'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { cotizaciones, cotizacionItems, clientes } from '@/lib/db/schema';
import {
  cotizacionSchema,
  motivoRechazoSchema,
  type CotizacionInput,
} from '@/lib/schemas/cotizacion';
import { calcularTotales, calcularItem } from '@/lib/cotizaciones/calculo';

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

/**
 * Verifica que el cliente exista y pertenezca al tenant.
 * Importante porque clienteId viene del cliente del navegador.
 */
async function validarCliente(tenantId: string, clienteId: string) {
  const [c] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(and(eq(clientes.id, clienteId), eq(clientes.tenantId, tenantId)));
  if (!c) throw new Error('Cliente no encontrado o no pertenece a este tenant');
}

export async function crearCotizacion(
  input: CotizacionInput
): Promise<ActionResult<{ id: string; numero: string }>> {
  const parsed = cotizacionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { user, tenant } = await requirePermission('cotizaciones.crear');
  const data = parsed.data;

  await validarCliente(tenant.id, data.clienteId);

  const totales = calcularTotales(data.items, data.descuentoGlobal);

  try {
    const result = await db.transaction(async (tx) => {
      const [{ siguiente }] = await tx.execute<{ siguiente: number }>(
        sql`SELECT siguiente_numero_cotizacion(${tenant.id}) AS siguiente`
      );

      const [cotizacion] = await tx
        .insert(cotizaciones)
        .values({
          tenantId: tenant.id,
          numeroCorrelativo: Number(siguiente),
          clienteId: data.clienteId,
          moneda: data.moneda,
          tipoCambio: data.tipoCambio != null ? String(data.tipoCambio) : null,
          fechaEmision: data.fechaEmision,
          fechaVencimiento: data.fechaVencimiento,
          subtotal: String(totales.subtotal),
          totalDescuentos: String(totales.totalDescuentos),
          descuentoGlobal: String(totales.descuentoGlobal),
          baseImponible: String(totales.baseImponible),
          igv: String(totales.igv),
          total: String(totales.total),
          notas: data.notas,
          terminosCondiciones: data.terminosCondiciones,
          creadoPor: user.id,
        })
        .returning({ id: cotizaciones.id, numeroCompleto: cotizaciones.numeroCompleto });

      const itemsRows = data.items.map((item, idx) => {
        const calc = calcularItem(item);
        return {
          cotizacionId: cotizacion.id,
          tenantId: tenant.id,
          orden: idx + 1,
          productoId: item.productoId ?? null,
          codigo: item.codigo ?? null,
          descripcion: item.descripcion,
          unidadMedida: item.unidadMedida,
          cantidad: String(item.cantidad),
          precioUnitario: String(item.precioUnitario),
          descuentoPorcentaje: String(item.descuentoPorcentaje),
          descuentoMonto: String(calc.descuentoMonto),
          afectaIgv: item.afectaIgv,
          subtotal: String(calc.subtotal),
          igv: String(calc.igv),
          total: String(calc.total),
        };
      });

      await tx.insert(cotizacionItems).values(itemsRows);

      return { id: cotizacion.id, numero: cotizacion.numeroCompleto ?? '' };
    });

    revalidatePath(`/${tenant.slug}/cotizaciones`);
    return { success: true, data: result };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al crear cotización';
    return { success: false, error: msg };
  }
}

