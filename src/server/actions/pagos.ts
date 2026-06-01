'use server';

import { and, eq, sum } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { facturas, pagos } from '@/lib/db/schema';
import { PagoSchema, type PagoInput } from '@/lib/schemas/credito';

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

// ─── registrarPago ────────────────────────────────────────────────────────────

export async function registrarPago(
  input: PagoInput
): Promise<ActionResult<{ totalPagado: number; saldoRestante: number }>> {
  try {
    // 1. Validar Zod
    const parsed = PagoSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
    }

    const data = parsed.data;

    // 2. Requiere permiso
    const { user, tenant } = await requirePermission('credito.registrar_pago');

    // 3. Cargar factura — verificar tenantId y estado aceptada (por SUNAT)
    const [factura] = await db
      .select({
        id: facturas.id,
        tenantId: facturas.tenantId,
        moneda: facturas.moneda,
        total: facturas.total,
        estadoSunat: facturas.estadoSunat,
      })
      .from(facturas)
      .where(and(eq(facturas.id, data.facturaId), eq(facturas.tenantId, tenant.id)));

    if (!factura) {
      return { success: false, error: 'Factura no encontrada' };
    }

    if (factura.estadoSunat !== 'aceptada') {
      return {
        success: false,
        error: 'Solo se pueden registrar pagos para facturas aceptadas por SUNAT',
      };
    }

    // 4. Si moneda distinta a factura y no hay tipoCambio → error
    const monedaFactura = factura.moneda as 'PEN' | 'USD';
    if (data.moneda !== monedaFactura && !data.tipoCambioAplicado) {
      return {
        success: false,
        error: 'tipo_cambio_required',
      };
    }

    const totalFactura = Number(factura.total);

    // 5. Calcular suma de pagos previos (en moneda de factura)
    const [{ totalPrevio }] = await db
      .select({ totalPrevio: sum(pagos.monto) })
      .from(pagos)
      .where(eq(pagos.facturaId, data.facturaId));

    const sumaPrevios = Number(totalPrevio ?? 0);

    // 6. Calcular monto en moneda de factura
    let montoEnMonedaFactura: number;
    if (data.moneda !== monedaFactura && data.tipoCambioAplicado) {
      montoEnMonedaFactura = data.monto * data.tipoCambioAplicado;
    } else {
      montoEnMonedaFactura = data.monto;
    }

    // 7. Si total nuevo > total factura → error
    const nuevoTotal = sumaPrevios + montoEnMonedaFactura;
    if (nuevoTotal > totalFactura) {
      return {
        success: false,
        error: 'monto_excede_saldo',
      };
    }

    // 8. Insert en pagos
    await db.insert(pagos).values({
      tenantId: tenant.id,
      facturaId: data.facturaId,
      monto: String(data.monto),
      moneda: data.moneda,
      tipoCambioAplicado: data.tipoCambioAplicado ? String(data.tipoCambioAplicado) : null,
      fechaPago: data.fechaPago,
      metodo: data.metodo,
      referencia: data.referencia ?? null,
      observaciones: data.observaciones ?? null,
      registradoPor: user.id,
    });

    // 9. Fire-and-forget refresh de la vista materializada
    db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY cuentas_por_cobrar`).catch(console.error);

    // 10. Revalidar módulo crédito
    revalidatePath(`/${tenant.slug}/credito`);
    revalidatePath(`/${tenant.slug}/credito/${factura.id}`);

    // 11. Retornar totales
    const totalPagado = nuevoTotal;
    const saldoRestante = Math.max(0, totalFactura - totalPagado);

    return {
      success: true,
      data: { totalPagado, saldoRestante },
    };
  } catch (err) {
    console.error('[pagos] registrarPago error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error interno' };
  }
}
