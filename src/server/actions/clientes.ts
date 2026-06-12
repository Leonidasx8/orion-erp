'use server';

import { and, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import {
  clientes,
  creditosCliente,
  direccionesCliente,
  contactosCliente,
  cotizaciones,
  facturas,
  notasCreditoDebito,
  guiasRemision,
  ordenesCompra,
  pagos,
} from '@/lib/db/schema';

// 'contado' → 0, '30dias' → 30, '45dias' → 45
function plazoToDias(plazo: string): number {
  if (plazo === 'contado') return 0;
  const m = plazo.match(/^(\d+)dias$/);
  return m ? parseInt(m[1], 10) : 0;
}
import {
  clienteSchema,
  direccionClienteSchema,
  contactoClienteSchema,
  type ClienteInput,
  type DireccionClienteInput,
  type ContactoClienteInput,
} from '@/lib/schemas/cliente';

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

export async function crearCliente(input: ClienteInput): Promise<ActionResult<{ id: string }>> {
  const parsed = clienteSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { user, tenant } = await requirePermission('clientes.crear');
  const data = parsed.data;

  const existing = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(
      and(
        eq(clientes.tenantId, tenant.id),
        eq(clientes.tipoDocumento, data.tipoDocumento),
        eq(clientes.numeroDocumento, data.numeroDocumento)
      )
    );

  if (existing.length > 0) {
    return { success: false, error: 'Ya existe un cliente con ese documento en este tenant' };
  }

  const [row] = await db
    .insert(clientes)
    .values({
      ...data,
      lineaCredito: String(data.lineaCredito),
      lineaCreditoPen: String(data.lineaCreditoPen),
      tenantId: tenant.id,
      createdBy: user.id,
    })
    .returning({ id: clientes.id });

  // Sincronizar creditosCliente para que el módulo CxC refleje la línea de crédito
  if (data.lineaCredito > 0 || data.lineaCreditoPen > 0) {
    await db
      .insert(creditosCliente)
      .values({
        clienteId: row.id,
        tenantId: tenant.id,
        lineaCredito: String(data.lineaCredito),
        moneda: 'USD',
        plazoDias: plazoToDias(data.plazoCredito),
        lineaCreditoPen: String(data.lineaCreditoPen),
        plazoDiasPen: plazoToDias(data.plazoCreditoPen),
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: creditosCliente.clienteId,
        set: {
          lineaCredito: String(data.lineaCredito),
          moneda: 'USD',
          plazoDias: plazoToDias(data.plazoCredito),
          lineaCreditoPen: String(data.lineaCreditoPen),
          plazoDiasPen: plazoToDias(data.plazoCreditoPen),
          updatedBy: user.id,
          updatedAt: new Date(),
        },
      });
  }

  revalidatePath(`/${tenant.slug}/clientes`);
  return { success: true, data: { id: row.id } };
}

export async function actualizarCliente(
  clienteId: string,
  input: ClienteInput
): Promise<ActionResult> {
  const parsed = clienteSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { tenant, user } = await requirePermission('clientes.editar');
  const data = parsed.data;

  await db
    .update(clientes)
    .set({
      ...data,
      lineaCredito: String(data.lineaCredito),
      lineaCreditoPen: String(data.lineaCreditoPen),
      updatedAt: new Date(),
    })
    .where(and(eq(clientes.id, clienteId), eq(clientes.tenantId, tenant.id)));

  // Sincronizar creditosCliente con los nuevos valores de crédito
  await db
    .insert(creditosCliente)
    .values({
      clienteId,
      tenantId: tenant.id,
      lineaCredito: String(data.lineaCredito),
      moneda: 'USD',
      plazoDias: plazoToDias(data.plazoCredito),
      lineaCreditoPen: String(data.lineaCreditoPen),
      plazoDiasPen: plazoToDias(data.plazoCreditoPen),
      updatedBy: user.id,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: creditosCliente.clienteId,
      set: {
        lineaCredito: String(data.lineaCredito),
        moneda: 'USD',
        plazoDias: plazoToDias(data.plazoCredito),
        lineaCreditoPen: String(data.lineaCreditoPen),
        plazoDiasPen: plazoToDias(data.plazoCreditoPen),
        updatedBy: user.id,
        updatedAt: new Date(),
      },
    });

  revalidatePath(`/${tenant.slug}/clientes`);
  revalidatePath(`/${tenant.slug}/clientes/${clienteId}`);
  revalidatePath(`/${tenant.slug}/credito`);
  return { success: true, data: undefined };
}

export async function cambiarEstadoCliente(
  clienteId: string,
  estado: 'activo' | 'inactivo' | 'bloqueado'
): Promise<ActionResult> {
  const { tenant } = await requirePermission('clientes.editar');

  await db
    .update(clientes)
    .set({ estado, updatedAt: new Date() })
    .where(and(eq(clientes.id, clienteId), eq(clientes.tenantId, tenant.id)));

  revalidatePath(`/${tenant.slug}/clientes`);
  revalidatePath(`/${tenant.slug}/clientes/${clienteId}`);
  return { success: true, data: undefined };
}

export type ImpactoEliminacionCliente = {
  cotizaciones: { doc: string; estado: string }[];
  ordenes: { doc: string; estado: string }[];
  facturas: { doc: string; estado: string; sunat: boolean }[];
  notas: { doc: string; estado: string; sunat: boolean }[];
  guias: { doc: string; estado: string; sunat: boolean }[];
};

/** Documentos que se eliminarían junto con el cliente (para mostrar en el diálogo). */
export async function obtenerImpactoEliminacion(
  clienteId: string
): Promise<ActionResult<ImpactoEliminacionCliente>> {
  const { tenant } = await requirePermission('clientes.eliminar');

  const facts = await db
    .select({
      id: facturas.id,
      numeroCompleto: facturas.numeroCompleto,
      serie: facturas.serie,
      numero: facturas.numero,
      estado: facturas.estado,
      estadoSunat: facturas.estadoSunat,
    })
    .from(facturas)
    .where(and(eq(facturas.tenantId, tenant.id), eq(facturas.clienteId, clienteId)));

  const factIds = facts.map((f) => f.id);
  const notaCond = factIds.length
    ? or(
        eq(notasCreditoDebito.clienteId, clienteId),
        inArray(notasCreditoDebito.documentoOrigenId, factIds)
      )
    : eq(notasCreditoDebito.clienteId, clienteId);

  const [cots, nots, gus, ocs] = await Promise.all([
    db
      .select({
        numeroCompleto: cotizaciones.numeroCompleto,
        correlativo: cotizaciones.numeroCorrelativo,
        estado: cotizaciones.estado,
      })
      .from(cotizaciones)
      .where(and(eq(cotizaciones.tenantId, tenant.id), eq(cotizaciones.clienteId, clienteId))),
    db
      .select({
        numeroCompleto: notasCreditoDebito.numeroCompleto,
        serie: notasCreditoDebito.serie,
        numero: notasCreditoDebito.numero,
        estado: notasCreditoDebito.estado,
        estadoSunat: notasCreditoDebito.estadoSunat,
      })
      .from(notasCreditoDebito)
      .where(and(eq(notasCreditoDebito.tenantId, tenant.id), notaCond)),
    db
      .select({
        numeroCompleto: guiasRemision.numeroCompleto,
        serie: guiasRemision.serie,
        numero: guiasRemision.numero,
        estado: guiasRemision.estado,
        estadoSunat: guiasRemision.estadoSunat,
      })
      .from(guiasRemision)
      .where(
        and(
          eq(guiasRemision.tenantId, tenant.id),
          or(eq(guiasRemision.remitenteId, clienteId), eq(guiasRemision.destinatarioId, clienteId))
        )
      ),
    db
      .select({ numero: ordenesCompra.numero, estado: ordenesCompra.estado })
      .from(ordenesCompra)
      .where(and(eq(ordenesCompra.tenantId, tenant.id), eq(ordenesCompra.proveedorId, clienteId))),
  ]);

  const num = (completo: string | null, serie: string, numero: number) =>
    completo ?? `${serie}-${numero}`;

  return {
    success: true,
    data: {
      cotizaciones: cots.map((c) => ({
        doc: c.numeroCompleto ?? `COT-${c.correlativo}`,
        estado: c.estado,
      })),
      ordenes: ocs.map((o) => ({ doc: o.numero, estado: o.estado })),
      facturas: facts.map((f) => ({
        doc: num(f.numeroCompleto, f.serie, f.numero),
        estado: f.estado,
        sunat: f.estadoSunat !== 'sin_enviar',
      })),
      notas: nots.map((n) => ({
        doc: num(n.numeroCompleto, n.serie, n.numero),
        estado: n.estado,
        sunat: n.estadoSunat !== 'sin_enviar',
      })),
      guias: gus.map((g) => ({
        doc: num(g.numeroCompleto, g.serie, g.numero),
        estado: g.estado,
        sunat: g.estadoSunat !== 'sin_enviar',
      })),
    },
  };
}

/**
 * Elimina el cliente y TODOS sus documentos ligados en una transacción:
 * pagos → NC/ND → facturas → guías → OC → cotizaciones → cliente.
 * Los comprobantes informados a SUNAT siguen existiendo en SUNAT;
 * solo se pierde el registro local (el diálogo lo advierte).
 */
export async function eliminarCliente(clienteId: string): Promise<ActionResult> {
  const { tenant } = await requirePermission('clientes.eliminar');

  const [existente] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(and(eq(clientes.id, clienteId), eq(clientes.tenantId, tenant.id)));

  if (!existente) return { success: false, error: 'Cliente no encontrado' };

  try {
    await db.transaction(async (tx) => {
      const cotIds = (
        await tx
          .select({ id: cotizaciones.id })
          .from(cotizaciones)
          .where(and(eq(cotizaciones.tenantId, tenant.id), eq(cotizaciones.clienteId, clienteId)))
      ).map((r) => r.id);

      const factIds = (
        await tx
          .select({ id: facturas.id })
          .from(facturas)
          .where(and(eq(facturas.tenantId, tenant.id), eq(facturas.clienteId, clienteId)))
      ).map((r) => r.id);

      const guiaIds = (
        await tx
          .select({ id: guiasRemision.id })
          .from(guiasRemision)
          .where(
            and(
              eq(guiasRemision.tenantId, tenant.id),
              or(
                eq(guiasRemision.remitenteId, clienteId),
                eq(guiasRemision.destinatarioId, clienteId)
              )
            )
          )
      ).map((r) => r.id);

      if (factIds.length) {
        await tx.delete(pagos).where(inArray(pagos.facturaId, factIds));
      }

      const notaCond = factIds.length
        ? or(
            eq(notasCreditoDebito.clienteId, clienteId),
            inArray(notasCreditoDebito.documentoOrigenId, factIds)
          )
        : eq(notasCreditoDebito.clienteId, clienteId);
      await tx
        .delete(notasCreditoDebito)
        .where(and(eq(notasCreditoDebito.tenantId, tenant.id), notaCond));

      if (factIds.length) {
        await tx.delete(facturas).where(inArray(facturas.id, factIds));
      }
      if (guiaIds.length) {
        await tx.delete(guiasRemision).where(inArray(guiasRemision.id, guiaIds));
      }

      const ocCond = cotIds.length
        ? or(
            eq(ordenesCompra.proveedorId, clienteId),
            inArray(ordenesCompra.cotizacionOrigenId, cotIds)
          )
        : eq(ordenesCompra.proveedorId, clienteId);
      await tx.delete(ordenesCompra).where(and(eq(ordenesCompra.tenantId, tenant.id), ocCond));

      if (cotIds.length) {
        await tx.delete(cotizaciones).where(inArray(cotizaciones.id, cotIds));
      }

      await tx
        .delete(clientes)
        .where(and(eq(clientes.id, clienteId), eq(clientes.tenantId, tenant.id)));
    });
  } catch (e) {
    return {
      success: false,
      error: `No se pudo eliminar: ${e instanceof Error ? e.message : 'error en la transacción'}`,
    };
  }

  for (const ruta of ['clientes', 'cotizaciones', 'facturas', 'guias', 'ordenes', 'credito']) {
    revalidatePath(`/${tenant.slug}/${ruta}`);
  }
  return { success: true, data: undefined };
}

export async function buscarClientes(q: string) {
  const { tenant } = await requirePermission('clientes.ver');

  if (q.length < 2) return [];

  return db
    .select({
      id: clientes.id,
      tipoDocumento: clientes.tipoDocumento,
      numeroDocumento: clientes.numeroDocumento,
      razonSocial: clientes.razonSocial,
      nombres: clientes.nombres,
      apellidoPaterno: clientes.apellidoPaterno,
      apellidoMaterno: clientes.apellidoMaterno,
      email: clientes.email,
      estado: clientes.estado,
    })
    .from(clientes)
    .where(
      and(
        eq(clientes.tenantId, tenant.id),
        or(
          sql`clientes.search_vector @@ plainto_tsquery('spanish', ${q})`,
          ilike(clientes.numeroDocumento, `%${q}%`)
        )
      )
    )
    .limit(20);
}

// --- Direcciones ---

export async function agregarDireccion(
  clienteId: string,
  input: DireccionClienteInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = direccionClienteSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { tenant } = await requirePermission('clientes.editar');

  const [row] = await db
    .insert(direccionesCliente)
    .values({ ...parsed.data, clienteId, tenantId: tenant.id })
    .returning({ id: direccionesCliente.id });

  revalidatePath(`/${tenant.slug}/clientes/${clienteId}`);
  return { success: true, data: { id: row.id } };
}

export async function eliminarDireccion(
  clienteId: string,
  direccionId: string
): Promise<ActionResult> {
  const { tenant } = await requirePermission('clientes.editar');

  await db
    .delete(direccionesCliente)
    .where(
      and(
        eq(direccionesCliente.id, direccionId),
        eq(direccionesCliente.clienteId, clienteId),
        eq(direccionesCliente.tenantId, tenant.id)
      )
    );

  revalidatePath(`/${tenant.slug}/clientes/${clienteId}`);
  return { success: true, data: undefined };
}

// --- Contactos ---

export async function agregarContacto(
  clienteId: string,
  input: ContactoClienteInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = contactoClienteSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { tenant } = await requirePermission('clientes.editar');

  const [row] = await db
    .insert(contactosCliente)
    .values({ ...parsed.data, clienteId, tenantId: tenant.id })
    .returning({ id: contactosCliente.id });

  revalidatePath(`/${tenant.slug}/clientes/${clienteId}`);
  return { success: true, data: { id: row.id } };
}

export async function eliminarContacto(
  clienteId: string,
  contactoId: string
): Promise<ActionResult> {
  const { tenant } = await requirePermission('clientes.editar');

  await db
    .delete(contactosCliente)
    .where(
      and(
        eq(contactosCliente.id, contactoId),
        eq(contactosCliente.clienteId, clienteId),
        eq(contactosCliente.tenantId, tenant.id)
      )
    );

  revalidatePath(`/${tenant.slug}/clientes/${clienteId}`);
  return { success: true, data: undefined };
}
