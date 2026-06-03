/**
 * Preview B.5 form crear cotización — sin auth, mock data, no submit. Solo dev.
 */
import { notFound } from 'next/navigation';
import type { Tenant } from '@/lib/db/schema';
import { TenantSidebar } from '@/components/shared/TenantSidebar';
import { TenantHeader } from '@/components/shared/TenantHeader';
import {
  CotizacionForm,
  type ClienteOption,
  type ProductoOption,
} from '@/components/modules/cotizaciones/CotizacionForm';
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

const MOCK_CLIENTES: ClienteOption[] = [
  { id: 'c-1', label: 'TECNOLOGÍA INDUSTRIAL SAC' },
  { id: 'c-2', label: 'ELECTROANDES SA' },
  { id: 'c-3', label: 'GRUPO MINERA CERRO VERDE' },
  { id: 'c-4', label: 'CONSTRUCTORA SUR EIRL' },
];

const MOCK_PRODUCTOS: ProductoOption[] = [
  {
    id: 'p-1',
    codigo: 'TX-4821',
    nombre: 'Transformador trifásico 50 kVA · 220V/380V',
    precio: 1240,
    costoUnitario: 980,
    margenMinimo: 15,
    tieneIgv: true,
    unidadMedida: 'NIU',
  },
  {
    id: 'p-2',
    codigo: 'CB-1004',
    nombre: 'Cable de cobre AWG #2 · 100m',
    precio: 124.5,
    costoUnitario: 95,
    margenMinimo: 10,
    tieneIgv: true,
    unidadMedida: 'NIU',
  },
  {
    id: 'p-3',
    codigo: 'SW-2210',
    nombre: 'Tablero de distribución modular 24 vías',
    precio: 612.4,
    costoUnitario: null,
    margenMinimo: null,
    tieneIgv: true,
    unidadMedida: 'NIU',
  },
];

export default function PreviewNuevaCotizacionPage() {
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
          { label: 'Nueva' },
        ]}
      />
      <main className="col-start-2 row-start-2 overflow-auto bg-orion-bg-subtle p-6">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-3">
            <h1 className="font-mono text-[22px] font-semibold tracking-tight text-orion-fg">
              Nueva cotización
            </h1>
            <p className="text-[12px] text-orion-fg-muted">
              Preview dev — el submit no llega al servidor.
            </p>
          </div>
          <CotizacionForm
            companySlug={tenant.slug}
            clientes={MOCK_CLIENTES}
            productos={MOCK_PRODUCTOS}
          />
        </div>
      </main>
    </div>
  );
}
