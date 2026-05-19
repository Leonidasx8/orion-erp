'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import {
  cotizaciones,
  cotizacionItems,
  clientes,
  productos,
  ordenesCompra,
  lineasOrdenCompra,
} from '@/lib/db/schema';
import {
  cotizacionSchema,
  motivoRechazoSchema,
  type CotizacionInput,
} from '@/lib/schemas/cotizacion';
import { calcularTotales, calcularItem } from '@/lib/cotizaciones/calculo';
import { capturarVersion } from '@/lib/cotizaciones/versiones';
import { validarMargenItem } from '@/lib/cotizaciones/margen';
import { calcularTotalesOrden } from '@/lib/ordenes/calculo';

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

async function validarCliente(tenantId: string, clienteId: string) {
  const [c] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(and(eq(clientes.id, clienteId), eq(clientes.tenantId, tenantId)));
  if (!c) throw new Error('Cliente no encontrado o no pertenece a este tenant');
}

/**
 * Carga los productos de los ítems y delega la validación de margen al helper puro.
 */
async function validarMargenMinimo(
  items: CotizacionInput['items']
): Promise<{ ok: true } | { ok: false; error: string }> {
  const itemsConProducto = items.filter((it) => it.productoId);
  if (itemsConProducto.length === 0) return { ok: true };

  for (const item of itemsConProducto) {
    const [producto] = await db
      .select({
        nombre: productos.nombre,
        costoUnitario: productos.costoUnitario,
        margenMinimo: productos.margenMinimo,
      })
      .from(productos)
      .where(eq(productos.id, item.productoId!));

    if (!producto) continue;

    const r = validarMargenItem(item.precioUnitario, producto);
    if (!r.ok) return { ok: false, error: r.error };
  }

  return { ok: true };
}

