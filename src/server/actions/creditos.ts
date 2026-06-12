'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { creditosCliente, clientes } from '@/lib/db/schema';
import { OtorgarCreditoSchema, type OtorgarCreditoInput } from '@/lib/schemas/credito';

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

// ─── otorgarCredito ───────────────────────────────────────────────────────────

export async function otorgarCredito(
  input: OtorgarCreditoInput
): Promise<ActionResult<{ clienteId: string }>> {
  try {
    const { user, tenant } = await requirePermission('credito.otorgar');

    const parsed = OtorgarCreditoSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
    }

    const data = parsed.data;

    // Verificar que el cliente pertenece al tenant
    const [cliente] = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(and(eq(clientes.id, data.clienteId), eq(clientes.tenantId, tenant.id)));

    if (!cliente) {
      return { success: false, error: 'Cliente no encontrado' };
    }

    // Upsert: si ya tiene línea de crédito, actualiza; si no, inserta
    await db
      .insert(creditosCliente)
      .values({
        clienteId: data.clienteId,
        tenantId: tenant.id,
        lineaCredito: String(data.lineaCredito),
        moneda: 'USD',
        plazoDias: data.plazoDias,
        lineaCreditoPen: String(data.lineaCreditoPen),
        plazoDiasPen: data.plazoDiasPen,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: creditosCliente.clienteId,
        set: {
          lineaCredito: String(data.lineaCredito),
          moneda: 'USD',
          plazoDias: data.plazoDias,
          lineaCreditoPen: String(data.lineaCreditoPen),
          plazoDiasPen: data.plazoDiasPen,
          updatedBy: user.id,
          updatedAt: new Date(),
        },
      });

    revalidatePath(`/${tenant.slug}/credito`);
    revalidatePath(`/${tenant.slug}/credito/${data.clienteId}`);
    return { success: true, data: { clienteId: data.clienteId } };
  } catch (err) {
    console.error('[creditos] otorgarCredito error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error interno' };
  }
}

// ─── bloquearCredito ──────────────────────────────────────────────────────────

export async function bloquearCredito(clienteId: string, motivo: string): Promise<ActionResult> {
  try {
    const { user, tenant } = await requirePermission('credito.otorgar');

    // Verificar que el cliente existe en el tenant
    const [cliente] = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(and(eq(clientes.id, clienteId), eq(clientes.tenantId, tenant.id)));

    if (!cliente) {
      return { success: false, error: 'Cliente no encontrado' };
    }

    await db
      .update(creditosCliente)
      .set({
        bloqueado: true,
        motivoBloqueo: motivo,
        bloqueadoPor: user.id,
        bloqueadoAt: new Date(),
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(
        and(eq(creditosCliente.clienteId, clienteId), eq(creditosCliente.tenantId, tenant.id))
      );

    revalidatePath(`/${tenant.slug}/credito`);
    revalidatePath(`/${tenant.slug}/credito/${clienteId}`);
    return { success: true, data: undefined };
  } catch (err) {
    console.error('[creditos] bloquearCredito error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error interno' };
  }
}

// ─── desbloquearCredito ───────────────────────────────────────────────────────

export async function desbloquearCredito(clienteId: string): Promise<ActionResult> {
  try {
    const { user, tenant } = await requirePermission('credito.otorgar');

    // Verificar que el cliente existe en el tenant
    const [cliente] = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(and(eq(clientes.id, clienteId), eq(clientes.tenantId, tenant.id)));

    if (!cliente) {
      return { success: false, error: 'Cliente no encontrado' };
    }

    await db
      .update(creditosCliente)
      .set({
        bloqueado: false,
        motivoBloqueo: null,
        bloqueadoPor: null,
        bloqueadoAt: null,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(
        and(eq(creditosCliente.clienteId, clienteId), eq(creditosCliente.tenantId, tenant.id))
      );

    revalidatePath(`/${tenant.slug}/credito`);
    revalidatePath(`/${tenant.slug}/credito/${clienteId}`);
    return { success: true, data: undefined };
  } catch (err) {
    console.error('[creditos] desbloquearCredito error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error interno' };
  }
}

// ─── bloquearCreditoPen ───────────────────────────────────────────────────────

export async function bloquearCreditoPen(clienteId: string, motivo: string): Promise<ActionResult> {
  try {
    const { user, tenant } = await requirePermission('credito.otorgar');

    const [cliente] = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(and(eq(clientes.id, clienteId), eq(clientes.tenantId, tenant.id)));

    if (!cliente) {
      return { success: false, error: 'Cliente no encontrado' };
    }

    await db
      .update(creditosCliente)
      .set({
        bloqueadoPen: true,
        motivoBloqueopPen: motivo,
        bloqueadoPenPor: user.id,
        bloqueadoPenAt: new Date(),
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(
        and(eq(creditosCliente.clienteId, clienteId), eq(creditosCliente.tenantId, tenant.id))
      );

    revalidatePath(`/${tenant.slug}/credito`);
    revalidatePath(`/${tenant.slug}/credito/${clienteId}`);
    return { success: true, data: undefined };
  } catch (err) {
    console.error('[creditos] bloquearCreditoPen error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error interno' };
  }
}

// ─── desbloquearCreditoPen ────────────────────────────────────────────────────

export async function desbloquearCreditoPen(clienteId: string): Promise<ActionResult> {
  try {
    const { user, tenant } = await requirePermission('credito.otorgar');

    const [cliente] = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(and(eq(clientes.id, clienteId), eq(clientes.tenantId, tenant.id)));

    if (!cliente) {
      return { success: false, error: 'Cliente no encontrado' };
    }

    await db
      .update(creditosCliente)
      .set({
        bloqueadoPen: false,
        motivoBloqueopPen: null,
        bloqueadoPenPor: null,
        bloqueadoPenAt: null,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(
        and(eq(creditosCliente.clienteId, clienteId), eq(creditosCliente.tenantId, tenant.id))
      );

    revalidatePath(`/${tenant.slug}/credito`);
    revalidatePath(`/${tenant.slug}/credito/${clienteId}`);
    return { success: true, data: undefined };
  } catch (err) {
    console.error('[creditos] desbloquearCreditoPen error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error interno' };
  }
}
