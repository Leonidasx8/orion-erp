'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import {
  ordenesCompra,
  lineasOrdenCompra,
  clientes,
  cotizaciones,
  cotizacionItems,
} from '@/lib/db/schema';
import { ordenCompraSchema, type OrdenCompraInput } from '@/lib/schemas/orden-compra';
import { calcularItem } from '@/lib/cotizaciones/calculo';
import { calcularTotalesOrden } from '@/lib/ordenes/calculo';
import { registrarEntradaPorOC } from '@/server/actions/kardex-internal';

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

async function validarProveedor(tenantId: string, proveedorId: string) {
  const [p] = await db
    .select({ id: clientes.id, esProveedor: clientes.esProveedor })
    .from(clientes)
    .where(and(eq(clientes.id, proveedorId), eq(clientes.tenantId, tenantId)));
  if (!p) throw new Error('Proveedor no encontrado o no pertenece a este tenant');
  if (!p.esProveedor) throw new Error('El contacto seleccionado no está marcado como proveedor');
}

export async function crearOrdenCompra(
  input: OrdenCompraInput
): Promise<ActionResult<{ id: string; numero: string }>> {
  const parsed = ordenCompraSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { user, tenant } = await requirePermission('ordenes.crear');
  const data = parsed.data;

  try {
    await validarProveedor(tenant.id, data.proveedorId);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error de validación' };
  }

  const totales = calcularTotalesOrden(data.lineas);

  try {
    const result = await db.transaction(async (tx) => {
      const [{ numero }] = await tx.execute<{ numero: string }>(
        // generar_numero_orden_compra usa upsert atómico en correlativos_orden_compra
        `SELECT generar_numero_orden_compra('${tenant.id}') AS numero`
      );

      const hoy = new Date().toISOString().slice(0, 10);

      const [orden] = await tx
        .insert(ordenesCompra)
        .values({
          tenantId: tenant.id,
          numero,
          proveedorId: data.proveedorId,
          cotizacionOrigenId: data.cotizacionOrigenId ?? null,
          moneda: data.moneda,
          tipoCambio: data.tipoCambio != null ? String(data.tipoCambio) : null,
          fechaEmision: data.fechaEmision ?? hoy,
          fechaEntregaEsperada: data.fechaEntregaEsperada ?? null,
          subtotal: String(totales.subtotal),
          igv: String(totales.igv),
          total: String(totales.total),
          terminosPago: data.terminosPago,
          direccionEntrega: data.direccionEntrega,
          observaciones: data.observaciones,
          compradorId: user.id,
          compradorNombre:
            (user.user_metadata?.full_name as string | undefined) ?? user.email ?? 'Usuario',
        })
        .returning({ id: ordenesCompra.id, numero: ordenesCompra.numero });

      await tx.insert(lineasOrdenCompra).values(
        data.lineas.map((linea, idx) => {
          const calc = calcularItem({
            cantidad: linea.cantidad,
            precioUnitario: linea.precioUnitario,
            descuentoPorcentaje: 0,
            afectaIgv: linea.afectaIgv,
          });
          return {
            ordenId: orden.id,
            tenantId: tenant.id,
            productoId: linea.productoId ?? null,
            skuSnapshot: linea.skuSnapshot,
            descripcion: linea.descripcion,
            cantidad: String(linea.cantidad),
            precioUnitario: String(linea.precioUnitario),
            afectaIgv: linea.afectaIgv,
            subtotal: String(calc.subtotal),
            igv: String(calc.igv),
            total: String(calc.total),
            orden: idx,
          };
        })
      );

      return { id: orden.id, numero: orden.numero };
    });

    revalidatePath(`/${tenant.slug}/ordenes`);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al crear OC' };
  }
}

