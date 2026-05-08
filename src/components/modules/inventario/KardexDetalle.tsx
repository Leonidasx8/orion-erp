'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  Download,
  SlidersHorizontal,
} from 'lucide-react';
import { Money } from '@/components/shared/Money';
import { cn } from '@/lib/utils';

export type MovimientoRow = {
  id: number;
  fecha: string;
  tipo: 'entrada' | 'salida' | 'ajuste_pos' | 'ajuste_neg' | 'anulacion';
  origenTipo: string;
  origenId: string | null;
  cantidad: number;
  costoUnitario: number | null;
  saldoPost: number;
  costoPromedioPost: number;
  observacion: string | null;
};

export type KardexDetalleProps = {
  tenantSlug: string;
  productoId: string;
  codigo: string;
  nombre: string;
  unidadMedida: string | null;
  stockActual: number;
  stockMinimo: number | null;
  costoPromedio: number;
  valorInventario: number;
  canAjustar: boolean;
  movimientos: MovimientoRow[];
  filtroActivo: 'todos' | 'entradas' | 'salidas' | 'ajustes';
};

type FiltroTipo = KardexDetalleProps['filtroActivo'];

function tipoLabel(tipo: MovimientoRow['tipo']): {
  label: string;
  icon: React.ReactNode;
  className: string;
} {
  switch (tipo) {
    case 'entrada':
      return {
        label: 'Entrada',
        icon: <ArrowDownLeft size={12} />,
        className: 'text-success-fg',
      };
    case 'salida':
      return {
        label: 'Salida',
        icon: <ArrowUpRight size={12} />,
        className: 'text-danger-fg',
      };
    case 'ajuste_pos':
      return {
        label: 'Ajuste +',
        icon: <SlidersHorizontal size={12} />,
        className: 'text-tenant-accent-fg',
      };
    case 'ajuste_neg':
      return {
        label: 'Ajuste −',
        icon: <SlidersHorizontal size={12} />,
        className: 'text-tenant-accent-fg',
      };
    case 'anulacion':
      return {
        label: 'Anulación',
        icon: <SlidersHorizontal size={12} />,
        className: 'text-orion-fg-muted',
      };
  }
}

function origenLabel(origenTipo: string, origenId: string | null): string {
  const base: Record<string, string> = {
    orden_compra: 'OC',
    factura: 'F',
    guia: 'GR',
    manual: 'AJ',
    anulacion: 'ANUL',
  };
  const prefix = base[origenTipo] ?? origenTipo.toUpperCase();
  return origenId ? `${prefix}-${origenId.slice(0, 8).toUpperCase()}` : prefix;
}

