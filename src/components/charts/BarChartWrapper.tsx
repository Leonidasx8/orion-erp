'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BarChartWrapperProps {
  data: { name: string; value: number }[];
  color?: string;
  height?: number;
  formatValue?: (v: number) => string;
}

export function BarChartWrapper({
  data,
  color = '#0284c7',
  height = 240,
  formatValue,
}: BarChartWrapperProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatValue}
          width={56}
        />
        <Tooltip
          formatter={(value: number) => [
            formatValue ? formatValue(value) : value.toLocaleString('es-PE'),
            '',
          ]}
          contentStyle={{
            fontSize: 12,
            borderRadius: 6,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
          }}
          cursor={{ fill: '#f1f5f9' }}
        />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
