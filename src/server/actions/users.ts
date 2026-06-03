'use server';

import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/require-permission';
import { invitarUsuarioMagicLink } from '@/lib/auth/invite';
import { syncTenantToCasbin } from '@/lib/auth/casbin/sync';
import { db } from '@/lib/db/client';
import { tenantMembers, roles } from '@/lib/db/schema';

const InvitarSchema = z.object({
  email: z.string().email(),
  nombre: z.string().min(2),
  rolNombre: z.string().min(1),
});

export async function invitarUsuario(input: z.infer<typeof InvitarSchema>) {
  const data = InvitarSchema.parse(input);
  const { user, tenant } = await requirePermission('admin.usuarios.invitar');

  const [rol] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.tenantId, tenant.id), eq(roles.nombre, data.rolNombre)))
    .limit(1);

  if (!rol) return { success: false as const, error: 'role-not-found' };

  const newUser = await invitarUsuarioMagicLink(data.email, data.nombre);

  await db.insert(tenantMembers).values({
    userId: newUser.id,
    tenantId: tenant.id,
    rol: data.rolNombre,
    estado: 'pendiente',
    invitadoPor: user.id,
  });

  await syncTenantToCasbin(tenant.id);
  revalidatePath(`/${tenant.slug}/admin/usuarios`);
  return { success: true as const, data: null };
}

export async function cambiarRol(targetUserId: string, nuevoRol: string) {
  const { tenant } = await requirePermission('admin.roles.editar');

  await db
    .update(tenantMembers)
    .set({ rol: nuevoRol })
    .where(and(eq(tenantMembers.userId, targetUserId), eq(tenantMembers.tenantId, tenant.id)));

  await syncTenantToCasbin(tenant.id);
  revalidatePath(`/${tenant.slug}/admin/usuarios`);
  return { success: true as const, data: null };
}

export async function suspenderUsuario(targetUserId: string) {
  const { tenant } = await requirePermission('admin.usuarios.suspender');

  await db
    .update(tenantMembers)
    .set({ estado: 'suspendido' })
    .where(and(eq(tenantMembers.userId, targetUserId), eq(tenantMembers.tenantId, tenant.id)));

  await syncTenantToCasbin(tenant.id);
  revalidatePath(`/${tenant.slug}/admin/usuarios`);
  return { success: true as const, data: null };
}

export async function reactivarUsuario(targetUserId: string) {
  const { tenant } = await requirePermission('admin.usuarios.suspender');

  await db
    .update(tenantMembers)
    .set({ estado: 'activo' })
    .where(and(eq(tenantMembers.userId, targetUserId), eq(tenantMembers.tenantId, tenant.id)));

  await syncTenantToCasbin(tenant.id);
  revalidatePath(`/${tenant.slug}/admin/usuarios`);
  return { success: true as const, data: null };
}
