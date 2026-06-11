'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import ExcelJS from 'exceljs';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { productos, categoriasProducto } from '@/lib/db/schema';
import { z } from 'zod';

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

export interface FilaImportada {
  index: number;
  sku: string;
  descripcion: string;
  familia: string;
  calibre: string;
  precioCompra: number;
  precioVenta: number;
  unidadMedida: string;
}

const MAX_FILAS = 2000;

// Encabezados aceptados (insensible a mayúsculas/tildes). Soporta la plantilla
// oficial de DIGNITA y variantes razonables de listas de proveedores.
const COLUMNAS = {
  sku: ['sku', 'codigo', 'código', 'cod', 'sku (codigo unico)', 'sku (código único)'],
  descripcion: ['nombre', 'descripcion', 'descripción', 'producto', 'nombre / descripcion'],
  familia: ['familia', 'categoria', 'categoría', 'categoria / familia', 'linea', 'línea'],
  calibre: ['calibre', 'seccion', 'sección', 'medida'],
  precioCompra: [
    'costo',
    'costo unitario',
    'precio compra',
    'p. compra',
    'precio de compra',
    'costo unitario (precio proveedor)',
  ],
  precioVenta: [
    'precio',
    'precio venta',
    'p. venta',
    'precio de venta',
    'precio unitario',
    'precio de venta (vacio = costo + margen global)',
  ],
  unidadMedida: ['unidad', 'unidad de medida', 'um', 'u.m.', 'unidad de medida (mtr/und/kg)'],
} as const;

function normalizar(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

function celdaTexto(v: ExcelJS.CellValue): string {
  if (v == null) return '';
  if (typeof v === 'object') {
    if ('result' in v && v.result != null) return String(v.result);
    if ('richText' in v) return v.richText.map((r) => r.text).join('');
    if ('text' in v) return String(v.text);
    return '';
  }
  return String(v);
}

function celdaNumero(v: ExcelJS.CellValue): number {
  if (typeof v === 'number') return v;
  if (v != null && typeof v === 'object' && 'result' in v && typeof v.result === 'number') {
    return v.result;
  }
  const n = parseFloat(
    celdaTexto(v)
      .replace(/[^\d.,-]/g, '')
      .replace(',', '.')
  );
  return Number.isFinite(n) ? n : 0;
}

export async function parsearArchivoProductos(
  formData: FormData
): Promise<ActionResult<{ filas: FilaImportada[]; nombreArchivo: string }>> {
  await requirePermission('productos.importar');

  const file = formData.get('archivo');
  if (!(file instanceof File)) return { success: false, error: 'No se recibió ningún archivo' };
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: 'El archivo supera los 5 MB permitidos' };
  }

  const wb = new ExcelJS.Workbook();
  try {
    if (file.name.toLowerCase().endsWith('.csv')) {
      const text = Buffer.from(await file.arrayBuffer()).toString('utf-8');
      const ws = wb.addWorksheet('csv');
      for (const line of text.split(/\r?\n/)) {
        if (line.trim()) ws.addRow(line.split(/[;,]/).map((c) => c.trim()));
      }
    } else {
      await wb.xlsx.load(await file.arrayBuffer());
    }
  } catch {
    return { success: false, error: 'No se pudo leer el archivo. ¿Es un Excel (.xlsx) válido?' };
  }

  const ws = wb.worksheets[0];
  if (!ws) return { success: false, error: 'El archivo no tiene hojas' };

  // Buscar la fila de encabezados en las primeras 15 filas: la que matchee
  // al menos SKU + un campo de precio.
  let headerRow = 0;
  const colIdx: Partial<Record<keyof typeof COLUMNAS, number>> = {};
  for (let r = 1; r <= Math.min(15, ws.rowCount); r++) {
    const row = ws.getRow(r);
    const encontrados: Partial<Record<keyof typeof COLUMNAS, number>> = {};
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const texto = normalizar(celdaTexto(cell.value));
      if (!texto) return;
      for (const campo of Object.keys(COLUMNAS) as (keyof typeof COLUMNAS)[]) {
        if (encontrados[campo] == null && COLUMNAS[campo].some((a) => normalizar(a) === texto)) {
          encontrados[campo] = col;
        }
      }
    });
    if (
      encontrados.sku != null &&
      (encontrados.precioCompra != null || encontrados.precioVenta != null)
    ) {
      headerRow = r;
      Object.assign(colIdx, encontrados);
      break;
    }
  }

  if (!headerRow) {
    return {
      success: false,
      error:
        'No se encontraron los encabezados. La primera hoja debe tener columnas "SKU" y "Costo" (o "Precio"). Descarga la plantilla oficial desde el paquete de entrega.',
    };
  }

  const filas: FilaImportada[] = [];
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const sku = colIdx.sku ? celdaTexto(row.getCell(colIdx.sku).value).trim() : '';
    const descripcion = colIdx.descripcion
      ? celdaTexto(row.getCell(colIdx.descripcion).value).trim()
      : '';
    if (!sku && !descripcion) continue; // fila vacía

    filas.push({
      index: filas.length + 1,
      sku,
      descripcion,
      familia: colIdx.familia ? celdaTexto(row.getCell(colIdx.familia).value).trim() : '',
      calibre: colIdx.calibre ? celdaTexto(row.getCell(colIdx.calibre).value).trim() || '—' : '—',
      precioCompra: colIdx.precioCompra ? celdaNumero(row.getCell(colIdx.precioCompra).value) : 0,
      precioVenta: colIdx.precioVenta ? celdaNumero(row.getCell(colIdx.precioVenta).value) : 0,
      unidadMedida: colIdx.unidadMedida
        ? celdaTexto(row.getCell(colIdx.unidadMedida).value).trim().toUpperCase() || 'NIU'
        : 'NIU',
    });
    if (filas.length >= MAX_FILAS) break;
  }

  if (filas.length === 0) {
    return {
      success: false,
      error: 'El archivo no tiene filas de datos debajo de los encabezados',
    };
  }

  return { success: true, data: { filas, nombreArchivo: file.name } };
}

