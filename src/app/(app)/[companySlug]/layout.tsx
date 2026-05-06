import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { createSSRClient } from '@/lib/supabase/server';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { db } from '@/lib/db/client';
import { tenantMembers, roles, rolPermisos } from '@/lib/db/schema';
import { TenantHeader } from '@/components/shared/TenantHeader';
import { TenantSidebar } from '@/components/shared/TenantSidebar';
import { PermissionsBootstrap } from '@/components/shared/PermissionsBootstrap';
import { tenantThemeClass } from '@/lib/design/tenant-theme';

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

  let tenant;
  try {
    tenant = await getCurrentTenant();
  } catch {
    notFound();
  }

  if (tenant.slug !== companySlug) notFound();

  const supabase = await createSSRClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userMember = user
    ? await db
        .select({ rol: tenantMembers.rol })
        .from(tenantMembers)
        .where(and(eq(tenantMembers.userId, user.id), eq(tenantMembers.tenantId, tenant.id)))
        .limit(1)
    : [];
  const userRol = userMember[0]?.rol;

  const userPermisos = user
    ? await db
        .selectDistinct({ codigo: rolPermisos.permisoCodigo })
        .from(tenantMembers)
        .innerJoin(
          roles,
          and(eq(roles.tenantId, tenantMembers.tenantId), eq(roles.nombre, tenantMembers.rol))
        )
        .innerJoin(rolPermisos, eq(rolPermisos.rolId, roles.id))
        .where(and(eq(tenantMembers.userId, user.id), eq(tenantMembers.tenantId, tenant.id)))
    : [];

  const userName = (user?.user_metadata?.nombre as string | undefined) ?? user?.email ?? undefined;

  return (
    <div
      className={`grid h-screen min-h-0 ${tenantThemeClass(tenant.slug)}`}
      style={{ gridTemplateColumns: '240px 1fr', gridTemplateRows: '56px 1fr' }}
    >
      <TenantSidebar tenant={tenant} userName={userName} userRole={userRol} />
      <TenantHeader tenant={tenant} userName={userName} />
      <PermissionsBootstrap permisos={userPermisos.map((p) => p.codigo)} />
      <main className="col-start-2 row-start-2 overflow-auto bg-orion-bg-subtle p-6">
        {children}
      </main>
    </div>
  );
}