export async function actualizarCotizacion(
  cotizacionId: string,
  input: CotizacionInput
): Promise<ActionResult> {
  const parsed = cotizacionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { tenant } = await requirePermission('cotizaciones.editar');
  const data = parsed.data;

  // Solo se puede editar si está en borrador
  const [actual] = await db
    .select({ estado: cotizaciones.estado })
    .from(cotizaciones)
    .where(and(eq(cotizaciones.id, cotizacionId), eq(cotizaciones.tenantId, tenant.id)));

  if (!actual) return { success: false, error: 'Cotización no encontrada' };
  if (actual.estado !== 'borrador')
    return {
      success: false,
      error: `Solo se puede editar en estado borrador (actual: ${actual.estado})`,
    };

  await validarCliente(tenant.id, data.clienteId);

  const totales = calcularTotales(data.items, data.descuentoGlobal);

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(cotizaciones)
        .set({
          clienteId: data.clienteId,
          moneda: data.moneda,
          tipoCambio: data.tipoCambio != null ? String(data.tipoCambio) : null,
          fechaEmision: data.fechaEmision,
          fechaVencimiento: data.fechaVencimiento,
          subtotal: String(totales.subtotal),
          totalDescuentos: String(totales.totalDescuentos),
          descuentoGlobal: String(totales.descuentoGlobal),
          baseImponible: String(totales.baseImponible),
          igv: String(totales.igv),
          total: String(totales.total),
          notas: data.notas,
          terminosCondiciones: data.terminosCondiciones,
          updatedAt: new Date(),
        })
        .where(eq(cotizaciones.id, cotizacionId));

      // Reemplazo full de items
      await tx.delete(cotizacionItems).where(eq(cotizacionItems.cotizacionId, cotizacionId));

      const itemsRows = data.items.map((item, idx) => {
        const calc = calcularItem(item);
        return {
          cotizacionId,
          tenantId: tenant.id,
          orden: idx + 1,
          productoId: item.productoId ?? null,
          codigo: item.codigo ?? null,
          descripcion: item.descripcion,
          unidadMedida: item.unidadMedida,
          cantidad: String(item.cantidad),
          precioUnitario: String(item.precioUnitario),
          descuentoPorcentaje: String(item.descuentoPorcentaje),
          descuentoMonto: String(calc.descuentoMonto),
          afectaIgv: item.afectaIgv,
          subtotal: String(calc.subtotal),
          igv: String(calc.igv),
          total: String(calc.total),
        };
      });

      await tx.insert(cotizacionItems).values(itemsRows);
    });

    revalidatePath(`/${tenant.slug}/cotizaciones`);
    revalidatePath(`/${tenant.slug}/cotizaciones/${cotizacionId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al actualizar' };
  }
}

export async function enviarCotizacion(cotizacionId: string): Promise<ActionResult> {
  const { tenant } = await requirePermission('cotizaciones.enviar');

  const [actual] = await db
    .select({ estado: cotizaciones.estado })
    .from(cotizaciones)
    .where(and(eq(cotizaciones.id, cotizacionId), eq(cotizaciones.tenantId, tenant.id)));

  if (!actual) return { success: false, error: 'Cotización no encontrada' };
  if (actual.estado !== 'borrador')
    return {
      success: false,
      error: `Solo se puede enviar desde borrador (actual: ${actual.estado})`,
    };

  // Validar que tenga al menos un item
  const itemsCount = await db.$count(
    cotizacionItems,
    eq(cotizacionItems.cotizacionId, cotizacionId)
  );
  if (itemsCount === 0) return { success: false, error: 'La cotización no tiene ítems' };

  await db
    .update(cotizaciones)
    .set({ estado: 'enviada', enviadaAt: new Date(), updatedAt: new Date() })
    .where(eq(cotizaciones.id, cotizacionId));

  revalidatePath(`/${tenant.slug}/cotizaciones`);
  revalidatePath(`/${tenant.slug}/cotizaciones/${cotizacionId}`);
  return { success: true, data: undefined };
}

export async function aceptarCotizacion(cotizacionId: string): Promise<ActionResult> {
  const { tenant } = await requirePermission('cotizaciones.aceptar');

  const [actual] = await db
    .select({ estado: cotizaciones.estado })
    .from(cotizaciones)
    .where(and(eq(cotizaciones.id, cotizacionId), eq(cotizaciones.tenantId, tenant.id)));

  if (!actual) return { success: false, error: 'Cotización no encontrada' };
  if (actual.estado !== 'enviada')
    return {
      success: false,
      error: `Solo se puede aceptar desde enviada (actual: ${actual.estado})`,
    };

  await db
    .update(cotizaciones)
    .set({ estado: 'aceptada', aceptadaAt: new Date(), updatedAt: new Date() })
    .where(eq(cotizaciones.id, cotizacionId));

  revalidatePath(`/${tenant.slug}/cotizaciones`);
  revalidatePath(`/${tenant.slug}/cotizaciones/${cotizacionId}`);
  return { success: true, data: undefined };
}

export async function rechazarCotizacion(
  cotizacionId: string,
  motivo: string
): Promise<ActionResult> {
  const parsed = motivoRechazoSchema.safeParse({ motivo });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { tenant } = await requirePermission('cotizaciones.rechazar');

  const [actual] = await db
    .select({ estado: cotizaciones.estado })
    .from(cotizaciones)
    .where(and(eq(cotizaciones.id, cotizacionId), eq(cotizaciones.tenantId, tenant.id)));

  if (!actual) return { success: false, error: 'Cotización no encontrada' };
  if (actual.estado !== 'enviada')
    return {
      success: false,
      error: `Solo se puede rechazar desde enviada (actual: ${actual.estado})`,
    };

  await db
    .update(cotizaciones)
    .set({
      estado: 'rechazada',
      rechazadaAt: new Date(),
      motivoRechazo: parsed.data.motivo,
      updatedAt: new Date(),
    })
    .where(eq(cotizaciones.id, cotizacionId));

  revalidatePath(`/${tenant.slug}/cotizaciones`);
  revalidatePath(`/${tenant.slug}/cotizaciones/${cotizacionId}`);
  return { success: true, data: undefined };
}

export async function duplicarCotizacion(
  cotizacionId: string
): Promise<ActionResult<{ id: string; numero: string }>> {
  const { user, tenant } = await requirePermission('cotizaciones.duplicar');

  const [original] = await db
    .select()
    .from(cotizaciones)
    .where(and(eq(cotizaciones.id, cotizacionId), eq(cotizaciones.tenantId, tenant.id)));

  if (!original) return { success: false, error: 'Cotización no encontrada' };

  const items = await db
    .select()
    .from(cotizacionItems)
    .where(eq(cotizacionItems.cotizacionId, cotizacionId));

  try {
    const result = await db.transaction(async (tx) => {
      const [{ siguiente }] = await tx.execute<{ siguiente: number }>(
        sql`SELECT siguiente_numero_cotizacion(${tenant.id}) AS siguiente`
      );

      const hoy = new Date().toISOString().slice(0, 10);
      const venceEn30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const [nueva] = await tx
        .insert(cotizaciones)
        .values({
          tenantId: tenant.id,
          numeroCorrelativo: Number(siguiente),
          clienteId: original.clienteId,
          moneda: original.moneda,
          tipoCambio: original.tipoCambio,
          fechaEmision: hoy,
          fechaVencimiento: venceEn30,
          estado: 'borrador',
          subtotal: original.subtotal,
          totalDescuentos: original.totalDescuentos,
          descuentoGlobal: original.descuentoGlobal,
          baseImponible: original.baseImponible,
          igv: original.igv,
          total: original.total,
          notas: original.notas,
          terminosCondiciones: original.terminosCondiciones,
          creadoPor: user.id,
        })
        .returning({ id: cotizaciones.id, numeroCompleto: cotizaciones.numeroCompleto });

      if (items.length > 0) {
        await tx.insert(cotizacionItems).values(
          items.map((it) => ({
            cotizacionId: nueva.id,
            tenantId: tenant.id,
            orden: it.orden,
            productoId: it.productoId,
            codigo: it.codigo,
            descripcion: it.descripcion,
            unidadMedida: it.unidadMedida,
            cantidad: it.cantidad,
            precioUnitario: it.precioUnitario,
            descuentoPorcentaje: it.descuentoPorcentaje,
            descuentoMonto: it.descuentoMonto,
            afectaIgv: it.afectaIgv,
            subtotal: it.subtotal,
            igv: it.igv,
            total: it.total,
          }))
        );
      }

      return { id: nueva.id, numero: nueva.numeroCompleto ?? '' };
    });

    revalidatePath(`/${tenant.slug}/cotizaciones`);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al duplicar' };
  }
}

export async function eliminarCotizacion(cotizacionId: string): Promise<ActionResult> {
  const { tenant } = await requirePermission('cotizaciones.eliminar');

  const [actual] = await db
    .select({ estado: cotizaciones.estado })
    .from(cotizaciones)
    .where(and(eq(cotizaciones.id, cotizacionId), eq(cotizaciones.tenantId, tenant.id)));

  if (!actual) return { success: false, error: 'Cotización no encontrada' };
  if (actual.estado !== 'borrador')
    return {
      success: false,
      error: `Solo se puede eliminar en borrador (actual: ${actual.estado})`,
    };

  await db.delete(cotizaciones).where(eq(cotizaciones.id, cotizacionId));

  revalidatePath(`/${tenant.slug}/cotizaciones`);
  return { success: true, data: undefined };
}
