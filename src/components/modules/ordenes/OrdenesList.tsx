'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  MoreHorizontal,
  Plus,
  Search,
  User,
} from 'lucide-react';
import { Money } from '@/components/shared/Money';
import { EstadoBadge, type Estado } from '@/components/shared/EstadoBadge';
import { cn } from '@/lib/utils';

export type OrdenRow = {
  id: string;
  numero: string;
  proveedor: string;
  estado: Estado;
  fechaEmision: string;
  fechaEntrega: string | null;
  lineas: number;
  total: number;
  moneda: 'PEN' | 'USD' | string;
  recibidoPct: number; // 0..100
  compradorNombre?: string | null;
};

export type OrdenesListProps = {
  tenantSlug: string;
  rows: OrdenRow[];
  counts: {
    total: number;
    borrador: number;
    enviada: number;
    aprobada: number;
    recibida_parcial: number;
    recibida_total: number;
    cerrada: number;
  };
  pendienteUsd: number;
  canCreate: boolean;
  filtroActivo: 'todas' | Estado;
  page: number;
  pageSize: number;
};

export function OrdenesList({
  tenantSlug,
  rows,
  counts,
  pendienteUsd,
  canCreate,
  filtroActivo,
  page,
  pageSize,
}: OrdenesListProps) {
  const base = `/${tenantSlug}/ordenes`;
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const visibleRows = q
    ? rows.filter(
        (r) => r.numero.toLowerCase().includes(q) || r.proveedor.toLowerCase().includes(q)
      )
    : rows;

  const showingFrom = visibleRows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = (page - 1) * pageSize + visibleRows.length;

  const filtros: { key: 'todas' | Estado; label: string; n: number }[] = [
    { key: 'todas', label: 'Todas', n: counts.total },
    { key: 'borrador', label: 'Borrador', n: counts.borrador },
    { key: 'enviada', label: 'Enviada', n: counts.enviada },
    { key: 'aprobada', label: 'Aprobada', n: counts.aprobada },
    { key: 'recibida_parcial', label: 'Recibida parcial', n: counts.recibida_parcial },
    { key: 'recibida_total', label: 'Recibida total', n: counts.recibida_total },
    { key: 'cerrada', label: 'Cerrada', n: counts.cerrada },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-4">
        <div>
          <h1 className="m-0 text-[22px] font-semibold tracking-tight text-orion-fg">
            Compras a Proveedores
          </h1>
          <p className="mt-1 text-[12px] text-orion-fg-muted">
            {counts.total} compras · pendiente por recibir{' '}
            <Money value={pendienteUsd} ccy="USD" dp={0} />
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] font-medium text-orion-fg hover:bg-orion-bg-muted"
          >
            <Download size={13} />
            Exportar
          </button>
          {canCreate && (
            <Link
              href={`${base}/nueva`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-tenant-accent px-3 text-[13px] font-medium text-white hover:brightness-95"
            >
              <Plus size={13} />
              Nueva compra
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto">
        {filtros.map((f) => {
          const active = filtroActivo === f.key;
          const href = f.key === 'todas' ? base : `${base}?estado=${f.key}`;
          return (
            <Link
              key={f.key}
              href={href}
              className={cn(
                'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium',
                active
                  ? 'border-tenant-accent bg-tenant-accent-soft text-tenant-accent-fg'
                  : 'border-orion-border bg-orion-bg text-orion-fg-muted hover:bg-orion-bg-muted'
              )}
            >
              {f.label}
              <span className="rounded-full bg-orion-bg-muted px-1.5 text-[10.5px] tabular-nums">
                {f.n}
              </span>
            </Link>
          );
        })}
        <div className="ml-auto flex h-8 w-72 items-center gap-2 rounded-md border border-orion-border bg-orion-bg px-2.5">
          <Search size={13} className="text-orion-fg-muted" />
          <input
            placeholder="Buscar por número o proveedor…"
            className="w-full bg-transparent text-[12.5px] text-orion-fg outline-none placeholder:text-orion-fg-subtle"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-orion-border bg-orion-bg shadow-orion-1">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              <Th>Número</Th>
              <Th>Proveedor</Th>
              <Th>Estado</Th>
              <Th align="right">Líneas</Th>
              <Th>Recepción</Th>
              <Th align="right">Total</Th>
              <Th>Creado por</Th>
              <Th>Emisión</Th>
              <Th>Entrega</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={10} className="p-10 text-center text-orion-fg-muted">
                  {q ? 'Sin resultados para esa búsqueda.' : 'No hay compras en este filtro.'}
                </td>
              </tr>
            )}
            {visibleRows.map((r) => (
              <tr
                key={r.id}
                className="border-t border-orion-border transition-colors hover:bg-orion-bg-subtle"
              >
                <Td>
                  <Link
                    href={`${base}/${r.id}`}
                    className="font-mono text-[12px] font-medium text-orion-fg hover:text-tenant-accent"
                  >
                    {r.numero}
                  </Link>
                </Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <User size={11} className="text-orion-fg-muted" />
                    <span className="truncate">{r.proveedor}</span>
                  </div>
                </Td>
                <Td>
                  <EstadoBadge estado={r.estado} size="sm" />
                </Td>
                <Td align="right" className="tabular-nums">
                  {r.lineas}
                </Td>
                <Td className="min-w-[140px]">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-orion-bg-muted">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          r.recibidoPct >= 100
                            ? 'bg-success'
                            : r.recibidoPct > 0
                              ? 'bg-warn'
                              : 'bg-orion-border'
                        )}
                        style={{ width: `${Math.min(100, Math.max(0, r.recibidoPct))}%` }}
                      />
                    </div>
                    <span className="w-9 text-right text-[11px] tabular-nums text-orion-fg-muted">
                      {Math.round(r.recibidoPct)}%
                    </span>
                  </div>
                </Td>
                <Td align="right" className="tabular-nums text-orion-fg">
                  <Money value={r.total} ccy={r.moneda} dp={2} />
                </Td>
                <Td className="text-orion-fg-muted">{r.compradorNombre ?? '—'}</Td>
                <Td className="whitespace-nowrap text-orion-fg-muted">{r.fechaEmision}</Td>
                <Td className="whitespace-nowrap text-orion-fg-muted">{r.fechaEntrega ?? '—'}</Td>
                <Td>
                  <button
                    type="button"
                    className="grid h-7 w-7 place-items-center rounded-md text-orion-fg-muted hover:bg-orion-bg-muted hover:text-orion-fg"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[12px] text-orion-fg-muted">
        <span>
          {showingFrom}–{showingTo} de {q ? visibleRows.length : counts.total}
        </span>
        <div className="flex items-center gap-2">
          <PageBtn href={page > 1 ? `${base}?page=${page - 1}` : null}>
            <ChevronLeft size={13} />
          </PageBtn>
          <span className="tabular-nums">página {page}</span>
          <PageBtn href={showingTo < counts.total ? `${base}?page=${page + 1}` : null}>
            <ChevronRight size={13} />
          </PageBtn>
        </div>
      </div>
    </div>
  );
}

function Th({ children, align }: { children?: React.ReactNode; align?: 'right' }) {
  return (
    <th
      className={cn(
        'border-b border-orion-border bg-orion-bg-subtle px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-orion-fg-muted',
        align === 'right' ? 'text-right' : 'text-left'
      )}
    >
      {children}
    </th>
  );
}
function Td({
  children,
  align,
  className,
}: {
  children?: React.ReactNode;
  align?: 'right';
  className?: string;
}) {
  return (
    <td
      className={cn(
        'h-9 px-3 align-middle text-orion-fg',
        align === 'right' ? 'text-right tabular-nums' : '',
        className
      )}
    >
      {children}
    </td>
  );
}
function PageBtn({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) {
    return (
      <span className="grid h-7 w-7 place-items-center rounded-md text-orion-fg-faint">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="grid h-7 w-7 place-items-center rounded-md text-orion-fg-muted hover:bg-orion-bg-muted hover:text-orion-fg"
    >
      {children}
    </Link>
  );
}
