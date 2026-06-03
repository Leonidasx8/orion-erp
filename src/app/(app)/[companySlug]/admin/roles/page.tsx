import { eq, sql } from 'drizzle-orm';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { requirePermissionPage } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { roles, rolPermisos, permisosDefinidos } from '@/lib/db/schema';
import { RolesPageLayout } from '@/components/modules/admin/RolesPageLayout';
import { PageHead } from '@/components/shared/PageHead';

export const metadata = { title: 'Roles y permisos' };

export default async function RolesPage({ params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;
  await requirePermissionPage('admin.roles.ver', companySlug);
  const tenant = await getCurrentTenant();

  const [tenantRoles, allPermisos, userCountsRaw] = await Promise.all([
    db.select().from(roles).where(eq(roles.tenantId, tenant.id)).orderBy(roles.nombre),
    db.select().from(permisosDefinidos).orderBy(permisosDefinidos.modulo, permisosDefinidos.codigo),
    db.execute<{ rol: string; n: string }>(sql`
      SELECT rol, COUNT(*)::text AS n
      FROM tenant_members
      WHERE tenant_id = ${tenant.id}
      GROUP BY rol
    `),
  ]);

  const userCounts = userCountsRaw as { rol: string; n: string }[];
  const userCountMap = Object.fromEntries(userCounts.map((r) => [r.rol, parseInt(r.n, 10)]));

  const rolesWithPerms = await Promise.all(
    tenantRoles.map(async (rol) => {
      const perms = await db
        .select({ codigo: rolPermisos.permisoCodigo })
        .from(rolPermisos)
        .where(eq(rolPermisos.rolId, rol.id));
      return {
        rol,
        permisos: perms.map((p) => p.codigo),
        userCount: userCountMap[rol.nombre] ?? 0,
      };
    })
  );

  const totalUsuarios = Object.values(userCountMap).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5">
      <PageHead
        title="Roles y permisos"
        subtitle={`${tenantRoles.length} roles configurados · ${totalUsuarios} usuarios`}
      />
      <RolesPageLayout roles={rolesWithPerms} allPermisos={allPermisos} companySlug={companySlug} />
    </div>
  );
}
