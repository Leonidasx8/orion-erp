import type React from 'react';
import { cn } from '@/lib/utils';

export function KpiRow({
  cols = 6,
  children,
}: {
  cols?: 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
}) {
  const colMap: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  };
  return <div className={cn('grid gap-3', colMap[cols])}>{children}</div>;
}

export function Kpi({
  label,
  icon,
  children,
  delta,
  deltaTone,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  delta?: React.ReactNode;
  deltaTone?: 'up' | 'down' | 'info' | 'warn' | 'neutral';
}) {
  const toneClass: Record<string, string> = {
    up: 'text-success-fg',
    down: 'text-danger-fg',
    info: 'text-info-fg',
    warn: 'text-warn-fg',
    neutral: 'text-orion-fg-muted',
  };
  return (
    <div className="min-w-0 rounded-lg border border-orion-border bg-orion-bg p-3.5 shadow-orion-1">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-orion-fg-muted">
        {icon && <span className="grid h-3 w-3 place-items-center">{icon}</span>}
        {label}
      </div>
      <div className="mt-1.5 text-[22px] font-semibold tracking-tight text-orion-fg">
        {children}
      </div>
      {delta !== undefined && (
        <div
          className={cn(
            'mt-1 flex items-center gap-1 text-[11.5px]',
            toneClass[deltaTone ?? 'neutral']
          )}
        >
          {delta}
        </div>
      )}
    </div>
  );
}
