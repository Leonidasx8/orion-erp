/**
 * Ruta de preview del Sistema de Diseño V1 — sin auth, mock tenant.
 * Sirve para QA visual y screenshots durante el desarrollo del design system.
 * Devuelve 404 fuera de NODE_ENV=development.
 */
import { notFound } from 'next/navigation';
import type { Tenant } from '@/lib/db/schema';
import { TenantSidebar } from '@/components/shared/TenantSidebar';
import { TenantHeader } from '@/components/shared/TenantHeader';
import { DashboardContent } from '@/components/modules/dashboard/DashboardContent';
import { tenantThemeClass } from '@/lib/design/tenant-theme';

const MOCK_TENANT: Tenant = {
  id: '00000000-0000-0000-0000-000000000001',
  slug: 'idex',
  razonSocial: 'IDEX SAC',
  ruc: '20614847370',
  direccionFiscal: null,
  ubigeo: null,
  logoUrl: null,
  colorPrimario: '#0070f3',
  colorSecundario: '#7928ca',
  faviconUrl: null,
  plan: 'starter',
  estado: 'activo',
  configSunat: null,
  fechaAlta: new Date(),
  fechaBaja: null,
  createdBy: null,
};

export default function PreviewDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ tenant?: string }>;
}) {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }
  void searchParams;

  const tenant = MOCK_TENANT;
  const userName = 'Lucas Escrivá';
  const userRole = 'Superadmin';

  return (
    <div
      className={`grid h-screen min-h-0 ${tenantThemeClass(tenant.slug)}`}
      style={{ gridTemplateColumns: '240px 1fr', gridTemplateRows: '56px 1fr' }}
    >
      <TenantSidebar tenant={tenant} userName={userName} userRole={userRole} />
      <TenantHeader
        tenant={tenant}
        userName={userName}
        crumbs={[{ label: 'Idex', href: `/${tenant.slug}` }, { label: 'Dashboard' }]}
      />
      <main className="col-start-2 row-start-2 overflow-auto bg-orion-bg-subtle p-6">
        <DashboardContent tenant={tenant} greetName="Lucas" />
      </main>
    </div>
  );
}
