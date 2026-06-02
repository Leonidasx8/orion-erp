'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  MoreHorizontal,
  Plus,
  Search,
  User,
  Users,
} from 'lucide-react';
import { Money } from '@/components/shared/Money';
import { PageHead } from '@/components/shared/PageHead';
import { ModuleHelp } from '@/components/shared/ModuleHelp';
import { EstadoBadge, type Estado } from '@/components/shared/EstadoBadge';
import { cn } from '@/lib/utils';

export type CotizacionRow = {
  id: string;
  numero: string;
  cliente: string;
  estado: Estado;
  fechaEmision: string; // texto display: "27 abr"
  fechaVencimiento: string | null; // "30 abr" o null/"—"
  items: number;
  total: number;
  moneda: 'PEN' | 'USD' | string;
  comercial: string;
};

export type CotizacionesListProps = {
  tenantSlug: string;
  rows: CotizacionRow[];
  counts: {
    total: number;
    borrador: number;
    enviada: number;
    aceptada: number;
    rechazada: number;
    vencida: number;
    convertida: number;
  };
  pipelineUsd: number;
  canCreate: boolean;
  filtroActivo?: 'todas' | Estado;
  page?: number;
  pageSize?: number;
};

const FILTROS: { key: 'todas' | Estado; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'borrador', label: 'Borrador' },
  { key: 'enviada', label: 'Enviadas' },
  { key: 'aceptada', label: 'Aceptadas' },
  { key: 'rechazada', label: 'Rechazadas' },
  { key: 'vencida', label: 'Vencidas' },
  { key: 'convertida', label: 'Convertidas' },
];

