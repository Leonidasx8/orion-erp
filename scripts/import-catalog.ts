#!/usr/bin/env tsx
/**
 * Importa catálogos de productos desde Excel a Supabase.
 *
 * Soporta:
 *  - Lista_precios_conectores_Grupo_Idex (PDF como TSV exportado)
 *  - LISTA_DE_PRECIO_ABRIL_2026-SEGELECTRICA.xlsx
 *
 * Uso:
 *   pnpm tsx scripts/import-catalog.ts <tenant-slug> <ruta-archivo>
 *
 * Ejemplo:
 *   pnpm tsx scripts/import-catalog.ts idex catalogos/segelectrica.xlsx
 */

import { resolve } from 'node:path';

import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// ── Argumentos
const [, , tenantSlug, archivo] = process.argv;
if (!tenantSlug || !archivo) {
  console.error('Uso: pnpm tsx scripts/import-catalog.ts <tenant-slug> <archivo.xlsx>');
  process.exit(1);
}

// ── Supabase admin client
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_KEY) {
  console.error('Variables NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY requeridas');
  process.exit(1);
}
const supabase = createClient(SB_URL, SB_KEY);

// ── Tipos
interface ProductoRow {
  sku: string;
  descripcion: string;
  familia?: string;
  calibre?: string;
  unidad_calibre?: string;
  diametro_agujero?: string;
  precio_compra: number;
  precio_venta_sugerido?: number;
  moneda: 'USD' | 'PEN';
}

// ── Parsers de atributos (heurísticos)

/** Extrae calibre + unidad: "50mm2", "4 AWG", "250 MCM" */
function parseCalibre(desc: string): { calibre?: string; unidad?: string } {
  const patterns = [/(\d+(?:\.\d+)?)\s*mm2?/i, /(\d+\/?\d*)\s*AWG/i, /(\d+)\s*MCM/i];
  for (const p of patterns) {
    const m = desc.match(p);
    if (m) {
      return {
        calibre: m[1],
        unidad: p.source.includes('mm') ? 'mm2' : p.source.includes('AWG') ? 'AWG' : 'MCM',
      };
    }
  }
  return {};
}

/** Diámetro de agujero: "1/4", "3/16", "5/16" */
function parseDiametroAgujero(desc: string): string | undefined {
  const m = desc.match(/(\d+\/\d+)\s*(?:agujero|huec[oh]o|hole)?/i);
  return m?.[1];
}

/** Familia desde la descripción (heurística básica) */
function parseFamilia(desc: string): string {
  const upper = desc.toUpperCase();
  if (upper.includes('TERMINAL')) return 'Terminales';
  if (upper.includes('FUSIBLE')) return 'Fusibles';
  if (upper.includes('CABLE')) return 'Cables';
  if (upper.includes('CONECTOR')) return 'Conectores';
  if (upper.includes('AISLADOR')) return 'Aisladores';
  return 'Otros';
}

// ── Parser principal Excel SegElectrica
function parseSegElectrica(filepath: string): ProductoRow[] {
  const wb = XLSX.readFile(filepath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  // SegElectrica tiene headers basura en las primeras ~9 filas
  // Detectamos la fila de headers reales por contenido
  const headerIdx = rows.findIndex(
    (r) =>
      Array.isArray(r) && r.some((c) => typeof c === 'string' && /codigo|descripcion|sku/i.test(c))
  );
  if (headerIdx === -1) {
    throw new Error('No se encontró fila de headers en el Excel');
  }

  const headers: string[] = (rows[headerIdx] as unknown[]).map((h) =>
    String(h ?? '')
      .toLowerCase()
      .trim()
  );

  const idxSku = headers.findIndex((h) => /codigo|sku|item/i.test(h));
  const idxDesc = headers.findIndex((h) => /descripcion|descripción|producto/i.test(h));
  const idxPrecio = headers.findIndex((h) => /precio.*lista|lista.*aaa|costo/i.test(h));
  const idxVenta = headers.findIndex((h) => /precio.*venta|sugerido|publico/i.test(h));

  if (idxSku === -1 || idxDesc === -1 || idxPrecio === -1) {
    throw new Error(`Columnas faltantes. Detectadas: ${headers.join(', ')}`);
  }

  const productos: ProductoRow[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[idxSku] || !r[idxDesc]) continue;

    const sku = String(r[idxSku]).trim();
    const descripcion = String(r[idxDesc]).trim();
    const precioCompra = Number(r[idxPrecio]);
    const precioVenta = idxVenta !== -1 ? Number(r[idxVenta]) : undefined;

    if (!sku || !descripcion || isNaN(precioCompra)) continue;

    const { calibre, unidad } = parseCalibre(descripcion);
    productos.push({
      sku,
      descripcion,
      familia: parseFamilia(descripcion),
      calibre,
      unidad_calibre: unidad,
      diametro_agujero: parseDiametroAgujero(descripcion),
      precio_compra: precioCompra,
      precio_venta_sugerido: precioVenta && !isNaN(precioVenta) ? precioVenta : undefined,
      moneda: 'USD',
    });
  }
  return productos;
}