export async function crearOcDesdeCotizacion(
  cotizacionId: string
): Promise<ActionResult<{ id: string; numero: string }>> {
  const { user, tenant } = await requirePermission('ordenes.crear');

  const [cot] = await db
    .select()
    .from(cotizaciones)
    .where(and(eq(cotizaciones.id, cotizacionId), eq(cotizaciones.tenantId, tenant.id)));

  if (!cot) return { success: false, error: 'Cotización no encontrada' };
  if (cot.estado !== 'aceptada')
    return { success: false, error: 'Solo se puede convertir a OC una cotización aceptada' };

  const items = await db
    .select()
    .from(cotizacionItems)
    .where(eq(cotizacionItems.cotizacionId, cotizacionId));

  if (items.length === 0) return { success: false, error: 'La cotización no tiene ítems' };

  try {
    const result = await db.transaction(async (tx) => {
      const [{ numero }] = await tx.execute<{ numero: string }>(
        `SELECT generar_numero_orden_compra('${tenant.id}') AS numero`
      );

      const hoy = new Date().toISOString().slice(0, 10);

      const [orden] = await tx
        .insert(ordenesCompra)
        .values({
          tenantId: tenant.id,
          numero,
          // El cliente de la cotización se usará como proveedor — en B.6 esto requiere
          // que el cliente esté marcado como proveedor. El caller debe verificar esto.
          proveedorId: cot.clienteId,
          cotizacionOrigenId: cotizacionId,
          moneda: cot.moneda,
          tipoCambio: cot.tipoCambio,
          fechaEmision: hoy,
          subtotal: cot.subtotal,
          igv: cot.igv,
          total: cot.total,
          compradorId: user.id,
          compradorNombre:
            (user.user_metadata?.full_name as string | undefined) ?? user.email ?? 'Usuario',
        })
        .returning({ id: ordenesCompra.id, numero: ordenesCompra.numero });

      await tx.insert(lineasOrdenCompra).values(
        items.map((item, idx) => ({
          ordenId: orden.id,
          tenantId: tenant.id,
          productoId: item.productoId,
          skuSnapshot: item.codigo ?? item.descripcion.slice(0, 100),
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          afectaIgv: item.afectaIgv,
          subtotal: item.subtotal,
          igv: item.igv,
          total: item.total,
          orden: idx,
        }))
      );

      return { id: orden.id, numero: orden.numero };
    });

    revalidatePath(`/${tenant.slug}/ordenes`);
    return { success: true, data: result };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error al crear OC desde cotización',
    };
  }
}

export async function enviarOrden(ordenId: string): Promise<ActionResult> {
  const { tenant } = await requirePermission('ordenes.enviar');

  const [actual] = await db
    .select({ estado: ordenesCompra.estado })
    .from(ordenesCompra)
    .where(and(eq(ordenesCompra.id, ordenId), eq(ordenesCompra.tenantId, tenant.id)));

  if (!actual) return { success: false, error: 'Orden no encontrada' };
  if (actual.estado !== 'borrador')
    return {
      success: false,
      error: `Solo se puede enviar desde borrador (actual: ${actual.estado})`,
    };

  await db
    .update(ordenesCompra)
    .set({ estado: 'enviada', fechaEnvio: new Date(), updatedAt: new Date() })
    .where(eq(ordenesCompra.id, ordenId));

  revalidatePath(`/${tenant.slug}/ordenes`);
  revalidatePath(`/${tenant.slug}/ordenes/${ordenId}`);
  return { success: true, data: undefined };
}

export async function aprobarOrden(ordenId: string): Promise<ActionResult> {
  const { tenant } = await requirePermission('ordenes.aprobar');

  const [actual] = await db
    .select({ estado: ordenesCompra.estado })
    .from(ordenesCompra)
    .where(and(eq(ordenesCompra.id, ordenId), eq(ordenesCompra.tenantId, tenant.id)));

  if (!actual) return { success: false, error: 'Orden no encontrada' };
  if (actual.estado !== 'enviada')
    return {
      success: false,
      error: `Solo se puede aprobar desde enviada (actual: ${actual.estado})`,
    };

  await db
    .update(ordenesCompra)
    .set({ estado: 'aprobada', fechaAprobacion: new Date(), updatedAt: new Date() })
    .where(eq(ordenesCompra.id, ordenId));

  revalidatePath(`/${tenant.slug}/ordenes`);
  revalidatePath(`/${tenant.slug}/ordenes/${ordenId}`);
  return { success: true, data: undefined };
}

