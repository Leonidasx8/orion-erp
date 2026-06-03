import { sql } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import {
  DashboardKpis,
  type MetricasRow,
  type CxCRow,
} from '@/components/modules/reportes/DashboardKpis';
import { VentasMesChart } from '@/components/modules/reportes/VentasMesChart';
import { PipelineChart } from '@/components/modules/reportes/PipelineChart';
import { TopClientesList } from '@/components/modules/reportes/TopClientesList';
import { TopProductosList } from '@/components/modules/reportes/TopProductosList';
import { PageHead } from '@/components/shared/PageHead';
import { PendientesPanel } from '@/components/modules/reportes/PendientesPanel';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const { tenant } = await requirePermission('reportes.ver');

  const [
    metricasRaw,
    pipelineRaw,
    topClientesRaw,
    topProductosRaw,
    cxcRaw,
    stockRaw,
    ocPendientesRaw,
    cotVencidasRaw,
  ] = await Promise.all([
    // Ventas por mes — últimos 12 meses desde dashboard_metricas
    db.execute<MetricasRow>(sql`
        SELECT
          mes::text,
          ventas_total::text,
          facturas_emitidas::text,
          clientes_unicos::text,
          ticket_promedio::text
        FROM dashboard_metricas
        WHERE tenant_id = ${tenant.id}
          AND mes >= date_trunc('month', current_date) - INTERVAL '11 months'
        ORDER BY mes
      `),

    // Pipeline de cotizaciones por estado
    db.execute<{ estado: string; cantidad: string; valor_total: string }>(sql`
        SELECT estado, cantidad::text, valor_total::text
        FROM pipeline_cotizaciones
        WHERE tenant_id = ${tenant.id}
      `),

    // Top 10 clientes por monto facturado
    db.execute<{ cliente_id: string; razon_social: string; monto_total: string }>(sql`
        SELECT cliente_id::text, razon_social, monto_total::text
        FROM top_clientes
        WHERE tenant_id = ${tenant.id}
        ORDER BY monto_total DESC
        LIMIT 10
      `),

    // Top 20 productos por monto facturado
    db.execute<{ producto_id: string; nombre: string; monto_total: string }>(sql`
        SELECT producto_id::text, nombre, monto_total::text
        FROM top_productos
        WHERE tenant_id = ${tenant.id}
        ORDER BY monto_total DESC
        LIMIT 20
      `),

    // CxC totales agregados
    db.execute<CxCRow>(sql`
        SELECT
          COALESCE(SUM(saldo_total), 0)::text   AS total,
          COALESCE(SUM(saldo_vencido), 0)::text AS vencido
        FROM cuentas_por_cobrar
        WHERE tenant_id = ${tenant.id}
      `),

    // Stock crítico — view hereda tenant_id desde productos
    db.execute<{ critico: string }>(sql`
        SELECT COUNT(*)::text AS critico
        FROM stock_critico
        WHERE tenant_id = ${tenant.id}
      `),

    // OC listas para recibir (aprobada + recibida_parcial)
    db.execute<{ count: string; numeros: string | null }>(sql`
        SELECT
          COUNT(*)::text AS count,
          array_to_string(array_agg(numero ORDER BY created_at DESC), ',') AS numeros
        FROM ordenes_compra
        WHERE tenant_id = ${tenant.id}
          AND estado IN ('aprobada', 'recibida_parcial')
      `),

    // Cotizaciones vencidas sin acción
    db.execute<{ count: string }>(sql`
      SELECT COUNT(*)::text AS count
      FROM cotizaciones
      WHERE tenant_id = ${tenant.id}
        AND estado = 'vencida'
    `),
  ]);

  const metricas = Array.from(metricasRaw);
  const pipeline = Array.from(pipelineRaw);
  const topClientes = Array.from(topClientesRaw);
  const topProductos = Array.from(topProductosRaw);
  const cxcTotales: CxCRow | null = cxcRaw[0] ?? null;
  const stockCritico = Number(stockRaw[0]?.critico ?? 0);
  const ocPendientesCount = Number(ocPendientesRaw[0]?.count ?? 0);
  const ocPendientesNumeros = ocPendientesRaw[0]?.numeros
    ? ocPendientesRaw[0].numeros.split(',').filter(Boolean)
    : [];
  const cotVencidas = Number(cotVencidasRaw[0]?.count ?? 0);

  function formatSubtitle() {
    const now = new Date();
    const meses = [
      'ene',
      'feb',
      'mar',
      'abr',
      'may',
      'jun',
      'jul',
      'ago',
      'sep',
      'oct',
      'nov',
      'dic',
    ];
    const label = `${now.getDate()} ${meses[now.getMonth()]} ${now.getFullYear()}`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const diasRestantes = lastDay.getDate() - now.getDate();
    return `Resumen del ${label} · cierra mes en ${diasRestantes} días`;
  }

  const firstName =
    (tenant.razonSocial.split(/\s+/)[0] ?? 'Equipo').replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ]/g, '') ||
    'Equipo';

  return (
    <>
      <PageHead title={`Buen día, ${firstName}`} subtitle={formatSubtitle()} />

      {/* Fila 1: 6 KPI cards */}
      <DashboardKpis
        metricas={metricas}
        cxcTotales={cxcTotales}
        stockCritico={stockCritico}
        companySlug={companySlug}
      />

      <PendientesPanel
        ocPendientes={{ count: ocPendientesCount, numeros: ocPendientesNumeros }}
        stockCritico={stockCritico}
        cotVencidas={cotVencidas}
        companySlug={companySlug}
      />

      {/* Fila 2: gráficos de ventas y pipeline */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <VentasMesChart data={metricas} />
        <PipelineChart data={pipeline} />
      </div>

      {/* Fila 3: top clientes y top productos */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopClientesList data={topClientes} companySlug={companySlug} />
        <TopProductosList data={topProductos} companySlug={companySlug} />
      </div>
    </>
  );
}
