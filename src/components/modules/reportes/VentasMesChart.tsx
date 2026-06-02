'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChartWrapper } from '@/components/charts';

const MESES_ABREV = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

interface VentasMesChartProps {
  data: { mes: string; ventas_total: string }[];
}

function formatCurrency(v: number): string {
  if (v >= 1_000_000) return `S/ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `S/ ${(v / 1_000).toFixed(0)}K`;
  return `S/ ${v.toFixed(0)}`;
}

export function VentasMesChart({ data }: VentasMesChartProps) {
  const chartData = data.map((row) => {
    const d = new Date(row.mes);
    const name = MESES_ABREV[d.getUTCMonth()] ?? row.mes;
    return { name, value: Number(row.ventas_total) };
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Ventas · 12 meses</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <BarChartWrapper
          data={chartData}
          color="#0284c7"
          height={220}
          formatValue={formatCurrency}
        />
      </CardContent>
    </Card>
  );
}
