/**
 * Preview B.7 kardex detalle — sin auth, mock data. Solo dev.
 */
import { notFound } from 'next/navigation';
import type { Tenant } from '@/lib/db/schema';
import { TenantSidebar } from '@/components/shared/TenantSidebar';
import { TenantHeader } from '@/components/shared/TenantHeader';
import { KardexDetalle, type MovimientoRow } from '@/components/modules/inventario/KardexDetalle';
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

const MOCK_MOVIMIENTOS: MovimientoRow[] = [
  {
    id: 9,
    fecha: new Date('2026-04-28T14:20:00').toISOString(),
    tipo: 'salida',
    origenTipo: 'guia',
    origenId: '11111111-0000-0000-0000-000000000001',
    cantidad: 12,
    costoUnitario: 0.1289,
    saldoPost: 3,
    costoPromedioPost: 0.1289,
    observacion: 'Despacho a CONSTRUCTORA SUR EIRL',
  },
  {
    id: 8,
    fecha: new Date('2026-04-27T10:00:00').toISOString(),
    tipo: 'salida',
    origenTipo: 'guia',
    origenId: '11111111-0000-0000-0000-000000000002',
    cantidad: 8,
    costoUnitario: 0.1289,
    saldoPost: 15,
    costoPromedioPost: 0.1289,
    observacion: 'Despacho a TECNOLOGÍA INDUSTRIAL',
  },
  {
    id: 7,
    fecha: new Date('2026-04-25T09:00:00').toISOString(),
    tipo: 'salida',
    origenTipo: 'guia',
    origenId: '11111111-0000-0000-0000-000000000003',
    cantidad: 25,
    costoUnitario: 0.1289,
    saldoPost: 23,
    costoPromedioPost: 0.1289,
    observacion: 'Despacho a ELECTROANDES SA',
  },
  {
    id: 6,
    fecha: new Date('2026-04-22T08:30:00').toISOString(),
    tipo: 'entrada',
    origenTipo: 'orden_compra',
    origenId: '22222222-0000-0000-0000-000000000001',
    cantidad: 50,
    costoUnitario: 0.1342,
    saldoPost: 48,
    costoPromedioPost: 0.1342,
    observacion: 'Recepción SegElectrica · lote L-5512',
  },
  {
    id: 5,
    fecha: new Date('2026-04-18T16:00:00').toISOString(),
    tipo: 'ajuste_pos',
    origenTipo: 'manual',
    origenId: null,
    cantidad: 2,
    costoUnitario: 0.1289,
    saldoPost: 30,
    costoPromedioPost: 0.1289,
    observacion: 'Ajuste por inventario físico · diferencia lote L-5489',
  },
  {
    id: 4,
    fecha: new Date('2026-04-18T12:00:00').toISOString(),
    tipo: 'salida',
    origenTipo: 'guia',
    origenId: '11111111-0000-0000-0000-000000000004',
    cantidad: 32,
    costoUnitario: 0.1289,
    saldoPost: 28,
    costoPromedioPost: 0.1289,
    observacion: 'Despacho a GRUPO MINERA CERRO VERDE',
  },
  {
    id: 3,
    fecha: new Date('2026-04-12T10:00:00').toISOString(),
    tipo: 'salida',
    origenTipo: 'guia',
    origenId: '11111111-0000-0000-0000-000000000005',
    cantidad: 18,
    costoUnitario: 0.1289,
    saldoPost: 46,
    costoPromedioPost: 0.1289,
    observacion: 'Despacho a ELECTROMECÁNICA ANDINA',
  },
  {
    id: 2,
    fecha: new Date('2026-04-08T08:00:00').toISOString(),
    tipo: 'salida',
    origenTipo: 'guia',
    origenId: '11111111-0000-0000-0000-000000000006',
    cantidad: 40,
    costoUnitario: 0.1289,
    saldoPost: 64,
    costoPromedioPost: 0.1289,
    observacion: 'Despacho a ELECTROANDES SA',
  },
  {
    id: 1,
    fecha: new Date('2026-04-01T07:00:00').toISOString(),
    tipo: 'entrada',
    origenTipo: 'orden_compra',
    origenId: '22222222-0000-0000-0000-000000000002',
    cantidad: 80,
    costoUnitario: 0.1289,
    saldoPost: 86,
    costoPromedioPost: 0.1289,
    observacion: 'Recepción SegElectrica · lote L-5489',
  },
];

export default function PreviewKardexPage() {
  if (process.env.NODE_ENV !== 'development') notFound();

  const tenant = MOCK_TENANT;

  return (
    <div
      className={`grid h-screen min-h-0 ${tenantThemeClass(tenant.slug)}`}
      style={{ gridTemplateColumns: '240px 1fr', gridTemplateRows: '56px 1fr' }}
    >
      <TenantSidebar tenant={tenant} userName="Lucas Escrivá" userRole="Superadmin" />
      <TenantHeader tenant={tenant} userName="Lucas Escrivá" />
      <main className="col-start-2 row-start-2 overflow-auto bg-orion-bg-subtle p-6">
        <KardexDetalle
          tenantSlug={tenant.slug}
          productoId="prod-demo"
          codigo="TER-50AWG-1/4"
          nombre='Terminal compresión 1 hueco 50 AWG agujero ¼"'
          unidadMedida="NIU"
          stockActual={3}
          stockMinimo={20}
          costoPromedio={0.1289}
          valorInventario={0.39}
          canAjustar
          movimientos={MOCK_MOVIMIENTOS}
          filtroActivo="todos"
        />
      </main>
    </div>
  );
}
