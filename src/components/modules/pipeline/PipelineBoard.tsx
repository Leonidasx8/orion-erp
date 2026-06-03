'use client';

import Link from 'next/link';
import { Money } from '@/components/shared/Money';
import { cn } from '@/lib/utils';

export type PipelineCard = {
  id: string;
  numero: string;
  cliente: string;
  total: number;
  moneda: string;
  comercial: string;
  dias: number;
  etapa: Etapa;
};

type Etapa =
  | 'borrador'
  | 'enviada'
  | 'aceptada'
  | 'oc'
  | 'factura'
  | 'cobrada'
  | 'guia'
  | 'rechazada';

const COLUMNAS: {
  etapa: Etapa;
  label: string;
  sub: string;
  color: string;
  dot: string;
}[] = [
  {
    etapa: 'borrador',
    label: 'Borrador',
    sub: 'Pendiente de envío',
    color: 'bg-orion-bg-muted/60',
    dot: 'bg-orion-fg-faint',
  },
  {
    etapa: 'enviada',
    label: 'Enviada',
    sub: 'Esperando respuesta',
    color: 'bg-blue-50',
    dot: 'bg-blue-400',
  },
  {
    etapa: 'aceptada',
    label: 'Aprobada',
    sub: 'Cliente aceptó',
    color: 'bg-emerald-50',
    dot: 'bg-emerald-400',
  },
  {
    etapa: 'oc',
    label: 'Compra generada',
    sub: 'OC al proveedor',
    color: 'bg-amber-50',
    dot: 'bg-amber-400',
  },
  {
    etapa: 'factura',
    label: 'Facturada',
    sub: 'Factura emitida',
    color: 'bg-violet-50',
    dot: 'bg-violet-400',
  },
  {
    etapa: 'guia',
    label: 'Guía emitida',
    sub: 'En tránsito',
    color: 'bg-cyan-50',
    dot: 'bg-cyan-400',
  },
  {
    etapa: 'cobrada',
    label: 'Cobrada',
    sub: 'SUNAT aceptada',
    color: 'bg-green-50',
    dot: 'bg-green-500',
  },
  {
    etapa: 'rechazada',
    label: 'Rechazada',
    sub: 'Perdida / Vencida',
    color: 'bg-red-50',
    dot: 'bg-red-400',
  },
];

function totalCol(cards: PipelineCard[]) {
  return cards.reduce((s, c) => s + c.total, 0);
}

export function PipelineBoard({
  cards,
  companySlug,
}: {
  cards: PipelineCard[];
  companySlug: string;
}) {
  const byEtapa = new Map<Etapa, PipelineCard[]>();
  for (const col of COLUMNAS) byEtapa.set(col.etapa, []);
  for (const c of cards) {
    byEtapa.get(c.etapa)?.push(c);
  }

  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex min-w-[1100px] gap-3">
        {COLUMNAS.map((col) => {
          const colCards = byEtapa.get(col.etapa) ?? [];
          const colTotal = totalCol(colCards);

          return (
            <div key={col.etapa} className="flex w-44 shrink-0 flex-col gap-2">
              {/* Column header */}
              <div className={cn('rounded-lg px-3 py-2', col.color)}>
                <div className="flex items-center gap-1.5">
                  <span className={cn('h-2 w-2 rounded-full', col.dot)} />
                  <span className="text-[12px] font-semibold text-orion-fg">{col.label}</span>
                  <span className="ml-auto text-[11px] tabular-nums text-orion-fg-faint">
                    {colCards.length}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] text-orion-fg-faint">{col.sub}</div>
                {colCards.length > 0 && (
                  <div className="mt-1 text-[11px] font-medium tabular-nums text-orion-fg-muted">
                    S/{' '}
                    {colTotal.toLocaleString('es-PE', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </div>
                )}
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-1.5">
                {colCards.length === 0 && (
                  <div className="rounded-lg border border-dashed border-orion-border py-5 text-center text-[10px] text-orion-fg-faint">
                    Vacío
                  </div>
                )}
                {colCards.map((card) => (
                  <Link
                    key={card.id}
                    href={`/${companySlug}/cotizaciones/${card.id}`}
                    className="hover:border-tenant-accent/40 block rounded-lg border border-orion-border bg-orion-bg p-2.5 shadow-orion-1 transition-all hover:shadow-orion-2"
                  >
                    <div className="mb-1 font-mono text-[11px] font-semibold text-orion-fg">
                      {card.numero}
                    </div>
                    <div className="mb-1.5 truncate text-[11px] leading-tight text-orion-fg-muted">
                      {card.cliente}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium tabular-nums text-orion-fg">
                        <Money value={card.total} ccy={card.moneda} dp={0} />
                      </span>
                      <span
                        className={cn(
                          'text-[10px] tabular-nums',
                          card.dias > 30 ? 'text-warn-fg' : 'text-orion-fg-faint'
                        )}
                      >
                        {card.dias}d
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