export function KardexDetalle({
  tenantSlug,
  productoId,
  codigo,
  nombre,
  unidadMedida,
  stockActual,
  stockMinimo,
  costoPromedio,
  valorInventario,
  canAjustar,
  movimientos,
  filtroActivo,
}: KardexDetalleProps) {
  const base = `/${tenantSlug}/inventario/${productoId}`;
  const stockCritico = stockMinimo != null && stockActual <= stockMinimo;
  const sinStock = stockActual <= 0;

  const chips: { key: FiltroTipo; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'entradas', label: 'Entradas' },
    { key: 'salidas', label: 'Salidas' },
    { key: 'ajustes', label: 'Ajustes' },
  ];

  // Rotation 30d: count salidas qty in last 30 days
  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - 30);
  const salidasUlt30 = movimientos
    .filter((m) => m.tipo === 'salida' && new Date(m.fecha) >= hace30)
    .reduce((s, m) => s + m.cantidad, 0);
  const rotacion30d =
    costoPromedio > 0 && stockActual > 0 ? (salidasUlt30 / stockActual).toFixed(1) : '—';

  return (
    <div className="space-y-5">
      {/* Back + Header */}
      <div>
        <Link
          href={`/${tenantSlug}/inventario`}
          className="mb-3 inline-flex items-center gap-1 text-[12px] text-orion-fg-muted hover:text-orion-fg"
        >
          <ChevronLeft size={14} />
          Inventario
        </Link>

        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-semibold tracking-tight text-orion-fg">
              <span className="font-mono">{codigo}</span>
            </h1>
            <p className="mt-0.5 text-[13px] text-orion-fg-muted">
              {nombre}
              {unidadMedida && <span className="ml-1 text-orion-fg-faint">· {unidadMedida}</span>}
            </p>
          </div>
          <div className="ml-auto flex shrink-0 gap-2">
            <button className="inline-flex h-8 items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg px-3 text-[12.5px] font-medium text-orion-fg hover:bg-orion-bg-subtle">
              <Download size={13} />
              Exportar kardex
            </button>
            {canAjustar && (
              <Link
                href={`${base}/ajuste`}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg px-3 text-[12.5px] font-medium text-orion-fg hover:bg-orion-bg-subtle"
              >
                <SlidersHorizontal size={13} />
                Ajuste manual
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Low stock alert */}
      {(sinStock || stockCritico) && (
        <div className="border-warn-border flex items-start gap-3 rounded-lg border bg-warn-soft px-4 py-3 text-[13px] text-warn-fg">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <span className="font-medium">
              {sinStock ? 'Sin stock disponible' : 'Stock por debajo del mínimo'}
            </span>
            <span className="text-warn-fg/75 ml-1">
              — {stockActual} {unidadMedida ?? 'u.'} en existencia
              {stockMinimo != null && ` · mínimo ${stockMinimo}`}
            </span>
          </div>
          <Link
            href={`/${tenantSlug}/ordenes/nueva`}
            className="border-warn-border ml-auto inline-flex h-7 shrink-0 items-center gap-1 rounded-md border bg-warn-soft px-2.5 text-[11.5px] font-medium"
          >
            Crear orden
          </Link>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-5 gap-3">
        {[
          {
            label: 'Stock actual',
            value: Number(stockActual).toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            }),
            sub: unidadMedida ?? 'unidades',
            tone: sinStock ? 'danger' : stockCritico ? 'warn' : undefined,
          },
          {
            label: 'Stock mínimo',
            value: stockMinimo != null ? String(stockMinimo) : '—',
            sub: 'configurado',
          },
          {
            label: 'Costo promedio',
            value: `$${Number(costoPromedio).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`,
            sub: 'CPP',
          },
          {
            label: 'Valor inventario',
            value: `$${Number(valorInventario).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            sub: 'al cierre',
          },
          {
            label: 'Rotación 30d',
            value: rotacion30d === '—' ? '—' : `${rotacion30d}x`,
            sub: `${salidasUlt30.toLocaleString('en-US', { maximumFractionDigits: 0 })} u. salidas`,
            tone: typeof rotacion30d !== 'string' ? 'good' : undefined,
          },
        ].map((kpi, i) => (
          <div key={i} className="rounded-lg border border-orion-border bg-orion-bg p-3.5">
            <div className="text-[10.5px] font-medium uppercase tracking-wider text-orion-fg-faint">
              {kpi.label}
            </div>
            <div
              className={cn(
                'mt-1 text-[22px] font-semibold tabular-nums',
                kpi.tone === 'danger'
                  ? 'text-danger-fg'
                  : kpi.tone === 'warn'
                    ? 'text-warn-fg'
                    : kpi.tone === 'good'
                      ? 'text-success-fg'
                      : 'text-orion-fg'
              )}
            >
              {kpi.value}
            </div>
            <div className="mt-0.5 text-[11.5px] text-orion-fg-faint">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Movements table */}
      <div className="overflow-hidden rounded-lg border border-orion-border">
        <div className="flex items-center gap-3 border-b border-orion-border bg-orion-bg px-4 py-3">
          <span className="text-[13px] font-medium text-orion-fg">Movimientos</span>
          <div className="ml-auto flex items-center gap-1.5">
            {chips.map((c) => (
              <Link
                key={c.key}
                href={c.key === 'todos' ? base : `${base}?tipo=${c.key}`}
                className={cn(
                  'inline-flex items-center rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors',
                  filtroActivo === c.key
                    ? 'bg-tenant-accent-soft text-tenant-accent-fg'
                    : 'text-orion-fg-muted hover:bg-orion-bg-muted hover:text-orion-fg'
                )}
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>

        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-orion-border/60 border-b bg-orion-bg-subtle">
              <th className="px-4 py-2.5 text-left font-medium text-orion-fg-muted">Fecha</th>
              <th className="px-4 py-2.5 text-left font-medium text-orion-fg-muted">Tipo</th>
              <th className="px-4 py-2.5 text-left font-medium text-orion-fg-muted">Documento</th>
              <th className="px-4 py-2.5 text-left font-medium text-orion-fg-muted">Detalle</th>
              <th className="px-4 py-2.5 text-right font-medium text-orion-fg-muted">Entrada</th>
              <th className="px-4 py-2.5 text-right font-medium text-orion-fg-muted">Salida</th>
              <th className="px-4 py-2.5 text-right font-medium text-orion-fg-muted">Saldo</th>
              <th className="px-4 py-2.5 text-right font-medium text-orion-fg-muted">
                Costo unit.
              </th>
            </tr>
          </thead>
          <tbody>
            {movimientos.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <div className="py-16 text-center text-[13px] text-orion-fg-muted">
                    Sin movimientos registrados
                  </div>
                </td>
              </tr>
            )}
            {movimientos.map((m) => {
              const tc = tipoLabel(m.tipo);
              const esEntrada = m.tipo === 'entrada' || m.tipo === 'ajuste_pos';
              const esSalida = m.tipo === 'salida' || m.tipo === 'ajuste_neg';
              const fecha = new Date(m.fecha).toLocaleDateString('es-PE', {
                day: 'numeric',
                month: 'short',
              });
              return (
                <tr key={m.id} className="border-orion-border/40 border-b hover:bg-orion-bg-subtle">
                  <td className="px-4 py-3 text-orion-fg-muted">{fecha}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn('inline-flex items-center gap-1 font-medium', tc.className)}
                    >
                      {tc.icon}
                      {tc.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11.5px] text-tenant-accent">
                    {origenLabel(m.origenTipo, m.origenId)}
                  </td>
                  <td className="max-w-[260px] px-4 py-3">
                    <span
                      className="block overflow-hidden text-ellipsis whitespace-nowrap text-orion-fg-muted"
                      title={m.observacion ?? undefined}
                    >
                      {m.observacion ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-success-fg">
                    {esEntrada
                      ? Number(m.cantidad).toLocaleString('en-US', { maximumFractionDigits: 2 })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-danger-fg">
                    {esSalida
                      ? Number(m.cantidad).toLocaleString('en-US', { maximumFractionDigits: 2 })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-orion-fg">
                    {Number(m.saldoPost).toLocaleString('en-US', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[11.5px] tabular-nums text-orion-fg-muted">
                    {m.costoUnitario != null ? (
                      <Money value={m.costoUnitario} ccy="USD" dp={4} />
                    ) : (
                      '—'
                    )}
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
