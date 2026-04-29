import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { createSSRClient } from '@/lib/supabase/server';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { db } from '@/lib/db/client';
import { tenantMembers, roles, rolPermisos } from '@/lib/db/schema';
import { TenantHeader } from '@/components/shared/TenantHeader';
import { TenantSidebar } from '@/components/shared/TenantSidebar';
import { PermissionsBootstrap } from '@/components/shared/PermissionsBootstrap';

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

  // Cargar permisos del usuario para este tenant (bootstrap del store cliente)
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

  return (
    <div className="flex min-h-screen">
      <TenantSidebar tenant={tenant} />
      <div className="flex flex-1 flex-col">
        <TenantHeader tenant={tenant} />
        <PermissionsBootstrap permisos={userPermisos.map((p) => p.codigo)} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
