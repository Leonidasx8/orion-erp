'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { clientes } from '@/lib/db/schema';

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

export interface FilaClienteImportada {
  index: number;
  numeroDocumento: string;
  razonSocial: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email: string;
  telefono: string;
  lineaCredito: number;
  plazoCredito: string;
  direccion: string;
  notas: string;
}

const MAX_FILAS = 1000;

// Encabezados aceptados (insensible a mayúsculas/tildes). Coinciden con la
// plantilla oficial (/api/[slug]/clientes/plantilla) y variantes razonables.
const COLUMNAS = {
  numeroDocumento: [
    'ruc / dni',
    'ruc/dni',
    'ruc',
    'dni',
    'documento',
    'numero documento',
    'numero de documento',
    'número de documento',
    'nro documento',
    'nro. documento',
  ],
  razonSocial: [
    'razon social',
    'razón social',
    'razon social (empresas)',
    'razón social (empresas)',
    'empresa',
  ],
  nombres: ['nombres', 'nombres (personas)', 'nombre'],
  apellidoPaterno: ['apellido paterno', 'ap. paterno', 'ap paterno'],
  apellidoMaterno: ['apellido materno', 'ap. materno', 'ap materno'],
  email: ['email', 'correo', 'correo electronico', 'correo electrónico', 'e-mail'],
  telefono: ['telefono', 'teléfono', 'celular', 'movil', 'móvil'],
  lineaCredito: [
    'linea de credito (usd)',
    'línea de crédito (usd)',
    'linea de credito',
    'línea de crédito',
    'linea credito',
    'credito',
    'crédito',
  ],
  plazoCredito: [
    'plazo de pago (contado/15/30/60)',
    'plazo de pago',
    'plazo',
    'plazo credito',
    'plazo de credito',
  ],
  direccion: ['direccion fiscal', 'dirección fiscal', 'direccion', 'dirección'],
  notas: ['notas', 'notas internas', 'observaciones'],
} as const;