export async function crearCotizacion(
  input: CotizacionInput
): Promise<ActionResult<{ id: string; numero: string }>> {
  const parsed = cotizacionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { user, tenant } = await requirePermission('cotizaciones.crear');
  const data = parsed.data;

  await validarCliente(tenant.id, data.clienteId);

  const margenCheck = await validarMargenMinimo(data.items);
  if (!margenCheck.ok) return { success: false, error: margenCheck.error };

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
          formaPago: data.formaPago ?? null,
          tiempoEntrega: data.tiempoEntrega ?? null,
          lugarEntrega: data.lugarEntrega ?? null,
          incluyeIgv: data.incluyeIgv ?? false,
          contactoClienteNombre: data.contactoClienteNombre ?? null,
          contactoClienteCargo: data.contactoClienteCargo ?? null,
          contactoClienteEmail: data.contactoClienteEmail || null,
          creadoPor: user.id,
          creadoPorNombre:
            (user.user_metadata?.full_name as string | undefined) ?? user.email ?? 'Usuario',
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

  const margenCheck = await validarMargenMinimo(data.items);
  if (!margenCheck.ok) return { success: false, error: margenCheck.error };

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
          formaPago: data.formaPago ?? null,
          tiempoEntrega: data.tiempoEntrega ?? null,
          lugarEntrega: data.lugarEntrega ?? null,
          incluyeIgv: data.incluyeIgv ?? false,
          contactoClienteNombre: data.contactoClienteNombre ?? null,
          contactoClienteCargo: data.contactoClienteCargo ?? null,
          contactoClienteEmail: data.contactoClienteEmail || null,
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
  const { user, tenant } = await requirePermission('cotizaciones.enviar');

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

  const itemsCount = await db.$count(
    cotizacionItems,
    eq(cotizacionItems.cotizacionId, cotizacionId)
  );
  if (itemsCount === 0) return { success: false, error: 'La cotización no tiene ítems' };

  try {
    await db.transaction(async (tx) => {
      // Snapshot del estado que se está enviando al cliente
      await capturarVersion(tx, cotizacionId, tenant.id, user.id, 'envio');

      await tx
        .update(cotizaciones)
        .set({ estado: 'enviada', enviadaAt: new Date(), updatedAt: new Date() })
        .where(eq(cotizaciones.id, cotizacionId));
    });
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al enviar' };
  }

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

/**
 * Genera una OC en estado borrador por cada proveedor principal distinto
 * entre los ítems de la cotización.
 *
 * El schema actual de `productos` no tiene `proveedor_principal_id`, por lo que
 * todos los ítems caen en un único grupo "sin proveedor asignado".
 * Cuando esa columna exista, solo habrá que añadir el LEFT JOIN y ajustar
 * `proveedorKey` — el resto del pipeline no cambia.
 *
 * Estrategia para la FK NOT NULL `proveedor_id` en `ordenes_compra`:
 *   - Si el grupo tiene un proveedorId real → se usa directamente.
 *   - Si el grupo es "sin proveedor" → se busca el primer contacto marcado como
 *     proveedor del tenant como placeholder; si no existe ninguno, se omite el
 *     grupo y se devuelve error descriptivo.
 *
 * La cotización NO cambia de estado — permanece en `aceptada`.
 */
export async function generarOCsDesdeCotizacion(
  cotizacionId: string
): Promise<ActionResult<{ ordenesCreadas: number }>> {
  const { user, tenant } = await requirePermission('cotizaciones.ver');

  // 1. Verificar cotización
  const [cot] = await db
    .select({
      id: cotizaciones.id,
      estado: cotizaciones.estado,
      moneda: cotizaciones.moneda,
      tipoCambio: cotizaciones.tipoCambio,
    })
    .from(cotizaciones)
    .where(and(eq(cotizaciones.id, cotizacionId), eq(cotizaciones.tenantId, tenant.id)));

  if (!cot) return { success: false, error: 'Cotización no encontrada' };
  if (cot.estado !== 'aceptada')
    return {
      success: false,
      error: `Solo se pueden generar compras desde una cotización aceptada (estado actual: ${cot.estado})`,
    };

  // 2. Fetch ítems + proveedorPrincipalId del producto via LEFT JOIN
  const items = await db
    .select({
      productoId: cotizacionItems.productoId,
      codigo: cotizacionItems.codigo,
      descripcion: cotizacionItems.descripcion,
      cantidad: cotizacionItems.cantidad,
      precioUnitario: cotizacionItems.precioUnitario,
      afectaIgv: cotizacionItems.afectaIgv,
      orden: cotizacionItems.orden,
      proveedorPrincipalId: productos.proveedorPrincipalId,
    })
    .from(cotizacionItems)
    .leftJoin(productos, eq(productos.id, cotizacionItems.productoId))
    .where(eq(cotizacionItems.cotizacionId, cotizacionId));

  if (items.length === 0) return { success: false, error: 'La cotización no tiene ítems' };

  // 3. Agrupar por proveedorPrincipalId (null → una sola OC con todos los ítems sin proveedor)
  type ItemRow = (typeof items)[number];
  const grupos = new Map<string | null, ItemRow[]>();
  for (const item of items) {
    const key = item.proveedorPrincipalId ?? null;
    const grupo = grupos.get(key) ?? [];
    grupo.push(item);
    grupos.set(key, grupo);
  }

  const compradorNombre =
    (user.user_metadata?.full_name as string | undefined) ?? user.email ?? 'Usuario';
  const hoy = new Date().toISOString().slice(0, 10);

  try {
    let ordenesCreadas = 0;

    await db.transaction(async (tx) => {
      for (const [proveedorKey, grupoItems] of grupos.entries()) {
        // Resolver proveedorId para este grupo
        let proveedorId: string;
        if (proveedorKey !== null) {
          proveedorId = proveedorKey;
        } else {
          // Sin proveedor asignado: usar primer proveedor registrado como placeholder
          const [placeholder] = await tx
            .select({ id: clientes.id })
            .from(clientes)
            .where(and(eq(clientes.tenantId, tenant.id), eq(clientes.esProveedor, true)))
            .limit(1);

          if (!placeholder) {
            throw new Error(
              'No hay proveedores registrados en el sistema. Crea al menos un proveedor antes de generar compras.'
            );
          }
          proveedorId = placeholder.id;
        }

        // Calcular totales del grupo
        const totales = calcularTotalesOrden(
          grupoItems.map((it) => ({
            cantidad: Number(it.cantidad),
            precioUnitario: Number(it.precioUnitario),
            afectaIgv: it.afectaIgv,
          }))
        );

        // Generar número correlativo de OC
        const [{ numero }] = await tx.execute<{ numero: string }>(
          `SELECT generar_numero_orden_compra('${tenant.id}') AS numero`
        );

        const observaciones =
          proveedorKey === null
            ? `Generada desde cotización ${cotizacionId} — sin proveedor asignado`
            : `Generada desde cotización ${cotizacionId} — proveedor ${proveedorKey}`;

        const [orden] = await tx
          .insert(ordenesCompra)
          .values({
            tenantId: tenant.id,
            numero,
            proveedorId,
            cotizacionOrigenId: cotizacionId,
            moneda: cot.moneda,
            tipoCambio: cot.tipoCambio,
            fechaEmision: hoy,
            subtotal: String(totales.subtotal),
            igv: String(totales.igv),
            total: String(totales.total),
            observaciones,
            compradorId: user.id,
            compradorNombre,
            // estado: 'borrador' — default en el schema, no hace falta especificarlo
          })
          .returning({ id: ordenesCompra.id });

        await tx.insert(lineasOrdenCompra).values(
          grupoItems.map((item, idx) => {
            const calc = calcularItem({
              cantidad: Number(item.cantidad),
              precioUnitario: Number(item.precioUnitario),
              descuentoPorcentaje: 0,
              afectaIgv: item.afectaIgv,
            });
            return {
              ordenId: orden.id,
              tenantId: tenant.id,
              productoId: item.productoId ?? null,
              skuSnapshot: item.codigo ?? item.descripcion.slice(0, 100),
              descripcion: item.descripcion,
              cantidad: item.cantidad,
              precioUnitario: item.precioUnitario,
              afectaIgv: item.afectaIgv,
              subtotal: String(calc.subtotal),
              igv: String(calc.igv),
              total: String(calc.total),
              orden: idx,
            };
          })
        );

        ordenesCreadas++;
      }
    });

    revalidatePath(`/${tenant.slug}/ordenes`);
    return { success: true, data: { ordenesCreadas } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error al generar órdenes de compra',
    };
  }
}
