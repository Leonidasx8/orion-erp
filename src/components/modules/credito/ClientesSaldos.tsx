import Link from 'next/link';
import { Inbox } from 'lucide-react';
import { Money } from '@/components/shared/Money';
import { cn } from '@/lib/utils';

export type ClienteSaldoRow = {
  clienteId: string;
  nombreCliente: string;
  lineaCredito: number;
  saldoPendiente: number;
  saldoVencido: number;
  diasMasVencido: number;
  bloqueado: boolean;
  moneda: string;
};

function EstadoCreditoBadge({ bloqueado, vencido }: { bloqueado: boolean; vencido: number }) {
  if (bloqueado) {
    return (
      <span className="inline-flex items-center rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-medium text-danger-fg">
        Bloqueado
      </span>
    );
  }
  if (vencido > 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-medium text-warn-fg">
        Con mora
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success-fg">
      Al día
    </span>
  );
}

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
            <th className="px-4 py-3 text-right">Línea crédito</th>
            <th className="px-4 py-3 text-right">Saldo pendiente</th>
            <th className="px-4 py-3 text-right">Saldo vencido</th>
            <th className="px-4 py-3 text-right">Días más vencido</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-orion-border">
          {rows.map((r) => (
            <tr key={r.clienteId} className="transition-colors hover:bg-orion-bg-subtle">
              <td className="px-4 py-3">
                <Link
                  href={`/${companySlug}/credito/clientes/${r.clienteId}`}
                  className="text-orion-accent font-medium hover:underline"
                >
                  {r.nombreCliente}
                </Link>
              </td>
              <td className="px-4 py-3 text-right">
                <Money value={r.lineaCredito} ccy={r.moneda as 'PEN' | 'USD'} />
              </td>
              <td className="px-4 py-3 text-right font-medium">
                <Money value={r.saldoPendiente} ccy={r.moneda as 'PEN' | 'USD'} />
              </td>
              <td
                className={cn(
                  'px-4 py-3 text-right font-medium',
                  r.saldoVencido > 0 ? 'text-danger-fg' : 'text-orion-fg-muted'
                )}
              >
                <Money value={r.saldoVencido} ccy={r.moneda as 'PEN' | 'USD'} />
              </td>
              <td
                className={cn(
                  'px-4 py-3 text-right tabular-nums',
                  r.diasMasVencido > 0 ? 'font-medium text-danger-fg' : 'text-orion-fg-muted'
                )}
              >
                {r.diasMasVencido > 0 ? `${r.diasMasVencido}d` : '—'}
              </td>
              <td className="px-4 py-3">
                <EstadoCreditoBadge bloqueado={r.bloqueado} vencido={r.saldoVencido} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