function normalizar(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

function normalizarPlazo(raw: string): string {
  const limpio = normalizar(raw);
  if (!limpio || limpio === 'contado' || limpio === '0') return 'contado';
  // Extraer cualquier número de días (ej: "45", "45 días", "45dias")
  const match = limpio.match(/(\d+)/);
  if (match) {
    const n = parseInt(match[1], 10);
    if (n === 0) return 'contado';
    return `${n}dias`;
  }
  return 'contado';
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

export async function parsearArchivoClientes(
  formData: FormData
): Promise<ActionResult<{ filas: FilaClienteImportada[]; nombreArchivo: string }>> {
  await requirePermission('clientes.crear');

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
  // al menos el documento + razón social o nombres.
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
      encontrados.numeroDocumento != null &&
      (encontrados.razonSocial != null || encontrados.nombres != null)
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
        'No se encontraron los encabezados. La primera hoja debe tener al menos las columnas "RUC / DNI" y "Razón social" (o "Nombres"). Descarga la plantilla oficial con el botón "Descargar plantilla".',
    };
  }

  const texto = (row: ExcelJS.Row, campo: keyof typeof COLUMNAS): string =>
    colIdx[campo] ? celdaTexto(row.getCell(colIdx[campo]!).value).trim() : '';

  const filas: FilaClienteImportada[] = [];
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const numeroDocumento = texto(row, 'numeroDocumento').replace(/\D/g, '');
    const razonSocial = texto(row, 'razonSocial');
    const nombres = texto(row, 'nombres');
    if (!numeroDocumento && !razonSocial && !nombres) continue; // fila vacía

    filas.push({
      index: filas.length + 1,
      numeroDocumento,
      razonSocial,
      nombres,
      apellidoPaterno: texto(row, 'apellidoPaterno'),
      apellidoMaterno: texto(row, 'apellidoMaterno'),
      email: texto(row, 'email'),
      telefono: texto(row, 'telefono').slice(0, 20),
      lineaCredito: colIdx.lineaCredito ? celdaNumero(row.getCell(colIdx.lineaCredito).value) : 0,
      plazoCredito: normalizarPlazo(texto(row, 'plazoCredito')),
      direccion: texto(row, 'direccion'),
      notas: texto(row, 'notas'),
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
  numeroDocumento: z
    .string()
    .regex(/^(\d{8}|\d{11})$/, 'El documento debe tener 8 dígitos (DNI) u 11 (RUC)'),
  razonSocial: z.string().trim().max(200),
  nombres: z.string().trim().max(100),
  apellidoPaterno: z.string().trim().max(100),
  apellidoMaterno: z.string().trim().max(100),
  email: z.string().email('Email inválido').max(150).or(z.literal('')),
  telefono: z.string().max(20),
  lineaCredito: z.number().min(0).finite(),
  plazoCredito: z.string().refine((v) => v === 'contado' || /^\d+dias$/.test(v), 'Plazo inválido'),
  direccion: z.string().max(300),
  notas: z.string().max(2000),
});

const confirmarSchema = z.object({
  filas: z.array(filaConfirmarSchema).min(1).max(MAX_FILAS),
});

export type ConfirmarImportClientesInput = z.infer<typeof confirmarSchema>;

export async function confirmarImportClientes(
  input: ConfirmarImportClientesInput
): Promise<ActionResult<{ creados: number; actualizados: number }>> {
  const parsed = confirmarSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { tenant, user } = await requirePermission('clientes.crear');
  const { filas } = parsed.data;

  // Validación servidor: documentos únicos dentro del archivo
  const vistos = new Set<string>();
  for (const f of filas) {
    if (vistos.has(f.numeroDocumento))
      return { success: false, error: `Documento duplicado en el archivo: ${f.numeroDocumento}` };
    vistos.add(f.numeroDocumento);
  }

  let creados = 0;
  let actualizados = 0;
  const fallidos: string[] = [];

  for (const f of filas) {
    const tipoDocumento = f.numeroDocumento.length === 11 ? 'RUC' : 'DNI';
    const tipoPersona = f.razonSocial ? 'juridica' : 'natural';

    if (tipoPersona === 'natural' && (!f.nombres || !f.apellidoPaterno)) {
      fallidos.push(`${f.numeroDocumento} (sin razón social ni nombres+apellido)`);
      continue;
    }

    // '' → no pisar el dato existente al actualizar
    const o = (s: string) => s.trim() || undefined;

    try {
      const [existente] = await db
        .select({ id: clientes.id })
        .from(clientes)
        .where(
          and(
            eq(clientes.tenantId, tenant.id),
            eq(clientes.tipoDocumento, tipoDocumento),
            eq(clientes.numeroDocumento, f.numeroDocumento)
          )
        )
        .limit(1);

      if (existente) {
        await db
          .update(clientes)
          .set({
            tipoPersona,
            razonSocial: o(f.razonSocial),
            nombres: o(f.nombres),
            apellidoPaterno: o(f.apellidoPaterno),
            apellidoMaterno: o(f.apellidoMaterno),
            email: o(f.email),
            telefono: o(f.telefono),
            lineaCredito: String(f.lineaCredito),
            plazoCredito: f.plazoCredito,
            direccionSunat: o(f.direccion),
            notas: o(f.notas),
            updatedAt: new Date(),
          })
          .where(eq(clientes.id, existente.id));
        actualizados++;
      } else {
        await db.insert(clientes).values({
          tenantId: tenant.id,
          tipoDocumento,
          numeroDocumento: f.numeroDocumento,
          tipoPersona,
          razonSocial: o(f.razonSocial) ?? null,
          nombres: o(f.nombres) ?? null,
          apellidoPaterno: o(f.apellidoPaterno) ?? null,
          apellidoMaterno: o(f.apellidoMaterno) ?? null,
          email: o(f.email) ?? null,
          telefono: o(f.telefono) ?? null,
          lineaCredito: String(f.lineaCredito),
          plazoCredito: f.plazoCredito,
          direccionSunat: o(f.direccion) ?? null,
          notas: o(f.notas) ?? null,
          createdBy: user.id,
        });
        creados++;
      }
    } catch (e) {
      console.error(`Import cliente ${f.numeroDocumento} falló:`, e);
      fallidos.push(f.numeroDocumento);
    }
  }

  revalidatePath(`/${tenant.slug}/clientes`);

  if (fallidos.length > 0) {
    const lista = fallidos.slice(0, 5).join(', ') + (fallidos.length > 5 ? '…' : '');
    return {
      success: false,
      error: `Se importaron ${creados + actualizados} de ${filas.length} clientes. Fallaron ${fallidos.length}: ${lista}. Corrige esas filas y vuelve a subir el archivo (los ya importados se actualizan, no se duplican).`,
    };
  }

  return { success: true, data: { creados, actualizados } };
}
