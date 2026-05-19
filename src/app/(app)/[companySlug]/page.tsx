import { and, eq, sql } from 'drizzle-orm';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { db } from '@/lib/db/client';
import { cotizaciones, clientes, productos } from '@/lib/db/schema';
import {
  DashboardContent,
  type DashboardData,
} from '@/components/modules/dashboard/DashboardContent';

export default async function TenantDashboardPage() {
  const tenant = await getCurrentTenant();

  const [cotizacionesAgg, stockCriticoAgg, clientesActivosAgg, porAprobarRows, stockCriticoRows] =
    await Promise.all([
      // Cotizaciones grouped by estado with USD totals
      db
        .select({
          estado: cotizaciones.estado,
          n: sql<number>`COUNT(*)::int`,
          valorUsd: sql<number>`COALESCE(SUM(
            CASE WHEN ${cotizaciones.moneda} = 'USD' THEN ${cotizaciones.total}::numeric
                 ELSE ${cotizaciones.total}::numeric / NULLIF(${cotizaciones.tipoCambio}::numeric, 0)
            END
          ), 0)`,
        })
        .from(cotizaciones)
        .where(eq(cotizaciones.tenantId, tenant.id))
        .groupBy(cotizaciones.estado),

      // Stock crítico count
      db
        .select({ n: sql<number>`COUNT(*)::int` })
        .from(productos)
        .where(
          and(
            eq(productos.tenantId, tenant.id),
            eq(productos.controlaStock, true),
            sql`${productos.stockMinimo} IS NOT NULL AND ${productos.stockActual}::numeric < ${productos.stockMinimo}::numeric`
          )
        ),

      // Clientes activos (only clientes, not pure proveedores)
      db
        .select({ n: sql<number>`COUNT(*)::int` })
        .from(clientes)
        .where(
          and(
            eq(clientes.tenantId, tenant.id),
            eq(clientes.esCliente, true),
            eq(clientes.estado, 'activo')
          )
        ),

      // Cotizaciones enviadas (pendientes de aprobar)
      db
        .select({
          id: cotizaciones.id,
          numeroCompleto: cotizaciones.numeroCompleto,
          total: cotizaciones.total,
          moneda: cotizaciones.moneda,
          fechaVencimiento: cotizaciones.fechaVencimiento,
          clienteRazon: clientes.razonSocial,
        })
        .from(cotizaciones)
        .leftJoin(clientes, eq(cotizaciones.clienteId, clientes.id))
        .where(and(eq(cotizaciones.tenantId, tenant.id), eq(cotizaciones.estado, 'enviada')))
        .orderBy(cotizaciones.fechaVencimiento)
        .limit(5),

      // Stock crítico rows
      db
        .select({
          id: productos.id,
          codigo: productos.codigo,
          nombre: productos.nombre,
          stockActual: productos.stockActual,
          stockMinimo: productos.stockMinimo,
        })
        .from(productos)
        .where(
          and(
            eq(productos.tenantId, tenant.id),
            eq(productos.controlaStock, true),
            sql`${productos.stockMinimo} IS NOT NULL AND ${productos.stockActual}::numeric < ${productos.stockMinimo}::numeric`
          )
        )
        .orderBy(
          sql`${productos.stockActual}::numeric / NULLIF(${productos.stockMinimo}::numeric, 0) ASC`
        )
        .limit(6),
    ]);

  // Build pipeline map
  const byEstado = new Map<string, { count: number; valor: number }>();
  let cotizacionesTotal = 0;
  let pipelineValor = 0;
  let ventasValor = 0;

  for (const r of cotizacionesAgg) {
    byEstado.set(r.estado, { count: r.n, valor: Number(r.valorUsd) });
    cotizacionesTotal += r.n;
    if (r.estado === 'borrador' || r.estado === 'enviada') {
      pipelineValor += Number(r.valorUsd);
    }
    if (r.estado === 'aceptada' || r.estado === 'convertida') {
      ventasValor += Number(r.valorUsd);
    }
  }

  const pipelineStages: DashboardData['pipeline'] = [
    'borrador',
    'enviada',
    'aceptada',
    'rechazada',
    'vencida',
  ].map((est) => ({
    estado: est,
    count: byEstado.get(est)?.count ?? 0,
    valor: byEstado.get(est)?.valor ?? 0,
  }));

  const today = new Date();
  const porAprobar: DashboardData['porAprobar'] = porAprobarRows.map((r) => {
    const vence = r.fechaVencimiento ? new Date(r.fechaVencimiento) : null;
    const dias = vence ? Math.round((vence.getTime() - today.getTime()) / 86400_000) : 999;
    return {
      id: r.id,
      numero: r.numeroCompleto ?? '—',
      cliente: r.clienteRazon ?? '—',
      total: Number(r.total),
      moneda: r.moneda,
      diasHastaVencimiento: dias,
    };
  });

  const stockCritico: DashboardData['stockCritico'] = stockCriticoRows.map((r) => ({
    id: r.id,
    codigo: r.codigo,
    nombre: r.nombre,
    stockActual: Number(r.stockActual ?? 0),
    stockMinimo: Number(r.stockMinimo ?? 0),
  }));

  const data: DashboardData = {
    kpis: {
      ventasMes: ventasValor,
      cotizacionesTotal,
      pipelineCount: byEstado.get('enviada')?.count ?? 0,
      pipelineValor,
      stockCriticoCount: stockCriticoAgg[0]?.n ?? 0,
      clientesActivos: clientesActivosAgg[0]?.n ?? 0,
    },
    pipeline: pipelineStages,
    porAprobar,
    stockCritico,
  };

  return <DashboardContent tenant={tenant} data={data} />;
}