export function CotizacionesList({
  tenantSlug,
  rows,
  counts,
  pipelineUsd,
  canCreate,
  filtroActivo = 'todas',
  page = 1,
  pageSize = 9,
}: CotizacionesListProps) {
  const base = `/${tenantSlug}/cotizaciones`;
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const visibleRows = q
    ? rows.filter(
        (r) =>
          r.numero.toLowerCase().includes(q) ||
          r.cliente.toLowerCase().includes(q) ||
          r.comercial.toLowerCase().includes(q)
      )
    : rows;
  const subtitle = `${counts.total} totales · ${counts.borrador + counts.enviada} abiertas · USD ${pipelineUsd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} en pipeline`;
  const totalAbiertas = counts.borrador + counts.enviada;
  void totalAbiertas;

  return (
    <>
      <PageHead
        title="Cotizaciones"
        subtitle={subtitle}
        help={
          <ModuleHelp
            module="cotizaciones"
            title="Cotizaciones"
            description="Crea y envía presupuestos al cliente. Una vez aceptadas, se convierten en compra al proveedor o factura electrónica."
            tips={[
              'Flujo: Borrador → Enviada → Aceptada → Convertida (factura o compra)',
              'Desde "Aceptada" genera la OC al proveedor con un clic',
              'El PDF se descarga desde el detalle de la cotización',
            ]}
          />
        }
        actions={
          <>
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
                Nueva cotización
              </Link>
            )}
          </>
        }
      />

      {/* Filter pills */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {FILTROS.map((f) => {
          const n = f.key === 'todas' ? counts.total : (counts[f.key as keyof typeof counts] ?? 0);
          const active = filtroActivo === f.key;
          const href = f.key === 'todas' ? base : `${base}?estado=${f.key}`;
          return (
            <Link
              key={f.key}
              href={href}
              className={cn(
                'inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-[12px] font-medium transition-colors',
                active
                  ? 'border-transparent bg-tenant-accent-soft text-tenant-accent-fg'
                  : 'border-orion-border bg-orion-bg text-orion-fg-muted hover:bg-orion-bg-muted'
              )}
            >
              {f.label}
              <span className={cn('text-[11px]', active ? 'opacity-80' : 'text-orion-fg-faint')}>
                {n}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 rounded-t-lg border border-b-0 border-orion-border bg-orion-bg p-2.5">
        <div className="flex h-8 min-w-[280px] flex-1 items-center gap-2 rounded-md border border-orion-border bg-orion-bg px-2.5">
          <Search size={13} className="text-orion-fg-faint" />
          <input
            type="text"
            placeholder="Buscar número, cliente…"
            className="flex-1 bg-transparent text-[12px] text-orion-fg placeholder:text-orion-fg-faint focus:outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <ToolbarBtn icon={<Calendar size={12} />} label="Fecha emisión" />
        <ToolbarBtn icon={<User size={12} />} label="Comercial" />
        <ToolbarBtn icon={<Users size={12} />} label="Cliente" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-b-lg border border-orion-border bg-orion-bg shadow-orion-1">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              <Th width={32}>
                <CheckboxStub />
              </Th>
              <Th>Número</Th>
              <Th>Cliente</Th>
              <Th>Estado</Th>
              <Th>Emisión</Th>
              <Th>Vence</Th>
              <Th align="right">Items</Th>
              <Th align="right">Total</Th>
              <Th>Comercial</Th>
              <Th width={32} />
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-orion-fg-muted">
                  {q ? 'Sin resultados para esa búsqueda.' : 'Sin cotizaciones que mostrar.'}
                </td>
              </tr>
            ) : (
              visibleRows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-orion-border last:border-0 hover:bg-orion-bg-subtle"
                >
                  <Td>
                    <CheckboxStub />
                  </Td>
                  <Td className="font-mono text-[11.5px]">
                    <Link href={`${base}/${r.id}`} className="hover:text-tenant-accent-fg">
                      {r.numero}
                    </Link>
                  </Td>
                  <Td className="max-w-[220px] truncate">{r.cliente}</Td>
                  <Td>
                    <EstadoBadge estado={r.estado} />
                  </Td>
                  <Td className="whitespace-nowrap text-orion-fg-muted">{r.fechaEmision}</Td>
                  <Td
                    className={cn(
                      'whitespace-nowrap',
                      r.estado === 'vencida' ? 'font-medium text-warn-fg' : 'text-orion-fg-muted'
                    )}
                  >
                    {r.fechaVencimiento ?? '—'}
                  </Td>
                  <Td align="right">{r.items}</Td>
                  <Td align="right">
                    <Money value={r.total} ccy={r.moneda} dp={2} />
                  </Td>
                  <Td className="text-orion-fg-muted">{r.comercial}</Td>
                  <Td>
                    <button
                      type="button"
                      className="grid h-6 w-6 place-items-center rounded-md text-orion-fg-faint hover:bg-orion-bg-muted hover:text-orion-fg"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="flex items-center gap-2 border-t border-orion-border bg-orion-bg-subtle px-4 py-2">
          <span className="text-[12px] text-orion-fg-muted">
            {rows.length === 0
              ? '0 de 0'
              : `${(page - 1) * pageSize + 1}–${(page - 1) * pageSize + rows.length} de ${counts.total}`}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <PageBtn href={page > 1 ? buildHref(base, filtroActivo, page - 1) : null}>
              <ChevronLeft size={12} />
            </PageBtn>
            <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-md border border-orion-border bg-orion-bg px-1.5 text-[12px] font-medium text-orion-fg">
              {page}
            </span>
            <PageBtn
              href={page * pageSize < counts.total ? buildHref(base, filtroActivo, page + 1) : null}
            >
              <ChevronRight size={12} />
            </PageBtn>
          </div>
        </div>
      </div>
    </>
  );
}

function ToolbarBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg px-2 text-[12px] font-medium text-orion-fg-muted hover:bg-orion-bg-muted hover:text-orion-fg"
    >
      {icon}
      {label}
      <ChevronDown size={11} />
    </button>
  );
}

function CheckboxStub() {
  return (
    <span className="inline-grid h-3.5 w-3.5 place-items-center rounded-sm border border-orion-border-strong bg-orion-bg" />
  );
}

function Th({
  children,
  align,
  width,
}: {
  children?: React.ReactNode;
  align?: 'right';
  width?: number;
}) {
  return (
    <th
      style={width ? { width } : undefined}
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
  children: React.ReactNode;
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

function buildHref(base: string, filtroActivo: 'todas' | Estado, targetPage: number) {
  const params = new URLSearchParams();
  if (filtroActivo !== 'todas') params.set('estado', filtroActivo);
  if (targetPage > 1) params.set('page', String(targetPage));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

function PageBtn({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) {
    return (
      <span className="grid h-7 w-7 place-items-center rounded-md text-orion-fg-faint opacity-40">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="grid h-7 w-7 place-items-center rounded-md border border-orion-border bg-orion-bg text-orion-fg-muted hover:bg-orion-bg-muted hover:text-orion-fg"
    >
      {children}
    </Link>
  );
}
