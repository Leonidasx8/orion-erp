import { sql } from 'drizzle-orm';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { userHasPermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { InventarioList, type StockRow } from '@/components/modules/inventario/InventarioList';

export const metadata = { title: 'Inventario' };

type EstadoFiltro = 'todos' | 'sin_stock' | 'critico' | 'normal';

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const params = await searchParams;
  const filtroActivo = (
    ['sin_stock', 'critico', 'normal'].includes(params.estado ?? '')
      ? (params.estado as EstadoFiltro)
      : 'todos'
  ) as EstadoFiltro;

  const [tenant, canAjustar] = await Promise.all([
    getCurrentTenant(),
    userHasPermission('inventario.ajuste_manual'),
  ]);

  // Query stock_actual view filtered by tenant
  const rows = await db.execute<{
    producto_id: string;
    codigo: string;
    nombre: string;
    unidad_medida: string | null;
    stock: string;
    stock_minimo: string | null;
    costo_promedio: string;
    valor_inventario: string;
    estado_stock: string;
    ultimo_movimiento_at: string | null;
  }>(sql`
    SELECT
      producto_id,
      codigo,
      nombre,
      unidad_medida,
      stock,
      stock_minimo,
      costo_promedio,
      valor_inventario,
      estado_stock,
      ultimo_movimiento_at
    FROM stock_actual
    WHERE tenant_id = ${tenant.id}
    ${filtroActivo !== 'todos' ? sql`AND estado_stock = ${filtroActivo}` : sql``}
    ORDER BY estado_stock ASC, nombre ASC
  `);

  // Aggregate counts (always from full tenant, not filtered)
  const counts = await db.execute<{
    total: string;
    sin_stock: string;
    critico: string;
    normal: string;
  }>(sql`
    SELECT
      COUNT(*)                                                     AS total,
      COUNT(*) FILTER (WHERE estado_stock = 'sin_stock')           AS sin_stock,
      COUNT(*) FILTER (WHERE estado_stock = 'critico')             AS critico,
      COUNT(*) FILTER (WHERE estado_stock = 'normal')              AS normal
    FROM stock_actual
    WHERE tenant_id = ${tenant.id}
  `);

  const c = counts[0] ?? { total: '0', sin_stock: '0', critico: '0', normal: '0' };

  const valorTotal = (rows as unknown as typeof rows).reduce(
    (s, r) => s + Number(r.valor_inventario),
    0
  );

  const stockRows: StockRow[] = (rows as unknown as typeof rows).map((r) => ({
    productoId: r.producto_id,
    codigo: r.codigo,
    nombre: r.nombre,
    unidadMedida: r.unidad_medida,
    stock: Number(r.stock),
    stockMinimo: r.stock_minimo != null ? Number(r.stock_minimo) : null,
    costoPromedio: Number(r.costo_promedio),
    valorInventario: Number(r.valor_inventario),
    estadoStock: r.estado_stock as StockRow['estadoStock'],
    ultimoMovimientoAt: r.ultimo_movimiento_at,
  }));

  return (
    <InventarioList
      tenantSlug={tenant.slug}
      rows={stockRows}
      counts={{
        total: Number(c.total),
        sin_stock: Number(c.sin_stock),
        critico: Number(c.critico),
        normal: Number(c.normal),
      }}
      valorTotalInventario={valorTotal}
      canAjustar={canAjustar}
      filtroActivo={filtroActivo}
    />
  );
}
