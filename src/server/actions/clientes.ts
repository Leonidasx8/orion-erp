'use server';

import { and, eq, ilike, or, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import {
  clientes,
  direccionesCliente,
  contactosCliente,
  cotizaciones,
  facturas,
  notasCreditoDebito,
  guiasRemision,
  ordenesCompra,
} from '@/lib/db/schema';
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
      tenantId: tenant.id,
      createdBy: user.id,
    })
    .returning({ id: clientes.id });

  revalidatePath(`/${tenant.slug}/clientes`);
  return { success: true, data: { id: row.id } };
}

export async function actualizarCliente(
  clienteId: string,
  input: ClienteInput
): Promise<ActionResult> {
  const parsed = clienteSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { tenant } = await requirePermission('clientes.editar');
  const data = parsed.data;

  await db
    .update(clientes)
    .set({ ...data, lineaCredito: String(data.lineaCredito), updatedAt: new Date() })
    .where(and(eq(clientes.id, clienteId), eq(clientes.tenantId, tenant.id)));

  revalidatePath(`/${tenant.slug}/clientes`);
  revalidatePath(`/${tenant.slug}/clientes/${clienteId}`);
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

export async function eliminarCliente(clienteId: string): Promise<ActionResult> {
  const { tenant } = await requirePermission('clientes.eliminar');

  const [existente] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(and(eq(clientes.id, clienteId), eq(clientes.tenantId, tenant.id)));

  if (!existente) return { success: false, error: 'Cliente no encontrado' };

  const [enCotizaciones, enFacturas, enNotas, enGuias, enOrdenes] = await Promise.all([
    db
      .select({ id: cotizaciones.id })
      .from(cotizaciones)
      .where(eq(cotizaciones.clienteId, clienteId))
      .limit(1),
    db.select({ id: facturas.id }).from(facturas).where(eq(facturas.clienteId, clienteId)).limit(1),
    db
      .select({ id: notasCreditoDebito.id })
      .from(notasCreditoDebito)
      .where(eq(notasCreditoDebito.clienteId, clienteId))
      .limit(1),
    db
      .select({ id: guiasRemision.id })
      .from(guiasRemision)
      .where(
        or(eq(guiasRemision.remitenteId, clienteId), eq(guiasRemision.destinatarioId, clienteId))
      )
      .limit(1),
    db
      .select({ id: ordenesCompra.id })
      .from(ordenesCompra)
      .where(eq(ordenesCompra.proveedorId, clienteId))
      .limit(1),
  ]);

  const usos = [
    enCotizaciones.length > 0 && 'cotizaciones',
    enFacturas.length > 0 && 'facturas',
    enNotas.length > 0 && 'notas de crédito/débito',
    enGuias.length > 0 && 'guías de remisión',
    enOrdenes.length > 0 && 'órdenes de compra',
  ].filter(Boolean);

  if (usos.length > 0) {
    return {
      success: false,
      error: `No se puede eliminar: el cliente tiene ${usos.join(', ')} asociadas. Márcalo como inactivo en su lugar.`,
    };
  }

  await db
    .delete(clientes)
    .where(and(eq(clientes.id, clienteId), eq(clientes.tenantId, tenant.id)));

  revalidatePath(`/${tenant.slug}/clientes`);
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
