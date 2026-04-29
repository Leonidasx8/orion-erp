import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { roles, rolPermisos, tenantMembers } from '@/lib/db/schema';
import { getEnforcer, reloadPolicy } from '.';

/**
 * Reescribe todas las policies de Casbin para un tenant a partir del estado de la DB.
 * Llamar después de cambios en roles, rol_permisos o tenant_members.
 */
export async function syncTenantToCasbin(tenantId: string): Promise<void> {
  const e = await getEnforcer();

  // Borrar policies y groupings del tenant
  await e.deleteRole(tenantId);
  const policies = await e.getFilteredPolicy(1, tenantId);
  for (const p of policies) {
    await e.removePolicy(...(p as [string, string, string]));
  }

  // Policies: rol_id → permiso_codigo dentro del tenant (p, rol_id, tenant_id, permiso)
  const rolesPerms = await db
    .select({
      rolId: roles.id,
      tenantId: roles.tenantId,
      permisoCodigo: rolPermisos.permisoCodigo,
    })
    .from(rolPermisos)
    .innerJoin(roles, eq(rolPermisos.rolId, roles.id))
    .where(eq(roles.tenantId, tenantId));

  for (const rp of rolesPerms) {
    await e.addPolicy(rp.rolId, rp.tenantId!, rp.permisoCodigo);
  }

  // Groupings: user_id → rol_id dentro del tenant (g, user_id, rol_id, tenant_id)
  const members = await db
    .select({
      userId: tenantMembers.userId,
      rolId: roles.id,
    })
    .from(tenantMembers)
    .innerJoin(
      roles,
      and(eq(roles.tenantId, tenantMembers.tenantId), eq(roles.nombre, tenantMembers.rol))
    )
    .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.estado, 'activo')));

  for (const m of members) {
    await e.addGroupingPolicy(m.userId, m.rolId, tenantId);
  }

  await e.savePolicy();
  await reloadPolicy();
}
