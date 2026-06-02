import { sql } from 'drizzle-orm'; // noqa
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { DashboardCxC, type DashboardCxCData } from '@/components/modules/credito/DashboardCxC';
import { AgingChart, type AgingBuckets } from '@/components/modules/credito/AgingChart';
import { ClientesSaldos, type ClienteSaldoRow } from '@/components/modules/credito/ClientesSaldos';

export const metadata = { title: 'Crédito y CxC' };

export default async function CreditoPage() {
  const { tenant } = await requirePermission('credito.ver');

  // Queries paralelas sobre vistas materializadas / vistas normales
  const [totalesRaw, agingRaw, clientesRaw] = await Promise.all([
    // KPIs generales desde cuentas_por_cobrar
    db.execute<{
      clientes_con_deuda: string;
      total_cxc: string;
      total_vencido: string;
    }>(sql`
      SELECT
        COUNT(*)::text                        AS clientes_con_deuda,
        COALESCE(SUM(saldo_total), 0)::text   AS total_cxc,
        COALESCE(SUM(saldo_vencido), 0)::text AS total_vencido
      FROM cuentas_por_cobrar
      WHERE tenant_id = ${tenant.id}
        AND saldo_total > 0
    `),

    // Buckets aging
    db.execute<{
      bucket_0_30: string;
      bucket_31_60: string;
      bucket_61_90: string;
      bucket_90_plus: string;
    }>(sql`
      SELECT
        COALESCE(SUM(bucket_0_30), 0)::text    AS bucket_0_30,
        COALESCE(SUM(bucket_31_60), 0)::text   AS bucket_31_60,
        COALESCE(SUM(bucket_61_90), 0)::text   AS bucket_61_90,
        COALESCE(SUM(bucket_90_plus), 0)::text AS bucket_90_plus
      FROM aging_cxc
      WHERE tenant_id = ${tenant.id}
    `),

    // Lista clientes con saldo, ordenada por vencido DESC
    db.execute<{
      cliente_id: string;
      nombre_cliente: string;
      linea_credito: string;
      saldo_total: string;
      saldo_vencido: string;
      dias_mas_vencido: string | null;
      bloqueado: boolean;
      moneda: string;
    }>(sql`
      SELECT
        cxc.cliente_id,
        cxc.razon_social                                          AS nombre_cliente,
        COALESCE(cr.linea_credito, 0)::text                      AS linea_credito,
        cxc.saldo_total,
        cxc.saldo_vencido,
        (CURRENT_DATE - cxc.dia_mas_vencido)::text               AS dias_mas_vencido,
        COALESCE(cr.bloqueado, false)                            AS bloqueado,
        COALESCE(cr.moneda, 'PEN')                               AS moneda
      FROM cuentas_por_cobrar cxc
      LEFT JOIN creditos_cliente cr ON cr.cliente_id = cxc.cliente_id
      WHERE cxc.tenant_id = ${tenant.id}
        AND cxc.saldo_total > 0
      ORDER BY cxc.saldo_vencido DESC, cxc.saldo_total DESC
      LIMIT 20
    `),
  ]);

  // Mapear resultados — db.execute devuelve el array directamente (no .rows)
  const totalesRow = totalesRaw[0] ?? {
    clientes_con_deuda: '0',
    total_cxc: '0',
    total_vencido: '0',
  };

  const dashboardData: DashboardCxCData = {
    clientesConDeuda: Number(totalesRow.clientes_con_deuda),
    totalCxC: Number(totalesRow.total_cxc),
    totalVencido: Number(totalesRow.total_vencido),
    moneda: 'PEN',
  };

  const agingRow = agingRaw[0] ?? {
    bucket_0_30: '0',
    bucket_31_60: '0',
    bucket_61_90: '0',
    bucket_90_plus: '0',
  };

  const agingBuckets: AgingBuckets = {
    bucket0a30: Number(agingRow.bucket_0_30),
    bucket31a60: Number(agingRow.bucket_31_60),
    bucket61a90: Number(agingRow.bucket_61_90),
    bucket90mas: Number(agingRow.bucket_90_plus),
  };

  const clientesRows: ClienteSaldoRow[] = (
    clientesRaw as unknown as Array<{
      cliente_id: string;
      nombre_cliente: string;
      linea_credito: string;
      saldo_total: string;
      saldo_vencido: string;
      dias_mas_vencido: string | null;
      bloqueado: boolean;
      moneda: string;
    }>
  ).map((r) => ({
    clienteId: r.cliente_id,
    nombreCliente: r.nombre_cliente,
    lineaCredito: Number(r.linea_credito),
    saldoPendiente: Number(r.saldo_total),
    saldoVencido: Number(r.saldo_vencido),
    diasMasVencido: Number(r.dias_mas_vencido ?? 0),
    bloqueado: Boolean(r.bloqueado),
    moneda: r.moneda,
  }));

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-orion-fg">Crédito y Cuentas por Cobrar</h1>
          <p className="mt-0.5 text-sm text-orion-fg-muted">Saldos pendientes y aging de cartera</p>
        </div>
      </div>

      {/* KPI cards */}
      <DashboardCxC data={dashboardData} />

      {/* Aging chart */}
      <div className="rounded-lg border border-orion-border p-5">
        <h2 className="mb-4 text-sm font-semibold text-orion-fg">Aging de cartera (PEN)</h2>
        <AgingChart buckets={agingBuckets} moneda="PEN" />
      </div>

      {/* Tabla clientes */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-orion-fg">Clientes con saldo pendiente</h2>
        <ClientesSaldos rows={clientesRows} companySlug={tenant.slug} />
      </div>
    </div>
  );
}
