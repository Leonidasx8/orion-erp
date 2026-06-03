'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, Package, Search, SlidersHorizontal } from 'lucide-react';
import { Money } from '@/components/shared/Money';
import { ModuleHelp } from '@/components/shared/ModuleHelp';
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
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-tight text-orion-fg">Inventario</h1>
            <ModuleHelp
              module="inventario"
              title="Inventario"
              description="Control de stock con kardex completo. Cada entrada y salida queda registrada con su costo, fecha y documento de origen."
              tips={[
                'El costo promedio ponderado se recalcula automáticamente en cada entrada',
                'Usa "Ajuste manual" para corregir diferencias físicas con motivo obligatorio',
                'El kardex de cada producto muestra el historial completo de movimientos',
              ]}
            />
          </div>
          <p className="mt-0.5 text-[13px] text-orion-fg-muted">
            {counts.total} producto{counts.total !== 1 ? 's' : ''} en stock ·{' '}
            <span className="tabular-nums">
              valor total <Money value={valorTotalInventario} ccy="USD" dp={2} />
            </span>
          </p>
        </div>
      </div>

      {/* Reposición banner */}
      {(counts.sin_stock > 0 || counts.critico > 0) && (
        <div className="border-danger-border rounded-lg border bg-danger-soft px-4 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-danger-fg" />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-danger-fg">
                {counts.sin_stock + counts.critico} producto
                {counts.sin_stock + counts.critico !== 1 ? 's' : ''} necesitan reposición de stock
              </p>
              <p className="text-danger-fg/80 mt-0.5 text-[12.5px]">
                Para agregar stock, crea una Orden de Compra y registra la recepción cuando llegue
                la mercadería. El inventario se actualiza automáticamente.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Link
                  href={`/${tenantSlug}/ordenes/nueva`}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md bg-danger-fg px-3 text-[12px] font-medium text-white hover:brightness-95"
                >
                  + Nueva orden de compra
                </Link>
                <Link
                  href={`/${tenantSlug}/ordenes?estado=pendiente_recepcion`}
                  className="border-danger-fg/30 hover:bg-danger-fg/10 inline-flex h-7 items-center gap-1.5 rounded-md border px-3 text-[12px] font-medium text-danger-fg"
                >
                  Ver OC pendientes <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
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
      <div className="overflow-x-auto rounded-lg border border-orion-border">
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
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <div className="flex flex-col items-center gap-2 py-16 text-orion-fg-muted">
                    <Package size={32} className="text-orion-fg-faint" />
                    <span className="text-[13px]">
                      {q ? `Sin resultados para "${query.trim()}"` : 'Sin registros de inventario'}
                    </span>
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
