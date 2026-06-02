'use client';

import { useState, useTransition, useCallback } from 'react';
import { reportePrecios, type FilaPrecio } from '@/server/actions/reportes-precios';
import { PageHead } from '@/components/shared/PageHead';

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function primerDiaMes(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(n);
}

export default function ReportePreciosPage() {
  const [desde, setDesde] = useState(primerDiaMes());
  const [hasta, setHasta] = useState(hoy());
  const [comercial, setComercial] = useState('');
  const [filas, setFilas] = useState<FilaPrecio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasBuscado, setHasBuscado] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleBuscar = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await reportePrecios({
          desde,
          hasta,
          comercial: comercial.trim() || undefined,
        });
        setFilas(res);
        setHasBuscado(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar');
        setFilas([]);
      }
    });
  }, [desde, hasta, comercial]);

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        title="Historial de precios"
        subtitle="Cambios de precio por producto, con autor y razón registrada."
      />

      {/* Filtros */}
      <div className="rounded-lg border border-orion-border bg-orion-bg p-4 shadow-orion-1">
        <div className="flex flex-wrap items-end gap-4">
          {[
            { id: 'desde', label: 'Desde', value: desde, set: setDesde },
            { id: 'hasta', label: 'Hasta', value: hasta, set: setHasta },
          ].map(({ id, label, value, set }) => (
            <div key={id} className="flex flex-col gap-1">
              <label htmlFor={id} className="text-[12px] font-medium text-orion-fg-muted">
                {label}
              </label>
              <input
                id={id}
                type="date"
                value={value}
                onChange={(e) => set(e.target.value)}
                className="focus:ring-orion-brand h-9 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] text-orion-fg focus:outline-none focus:ring-2"
              />
            </div>
          ))}

          <div className="flex flex-col gap-1">
            <label htmlFor="comercial" className="text-[12px] font-medium text-orion-fg-muted">
              Usuario
            </label>
            <input
              id="comercial"
              type="text"
              value={comercial}
              onChange={(e) => setComercial(e.target.value)}
              placeholder="nombre exacto…"
              className="focus:ring-orion-brand h-9 w-44 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] text-orion-fg placeholder:text-orion-fg-muted focus:outline-none focus:ring-2"
            />
          </div>

          <button
            onClick={handleBuscar}
            disabled={isPending}
            className="bg-orion-brand h-9 rounded-md px-5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Cargando…' : 'Generar reporte'}
          </button>
        </div>
      </div>

      {error && (
        <div className="border-danger-border bg-danger-subtle rounded-md border px-4 py-3 text-[13px] text-danger-fg">
          {error}
        </div>
      )}

      {hasBuscado && (
        <div className="rounded-lg border border-orion-border bg-orion-bg shadow-orion-1">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-orion-border bg-orion-bg-subtle">
                  {[
                    'Fecha',
                    'Usuario',
                    'SKU',
                    'Producto',
                    'Antes (S/)',
                    'Después (S/)',
                    'Δ%',
                    'Razón',
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 font-medium text-orion-fg-muted ${i >= 4 && i <= 6 ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-orion-fg-muted">
                      No hay cambios de precio en el período seleccionado.
                    </td>
                  </tr>
                ) : (
                  filas.map((f, idx) => {
                    const sube = f.variacionPct > 0;
                    const baja = f.variacionPct < 0;
                    const colorPct = sube
                      ? 'text-success-fg'
                      : baja
                        ? 'text-danger-fg'
                        : 'text-orion-fg-muted';
                    return (
                      <tr
                        key={idx}
                        className="border-b border-orion-border last:border-b-0 hover:bg-orion-bg-subtle"
                      >
                        <td className="px-4 py-2.5 font-mono text-[12px] text-orion-fg-muted">
                          {f.fecha}
                        </td>
                        <td className="px-4 py-2.5 text-orion-fg">{f.comercial}</td>
                        <td className="px-4 py-2.5 font-mono text-[12px] text-orion-fg">{f.sku}</td>
                        <td className="px-4 py-2.5 text-orion-fg">{f.producto}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-orion-fg-muted">
                          {fmt(f.precioAnterior)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium tabular-nums text-orion-fg">
                          {fmt(f.precioNuevo)}
                        </td>
                        <td
                          className={`px-4 py-2.5 text-right font-medium tabular-nums ${colorPct}`}
                        >
                          {sube ? '+' : ''}
                          {f.variacionPct.toFixed(1)}%
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-2.5 text-orion-fg-muted">
                          {f.razon}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