export async function recibirParcial(
  ordenId: string,
  recepciones: { lineaId: string; cantidadRecibida: number }[]
): Promise<ActionResult> {
  if (recepciones.length === 0)
    return { success: false, error: 'Debes indicar al menos una línea' };

  const { user, tenant } = await requirePermission('ordenes.recibir');

  const [actual] = await db
    .select({ estado: ordenesCompra.estado })
    .from(ordenesCompra)
    .where(and(eq(ordenesCompra.id, ordenId), eq(ordenesCompra.tenantId, tenant.id)));

  if (!actual) return { success: false, error: 'Orden no encontrada' };
  if (!['aprobada', 'recibida_parcial'].includes(actual.estado))
    return {
      success: false,
      error: `Solo se puede recibir desde aprobada o recibida_parcial (actual: ${actual.estado})`,
    };

  const lineas = await db
    .select()
    .from(lineasOrdenCompra)
    .where(eq(lineasOrdenCompra.ordenId, ordenId));

  try {
    await db.transaction(async (tx) => {
      for (const recep of recepciones) {
        const linea = lineas.find((l) => l.id === recep.lineaId);
        if (!linea) throw new Error(`Línea ${recep.lineaId} no encontrada en esta orden`);

        const nuevaCantidad = Number(linea.cantidadRecibida) + recep.cantidadRecibida;
        if (nuevaCantidad > Number(linea.cantidad))
          throw new Error(`Cantidad a recibir supera lo pedido en "${linea.descripcion}"`);

        await tx
          .update(lineasOrdenCompra)
          .set({ cantidadRecibida: String(nuevaCantidad) })
          .where(eq(lineasOrdenCompra.id, recep.lineaId));

        // Registrar entrada de stock en kardex (solo si hay producto asociado)
        if (linea.productoId) {
          await registrarEntradaPorOC(tx, {
            tenantId: tenant.id,
            productoId: linea.productoId,
            cantidad: recep.cantidadRecibida,
            costoUnitario: Number(linea.precioUnitario),
            ordenCompraId: ordenId,
            userId: user.id,
          });
        }
      }

      // Recalcular estado según si todas las líneas están totalmente recibidas
      const lineasActualizadas = await tx
        .select({
          cantidad: lineasOrdenCompra.cantidad,
          recibida: lineasOrdenCompra.cantidadRecibida,
        })
        .from(lineasOrdenCompra)
        .where(eq(lineasOrdenCompra.ordenId, ordenId));

      const totalRecibida = lineasActualizadas.every(
        (l) => Number(l.recibida) >= Number(l.cantidad)
      );

      await tx
        .update(ordenesCompra)
        .set({
          estado: totalRecibida ? 'recibida_total' : 'recibida_parcial',
          fechaRecepcionCompleta: totalRecibida ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(ordenesCompra.id, ordenId));
    });
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error al registrar recepción',
    };
  }

  revalidatePath(`/${tenant.slug}/ordenes`);
  revalidatePath(`/${tenant.slug}/ordenes/${ordenId}`);
  return { success: true, data: undefined };
}

export async function cerrarOrden(ordenId: string): Promise<ActionResult> {
  const { tenant } = await requirePermission('ordenes.aprobar');

  const [actual] = await db
    .select({ estado: ordenesCompra.estado })
    .from(ordenesCompra)
    .where(and(eq(ordenesCompra.id, ordenId), eq(ordenesCompra.tenantId, tenant.id)));

  if (!actual) return { success: false, error: 'Orden no encontrada' };
  if (!['recibida_total', 'recibida_parcial'].includes(actual.estado))
    return {
      success: false,
      error: `Solo se puede cerrar desde recibida_total o recibida_parcial (actual: ${actual.estado})`,
    };

  await db
    .update(ordenesCompra)
    .set({ estado: 'cerrada', updatedAt: new Date() })
    .where(eq(ordenesCompra.id, ordenId));

  revalidatePath(`/${tenant.slug}/ordenes`);
  revalidatePath(`/${tenant.slug}/ordenes/${ordenId}`);
  return { success: true, data: undefined };
}

export async function eliminarOrden(ordenId: string): Promise<ActionResult> {
  const { tenant } = await requirePermission('ordenes.eliminar');

  const [actual] = await db
    .select({ estado: ordenesCompra.estado })
    .from(ordenesCompra)
    .where(and(eq(ordenesCompra.id, ordenId), eq(ordenesCompra.tenantId, tenant.id)));

  if (!actual) return { success: false, error: 'Orden no encontrada' };
  if (actual.estado !== 'borrador')
    return {
      success: false,
      error: `Solo se puede eliminar en borrador (actual: ${actual.estado})`,
    };

  await db.delete(ordenesCompra).where(eq(ordenesCompra.id, ordenId));

  revalidatePath(`/${tenant.slug}/ordenes`);
  return { success: true, data: undefined };
}
