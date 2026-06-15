import { and, asc, eq, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { userHasPermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { clientes, productos } from '@/lib/db/schema';
import {
  CotizacionForm,
  type ClienteOption,
  type ProductoOption,
} from '@/components/modules/cotizaciones/CotizacionForm';

export const metadata = { title: 'Nueva cotización' };

export default async function NuevaCotizacionPage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ clienteId?: string }>;
}) {
  const { companySlug } = await params;
  const sp = await searchParams;
  const defaultClienteId = sp.clienteId;
  const tenant = await getCurrentTenant();

  const canCreate = await userHasPermission('cotizaciones.crear');
  if (!canCreate) redirect(`/${companySlug}/cotizaciones`);

  const [clientesRows, productosRows, stockRows] = await Promise.all([
    db
      .select({
        id: clientes.id,
        razonSocial: clientes.razonSocial,
        nombres: clientes.nombres,
        apellidoPaterno: clientes.apellidoPaterno,
      })
      .from(clientes)
      .where(and(eq(clientes.tenantId, tenant.id), eq(clientes.esCliente, true)))
      .orderBy(asc(clientes.razonSocial)),
    db
      .select({
        id: productos.id,
        codigo: productos.codigo,
        nombre: productos.nombre,
        precio: productos.precioUnitario,
        costoUnitario: productos.costoUnitario,
        margenMinimo: productos.margenMinimo,
        tieneIgv: productos.tieneIgv,
        unidadMedida: productos.unidadMedida,
        activo: productos.activo,
      })
      .from(productos)
      .where(eq(productos.tenantId, tenant.id))
      .orderBy(asc(productos.codigo)),
    db.execute<{ producto_id: string; stock: string }>(
      sql`SELECT producto_id::text, stock::text FROM stock_actual WHERE tenant_id = ${tenant.id}`
    ),
  ]);

  const stockMap = new Map(Array.from(stockRows).map((r) => [r.producto_id, Number(r.stock)]));

  const clientesOpt: ClienteOption[] = clientesRows.map((c) => ({
    id: c.id,
    label:
      c.razonSocial ?? ([c.nombres, c.apellidoPaterno].filter(Boolean).join(' ') || 'Sin nombre'),
  }));
  const productosOpt: ProductoOption[] = productosRows
    .filter((p) => p.activo)
    .map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      precio: Number(p.precio),
      costoUnitario: p.costoUnitario != null ? Number(p.costoUnitario) : null,
      margenMinimo: p.margenMinimo != null ? Number(p.margenMinimo) : null,
      tieneIgv: p.tieneIgv,
      unidadMedida: p.unidadMedida,
      stockActual: stockMap.get(p.id) ?? null,
    }));

  return (
    <div className="flex flex-col gap-3">
      <CotizacionForm
        companySlug={companySlug}
        clientes={clientesOpt}
        productos={productosOpt}
        defaultClienteId={defaultClienteId}
      />
    </div>
  );
}
