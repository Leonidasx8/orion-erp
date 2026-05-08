/**
 * Preview B.7 ajuste manual — sin auth, mock data. Solo dev.
 */
import { notFound } from 'next/navigation';
import type { Tenant } from '@/lib/db/schema';
import { TenantSidebar } from '@/components/shared/TenantSidebar';
import { TenantHeader } from '@/components/shared/TenantHeader';
import { AjusteManualForm } from '@/components/modules/inventario/AjusteManualForm';
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

export default function PreviewAjustePage() {
  if (process.env.NODE_ENV !== 'development') notFound();

  const tenant = MOCK_TENANT;

  return (
    <div
      className={`grid h-screen min-h-0 ${tenantThemeClass(tenant.slug)}`}
      style={{ gridTemplateColumns: '240px 1fr', gridTemplateRows: '56px 1fr' }}
    >
      <TenantSidebar tenant={tenant} userName="Lucas Escrivá" userRole="Superadmin" />
      <TenantHeader
        tenant={tenant}
        userName="Lucas Escrivá"
        crumbs={[
          { label: 'Idex', href: `/${tenant.slug}` },
          { label: 'Inventario', href: `/${tenant.slug}/inventario` },
          { label: 'TER-50AWG-1/4', href: `/${tenant.slug}/inventario/prod-demo` },
          { label: 'Ajuste manual' },
        ]}
      />
      <main className="col-start-2 row-start-2 overflow-auto bg-orion-bg-subtle p-6">
        <AjusteManualForm
          tenantSlug={tenant.slug}
          producto={{
            id: '00000000-0000-0000-0000-000000000099',
            codigo: 'TER-50AWG-1/4',
            nombre: 'Terminal compresión 1 hueco 50 AWG agujero ¼"',
            unidadMedida: 'NIU',
            stockActual: 3,
            costoPromedio: 0.1289,
          }}
        />
      </main>
    </div>
  );
}
