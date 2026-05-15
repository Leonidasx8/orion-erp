/**
 * Preview B.5 lista cotizaciones — sin auth, mock data. Solo dev.
 */
import { notFound } from 'next/navigation';
import type { Tenant } from '@/lib/db/schema';
import { TenantSidebar } from '@/components/shared/TenantSidebar';
import { TenantHeader } from '@/components/shared/TenantHeader';
import {
  CotizacionesList,
  type CotizacionRow,
} from '@/components/modules/cotizaciones/CotizacionesList';
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

const MOCK_ROWS: CotizacionRow[] = [
  {
    id: '1',
    numero: 'COT-2026-00132',
    cliente: 'TECNOLOGÍA INDUSTRIAL SAC',
    estado: 'enviada',
    fechaEmision: '27 abr',
    fechaVencimiento: '30 abr',
    items: 8,
    total: 4218.4,
    moneda: 'USD',
    comercial: 'M. Quispe',
  },
  {
    id: '2',
    numero: 'COT-2026-00131',
    cliente: 'ELECTROANDES SA',
    estado: 'borrador',
    fechaEmision: '27 abr',
    fechaVencimiento: null,
    items: 12,
    total: 8412.5,
    moneda: 'USD',
    comercial: 'M. Quispe',
  },
  {
    id: '3',
    numero: 'COT-2026-00130',
    cliente: 'GRUPO MINERA CERRO VERDE',
    estado: 'aprobada',
    fechaEmision: '26 abr',
    fechaVencimiento: '10 may',
    items: 24,
    total: 22150.5,
    moneda: 'USD',
    comercial: 'L. Escrivá',
  },
  {
    id: '4',
    numero: 'COT-2026-00129',
    cliente: 'CONSTRUCTORA SUR EIRL',
    estado: 'enviada',
    fechaEmision: '25 abr',
    fechaVencimiento: '02 may',
    items: 5,
    total: 1840.2,
    moneda: 'USD',
    comercial: 'M. Quispe',
  },
  {
    id: '5',
    numero: 'COT-2026-00128',
    cliente: 'ELECTROMECÁNICA INDUSTRIAL SAC',
    estado: 'enviada',
    fechaEmision: '24 abr',
    fechaVencimiento: '01 may',
    items: 18,
    total: 12480.0,
    moneda: 'USD',
    comercial: 'A. Salinas',
  },
  {
    id: '6',
    numero: 'COT-2026-00127',
    cliente: 'TÉCNICA Y SERVICIOS SUR EIRL',
    estado: 'rechazada',
    fechaEmision: '24 abr',
    fechaVencimiento: null,
    items: 6,
    total: 3210.0,
    moneda: 'USD',
    comercial: 'A. Salinas',
  },
  {
    id: '7',
    numero: 'COT-2026-00126',
    cliente: 'INVERSIONES MARTÍNEZ',
    estado: 'vencida',
    fechaEmision: '15 abr',
    fechaVencimiento: '22 abr',
    items: 3,
    total: 890.0,
    moneda: 'USD',
    comercial: 'A. Salinas',
  },
  {
    id: '8',
    numero: 'COT-2026-00125',
    cliente: 'GRUPO MINERA CERRO VERDE',
    estado: 'convertida',
    fechaEmision: '12 abr',
    fechaVencimiento: null,
    items: 32,
    total: 38450.0,
    moneda: 'USD',
    comercial: 'L. Escrivá',
  },
  {
    id: '9',
    numero: 'COT-2026-00124',
    cliente: 'ELECTROANDES SA',
    estado: 'convertida',
    fechaEmision: '10 abr',
    fechaVencimiento: null,
    items: 14,
    total: 7820.5,
    moneda: 'USD',
    comercial: 'M. Quispe',
  },
];

export default function PreviewCotizacionesPage() {
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
        crumbs={[{ label: 'Idex', href: `/${tenant.slug}` }, { label: 'Cotizaciones' }]}
      />
      <main className="col-start-2 row-start-2 overflow-auto bg-orion-bg-subtle p-6">
        <CotizacionesList
          tenantSlug={tenant.slug}
          rows={MOCK_ROWS}
          counts={{
            total: 42,
            borrador: 5,
            enviada: 7,
            aprobada: 3,
            rechazada: 2,
            vencida: 1,
            convertida: 24,
          }}
          pipelineUsd={38412}
          canCreate
          filtroActivo="todas"
          page={1}
          pageSize={9}
        />
      </main>
    </div>
  );
}
