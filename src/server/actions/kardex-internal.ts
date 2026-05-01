import 'server-only';

import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { kardexMovimientos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Helpers internos del kardex — invocables únicamente desde server actions
 * de otros módulos (B.6 OC, B.9 facturación, etc.). NO exponer al cliente.
 *
 * Todos delegan en la función SQL `registrar_movimiento_stock()` que serializa
 * los movimientos del mismo producto con SELECT FOR UPDATE.
 */

type Executor = typeof db | Parameters<Parameters<(typeof db)['transaction']>[0]>[0];

/** Entrada de stock al recibir una OC (parcial o total). */
export async function registrarEntradaPorOC(
  exec: Executor,
  args: {
    tenantId: string;
    productoId: string;
    cantidad: number;
    costoUnitario: number;
    ordenCompraId: string;
    userId: string;
  }
): Promise<void> {
  await exec.execute(sql`
    SELECT registrar_movimiento_stock(
      ${args.tenantId}::uuid,
      ${args.productoId}::uuid,
      'entrada'::text,
      ${args.cantidad}::numeric,
      'orden_compra'::text,
      ${args.ordenCompraId}::uuid,
      ${args.costoUnitario}::numeric,
      NULL::text,
      ${args.userId}::uuid
    )
  `);
}

/** Salida de stock al emitir una factura. */
export async function registrarSalidaPorFactura(
  exec: Executor,
  args: {
    tenantId: string;
    productoId: string;
    cantidad: number;
    facturaId: string;
    userId: string;
  }
): Promise<void> {
  await exec.execute(sql`
    SELECT registrar_movimiento_stock(
      ${args.tenantId}::uuid,
      ${args.productoId}::uuid,
      'salida'::text,
      ${args.cantidad}::numeric,
      'factura'::text,
      ${args.facturaId}::uuid,
      NULL::numeric,
      NULL::text,
      ${args.userId}::uuid
    )
  `);
}

/** Salida por guía de remisión (B.8). */
export async function registrarSalidaPorGuia(
  exec: Executor,
  args: {
    tenantId: string;
    productoId: string;
    cantidad: number;
    guiaId: string;
    userId: string;
  }
): Promise<void> {
  await exec.execute(sql`
    SELECT registrar_movimiento_stock(
      ${args.tenantId}::uuid,
      ${args.productoId}::uuid,
      'salida'::text,
      ${args.cantidad}::numeric,
      'guia'::text,
      ${args.guiaId}::uuid,
      NULL::numeric,
      NULL::text,
      ${args.userId}::uuid
    )
  `);
}

/**
 * Reversa un movimiento previo (anulación de factura, OC, etc.).
 * Lee el movimiento original e inserta el inverso (si fue 'salida' → 'entrada' y viceversa).
 */
export async function reversarMovimiento(
  exec: Executor,
  args: { tenantId: string; movimientoOriginalId: number; userId: string }
): Promise<void> {
  const [orig] = await exec
    .select({
      productoId: kardexMovimientos.productoId,
      tipo: kardexMovimientos.tipo,
      cantidad: kardexMovimientos.cantidad,
      costoUnitario: kardexMovimientos.costoUnitario,
    })
    .from(kardexMovimientos)
    .where(eq(kardexMovimientos.id, args.movimientoOriginalId));

  if (!orig) throw new Error(`movimiento ${args.movimientoOriginalId} no existe`);

  const tipoInverso = orig.tipo === 'salida' || orig.tipo === 'ajuste_neg' ? 'entrada' : 'salida';

  // Para entradas inversas necesitamos un costo unitario; usamos el del original.
  const costoParaInverso = tipoInverso === 'entrada' ? orig.costoUnitario : null;

  await exec.execute(sql`
    SELECT registrar_movimiento_stock(
      ${args.tenantId}::uuid,
      ${orig.productoId}::uuid,
      ${tipoInverso}::text,
      ${orig.cantidad}::numeric,
      'anulacion'::text,
      NULL::uuid,
      ${costoParaInverso}::numeric,
      ${'reversa de movimiento ' + args.movimientoOriginalId}::text,
      ${args.userId}::uuid
    )
  `);
}
