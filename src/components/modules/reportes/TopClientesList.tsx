import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TopClienteRow {
  cliente_id: string;
  razon_social: string;
  monto_total: string;
}

interface TopClientesListProps {
  data: TopClienteRow[];
  companySlug: string;
}

function formatCurrency(v: number): string {
  return `S/ ${v.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function TopClientesList({ data, companySlug }: TopClientesListProps) {
  const items = data.map((r) => ({
    name: r.razon_social,
    value: Number(r.monto_total),
    href: `/${companySlug}/clientes/${r.cliente_id}`,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Top clientes · 12 meses</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <p className="py-6 text-center text-xs text-orion-fg-muted">Sin datos de facturación</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.href} className="flex items-center gap-3 text-sm">
                <div className="min-w-0 flex-1">
                  <Link
                    href={item.href}
                    className="mb-1 block truncate text-xs font-medium text-orion-fg hover:text-tenant-accent hover:underline"
                    title={item.name}
                  >
                    {item.name}
                  </Link>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-orion-bg-muted">
                    <div
                      className="bg-orion-info h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${items[0] && items[0].value > 0 ? Math.round((item.value / items[0].value) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="w-24 shrink-0 text-right text-xs font-semibold tabular-nums text-orion-fg">
                  {formatCurrency(item.value)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
