'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChartWrapper } from '@/components/charts';

interface PipelineRow {
  estado: string;
  cantidad: string;
  valor_total: string;
}

interface PipelineChartProps {
  data: PipelineRow[];
}

const ESTADO_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  vencida: 'Vencida',
  convertida: 'Convertida',
};

function formatCurrency(v: number): string {
  if (v >= 1_000_000) return `US$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `US$ ${(v / 1_000).toFixed(0)}K`;
  return `US$ ${v.toFixed(0)}`;
}

export function PipelineChart({ data }: PipelineChartProps) {
  const chartData = data
    .filter((r) => Number(r.valor_total) > 0)
    .map((r) => ({
      name: ESTADO_LABELS[r.estado] ?? r.estado,
      value: Number(r.valor_total),
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Pipeline cotizaciones</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <BarChartWrapper
          data={chartData}
          color="#7c3aed"
          height={220}
          formatValue={formatCurrency}
        />
      </CardContent>
    </Card>
  );
}
