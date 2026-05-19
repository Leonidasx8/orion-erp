'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, Package, Search, SlidersHorizontal } from 'lucide-react';
import { Money } from '@/components/shared/Money';
import { cn } from '@/lib/utils';

export type StockRow = {
  productoId: string;
  codigo: string;
  nombre: string;
  unidadMedida: string | null;
  stock: number;
  stockMinimo: number | null;
  costoPromedio: number;
  valorInventario: number;
  estadoStock: 'sin_stock' | 'critico' | 'normal';
  ultimoMovimientoAt: string | null;
};

export type InventarioListProps = {
  tenantSlug: string;
  rows: StockRow[];
  counts: {
    total: number;
    sin_stock: number;
    critico: number;
    normal: number;
  };
  valorTotalInventario: number;
  canAjustar: boolean;
  filtroActivo: 'todos' | 'sin_stock' | 'critico' | 'normal';
};

const ESTADO_CFG = {
  sin_stock: { label: 'Sin stock', className: 'bg-danger-soft text-danger-fg' },
  critico: { label: 'Crítico', className: 'bg-warn-soft text-warn-fg' },
  normal: { label: 'Normal', className: 'bg-success-soft text-success-fg' },
};

export function InventarioList({
  tenantSlug,
  rows,
  counts,
  valorTotalInventario,
  filtroActivo,
  canAjustar,
}: InventarioListProps) {
  const base = `/${tenantSlug}/inventario`;
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const visibleRows = q
    ? rows.filter((r) => r.codigo.toLowerCase().includes(q) || r.nombre.toLowerCase().includes(q))
    : rows;

  const chips: { key: InventarioListProps['filtroActivo']; label: string; count: number }[] = [
    { key: 'todos', label: 'Todos', count: counts.total },
    { key: 'sin_stock', label: 'Sin stock', count: counts.sin_stock },
    { key: 'critico', label: 'Stock crítico', count: counts.critico },
    { key: 'normal', label: 'Normal', count: counts.normal },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-semibold tracking-tight text-orion-fg">Inventario</h1>
          <p className="mt-0.5 text-[13px] text-orion-fg-muted">
            {counts.total} producto{counts.total !== 1 ? 's' : ''} en stock ·{' '}
            <span className="tabular-nums">
              valor total <Money value={valorTotalInventario} ccy="USD" dp={2} />
            </span>
          </p>
        </div>
      </div>

      {/* Critical alert */}
      {(counts.sin_stock > 0 || counts.critico > 0) && (
        <div className="border-warn-border flex items-start gap-3 rounded-lg border bg-warn-soft px-4 py-3 text-[13px] text-warn-fg">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <div>
            <span className="font-medium">
              {counts.sin_stock > 0 && `${counts.sin_stock} sin stock`}
              {counts.sin_stock > 0 && counts.critico > 0 && ' · '}
              {counts.critico > 0 && `${counts.critico} bajo mínimo`}
            </span>
            <span className="text-warn-fg/75 ml-1">
              — revisa las compras a proveedores pendientes.
            </span>
          </div>
        </div>
      )}

      {/* Chip filters */}
      <div className="flex items-center gap-2">
        {chips.map((c) => (
          <Link
            key={c.key}
            href={c.key === 'todos' ? base : `${base}?estado=${c.key}`}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
              filtroActivo === c.key
                ? 'bg-tenant-accent-soft text-tenant-accent-fg'
                : 'bg-orion-bg-muted text-orion-fg-muted hover:bg-orion-bg-subtle hover:text-orion-fg'
            )}
          >
            {c.label}
            <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] leading-none">
              {c.count}
            </span>
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-orion-fg-faint"
            />
            <input
              className="h-8 rounded-md border border-orion-border bg-orion-bg pl-8 pr-3 text-[12px] text-orion-fg placeholder:text-orion-fg-faint focus:outline-none focus:ring-1 focus:ring-tenant-accent"
              placeholder="Buscar producto..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-orion-border">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-orion-border bg-orion-bg-subtle">
              <th className="px-4 py-2.5 text-left font-medium text-orion-fg-muted">Código</th>
              <th className="px-4 py-2.5 text-left font-medium text-orion-fg-muted">Producto</th>
              <th className="px-4 py-2.5 text-left font-medium text-orion-fg-muted">Estado</th>
              <th className="px-4 py-2.5 text-right font-medium text-orion-fg-muted">Stock</th>
              <th className="px-4 py-2.5 text-right font-medium text-orion-fg-muted">Mínimo</th>
              <th className="px-4 py-2.5 text-right font-medium text-orion-fg-muted">
                Costo prom.
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-orion-fg-muted">Valor inv.</th>
              <th className="px-4 py-2.5 text-right font-medium text-orion-fg-muted">
                Último mov.
              </th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <div className="flex flex-col items-center gap-2 py-16 text-orion-fg-muted">
                    <Package size={32} className="text-orion-fg-faint" />
                    <span className="text-[13px]">Sin registros de inventario</span>
                  </div>
                </td>
              </tr>
            )}
            {visibleRows.map((row) => {
              const cfg = ESTADO_CFG[row.estadoStock];
              const fechaMov = row.ultimoMovimientoAt
                ? new Date(row.ultimoMovimientoAt).toLocaleDateString('es-PE', {
                    day: 'numeric',
                    month: 'short',
                    year: '2-digit',
                  })
                : '—';
              return (
                <tr
                  key={row.productoId}
                  className="border-orion-border/50 border-b hover:bg-orion-bg-subtle"
                >
                  <td className="px-4 py-3 font-mono text-[11.5px] text-tenant-accent">
                    {row.codigo}
                  </td>
                  <td className="max-w-[280px] px-4 py-3">
                    <span
                      className="block overflow-hidden text-ellipsis whitespace-nowrap text-orion-fg"
                      title={row.nombre}
                    >
                      {row.nombre}
                    </span>
                    {row.unidadMedida && (
                      <span className="text-[11px] text-orion-fg-faint">{row.unidadMedida}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                        cfg.className
                      )}
                    >
                      {cfg.label}
                    </span>
                  </td>
                  <td
                    className={cn(
                      'px-4 py-3 text-right font-semibold tabular-nums',
                      row.estadoStock === 'sin_stock'
                        ? 'text-danger-fg'
                        : row.estadoStock === 'critico'
                          ? 'text-warn-fg'
                          : 'text-orion-fg'
                    )}
                  >
                    {Number(row.stock).toLocaleString('en-US', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-orion-fg-muted">
                    {row.stockMinimo != null ? row.stockMinimo : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[11.5px] tabular-nums text-orion-fg-muted">
                    <Money value={row.costoPromedio} ccy="USD" dp={4} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-orion-fg-muted">
                    <Money value={row.valorInventario} ccy="USD" dp={2} />
                  </td>
                  <td className="px-4 py-3 text-right text-[12px] text-orion-fg-muted">
                    {fechaMov}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {canAjustar && (
                        <Link
                          href={`${base}/${row.productoId}/ajuste`}
                          className="flex items-center justify-center rounded p-1 text-orion-fg-muted hover:bg-orion-bg-muted hover:text-orion-fg"
                          title="Ajuste manual"
                        >
                          <SlidersHorizontal size={14} />
                        </Link>
                      )}
                      <Link
                        href={`${base}/${row.productoId}`}
                        className="flex items-center justify-center rounded p-1 text-orion-fg-muted hover:bg-orion-bg-muted hover:text-orion-fg"
                        title="Ver kardex"
                      >
                        <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
