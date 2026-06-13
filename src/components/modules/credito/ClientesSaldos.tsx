import Link from 'next/link';
import { Inbox, MoreHorizontal } from 'lucide-react';
import { Money } from '@/components/shared/Money';
import { cn } from '@/lib/utils';

export type ClienteSaldoRow = {
  clienteId: string;
  nombreCliente: string;
  // USD
  lineaCreditoUsd: number;
  saldoUsd: number;
  saldoVencidoUsd: number;
  bloqueado: boolean;
  // PEN
  lineaCreditoPen: number;
  saldoPen: number;
  saldoVencidoPen: number;
  bloqueadoPen: boolean;
  // Shared
  diasMasVencido: number;
};

export function ClientesSaldos({
  rows,
  companySlug,
}: {
  rows: ClienteSaldoRow[];
  companySlug: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-orion-fg-muted">
        <Inbox size={40} className="opacity-30" />
        <p className="text-sm">No hay clientes con saldo pendiente.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-orion-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-orion-border bg-orion-bg-subtle text-left text-xs uppercase tracking-wide text-orion-fg-muted">
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Mon.</th>
            <th className="px-4 py-3 text-right">Línea</th>
            <th className="px-4 py-3 text-right">Utilizado</th>
            <th className="px-4 py-3">Uso</th>
            <th className="px-4 py-3 text-right">Vencido</th>
            <th className="px-4 py-3 text-right">Días venc.</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, clientIdx) => {
            const currencies: Array<{
              ccy: 'USD' | 'PEN';
              linea: number;
              saldo: number;
              vencido: number;
              bloqueado: boolean;
            }> = [
              {
                ccy: 'USD',
                linea: r.lineaCreditoUsd,
                saldo: r.saldoUsd,
                vencido: r.saldoVencidoUsd,
                bloqueado: r.bloqueado,
              },
              {
                ccy: 'PEN',
                linea: r.lineaCreditoPen,
                saldo: r.saldoPen,
                vencido: r.saldoVencidoPen,
                bloqueado: r.bloqueadoPen,
              },
            ];

            return currencies.map((c, idx) => {
              const pct = c.linea > 0 ? Math.min(100, Math.round((c.saldo / c.linea) * 100)) : 0;
              const barColor = pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-warn' : 'bg-success';
              const diasColor =
                r.diasMasVencido > 60
                  ? 'text-danger-fg'
                  : r.diasMasVencido >= 30
                    ? 'text-warn-fg'
                    : 'text-orion-fg';

              return (
                <tr
                  key={`${r.clienteId}-${c.ccy}`}
                  className={cn(
                    'transition-colors hover:brightness-95',
                    idx === 1 && 'border-b border-orion-border',
                    clientIdx % 2 === 0 ? 'bg-orion-bg' : 'bg-orion-bg-subtle/40'
                  )}
                >
                  <td className="px-4 py-2.5">
                    {idx === 0 ? (
                      <Link
                        href={`/${companySlug}/credito/clientes/${r.clienteId}`}
                        className="text-orion-accent font-medium hover:underline"
                      >
                        {r.nombreCliente}
                      </Link>
                    ) : (
                      <span className="text-orion-fg-faint">↳</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold',
                        c.ccy === 'USD'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      )}
                    >
                      {c.ccy}
                    </span>
                    {c.bloqueado && (
                      <span className="ml-1 inline-flex items-center rounded bg-danger-soft px-1 py-0.5 text-[10px] font-semibold text-danger-fg">
                        BLQ
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Money value={c.linea} ccy={c.ccy} />
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    <Money value={c.saldo} ccy={c.ccy} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-orion-bg-muted">
                        <div
                          className={cn('h-full rounded-full', barColor)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          'text-[11.5px] tabular-nums',
                          pct >= 90
                            ? 'text-danger-fg'
                            : pct >= 70
                              ? 'text-warn-fg'
                              : 'text-orion-fg-muted'
                        )}
                      >
                        {pct}%
                      </span>
                    </div>
                  </td>
                  <td
                    className={cn(
                      'px-4 py-2.5 text-right font-medium',
                      c.vencido > 0 ? 'text-danger-fg' : 'text-orion-fg-muted'
                    )}
                  >
                    <Money value={c.vencido} ccy={c.ccy} />
                  </td>
                  <td
                    className={cn(
                      'px-4 py-2.5 text-right tabular-nums',
                      r.diasMasVencido > 0 ? diasColor : 'text-orion-fg-muted'
                    )}
                  >
                    {idx === 0 && r.diasMasVencido > 0
                      ? `${r.diasMasVencido}d`
                      : idx === 0
                        ? '—'
                        : ''}
                  </td>
                  <td className="px-4 py-2.5">
                    {idx === 0 && (r.saldoUsd > 0 || r.saldoPen > 0) ? (
                      <Link
                        href={`/${companySlug}/credito/pagos/nuevo?clienteId=${r.clienteId}`}
                        className={cn(
                          'inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium hover:opacity-80',
                          r.saldoVencidoUsd > 0 || r.saldoVencidoPen > 0
                            ? 'border-danger-soft bg-danger-soft text-danger-fg'
                            : 'border-orion-border bg-orion-bg-subtle text-orion-fg'
                        )}
                      >
                        Registrar pago
                      </Link>
                    ) : (
                      <span className="text-orion-fg-faint">
                        {idx === 0 ? <MoreHorizontal size={14} /> : ''}
                      </span>
                    )}
                  </td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}
