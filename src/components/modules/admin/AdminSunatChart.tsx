'use client';

import { AreaChart, Area, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';

const AREA_DATA = [
  12, 18, 22, 17, 28, 32, 40, 35, 42, 38, 52, 48, 55, 60, 58, 72, 68, 80, 72, 85, 90, 86, 94, 102,
  98, 108, 112, 118, 122, 128,
].map((v, i) => ({ day: i + 1, value: v }));

const PIE_DATA = [
  { label: 'Idex', value: 612, color: '#0070f3' },
  { label: 'Agroalves', value: 235, color: '#16a34a' },
];

const TOTAL = PIE_DATA.reduce((s, d) => s + d.value, 0);

export function AdminSunatChart() {
  return (
    <>
      {/* Area chart */}
      <div className="px-4 pb-0 pt-4">
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={AREA_DATA} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="sunatGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0070f3" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#0070f3" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{
                fontSize: 11,
                padding: '4px 8px',
                border: '1px solid hsl(var(--border))',
                borderRadius: 6,
                background: 'hsl(var(--background))',
              }}
              formatter={(value: number) => [value, 'docs']}
              labelFormatter={(label: number) => `Día ${label}`}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#0070f3"
              strokeWidth={1.5}
              fill="url(#sunatGradient)"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-1.5 flex justify-between pb-3 text-[11px] text-muted-foreground">
          <span>1 abr</span>
          <span>29 abr</span>
        </div>
      </div>

      <div className="border-t" />

      {/* Donut distribution */}
      <div className="px-4 py-3">
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
          Distribución por tenant
        </p>
        <div className="flex items-center gap-3">
          <PieChart width={80} height={80}>
            <Pie
              data={PIE_DATA}
              dataKey="value"
              cx={40}
              cy={40}
              innerRadius={24}
              outerRadius={38}
              strokeWidth={0}
              startAngle={90}
              endAngle={-270}
            >
              {PIE_DATA.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
          <div className="flex flex-1 flex-col gap-1.5">
            {PIE_DATA.map((entry) => (
              <div key={entry.label} className="flex items-center gap-1.5 text-xs">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: entry.color }}
                />
                <span>{entry.label}</span>
                <span className="ml-auto text-muted-foreground">
                  {entry.value.toLocaleString('es-PE')} · {Math.round((entry.value / TOTAL) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
