/**
 * Preview B.6 lista órdenes — sin auth, mock data. Solo dev.
 */
import { notFound } from 'next/navigation';
import type { Tenant } from '@/lib/db/schema';
import { TenantSidebar } from '@/components/shared/TenantSidebar';
import { TenantHeader } from '@/components/shared/TenantHeader';
import { OrdenesList, type OrdenRow } from '@/components/modules/ordenes/OrdenesList';
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
  web: null,
  telefono: null,
  contactoEmail: null,
  bancoNombre: null,
  bancoCuenta: null,
  bancoCci: null,
  bancoDetraccionCuenta: null,
};

const MOCK_ROWS: OrdenRow[] = [
  {
    id: '1',
    numero: 'OC-2026-00045',
    proveedor: 'IMPORTACIONES SUR EIRL',
    estado: 'recibida_parcial',
    fechaEmision: '02 may',
    fechaEntrega: '20 may',
    lineas: 8,
    total: 12480.5,
    moneda: 'USD',
    recibidoPct: 62,
  },
  {
    id: '2',
    numero: 'OC-2026-00044',
    proveedor: 'TRANSFORMADORES DEL PERÚ SAC',
    estado: 'aprobada',
    fechaEmision: '01 may',
    fechaEntrega: '18 may',
    lineas: 4,
    total: 8200,
    moneda: 'USD',
    recibidoPct: 0,
  },
  {
    id: '3',
    numero: 'OC-2026-00043',
    proveedor: 'CABLES Y CONDUCTORES SA',
    estado: 'recibida_total',
    fechaEmision: '28 abr',
    fechaEntrega: '05 may',
    lineas: 12,
    total: 4180.2,
    moneda: 'USD',
    recibidoPct: 100,
  },
  {
    id: '4',
    numero: 'OC-2026-00042',
    proveedor: 'ELECTRO IMPORTACIONES SAC',
    estado: 'enviada',
    fechaEmision: '27 abr',
    fechaEntrega: '15 may',
    lineas: 6,
    total: 6750,
    moneda: 'USD',
    recibidoPct: 0,
  },
  {
    id: '5',
    numero: 'OC-2026-00041',
    proveedor: 'TRANSFORMADORES DEL PERÚ SAC',
    estado: 'borrador',
    fechaEmision: '26 abr',
    fechaEntrega: null,
    lineas: 3,
    total: 2400,
    moneda: 'USD',
    recibidoPct: 0,
  },
  {
    id: '6',
    numero: 'OC-2026-00040',
    proveedor: 'IMPORTACIONES SUR EIRL',
    estado: 'cerrada',
    fechaEmision: '15 abr',
    fechaEntrega: '25 abr',
    lineas: 22,
    total: 24800,
    moneda: 'USD',
    recibidoPct: 100,
  },
];

export default function PreviewOrdenesPage() {
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
        crumbs={[{ label: 'Idex', href: `/${tenant.slug}` }, { label: 'Órdenes de compra' }]}
      />
      <main className="col-start-2 row-start-2 overflow-auto bg-orion-bg-subtle p-6">
        <OrdenesList
          tenantSlug={tenant.slug}
          rows={MOCK_ROWS}
          counts={{
            total: 28,
            borrador: 3,
            enviada: 5,
            aprobada: 4,
            recibida_parcial: 6,
            recibida_total: 7,
            cerrada: 3,
          }}
          pendienteUsd={48230}
          canCreate
          filtroActivo="todas"
          page={1}
          pageSize={6}
        />
      </main>
    </div>
  );
}
