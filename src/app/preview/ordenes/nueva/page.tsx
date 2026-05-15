/**
 * Preview B.6 form nueva OC — sin auth, mock data. Solo dev.
 */
import { notFound } from 'next/navigation';
import type { Tenant } from '@/lib/db/schema';
import { TenantSidebar } from '@/components/shared/TenantSidebar';
import { TenantHeader } from '@/components/shared/TenantHeader';
import {
  OrdenForm,
  type ProductoOption,
  type ProveedorOption,
} from '@/components/modules/ordenes/OrdenForm';
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

const MOCK_PROVEEDORES: ProveedorOption[] = [
  { id: 'pv-1', label: 'IMPORTACIONES SUR EIRL' },
  { id: 'pv-2', label: 'TRANSFORMADORES DEL PERÚ SAC' },
  { id: 'pv-3', label: 'CABLES Y CONDUCTORES SA' },
];

const MOCK_PRODUCTOS: ProductoOption[] = [
  {
    id: 'p-1',
    codigo: 'TX-4821',
    nombre: 'Transformador trifásico 50 kVA · 220V/380V',
    precio: 1200,
    tieneIgv: true,
  },
  {
    id: 'p-2',
    codigo: 'CB-1004',
    nombre: 'Cable de cobre AWG #2 · 100m',
    precio: 120,
    tieneIgv: true,
  },
  {
    id: 'p-3',
    codigo: 'SW-2210',
    nombre: 'Tablero de distribución modular 24 vías',
    precio: 580,
    tieneIgv: true,
  },
];

export default function PreviewNuevaOrdenPage() {
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
          { label: 'Nueva' },
        ]}
      />
      <main className="col-start-2 row-start-2 overflow-auto bg-orion-bg-subtle p-6">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-3">
            <h1 className="font-mono text-[22px] font-semibold tracking-tight text-orion-fg">
              Nueva orden de compra
            </h1>
            <p className="text-[12px] text-orion-fg-muted">
              Preview dev — el submit no llega al servidor.
            </p>
          </div>
          <OrdenForm
            companySlug={tenant.slug}
            proveedores={MOCK_PROVEEDORES}
            productos={MOCK_PRODUCTOS}
          />
        </div>
      </main>
    </div>
  );
}
