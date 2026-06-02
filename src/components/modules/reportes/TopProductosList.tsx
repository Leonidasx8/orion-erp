import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TopProductoRow {
  producto_id: string;
  nombre: string;
  monto_total: string;
}

interface TopProductosListProps {
  data: TopProductoRow[];
  companySlug: string;
}

function formatCurrency(v: number): string {
  return `S/ ${v.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function TopProductosList({ data, companySlug }: TopProductosListProps) {
  const maxValue = data.length > 0 ? Number(data[0].monto_total) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Top productos · 12 meses</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {data.length === 0 ? (
          <p className="py-6 text-center text-xs text-orion-fg-muted">Sin datos de facturación</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.map((r) => {
              const value = Number(r.monto_total);
              const pct = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
              return (
                <li key={r.producto_id} className="flex items-center gap-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/${companySlug}/productos/${r.producto_id}`}
                      className="mb-1 block truncate text-xs font-medium text-orion-fg hover:text-tenant-accent hover:underline"
                      title={r.nombre}
                    >
                      {r.nombre}
                    </Link>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-orion-bg-muted">
                      <div
                        className="bg-orion-info h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-24 shrink-0 text-right text-xs font-semibold tabular-nums text-orion-fg">
                    {formatCurrency(value)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
