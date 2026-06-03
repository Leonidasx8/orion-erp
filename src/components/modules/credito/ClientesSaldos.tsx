import Link from 'next/link';
import { Inbox, MoreHorizontal } from 'lucide-react';
import { Money } from '@/components/shared/Money';
import { cn } from '@/lib/utils';

export type ClienteSaldoRow = {
  clienteId: string;
  nombreCliente: string;
  lineaCredito: number;
  saldoPendiente: number; // utilizado = total owed
  saldoVencido: number;
  diasMasVencido: number;
  bloqueado: boolean;
  moneda: string;
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
            <th className="px-4 py-3 text-right">Línea</th>
            <th className="px-4 py-3 text-right">Utilizado</th>
            <th className="px-4 py-3">Uso</th>
            <th className="px-4 py-3 text-right">Por vencer</th>
            <th className="px-4 py-3 text-right">Vencido</th>
            <th className="px-4 py-3 text-right">Días vencido</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-orion-border">
          {rows.map((r) => {
            const pct =
              r.lineaCredito > 0
                ? Math.min(100, Math.round((r.saldoPendiente / r.lineaCredito) * 100))
                : 0;
            const barColor = pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-warn' : 'bg-success';

            const porVencer = Math.max(0, r.saldoPendiente - r.saldoVencido);

            const diasColor =
              r.diasMasVencido > 60
                ? 'text-danger-fg'
                : r.diasMasVencido >= 30
                  ? 'text-warn-fg'
                  : 'text-orion-fg';

            return (
              <tr key={r.clienteId} className="transition-colors hover:bg-orion-bg-subtle">
                {/* Cliente */}
                <td className="px-4 py-3">
                  <Link
                    href={`/${companySlug}/credito/clientes/${r.clienteId}`}
                    className="text-orion-accent font-medium hover:underline"
                  >
                    {r.nombreCliente}
                  </Link>
                </td>

                {/* Línea crédito */}
                <td className="px-4 py-3 text-right">
                  <Money value={r.lineaCredito} ccy={r.moneda as 'PEN' | 'USD'} />
                </td>

                {/* Utilizado */}
                <td className="px-4 py-3 text-right font-medium">
                  <Money value={r.saldoPendiente} ccy={r.moneda as 'PEN' | 'USD'} />
                </td>

                {/* Uso: progress bar + % */}
                <td className="px-4 py-3">
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

                {/* Por vencer */}
                <td className="px-4 py-3 text-right">
                  {porVencer > 0 ? (
                    <Money value={porVencer} ccy={r.moneda as 'PEN' | 'USD'} />
                  ) : (
                    <span className="text-orion-fg-faint">—</span>
                  )}
                </td>

                {/* Vencido */}
                <td
                  className={cn(
                    'px-4 py-3 text-right font-medium',
                    r.saldoVencido > 0 ? 'text-danger-fg' : 'text-orion-fg-muted'
                  )}
                >
                  <Money value={r.saldoVencido} ccy={r.moneda as 'PEN' | 'USD'} />
                </td>

                {/* Días vencido */}
                <td
                  className={cn(
                    'px-4 py-3 text-right tabular-nums',
                    r.diasMasVencido > 0 ? diasColor : 'text-orion-fg-muted'
                  )}
                >
                  {r.diasMasVencido > 0 ? `${r.diasMasVencido}d` : '—'}
                </td>

                {/* Total = saldoPendiente */}
                <td className="px-4 py-3 text-right font-medium">
                  <Money value={r.saldoPendiente} ccy={r.moneda as 'PEN' | 'USD'} />
                </td>

                {/* Acciones */}
                <td className="px-4 py-3">
                  {r.saldoVencido > 0 ? (
                    <Link
                      href={`/${companySlug}/credito/pagos/nuevo?clienteId=${r.clienteId}`}
                      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-danger-soft bg-danger-soft px-2.5 text-[12px] font-medium text-danger-fg hover:opacity-80"
                    >
                      Cobrar
                    </Link>
                  ) : (
                    <span className="text-orion-fg-faint">
                      <MoreHorizontal size={14} />
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
