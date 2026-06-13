import { sql } from 'drizzle-orm';
import { requirePermissionPage } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { DashboardCxC, type DashboardCxCData } from '@/components/modules/credito/DashboardCxC';
import { ClientesSaldos, type ClienteSaldoRow } from '@/components/modules/credito/ClientesSaldos';
import { ModuleHelp } from '@/components/shared/ModuleHelp';

type AgingBuckets = {
  bucket0a30: number;
  bucket31a60: number;
  bucket61a90: number;
  bucket90mas: number;
};

function AgingStrip({
  buckets,
  ccy,
  totalVencido,
}: {
  buckets: AgingBuckets;
  ccy: 'USD' | 'PEN';
  totalVencido: number;
}) {
  const symbol = ccy === 'USD' ? 'USD' : 'S/';
  const total =
    buckets.bucket0a30 + buckets.bucket31a60 + buckets.bucket61a90 + buckets.bucket90mas;

  const items = [
    { label: '1-30 días', value: buckets.bucket0a30, color: 'var(--accent)' },
    { label: '31-60 días', value: buckets.bucket31a60, color: 'var(--warn)' },
    { label: '61-90 días', value: buckets.bucket61a90, color: '#ea580c' },
    { label: '+90 días', value: buckets.bucket90mas, color: 'var(--danger)' },
  ] as const;

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`text-[11px] font-semibold ${ccy === 'USD' ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`}
        >
          {ccy === 'USD' ? 'USD' : 'Soles'}
        </span>
        {totalVencido > 0 ? (
          <span className="text-[12px] text-orion-fg-muted">
            {symbol} {totalVencido.toLocaleString('es-PE', { minimumFractionDigits: 2 })} vencido
          </span>
        ) : (
          <span className="text-[12px] italic text-orion-fg-faint">
            Sin facturas vencidas en {ccy === 'USD' ? 'USD' : 'soles'}
          </span>
        )}
      </div>
      {totalVencido > 0 && (
        <>
          <div className="mb-2 grid grid-cols-4 gap-2">
            {items.map((b) => (
              <div key={b.label} className="rounded-md bg-orion-bg-subtle p-2.5">
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: b.color }} />
                  <span className="text-[11px] text-orion-fg-muted">{b.label}</span>
                </div>
                <div className="text-[16px] font-semibold text-orion-fg">
                  {symbol}{' '}
                  {b.value.toLocaleString('es-PE', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </div>
              </div>
            ))}
          </div>
          {total > 0 && (
            <div className="flex h-1.5 overflow-hidden rounded-full">
              {items.map(
                (seg) =>
                  seg.value > 0 && (
                    <div
                      key={seg.label}
                      style={{ width: `${(seg.value / total) * 100}%`, background: seg.color }}
                    />
                  )
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AgingReportCard({
  agingUsd,
  agingPen,
  totalVencidoUsd,
  totalVencidoPen,
  clientesConDeuda,
}: {
  agingUsd: AgingBuckets;
  agingPen: AgingBuckets;
  totalVencidoUsd: number;
  totalVencidoPen: number;
  clientesConDeuda: number;
}) {
  return (
    <div className="rounded-lg border border-orion-border bg-orion-bg p-4">
      <div className="mb-1 flex items-center">
        <span className="text-[13px] font-semibold text-orion-fg">
          Antigüedad de cartera &middot;{' '}
          {new Date().toLocaleDateString('es-PE', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
        <span className="ml-auto text-[11.5px] text-orion-fg-muted">
          {clientesConDeuda} clientes
        </span>
      </div>

      <AgingStrip buckets={agingUsd} ccy="USD" totalVencido={totalVencidoUsd} />

      <hr className="my-3 border-orion-border" />

      <AgingStrip buckets={agingPen} ccy="PEN" totalVencido={totalVencidoPen} />
    </div>
  );
}

export const metadata = { title: 'Crédito y CxC' };

export default async function CreditoPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const { tenant } = await requirePermissionPage('credito.ver', companySlug);

  const agingQuery = (moneda: 'USD' | 'PEN') =>
    db.execute<{
      bucket_0_30: string;
      bucket_31_60: string;
      bucket_61_90: string;
      bucket_90_plus: string;
    }>(sql`
      SELECT
        COALESCE(SUM(f.total - COALESCE(p.total_pagado, 0)) FILTER (
          WHERE COALESCE(p.total_pagado, 0) < f.total
            AND CURRENT_DATE - f.fecha_vencimiento BETWEEN 1 AND 30
        ), 0)::text AS bucket_0_30,
        COALESCE(SUM(f.total - COALESCE(p.total_pagado, 0)) FILTER (
          WHERE COALESCE(p.total_pagado, 0) < f.total
            AND CURRENT_DATE - f.fecha_vencimiento BETWEEN 31 AND 60
        ), 0)::text AS bucket_31_60,
        COALESCE(SUM(f.total - COALESCE(p.total_pagado, 0)) FILTER (
          WHERE COALESCE(p.total_pagado, 0) < f.total
            AND CURRENT_DATE - f.fecha_vencimiento BETWEEN 61 AND 90
        ), 0)::text AS bucket_61_90,
        COALESCE(SUM(f.total - COALESCE(p.total_pagado, 0)) FILTER (
          WHERE COALESCE(p.total_pagado, 0) < f.total
            AND CURRENT_DATE - f.fecha_vencimiento > 90
        ), 0)::text AS bucket_90_plus
      FROM facturas f
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(monto), 0) AS total_pagado
        FROM pagos
        WHERE factura_id = f.id
          AND moneda = f.moneda
      ) p ON true
      WHERE f.tenant_id = ${tenant.id}
        AND f.estado_sunat = 'aceptada'
        AND f.forma_pago = 'credito'
        AND f.moneda = ${moneda}
    `);

  const [totalesRaw, agingUsdRaw, agingPenRaw, clientesRaw] = await Promise.all([
    db.execute<{
      clientes_con_deuda: string;
      total_cxc_usd: string;
      total_cxc_pen: string;
      total_vencido_usd: string;
      total_vencido_pen: string;
    }>(sql`
      SELECT
        COUNT(*)::text                              AS clientes_con_deuda,
        COALESCE(SUM(saldo_total_usd), 0)::text    AS total_cxc_usd,
        COALESCE(SUM(saldo_total_pen), 0)::text    AS total_cxc_pen,
        COALESCE(SUM(saldo_vencido_usd), 0)::text  AS total_vencido_usd,
        COALESCE(SUM(saldo_vencido_pen), 0)::text  AS total_vencido_pen
      FROM cuentas_por_cobrar
      WHERE tenant_id = ${tenant.id}
        AND (saldo_total_usd > 0 OR saldo_total_pen > 0)
    `),
    agingQuery('USD'),
    agingQuery('PEN'),
    db.execute<{
      cliente_id: string;
      nombre_cliente: string;
      linea_credito_usd: string;
      linea_credito_pen: string;
      saldo_total_usd: string;
      saldo_total_pen: string;
      saldo_vencido_usd: string;
      saldo_vencido_pen: string;
      dias_mas_vencido: string | null;
      bloqueado: boolean;
      bloqueado_pen: boolean;
    }>(sql`
      SELECT
        cxc.cliente_id,
        cxc.razon_social                                          AS nombre_cliente,
        COALESCE(cxc.linea_credito_usd, 0)::text                 AS linea_credito_usd,
        COALESCE(cxc.linea_credito_pen, 0)::text                 AS linea_credito_pen,
        COALESCE(cxc.saldo_total_usd, 0)::text                   AS saldo_total_usd,
        COALESCE(cxc.saldo_total_pen, 0)::text                   AS saldo_total_pen,
        COALESCE(cxc.saldo_vencido_usd, 0)::text                 AS saldo_vencido_usd,
        COALESCE(cxc.saldo_vencido_pen, 0)::text                 AS saldo_vencido_pen,
        (CURRENT_DATE - cxc.dia_mas_vencido)::text               AS dias_mas_vencido,
        COALESCE(cxc.bloqueado, false)                           AS bloqueado,
        COALESCE(cxc.bloqueado_pen, false)                       AS bloqueado_pen
      FROM cuentas_por_cobrar cxc
      WHERE cxc.tenant_id = ${tenant.id}
        AND (cxc.saldo_total_usd > 0 OR cxc.saldo_total_pen > 0)
      ORDER BY (COALESCE(cxc.saldo_vencido_usd, 0) + COALESCE(cxc.saldo_vencido_pen, 0)) DESC,
               (COALESCE(cxc.saldo_total_usd, 0) + COALESCE(cxc.saldo_total_pen, 0)) DESC
      LIMIT 20
    `),
  ]);

  const totalesRow = totalesRaw[0] ?? {
    clientes_con_deuda: '0',
    total_cxc_usd: '0',
    total_cxc_pen: '0',
    total_vencido_usd: '0',
    total_vencido_pen: '0',
  };

  const dashboardData: DashboardCxCData = {
    clientesConDeuda: Number(totalesRow.clientes_con_deuda),
    totalCxCUsd: Number(totalesRow.total_cxc_usd),
    totalCxCPen: Number(totalesRow.total_cxc_pen),
    totalVencidoUsd: Number(totalesRow.total_vencido_usd),
    totalVencidoPen: Number(totalesRow.total_vencido_pen),
  };

  const zeroAging: AgingBuckets = { bucket0a30: 0, bucket31a60: 0, bucket61a90: 0, bucket90mas: 0 };

  const toAgingBuckets = (raw: Awaited<ReturnType<typeof agingQuery>>): AgingBuckets => {
    const r = raw[0];
    if (!r) return zeroAging;
    return {
      bucket0a30: Number(r.bucket_0_30),
      bucket31a60: Number(r.bucket_31_60),
      bucket61a90: Number(r.bucket_61_90),
      bucket90mas: Number(r.bucket_90_plus),
    };
  };

  const clientesRows: ClienteSaldoRow[] = Array.from(
    clientesRaw as Iterable<{
      cliente_id: string;
      nombre_cliente: string;
      linea_credito_usd: string;
      linea_credito_pen: string;
      saldo_total_usd: string;
      saldo_total_pen: string;
      saldo_vencido_usd: string;
      saldo_vencido_pen: string;
      dias_mas_vencido: string | null;
      bloqueado: boolean;
      bloqueado_pen: boolean;
    }>
  ).map((r) => ({
    clienteId: r.cliente_id,
    nombreCliente: r.nombre_cliente,
    lineaCreditoUsd: Number(r.linea_credito_usd),
    saldoUsd: Number(r.saldo_total_usd),
    saldoVencidoUsd: Number(r.saldo_vencido_usd),
    bloqueado: Boolean(r.bloqueado),
    lineaCreditoPen: Number(r.linea_credito_pen),
    saldoPen: Number(r.saldo_total_pen),
    saldoVencidoPen: Number(r.saldo_vencido_pen),
    bloqueadoPen: Boolean(r.bloqueado_pen),
    diasMasVencido: Number(r.dias_mas_vencido ?? 0),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-orion-fg">Crédito y Cuentas por Cobrar</h1>
            <ModuleHelp
              module="credito"
              title="Crédito y CxC"
              description="Administra las cuentas por cobrar. Otorga líneas de crédito a clientes y registra sus pagos para controlar el saldo pendiente."
              tips={[
                'Otorga línea de crédito al cliente antes de registrar pagos',
                'Los pagos parciales reducen el saldo — registra cada cobro',
                'La antigüedad de cartera muestra cuántos días llevan pendientes las facturas',
              ]}
            />
          </div>
          <p className="mt-0.5 text-sm text-orion-fg-muted">
            Saldos pendientes y antigüedad de cartera
          </p>
        </div>
      </div>

      <DashboardCxC data={dashboardData} />

      <AgingReportCard
        agingUsd={toAgingBuckets(agingUsdRaw)}
        agingPen={toAgingBuckets(agingPenRaw)}
        totalVencidoUsd={dashboardData.totalVencidoUsd}
        totalVencidoPen={dashboardData.totalVencidoPen}
        clientesConDeuda={dashboardData.clientesConDeuda}
      />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-orion-fg">Clientes con saldo pendiente</h2>
        <ClientesSaldos rows={clientesRows} companySlug={tenant.slug} />
      </div>
    </div>
  );
}