// ── Main
async function main() {
  console.log(`▶ Importando catálogo para tenant "${tenantSlug}"`);

  const { data: tenant, error: tErr } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single();
  if (tErr || !tenant) {
    console.error(`❌ Tenant "${tenantSlug}" no encontrado:`, tErr);
    process.exit(1);
  }

  const productos = parseSegElectrica(resolve(archivo));
  console.log(`▶ Parseados ${productos.length} productos`);

  // INSERT productos en lotes de 100
  let inserted = 0;
  for (let i = 0; i < productos.length; i += 100) {
    const batch = productos.slice(i, i + 100).map((p) => ({
      tenant_id: tenant.id,
      sku: p.sku,
      descripcion: p.descripcion,
      familia: p.familia,
      calibre: p.calibre,
      unidad_calibre: p.unidad_calibre,
      diametro_agujero: p.diametro_agujero,
      estado: 'activo',
    }));

    const { error: pErr } = await supabase
      .from('productos')
      .upsert(batch, { onConflict: 'tenant_id,sku' });
    if (pErr) {
      console.error('❌ Error inserción productos:', pErr);
      break;
    }
    inserted += batch.length;
    console.log(`  ${inserted}/${productos.length}...`);
  }

  // INSERT precios
  // Necesitamos el id del producto que acabamos de insertar
  // Re-leemos los SKUs y armamos los precios
  console.log('▶ Insertando precios...');
  const { data: productosDb } = await supabase
    .from('productos')
    .select('id, sku')
    .eq('tenant_id', tenant.id);

  const skuToId = new Map((productosDb ?? []).map((p) => [p.sku, p.id]));
  const hoy = new Date().toISOString().split('T')[0];
  interface PrecioRow {
    producto_id: string;
    tipo: 'compra' | 'venta_sugerido';
    moneda: 'USD' | 'PEN';
    precio: number;
    vigente_desde: string;
  }
  const precios: PrecioRow[] = [];

  for (const p of productos) {
    const productoId = skuToId.get(p.sku);
    if (!productoId) continue;
    precios.push({
      producto_id: productoId,
      tipo: 'compra',
      moneda: p.moneda,
      precio: p.precio_compra,
      vigente_desde: hoy,
    });
    if (p.precio_venta_sugerido) {
      precios.push({
        producto_id: productoId,
        tipo: 'venta_sugerido',
        moneda: p.moneda,
        precio: p.precio_venta_sugerido,
        vigente_desde: hoy,
      });
    }
  }

  for (let i = 0; i < precios.length; i += 200) {
    const batch = precios.slice(i, i + 200);
    const { error } = await supabase.from('precios_producto').upsert(batch);
    if (error) {
      console.error('❌ Error precios:', error);
      break;
    }
  }

  console.log(`✅ Importación completada. ${inserted} productos, ${precios.length} precios.`);
}

main().catch((e) => {
  console.error('❌ Error fatal:', e);
  process.exit(1);
});
