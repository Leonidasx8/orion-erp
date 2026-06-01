'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export type AgingBuckets = {
  bucket0a30: number;
  bucket31a60: number;
  bucket61a90: number;
  bucket90mas: number;
};

const BUCKETS = [
  { key: 'bucket0a30', label: '0–30 días', color: '#22c55e' },
  { key: 'bucket31a60', label: '31–60 días', color: '#eab308' },
  { key: 'bucket61a90', label: '61–90 días', color: '#f97316' },
  { key: 'bucket90mas', label: '+90 días', color: '#ef4444' },
] as const;

function formatSoles(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

export function AgingChart({
  buckets,
  moneda = 'PEN',
}: {
  buckets: AgingBuckets;
  moneda?: string;
}) {
  const data = BUCKETS.map((b) => ({
    name: b.label,
    color: b.color,
    value: buckets[b.key],
  }));

  const total = data.reduce((acc, d) => acc + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-orion-fg-faint">
        Sin saldos pendientes
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--orion-border, #e5e7eb)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: 'var(--orion-fg-muted, #6b7280)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatSoles}
            tick={{ fontSize: 11, fill: 'var(--orion-fg-muted, #6b7280)' }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            formatter={(value: number) => [
              `${moneda} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              'Saldo',
            ]}
            contentStyle={{
              fontSize: 12,
              borderRadius: 6,
              border: '1px solid var(--orion-border, #e5e7eb)',
              background: 'var(--orion-bg, #fff)',
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Leyenda debajo */}
      <div className="flex flex-wrap justify-center gap-4">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs text-orion-fg-muted">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
            <span>{d.name}</span>
            <span className="font-medium tabular-nums text-orion-fg">
              {moneda}{' '}
              {d.value.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
