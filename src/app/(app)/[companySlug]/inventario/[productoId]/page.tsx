import { and, desc, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { userHasPermission } from '@/lib/auth/require-permission';
import { requirePermissionPage } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { kardexMovimientos, productos } from '@/lib/db/schema';
import { KardexDetalle, type MovimientoRow } from '@/components/modules/inventario/KardexDetalle';

export async function generateMetadata({ params }: { params: Promise<{ productoId: string }> }) {
  const { productoId } = await params;
  return { title: `Kardex · ${productoId.slice(0, 8)}` };
}

type TipoFiltro = 'todos' | 'entradas' | 'salidas' | 'ajustes';

export default async function KardexPage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string; productoId: string }>;
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { productoId, companySlug } = await params;
  const sp = await searchParams;
  const filtroActivo = (
    ['entradas', 'salidas', 'ajustes'].includes(sp.tipo ?? '') ? (sp.tipo as TipoFiltro) : 'todos'
  ) as TipoFiltro;

  const [tenant, canAjustar] = await Promise.all([
    getCurrentTenant(),
    userHasPermission('inventario.ajuste_manual'),
  ]);
  await requirePermissionPage('inventario.ver', companySlug);

  // Fetch producto + stock
  const stockRows = await db.execute<{
    codigo: string;
    nombre: string;
    unidad_medida: string | null;
    stock: string;
    stock_minimo: string | null;
    costo_promedio: string;
    valor_inventario: string;
  }>(sql`
    SELECT codigo, nombre, unidad_medida, stock, stock_minimo, costo_promedio, valor_inventario
    FROM stock_actual
    WHERE producto_id = ${productoId} AND tenant_id = ${tenant.id}
  `);

  const stock = stockRows[0];
  if (!stock) {
    // Might exist as product without costos_inventario entry
    const [prod] = await db
      .select({
        codigo: productos.codigo,
        nombre: productos.nombre,
        unidadMedida: productos.unidadMedida,
        stockMinimo: productos.stockMinimo,
      })
      .from(productos)
      .where(and(eq(productos.id, productoId), eq(productos.tenantId, tenant.id)));
    if (!prod) notFound();

    // No movements yet — show empty kardex
    return (
      <KardexDetalle
        tenantSlug={tenant.slug}
        productoId={productoId}
        codigo={prod.codigo}
        nombre={prod.nombre}
        unidadMedida={prod.unidadMedida}
        stockActual={0}
        stockMinimo={prod.stockMinimo != null ? Number(prod.stockMinimo) : null}
        costoPromedio={0}
        valorInventario={0}
        canAjustar={canAjustar}
        movimientos={[]}
        filtroActivo={filtroActivo}
      />
    );
  }

  // Build tipo filter for query
  const tipoFiltro: string[] =
    filtroActivo === 'entradas'
      ? ['entrada']
      : filtroActivo === 'salidas'
        ? ['salida']
        : filtroActivo === 'ajustes'
          ? ['ajuste_pos', 'ajuste_neg']
          : [];

  const movRows = await db
    .select()
    .from(kardexMovimientos)
    .where(
      and(
        eq(kardexMovimientos.productoId, productoId),
        ...(tipoFiltro.length > 0 ? [sql`${kardexMovimientos.tipo} = ANY(${tipoFiltro})`] : [])
      )
    )
    .orderBy(desc(kardexMovimientos.fecha));

  const movimientos: MovimientoRow[] = movRows.map((m) => ({
    id: m.id,
    fecha: m.fecha.toISOString(),
    tipo: m.tipo as MovimientoRow['tipo'],
    origenTipo: m.origenTipo,
    origenId: m.origenId,
    cantidad: Number(m.cantidad),
    costoUnitario: m.costoUnitario != null ? Number(m.costoUnitario) : null,
    saldoPost: Number(m.saldoPost),
    costoPromedioPost: Number(m.costoPromedioPost),
    observacion: m.observacion,
  }));

  return (
    <KardexDetalle
      tenantSlug={tenant.slug}
      productoId={productoId}
      codigo={stock.codigo}
      nombre={stock.nombre}
      unidadMedida={stock.unidad_medida}
      stockActual={Number(stock.stock)}
      stockMinimo={stock.stock_minimo != null ? Number(stock.stock_minimo) : null}
      costoPromedio={Number(stock.costo_promedio)}
      valorInventario={Number(stock.valor_inventario)}
      canAjustar={canAjustar}
      movimientos={movimientos}
      filtroActivo={filtroActivo}
    />
  );
}
