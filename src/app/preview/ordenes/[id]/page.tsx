/**
 * Preview B.6 detalle OC — sin auth, mock data. Solo dev.
 */
import { notFound } from 'next/navigation';
import type { Tenant } from '@/lib/db/schema';
import { TenantSidebar } from '@/components/shared/TenantSidebar';
import { TenantHeader } from '@/components/shared/TenantHeader';
import { OrdenDetalle, type OrdenDetalleData } from '@/components/modules/ordenes/OrdenDetalle';
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
  bancoCuentaUsd: null,
  bancoCciUsd: null,
  comercialNombre: null,
  comercialCargo: null,
  comercialTelefono: null,
};

const MOCK: OrdenDetalleData = {
  id: '1',
  numero: 'OC-2026-00045',
  estado: 'recibida_parcial',
  proveedor: 'IMPORTACIONES SUR EIRL',
  comprador: 'L. Escrivá',
  fechaEmisionDisplay: '02 may 2026',
  fechaEntregaDisplay: '20 may 2026',
  moneda: 'USD',
  tipoCambio: 3.785,
  lineas: [
    {
      id: 'l-1',
      sku: 'TX-4821',
      descripcion: 'Transformador trifásico 50 kVA · 220V/380V',
      cantidad: 4,
      cantidadRecibida: 4,
      precioUnitario: 1200,
      subtotal: 4800,
    },
    {
      id: 'l-2',
      sku: 'CB-1004',
      descripcion: 'Cable de cobre AWG #2 · 100m',
      cantidad: 20,
      cantidadRecibida: 12,
      precioUnitario: 120,
      subtotal: 2400,
    },
    {
      id: 'l-3',
      sku: 'SW-2210',
      descripcion: 'Tablero de distribución modular 24 vías',
      cantidad: 6,
      cantidadRecibida: 0,
      precioUnitario: 580,
      subtotal: 3480,
    },
    {
      id: 'l-4',
      sku: 'BK-0042',
      descripcion: 'Interruptor termomagnético 32A',
      cantidad: 30,
      cantidadRecibida: 12,
      precioUnitario: 60,
      subtotal: 1800,
    },
  ],
  totales: {
    subtotal: 12480.5,
    igv: 2246.49,
    total: 14726.99,
  },
  terminos: {
    pago: '50% adelanto · 50% contra entrega',
    entrega: 'Almacén Lurín — Av. Industrial 1024',
    observaciones: 'Coordinar con almacén con 24h de anticipación.',
  },
  permissions: {
    enviar: false,
    aprobar: false,
    recibir: true,
    editar: false,
  },
};

export default function PreviewOrdenDetallePage() {
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
          { label: 'Órdenes de compra', href: `/${tenant.slug}/ordenes` },
          { label: MOCK.numero },
        ]}
      />
      <main className="col-start-2 row-start-2 overflow-auto bg-orion-bg-subtle p-6">
        <OrdenDetalle data={MOCK} tenantSlug={tenant.slug} />
      </main>
    </div>
  );
}
