import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: number | string;
  delta?: number; // positivo = crecimiento, negativo = caída
  format?: 'number' | 'currency' | 'percentage';
  currency?: 'PEN' | 'USD';
  className?: string;
  subtitle?: string;
  subtitleClassName?: string;
}

export function KpiCard({
  label,
  value,
  delta,
  format = 'number',
  currency = 'PEN',
  className,
  subtitle,
  subtitleClassName,
}: KpiCardProps) {
  const formatted =
    format === 'currency'
      ? `${currency} ${Number(value).toLocaleString('es-PE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : format === 'percentage'
        ? `${Number(value).toFixed(1)}%`
        : typeof value === 'number'
          ? value.toLocaleString('es-PE')
          : value;

  return (
    <Card className={cn('', className)}>
      <CardContent className="p-4">
        <CardDescription className="text-xs">{label}</CardDescription>
        <div className="mt-1 text-2xl font-bold">{formatted}</div>
        {subtitle && (
          <p className={cn('mt-0.5 text-xs', subtitleClassName ?? 'text-muted-foreground')}>
            {subtitle}
          </p>
        )}
        {delta !== undefined && (
          <div
            className={cn(
              'mt-1 flex items-center gap-1 text-xs',
              delta >= 0 ? 'text-green-600' : 'text-red-600'
            )}
          >
            {delta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            <span>{Math.abs(delta).toFixed(1)}%</span>
            <span className="text-muted-foreground">vs mes anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
