import Image from 'next/image';
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

const TENANT_LOGOS: Record<string, string> = {
  idex: '/idex-logo.png',
  agroalves: '/agroalves-logo.png',
};

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

  const logoSrc = TENANT_LOGOS[tenant.slug];
  const companyShortName = tenant.razonSocial.split(/\s+/)[0];

  return (
    <div className={`flex min-h-screen bg-orion-bg-subtle ${tenantThemeClass(tenant.slug)}`}>
      {/* Mobile top bar — visible only below lg */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-12 items-center gap-3 border-b border-orion-border bg-orion-bg px-4 lg:hidden">
        {logoSrc ? (
          <Image
            src={logoSrc}
            alt={tenant.razonSocial}
            width={80}
            height={32}
            className="h-8 w-auto max-w-[120px] object-contain"
          />
        ) : (
          <>
            <span className="grid h-6 w-6 place-items-center rounded-md bg-tenant-accent text-[10px] font-bold text-white">
              {companyShortName.slice(0, 2).toUpperCase()}
            </span>
            <span className="text-sm font-semibold text-orion-fg">{companyShortName}</span>
          </>
        )}
      </div>

      {/* Sidebar — hidden on mobile, visible on lg+ */}
      <TenantSidebar tenant={tenant} userName={userName} userRole={userRol} />

      {/* Right column: topbar + content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TenantHeader tenant={tenant} userName={userName} />
        <PermissionsBootstrap permisos={userPermisos.map((p) => p.codigo)} />
        <main className="flex-1 overflow-auto p-4 pt-16 lg:p-6 lg:pt-6">{children}</main>
      </div>
    </div>
  );
}
