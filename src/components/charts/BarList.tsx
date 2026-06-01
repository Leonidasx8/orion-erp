import { cn } from '@/lib/utils';

interface BarListItem {
  name: string;
  value: number;
}

interface BarListProps {
  items: BarListItem[];
  formatValue?: (v: number) => string;
  limit?: number;
  className?: string;
}

export function BarList({ items, formatValue, limit, className }: BarListProps) {
  const visible = limit !== undefined ? items.slice(0, limit) : items;
  const max = visible.reduce((acc, item) => Math.max(acc, item.value), 0);

  return (
    <ul className={cn('flex flex-col gap-2', className)}>
      {visible.map((item) => {
        const pct = max > 0 ? Math.round((item.value / max) * 100) : 0;
        const displayValue = formatValue
          ? formatValue(item.value)
          : item.value.toLocaleString('es-PE');

        return (
          <li key={item.name} className="flex items-center gap-3 text-sm">
            {/* Name + bar */}
            <div className="min-w-0 flex-1">
              <div className="mb-1 truncate text-xs font-medium text-orion-fg" title={item.name}>
                {item.name}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-orion-bg-muted">
                <div
                  className="bg-orion-info h-full rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            {/* Value */}
            <span className="w-24 shrink-0 text-right text-xs font-semibold tabular-nums text-orion-fg">
              {displayValue}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
