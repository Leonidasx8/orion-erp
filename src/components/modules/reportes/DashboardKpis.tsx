import { KpiCard } from '@/components/charts';

export interface MetricasRow extends Record<string, unknown> {
  mes: string;
  ventas_total: string;
  facturas_emitidas: string;
  clientes_unicos: string;
  ticket_promedio: string;
}

export interface CxCRow extends Record<string, unknown> {
  total: string;
  vencido: string;
}

interface DashboardKpisProps {
  metricas: MetricasRow[];
  cxcTotales: CxCRow | null;
  stockCritico: number;
}

export function DashboardKpis({ metricas, cxcTotales, stockCritico }: DashboardKpisProps) {
  const mesActual = metricas[metricas.length - 1];
  const mesAnterior = metricas[metricas.length - 2];

  const deltaVentas =
    mesAnterior && Number(mesAnterior.ventas_total) > 0
      ? ((Number(mesActual?.ventas_total ?? 0) - Number(mesAnterior.ventas_total)) /
          Number(mesAnterior.ventas_total)) *
        100
      : 0;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      <KpiCard
        label="Ventas del mes"
        value={Number(mesActual?.ventas_total ?? 0)}
        delta={deltaVentas}
        format="currency"
      />
      <KpiCard label="Facturas emitidas" value={Number(mesActual?.facturas_emitidas ?? 0)} />
      <KpiCard label="Clientes únicos" value={Number(mesActual?.clientes_unicos ?? 0)} />
      <KpiCard
        label="Ticket promedio"
        value={Number(mesActual?.ticket_promedio ?? 0)}
        format="currency"
      />
      <KpiCard label="CxC total" value={Number(cxcTotales?.total ?? 0)} format="currency" />
      <KpiCard label="Stock crítico" value={stockCritico} />
    </div>
  );
}
