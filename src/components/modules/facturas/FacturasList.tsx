'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, Clock, Cloud, Receipt, X } from 'lucide-react';
import { EstadoBadge } from '@/components/shared/EstadoBadge';
import { Money } from '@/components/shared/Money';
import { AnulacionCountdown, formatDuracion } from './AnulacionCountdown';
import type { Estado } from '@/components/shared/EstadoBadge';

export type FacturaRow = {
  id: string;
  numeroCompleto: string;
  tipoDocumento: string;
  fechaEmision: string;
  fechaEmisionIso: string;
  clienteRazon: string;
  moneda: string;
  total: string;
  estado: string;
  estadoSunat: string;
  cotizacionNumero?: string | null;
  /** Tiempo entre la emisión de la factura y su NC de anulación aceptada */
  anuladaTrasMs?: number | null;
};

const FILTROS = [
  { key: 'todas', label: 'Todas' },
  { key: 'pendiente', label: 'Pendiente SUNAT' },
  { key: 'aceptada', label: 'Aceptadas' },
  { key: 'rechazada', label: 'Rechazadas' },
  { key: 'anulada', label: 'Anuladas' },
] as const;

export function FacturasList({
  rows,
  filtroActivo,
  total,
  page,
  companySlug,
  sunatCounts,
}: {
  rows: FacturaRow[];
  filtroActivo: string;
  total: number;
  page: number;
  companySlug: string;
  sunatCounts?: { aceptadas: number; pendientes: number; rechazadas: number; anuladas: number };
}) {
  const pathname = usePathname();
  const base = `/${companySlug}/facturas`;

  return (
    <div className="flex flex-col gap-4">
      {/* SUNAT health strip */}
      {sunatCounts && (
        <div className="grid grid-cols-5 gap-3 rounded-lg border border-orion-border bg-orion-bg p-3">
          {(
            [
              {
                label: 'Aceptadas',
                value: sunatCounts.aceptadas,
                tone: 'success',
                icon: <Check size={13} />,
              },
              {
                label: 'Pendientes',
                value: sunatCounts.pendientes,
                tone: 'warn',
                icon: <Clock size={13} />,
              },
              {
                label: 'Rechazadas',
                value: sunatCounts.rechazadas,
                tone: 'danger',
                icon: <X size={13} />,
              },
              {
                label: 'Anuladas',
                value: sunatCounts.anuladas,
                tone: 'muted',
                icon: <X size={13} />,
              },
              {
                label: 'Estado SUNAT',
                value: 'OK',
                tone: 'success',
                icon: <Cloud size={13} />,
                sub: 'conexión activa',
              },
            ] as const
          ).map((k, i) => {
            const bg =
              k.tone === 'success'
                ? 'bg-success-soft text-success-fg'
                : k.tone === 'warn'
                  ? 'bg-warn-soft text-warn-fg'
                  : k.tone === 'danger'
                    ? 'bg-danger-soft text-danger-fg'
                    : 'bg-orion-bg-muted text-orion-fg-muted';
            return (
              <div key={i}>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded ${bg}`}
                  >
                    {k.icon}
                  </span>
                  <span className="text-[11.5px] text-orion-fg-muted">{k.label}</span>
                </div>
                <div className="mt-1 text-[20px] font-semibold text-orion-fg">{k.value}</div>
                {'sub' in k && k.sub && (
                  <div className="text-[10.5px] text-orion-fg-faint">{k.sub}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <Link
            key={f.key}
            href={f.key === 'todas' ? base : `${base}?estado=${f.key}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filtroActivo === f.key
                ? 'border-tenant-accent bg-tenant-accent text-white'
                : 'hover:border-tenant-accent/50 border-orion-border bg-orion-bg-subtle text-orion-fg-muted'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Tabla */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-orion-fg-muted">
          <Receipt size={40} className="opacity-30" />
          <p className="text-sm">
            No hay facturas{filtroActivo !== 'todas' ? ' en este estado' : ''}.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-orion-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-orion-border bg-orion-bg-subtle text-left text-xs uppercase tracking-wide text-orion-fg-muted">
                <th className="px-4 py-3">Número</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Cotización origen</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Estado doc.</th>
                <th className="px-4 py-3">Estado SUNAT</th>
                <th className="px-4 py-3">Anulación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orion-border">
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer transition-colors hover:bg-orion-bg-subtle"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`${base}/${r.id}`}
                      className="font-mono font-medium text-tenant-accent-fg hover:underline"
                    >
                      {r.numeroCompleto}
                    </Link>
                    <span className="ml-2 text-xs text-orion-fg-muted">
                      {r.tipoDocumento === '01' ? 'Factura' : 'Boleta'}
                    </span>
                  </td>
                  <td className="max-w-48 truncate px-4 py-3 text-orion-fg">{r.clienteRazon}</td>
                  <td className="px-4 py-3 font-mono text-xs text-orion-fg-muted">
                    {r.cotizacionNumero ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-orion-fg-muted">{r.fechaEmision}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    <Money value={parseFloat(r.total)} ccy={r.moneda as 'PEN' | 'USD'} />
                  </td>
                  <td className="px-4 py-3">
                    <EstadoBadge estado={r.estado as Estado} />
                  </td>
                  <td className="px-4 py-3">
                    <EstadoBadge estado={r.estadoSunat as Estado} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {r.estadoSunat === 'anulada' ? (
                      r.anuladaTrasMs != null ? (
                        <span
                          className="text-xs text-danger-fg"
                          title="Tiempo entre la emisión de la factura y la aceptación SUNAT de su NC de anulación"
                        >
                          Anulada tras {formatDuracion(r.anuladaTrasMs)}
                        </span>
                      ) : (
                        <span className="text-xs text-orion-fg-faint">Anulada</span>
                      )
                    ) : r.estadoSunat === 'rechazada' ? (
                      <span className="text-xs text-orion-fg-faint">—</span>
                    ) : (
                      <AnulacionCountdown fechaEmision={r.fechaEmisionIso} compact />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {total > 20 && (
        <div className="flex items-center justify-between text-xs text-orion-fg-muted">
          <span>{total} facturas</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`${pathname}?page=${page - 1}`}
                className="text-tenant-accent-fg hover:underline"
              >
                ← Anterior
              </Link>
            )}
            {rows.length === 20 && (
              <Link
                href={`${pathname}?page=${page + 1}`}
                className="text-tenant-accent-fg hover:underline"
              >
                Siguiente →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
