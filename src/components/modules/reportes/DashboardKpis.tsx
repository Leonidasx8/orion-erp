import Link from 'next/link';
import { KpiCard } from '@/components/charts';

export interface MetricasRow extends Record<string, unknown> {
  mes: string;
  ventas_total: string;
  facturas_emitidas: string;
  clientes_unicos: string;
  ticket_promedio: string;
  ticket_promedio_usd: string;
}

export interface CxCRow extends Record<string, unknown> {
  total: string;
  vencido: string;
}

interface DashboardKpisProps {
  metricas: MetricasRow[];
  cxcTotales: CxCRow | null;
  stockCritico: number;
  ventasPorMoneda: { moneda: string; total: string }[];
  companySlug: string;
}

export function DashboardKpis({
  metricas,
  cxcTotales,
  stockCritico,
  ventasPorMoneda,
  companySlug,
}: DashboardKpisProps) {
  const mesActual = metricas[metricas.length - 1];
  const cxcVencido = Number(cxcTotales?.vencido ?? 0);

  const ventasUSD = Number(ventasPorMoneda.find((v) => v.moneda === 'USD')?.total ?? 0);
  const ventasPEN = Number(ventasPorMoneda.find((v) => v.moneda === 'PEN')?.total ?? 0);

  // Compute date range for current month (YYYY-MM-DD format)
  const now = new Date();
  const mesActualStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const finDeMesStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      <Link
        href={`/${companySlug}/reportes/ventas?desde=${mesActualStr}&hasta=${finDeMesStr}&moneda=USD`}
        className="block rounded-lg transition-opacity hover:opacity-80"
      >
        <KpiCard
          label="Ventas USD (mes)"
          value={ventasUSD}
          format="currency"
          currency="USD"
          subtitle="dólares"
        />
      </Link>
      <Link
        href={`/${companySlug}/reportes/ventas?desde=${mesActualStr}&hasta=${finDeMesStr}&moneda=PEN`}
        className="block rounded-lg transition-opacity hover:opacity-80"
      >
        <KpiCard
          label="Ventas PEN (mes)"
          value={ventasPEN}
          format="currency"
          subtitle={
            mesActual?.facturas_emitidas ? `${mesActual.facturas_emitidas} fact. emitidas` : 'soles'
          }
        />
      </Link>
      <Link
        href={`/${companySlug}/clientes`}
        className="block rounded-lg transition-opacity hover:opacity-80"
      >
        <KpiCard label="Clientes únicos" value={Number(mesActual?.clientes_unicos ?? 0)} />
      </Link>
      <Link
        href={`/${companySlug}/reportes/ventas?moneda=USD`}
        className="block rounded-lg transition-opacity hover:opacity-80"
      >
        <KpiCard
          label="Ticket USD"
          value={Number(mesActual?.ticket_promedio_usd ?? 0)}
          format="currency"
          currency="USD"
          subtitle="promedio por factura"
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
