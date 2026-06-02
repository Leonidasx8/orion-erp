import Image from 'next/image';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { createSSRClient } from '@/lib/supabase/server';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { db } from '@/lib/db/client';
import { tenantMembers, roles, rolPermisos } from '@/lib/db/schema';
import { TenantHeader } from '@/components/shared/TenantHeader';
import { TenantSidebar } from '@/components/shared/TenantSidebar';
import { MobileTopBar } from '@/components/shared/MobileTopBar';
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

  const mobileLogo = logoSrc ? (
    <Image
      src={logoSrc}
      alt={tenant.razonSocial}
      width={80}
      height={28}
      className="h-7 w-auto max-w-[110px] object-contain"
    />
  ) : (
    <span className="text-sm font-semibold text-orion-fg">{companyShortName}</span>
  );

  return (
    <div className={`flex min-h-screen bg-orion-bg-subtle ${tenantThemeClass(tenant.slug)}`}>
      {/* Mobile: barra fija + drawer con sidebar */}
      <MobileTopBar
        logo={mobileLogo}
        sidebar={<TenantSidebar tenant={tenant} userName={userName} userRole={userRol} />}
      />

      {/* Sidebar — solo en lg+ */}
      <TenantSidebar tenant={tenant} userName={userName} userRole={userRol} />

      {/* Columna derecha: header + contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TenantHeader className="hidden lg:flex" tenant={tenant} userName={userName} />
        <PermissionsBootstrap permisos={userPermisos.map((p) => p.codigo)} />
        <main className="flex-1 overflow-auto p-4 pt-14 lg:p-6 lg:pt-6">{children}</main>
      </div>
    </div>
  );
}
