import Link from 'next/link';
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
  companySlug: string;
}

export function DashboardKpis({
  metricas,
  cxcTotales,
  stockCritico,
  companySlug,
}: DashboardKpisProps) {
  const mesActual = metricas[metricas.length - 1];
  const mesAnterior = metricas[metricas.length - 2];
  const cxcVencido = Number(cxcTotales?.vencido ?? 0);

  const deltaVentas =
    mesAnterior && Number(mesAnterior.ventas_total) > 0
      ? ((Number(mesActual?.ventas_total ?? 0) - Number(mesAnterior.ventas_total)) /
          Number(mesAnterior.ventas_total)) *
        100
      : 0;

  // Compute date range for current month (YYYY-MM-DD format)
  const now = new Date();
  const mesActualStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const finDeMesStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      <Link
        href={`/${companySlug}/reportes/ventas?desde=${mesActualStr}&hasta=${finDeMesStr}`}
        className="block rounded-lg transition-opacity hover:opacity-80"
      >
        <KpiCard
          label="Ventas del mes"
          value={Number(mesActual?.ventas_total ?? 0)}
          delta={deltaVentas}
          format="currency"
        />
      </Link>
      <Link
        href={`/${companySlug}/facturas`}
        className="block rounded-lg transition-opacity hover:opacity-80"
      >
        <KpiCard label="Facturas emitidas" value={Number(mesActual?.facturas_emitidas ?? 0)} />
      </Link>
      <Link
        href={`/${companySlug}/clientes`}
        className="block rounded-lg transition-opacity hover:opacity-80"
      >
        <KpiCard label="Clientes únicos" value={Number(mesActual?.clientes_unicos ?? 0)} />
      </Link>
      <Link
        href={`/${companySlug}/reportes/ventas`}
        className="block rounded-lg transition-opacity hover:opacity-80"
      >
        <KpiCard
          label="Ticket promedio"
          value={Number(mesActual?.ticket_promedio ?? 0)}
          format="currency"
        />
      </Link>
      <Link
        href={`/${companySlug}/credito`}
        className="block rounded-lg transition-opacity hover:opacity-80"
      >
        <KpiCard
          label="CxC total"
          value={Number(cxcTotales?.total ?? 0)}
          format="currency"
          subtitle={
            cxcVencido > 0
              ? `S/ ${cxcVencido.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} vencido`
              : undefined
          }
          subtitleClassName={cxcVencido > 0 ? 'text-red-600 font-medium' : undefined}
        />
      </Link>
      <Link
        href={`/${companySlug}/inventario?estado=critico`}
        className="block rounded-lg transition-opacity hover:opacity-80"
      >
        <KpiCard label="Stock crítico" value={stockCritico} />
      </Link>
    </div>
  );
}
