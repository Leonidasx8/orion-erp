/**
 * Preview B.7 inventario lista — sin auth, mock data. Solo dev.
 */
import { notFound } from 'next/navigation';
import type { Tenant } from '@/lib/db/schema';
import { TenantSidebar } from '@/components/shared/TenantSidebar';
import { TenantHeader } from '@/components/shared/TenantHeader';
import { InventarioList, type StockRow } from '@/components/modules/inventario/InventarioList';
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
  margenMinimoGlobal: null,
  aprobacionMontoMaximo: null,
  igvAutomatico: true,
  descuentosPorLinea: true,
};

const MOCK_ROWS: StockRow[] = [
  {
    productoId: 'prod-001',
    codigo: 'TER-50AWG-1/4',
    nombre: 'Terminal compresión 1 hueco 50 AWG agujero ¼"',
    unidadMedida: 'NIU',
    stock: 3,
    stockMinimo: 20,
    costoPromedio: 0.1289,
    valorInventario: 0.39,
    estadoStock: 'critico',
    ultimoMovimientoAt: new Date('2026-04-28').toISOString(),
  },
  {
    productoId: 'prod-002',
    codigo: 'TER-70AWG-1/2',
    nombre: 'Terminal compresión 1 hueco 70 AWG ½"',
    unidadMedida: 'NIU',
    stock: 0,
    stockMinimo: 10,
    costoPromedio: 0.1842,
    valorInventario: 0,
    estadoStock: 'sin_stock',
    ultimoMovimientoAt: new Date('2026-04-27').toISOString(),
  },
  {
    productoId: 'prod-003',
    codigo: 'CAB-10AWG-NEG',
    nombre: 'Cable cobre 10 AWG color negro 600V',
    unidadMedida: 'MTR',
    stock: 450,
    stockMinimo: 100,
    costoPromedio: 3.45,
    valorInventario: 1552.5,
    estadoStock: 'normal',
    ultimoMovimientoAt: new Date('2026-04-25').toISOString(),
  },
  {
    productoId: 'prod-004',
    codigo: 'CAB-14AWG-AZU',
    nombre: 'Cable cobre 14 AWG color azul 600V',
    unidadMedida: 'MTR',
    stock: 820,
    stockMinimo: 200,
    costoPromedio: 1.85,
    valorInventario: 1517.0,
    estadoStock: 'normal',
    ultimoMovimientoAt: new Date('2026-04-20').toISOString(),
  },
  {
    productoId: 'prod-005',
    codigo: 'TUB-12-NEG',
    nombre: 'Tubería termo-contractible 12mm',
    unidadMedida: 'MTR',
    stock: 320,
    stockMinimo: 50,
    costoPromedio: 0.72,
    valorInventario: 230.4,
    estadoStock: 'normal',
    ultimoMovimientoAt: new Date('2026-04-18').toISOString(),
  },
];

export default function PreviewInventarioPage() {
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
        crumbs={[{ label: 'Idex', href: `/${tenant.slug}` }, { label: 'Inventario' }]}
      />
      <main className="col-start-2 row-start-2 overflow-auto bg-orion-bg-subtle p-6">
        <InventarioList
          tenantSlug={tenant.slug}
          rows={MOCK_ROWS}
          counts={{
            total: 5,
            sin_stock: 1,
            critico: 1,
            normal: 3,
          }}
          valorTotalInventario={3300.29}
          canAjustar
          filtroActivo="todos"
        />
      </main>
    </div>
  );
}
