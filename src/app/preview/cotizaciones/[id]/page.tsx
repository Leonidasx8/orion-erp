/**
 * Preview B.5 detalle cotización — sin auth, mock data. Solo dev.
 */
import { notFound } from 'next/navigation';
import type { Tenant } from '@/lib/db/schema';
import { TenantSidebar } from '@/components/shared/TenantSidebar';
import { TenantHeader } from '@/components/shared/TenantHeader';
import {
  CotizacionDetalle,
  type CotizacionDetalleData,
} from '@/components/modules/cotizaciones/CotizacionDetalle';
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

const MOCK: CotizacionDetalleData = {
  id: '1',
  numero: 'COT-2026-00132',
  estado: 'enviada',
  cliente: 'TECNOLOGÍA INDUSTRIAL SAC',
  comercial: 'M. Quispe',
  fechaEmisionDisplay: '27 abr 2026',
  fechaVencimientoDisplay: '30 abr 2026',
  vencimientoTag: 'vence en 1 día',
  moneda: 'USD',
  tipoCambio: 3.785,
  items: [
    {
      id: 'it-1',
      sku: 'TX-4821',
      descripcion: 'Transformador trifásico 50 kVA · 220V/380V',
      cantidad: 2,
      precioUnitario: 1240.0,
      subtotal: 2480.0,
    },
    {
      id: 'it-2',
      sku: 'CB-1004',
      descripcion: 'Cable de cobre AWG #2 · 100m',
      cantidad: 4,
      precioUnitario: 124.5,
      subtotal: 498.0,
    },
    {
      id: 'it-3',
      sku: 'SW-2210',
      descripcion: 'Tablero de distribución modular 24 vías',
      cantidad: 1,
      precioUnitario: 612.4,
      subtotal: 612.4,
    },
    {
      id: 'it-4',
      sku: null,
      descripcion: 'Servicio de instalación y puesta en marcha',
      cantidad: 1,
      precioUnitario: 628.0,
      subtotal: 628.0,
    },
  ],
  totales: {
    subtotal: 4218.4,
    igv: 759.31,
    total: 4977.71,
  },
  terminos: {
    pago: '50% adelanto · 50% contra entrega',
    entrega: '15 días hábiles',
    validez: 'Hasta 30 abr 2026',
    observaciones: 'Incluye traslado a obra dentro de Lima Metropolitana.',
  },
  timeline: [
    { id: 't1', tipo: 'done', titulo: 'Cotización creada', meta: '27 abr 2026 · 09:42' },
    { id: 't2', tipo: 'active', titulo: 'Enviada al cliente', meta: '27 abr 2026 · 11:05' },
    { id: 't3', tipo: 'done', titulo: 'PDF abierto', meta: '27 abr 2026 · 14:33' },
  ],
  permissions: {
    aprobar: true,
    rechazar: true,
    duplicar: true,
    reenviar: true,
  },
};

export default function PreviewCotizacionDetallePage() {
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
          { label: 'Cotizaciones', href: `/${tenant.slug}/cotizaciones` },
          { label: MOCK.numero },
        ]}
      />
      <main className="col-start-2 row-start-2 overflow-auto bg-orion-bg-subtle p-6">
        <CotizacionDetalle data={MOCK} tenantSlug={tenant.slug} />
      </main>
    </div>
  );
}