const filaConfirmarSchema = z.object({
  sku: z.string().min(1).max(60),
  descripcion: z.string().min(1).max(300),
  familia: z.string().max(120),
  precioCompra: z.number().positive().finite(),
  precioVenta: z.number().nonnegative().finite(),
  unidadMedida: z.string().max(10).default('NIU'),
});

const confirmarSchema = z.object({
  filas: z.array(filaConfirmarSchema).min(1).max(MAX_FILAS),
  margenPorcentaje: z.number().min(0).max(500).default(10),
});

export type ConfirmarImportInput = z.infer<typeof confirmarSchema>;

export async function confirmarImportProductos(
  input: ConfirmarImportInput
): Promise<ActionResult<{ creados: number; actualizados: number }>> {
  const parsed = confirmarSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { tenant, user } = await requirePermission('productos.importar');
  const { filas, margenPorcentaje } = parsed.data;

  // Validación servidor: SKUs únicos dentro del archivo
  const vistos = new Set<string>();
  for (const f of filas) {
    if (vistos.has(f.sku))
      return { success: false, error: `SKU duplicado en el archivo: ${f.sku}` };
    vistos.add(f.sku);
  }

  // Resolver/crear categorías una sola vez
  const nombresFamilia = [...new Set(filas.map((f) => f.familia.trim() || 'Sin clasificar'))];
  const categoriaIds = new Map<string, string>();
  for (const nombre of nombresFamilia) {
    const existente = await db
      .select({ id: categoriasProducto.id })
      .from(categoriasProducto)
      .where(and(eq(categoriasProducto.tenantId, tenant.id), eq(categoriasProducto.nombre, nombre)))
      .limit(1);
    if (existente.length) {
      categoriaIds.set(nombre, existente[0].id);
    } else {
      const [creada] = await db
        .insert(categoriasProducto)
        .values({ tenantId: tenant.id, nombre })
        .returning({ id: categoriasProducto.id });
      categoriaIds.set(nombre, creada.id);
    }
  }

  let creados = 0;
  let actualizados = 0;

  for (const f of filas) {
    const familia = f.familia.trim() || 'Sin clasificar';
    const precioVenta =
      f.precioVenta > 0
        ? f.precioVenta
        : Math.round(f.precioCompra * (1 + margenPorcentaje / 100) * 10000) / 10000;

    const result = await db
      .insert(productos)
      .values({
        tenantId: tenant.id,
        codigo: f.sku,
        nombre: f.descripcion,
        categoriaId: categoriaIds.get(familia),
        costoUnitario: String(f.precioCompra),
        precioUnitario: String(precioVenta),
        unidadMedida: f.unidadMedida || 'NIU',
        tipo: 'bien',
        controlaStock: false,
        activo: true,
        createdBy: user.id,
      })
      .onConflictDoUpdate({
        target: [productos.tenantId, productos.codigo],
        set: {
          nombre: f.descripcion,
          categoriaId: categoriaIds.get(familia),
          costoUnitario: String(f.precioCompra),
          precioUnitario: String(precioVenta),
          updatedAt: new Date(),
        },
      })
      .returning({ created: sql<boolean>`(xmax = 0)` });

    if (result[0]?.created) creados++;
    else actualizados++;
  }

  revalidatePath(`/${tenant.slug}/productos`);
  return { success: true, data: { creados, actualizados } };
}
