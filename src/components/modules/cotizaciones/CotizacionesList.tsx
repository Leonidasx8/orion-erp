'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Kanban,
  LayoutList,
  MoreHorizontal,
  Plus,
  Search,
  User,
  Users,
  X,
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
  fechaEmisionRaw: string; // ISO date "YYYY-MM-DD" para filtrado
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
  filtroFechaInit?: string | null;
  filtroComercialInit?: string | null;
  filtroClienteInit?: string | null;
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

const FECHA_OPCIONES = [
  { key: null, label: 'Todo' },
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes', label: 'Este mes' },
  { key: 'mes_anterior', label: 'Mes anterior' },
] as const;

function matchFecha(raw: string, filtro: string | null): boolean {
  if (!filtro || !raw) return true;
  const hoy = new Date();
  const d = new Date(raw + 'T12:00:00');
  if (filtro === 'hoy') return d.toDateString() === hoy.toDateString();
  if (filtro === 'semana') {
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
    lunes.setHours(0, 0, 0, 0);
    return d >= lunes;
  }
  if (filtro === 'mes')
    return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth();
  if (filtro === 'mes_anterior') {
    const mes = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    return d.getFullYear() === mes.getFullYear() && d.getMonth() === mes.getMonth();
  }
  return true;
}

export function CotizacionesList({
  tenantSlug,
  rows,
  counts,
  pipelineUsd,
  canCreate,
  filtroActivo = 'todas',
  page = 1,
  pageSize = 9,
  filtroFechaInit = null,
  filtroComercialInit = null,
  filtroClienteInit = null,
}: CotizacionesListProps) {
  const base = `/${tenantSlug}/cotizaciones`;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [query, setQuery] = useState('');
  const [filtroFecha, setFiltroFecha] = useState<string | null>(filtroFechaInit ?? null);
  const [filtroComercial, setFiltroComercial] = useState<string | null>(
    filtroComercialInit ?? null
  );
  const [filtroCliente, setFiltroCliente] = useState<string | null>(filtroClienteInit ?? null);

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, encodeURIComponent(value));
    } else {
      params.delete(key);
    }
    params.delete('page'); // reset paginación al filtrar
    router.push(`${base}?${params.toString()}`);
  };

  const q = query.trim().toLowerCase();

  const comerciales = [...new Set(rows.map((r) => r.comercial).filter((c) => c !== '—'))].sort();
  const clientesUnicos = [...new Set(rows.map((r) => r.cliente).filter((c) => c !== '—'))].sort();

  const visibleRows = rows.filter((r) => {
    if (
      q &&
      !r.numero.toLowerCase().includes(q) &&
      !r.cliente.toLowerCase().includes(q) &&
      !r.comercial.toLowerCase().includes(q)
    )
      return false;
    if (filtroFecha && !matchFecha(r.fechaEmisionRaw, filtroFecha)) return false;
    if (filtroComercial && r.comercial !== filtroComercial) return false;
    if (filtroCliente && r.cliente !== filtroCliente) return false;
    return true;
  });
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
              disabled
              title="Próximamente"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] font-medium text-orion-fg hover:bg-orion-bg-muted disabled:cursor-not-allowed disabled:opacity-50"
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
        <FilterDropdown
          icon={<Calendar size={12} />}
          label="Fecha emisión"
          active={filtroFecha}
          activeLabel={FECHA_OPCIONES.find((o) => o.key === filtroFecha)?.label ?? null}
          onClear={() => {
            setFiltroFecha(null);
            updateFilter('fecha', null);
          }}
        >
          {FECHA_OPCIONES.map((o) => (
            <DropdownItem
              key={String(o.key)}
              selected={filtroFecha === o.key}
              onClick={() => {
                setFiltroFecha(o.key);
                updateFilter('fecha', o.key);
              }}
            >
              {o.label}
            </DropdownItem>
          ))}
        </FilterDropdown>

        <FilterDropdown
          icon={<User size={12} />}
          label="Comercial"
          active={filtroComercial}
          activeLabel={filtroComercial}
          onClear={() => {
            setFiltroComercial(null);
            updateFilter('comercial', null);
          }}
        >
          {comerciales.length === 0 ? (
            <div className="px-3 py-2 text-xs text-orion-fg-faint">Sin datos</div>
          ) : (
            comerciales.map((c) => (
              <DropdownItem
                key={c}
                selected={filtroComercial === c}
                onClick={() => {
                  setFiltroComercial(c);
                  updateFilter('comercial', c);
                }}
              >
                {c}
              </DropdownItem>
            ))
          )}
        </FilterDropdown>

        <FilterDropdown
          icon={<Users size={12} />}
          label="Cliente"
          active={filtroCliente}
          activeLabel={filtroCliente}
          onClear={() => {
            setFiltroCliente(null);
            updateFilter('cliente', null);
          }}
        >
          {clientesUnicos.length === 0 ? (
            <div className="px-3 py-2 text-xs text-orion-fg-faint">Sin datos</div>
          ) : (
            clientesUnicos.map((c) => (
              <DropdownItem
                key={c}
                selected={filtroCliente === c}
                onClick={() => {
                  setFiltroCliente(c);
                  updateFilter('cliente', c);
                }}
              >
                {c}
              </DropdownItem>
            ))
          )}
        </FilterDropdown>

        {/* Toggle lista/kanban */}
        <div className="ml-auto flex items-center gap-1 rounded-md border border-orion-border p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={cn(
              'grid h-6 w-6 place-items-center rounded-sm transition-colors',
              viewMode === 'list'
                ? 'bg-tenant-accent-soft text-tenant-accent-fg'
                : 'text-orion-fg-faint hover:text-orion-fg'
            )}
            title="Vista lista"
          >
            <LayoutList size={13} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={cn(
              'grid h-6 w-6 place-items-center rounded-sm transition-colors',
              viewMode === 'kanban'
                ? 'bg-tenant-accent-soft text-tenant-accent-fg'
                : 'text-orion-fg-faint hover:text-orion-fg'
            )}
            title="Vista kanban"
          >
            <Kanban size={13} />
          </button>
        </div>
      </div>

      {/* Kanban */}
      {viewMode === 'kanban' && <CotizacionesKanban rows={visibleRows} base={base} />}

      {/* Table */}
      {viewMode === 'list' && (
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
                      {/* En cotización 'aceptada' = aceptada por el cliente, no por SUNAT */}
                      <EstadoBadge
                        estado={r.estado === 'aceptada' ? 'aceptada_cliente' : r.estado}
                      />
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
              <PageBtn
                href={
                  page > 1
                    ? buildHref(base, filtroActivo, page - 1, {
                        fecha: filtroFecha,
                        comercial: filtroComercial,
                        cliente: filtroCliente,
                      })
                    : null
                }
              >
                <ChevronLeft size={12} />
              </PageBtn>
              <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-md border border-orion-border bg-orion-bg px-1.5 text-[12px] font-medium text-orion-fg">
                {page}
              </span>
              <PageBtn
                href={
                  page * pageSize < counts.total
                    ? buildHref(base, filtroActivo, page + 1, {
                        fecha: filtroFecha,
                        comercial: filtroComercial,
                        cliente: filtroCliente,
                      })
                    : null
                }
              >
                <ChevronRight size={12} />
              </PageBtn>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Vista Kanban ─────────────────────────────────────────────────────────────

const KANBAN_COLS: { estado: 'todas' | Estado; label: string; color: string }[] = [
  { estado: 'borrador', label: 'Borrador', color: 'bg-orion-bg-muted text-orion-fg-muted' },
  { estado: 'enviada', label: 'Enviada', color: 'bg-blue-100 text-blue-700' },
  { estado: 'aceptada', label: 'Aceptada', color: 'bg-success-soft text-success-fg' },
  { estado: 'rechazada', label: 'Rechazada', color: 'bg-danger-soft text-danger-fg' },
  { estado: 'vencida', label: 'Vencida', color: 'bg-warn-soft text-warn-fg' },
  { estado: 'convertida', label: 'Convertida', color: 'bg-purple-100 text-purple-700' },
];

function CotizacionesKanban({ rows, base }: { rows: CotizacionRow[]; base: string }) {
  const byEstado = new Map<string, CotizacionRow[]>();
  for (const col of KANBAN_COLS) byEstado.set(col.estado, []);
  for (const r of rows) {
    const bucket = byEstado.get(r.estado) ?? byEstado.get('borrador')!;
    bucket.push(r);
  }

  return (
    <div className="overflow-x-auto rounded-b-lg border border-orion-border bg-orion-bg-subtle pb-2 shadow-orion-1">
      <div className="flex min-w-[900px] gap-3 p-3">
        {KANBAN_COLS.map((col) => {
          const colRows = byEstado.get(col.estado) ?? [];
          return (
            <div key={col.estado} className="flex w-52 shrink-0 flex-col gap-2">
              {/* Column header */}
              <div className="flex items-center justify-between px-1">
                <span
                  className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', col.color)}
                >
                  {col.label}
                </span>
                <span className="text-[11px] tabular-nums text-orion-fg-faint">
                  {colRows.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2">
                {colRows.length === 0 && (
                  <div className="rounded-lg border border-dashed border-orion-border py-4 text-center text-[11px] text-orion-fg-faint">
                    Sin cotizaciones
                  </div>
                )}
                {colRows.map((r) => (
                  <Link
                    key={r.id}
                    href={`${base}/${r.id}`}
                    className="hover:border-tenant-accent/40 block rounded-lg border border-orion-border bg-orion-bg p-3 shadow-orion-1 transition-colors hover:bg-orion-bg-hover"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-mono text-[11px] font-medium text-orion-fg">
                        {r.numero}
                      </span>
                      <span className="text-[10px] text-orion-fg-faint">{r.fechaEmision}</span>
                    </div>
                    <div className="mb-2 truncate text-[12px] text-orion-fg">{r.cliente}</div>
                    <div className="flex items-center justify-between">
                      <Money value={r.total} ccy={r.moneda} dp={0} />
                      {r.comercial && r.comercial !== '—' && (
                        <span className="max-w-[80px] truncate text-[10px] text-orion-fg-faint">
                          {r.comercial.split(' ')[0]}
                        </span>
                      )}
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

function FilterDropdown({
  icon,
  label,
  active,
  activeLabel,
  onClear,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  active: string | null;
  activeLabel: string | null;
  onClear: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[12px] font-medium transition-colors',
          active
            ? 'border-tenant-accent bg-tenant-accent-soft text-tenant-accent-fg'
            : 'border-orion-border bg-orion-bg text-orion-fg-muted hover:bg-orion-bg-muted hover:text-orion-fg'
        )}
      >
        {icon}
        <span>{active ? activeLabel : label}</span>
        {active ? (
          <span
            role="button"
            aria-label="Limpiar filtro"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
              setOpen(false);
            }}
            className="hover:bg-tenant-accent/20 ml-0.5 rounded-full p-px"
          >
            <X size={10} />
          </span>
        ) : (
          <ChevronDown size={11} />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[160px] rounded-lg border border-orion-border bg-orion-bg py-1 shadow-orion-2">
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors',
        selected
          ? 'bg-tenant-accent-soft font-medium text-tenant-accent-fg'
          : 'text-orion-fg hover:bg-orion-bg-hover'
      )}
    >
      {selected && <span className="text-[10px]">✓</span>}
      {children}
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

function buildHref(
  base: string,
  filtroActivo: 'todas' | Estado,
  targetPage: number,
  extras?: { fecha?: string | null; comercial?: string | null; cliente?: string | null }
) {
  const params = new URLSearchParams();
  if (filtroActivo !== 'todas') params.set('estado', filtroActivo);
  if (targetPage > 1) params.set('page', String(targetPage));
  if (extras?.fecha) params.set('fecha', encodeURIComponent(extras.fecha));
  if (extras?.comercial) params.set('comercial', encodeURIComponent(extras.comercial));
  if (extras?.cliente) params.set('cliente', encodeURIComponent(extras.cliente));
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
