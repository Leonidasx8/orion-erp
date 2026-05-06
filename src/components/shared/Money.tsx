import { cn } from '@/lib/utils';

export function Money({
  value,
  ccy = 'USD',
  dp = 2,
  className,
}: {
  value: number | string;
  ccy?: 'USD' | 'PEN' | string;
  dp?: number;
  className?: string;
}) {
  const v = Number(value).toLocaleString('en-US', {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
  return (
    <span className={cn('tabular-nums', className)}>
      <span className="mr-1 text-[0.85em] text-orion-fg-faint">{ccy}</span>
      {v}
    </span>
  );
}
