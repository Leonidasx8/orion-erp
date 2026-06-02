'use client';

import { useState, useTransition, useCallback, useEffect } from 'react';
import { reporteCotizaciones, type FilaReporteCot } from '@/server/actions/reportes-cotizaciones';
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
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(n);
}

function pct(n: number) {
  return n > 0 ? `${n.toFixed(0)}%` : '0%';
}

// ─── Panel KPI (R3) ──────────────────────────────────────────────────────────

function PanelControl({ filas }: { filas: FilaReporteCot[] }) {
  const generadas = filas.reduce((s, f) => s + f.total, 0);
  const porCerrar = filas.reduce((s, f) => s + f.enviada, 0);
  const aceptadas = filas.reduce((s, f) => s + f.aceptada, 0);
  const convertidas = filas.reduce((s, f) => s + f.convertida, 0);
  const montoPipeline = filas.reduce((s, f) => s + f.montoAceptado, 0);
  const tasaConv = generadas > 0 ? ((aceptadas + convertidas) / generadas) * 100 : 0;

  const kpis = [
    { label: 'Generadas', value: generadas, warn: false },
    { label: 'Por cerrar', value: porCerrar, warn: porCerrar > 0 },
    { label: 'Aceptadas', value: aceptadas, warn: false },
    { label: 'Convertidas', value: convertidas, warn: false },
    { label: 'Tasa conversión', value: pct(tasaConv), warn: false },
    { label: 'Pipeline S/', value: fmt(montoPipeline), warn: false },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {kpis.map((k) => (
        <div
          key={k.label}
          className="rounded-lg border border-orion-border bg-orion-bg p-3 shadow-orion-1"
        >
          <p
            className={`text-[11px] font-medium ${k.warn ? 'text-warn-fg' : 'text-orion-fg-muted'}`}
          >
            {k.label}
          </p>
          <p
            className={`mt-1 text-[18px] font-semibold tabular-nums ${k.warn ? 'text-warn-fg' : 'text-orion-fg'}`}
          >
            {k.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ReporteCotizacionesPage() {
  const [desde, setDesde] = useState(primerDiaMes());
  const [hasta, setHasta] = useState(hoy());
  const [comercial, setComercial] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [filas, setFilas] = useState<FilaReporteCot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasBuscado, setHasBuscado] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleBuscar = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await reporteCotizaciones({
          desde,
          hasta,
          comercial: comercial.trim() || undefined,
          estado: estadoFiltro || undefined,
        });
        setFilas(res);
        setHasBuscado(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar');
        setFilas([]);
      }
    });
  }, [desde, hasta, comercial, estadoFiltro]);

  // Auto-cargar al abrir la página con el mes actual
  useEffect(() => {
    handleBuscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalMonto = filas.reduce((s, f) => s + f.montoTotal, 0);
  const totalAceptado = filas.reduce((s, f) => s + f.montoAceptado, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        title="Cotizaciones por comercial"
        subtitle="Seguimiento de cotizaciones agrupadas por quien las generó."
      />

      {/* Filtros */}
      <div className="rounded-lg border border-orion-border bg-orion-bg p-4 shadow-orion-1">
        <div className="flex flex-wrap items-end gap-4">
          {[
            { id: 'desde', label: 'Desde', type: 'date', value: desde, set: setDesde },
            { id: 'hasta', label: 'Hasta', type: 'date', value: hasta, set: setHasta },
          ].map(({ id, label, type, value, set }) => (
            <div key={id} className="flex flex-col gap-1">
              <label htmlFor={id} className="text-[12px] font-medium text-orion-fg-muted">
                {label}
              </label>
              <input
                id={id}
                type={type}
                value={value}
                onChange={(e) => set(e.target.value)}
                className="focus:ring-orion-brand h-9 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] text-orion-fg focus:outline-none focus:ring-2"
              />
            </div>
          ))}

          <div className="flex flex-col gap-1">
            <label htmlFor="comercial" className="text-[12px] font-medium text-orion-fg-muted">
              Comercial
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

          <div className="flex flex-col gap-1">
            <label htmlFor="estado" className="text-[12px] font-medium text-orion-fg-muted">
              Estado
            </label>
            <select
              id="estado"
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className="focus:ring-orion-brand h-9 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] text-orion-fg focus:outline-none focus:ring-2"
            >
              <option value="">Todos</option>
              <option value="borrador">Borrador</option>
              <option value="enviada">Enviada</option>
              <option value="aceptada">Aceptada</option>
              <option value="rechazada">Rechazada</option>
              <option value="vencida">Vencida</option>
              <option value="convertida">Convertida</option>
            </select>
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

      {/* Panel KPI R3 */}
      {hasBuscado && <PanelControl filas={filas} />}

      {/* Tabla R1 */}
      {hasBuscado && (
        <div className="rounded-lg border border-orion-border bg-orion-bg shadow-orion-1">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-orion-border bg-orion-bg-subtle">
                  {[
                    'Comercial',
                    'Total',
                    'Borrador',
                    'Enviadas',
                    'Aceptadas',
                    'Rechazadas',
                    'Convertidas',
                    'Monto total',
                    'Monto ganado',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-medium text-orion-fg-muted first:text-left [&:not(:first-child)]:text-right"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-orion-fg-muted">
                      No hay datos para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filas.map((f) => (
                    <tr
                      key={f.comercial}
                      className="border-b border-orion-border last:border-b-0 hover:bg-orion-bg-subtle"
                    >
                      <td className="px-4 py-2.5 font-medium text-orion-fg">{f.comercial}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-orion-fg">
                        {f.total}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-orion-fg-muted">
                        {f.borrador}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-warn-fg">
                        {f.enviada}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-success-fg">
                        {f.aceptada}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-danger-fg">
                        {f.rechazada}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-orion-fg">
                        {f.convertida}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-orion-fg">
                        {fmt(f.montoTotal)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums text-success-fg">
                        {fmt(f.montoAceptado)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filas.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-orion-border bg-orion-bg-subtle font-semibold">
                    <td className="px-4 py-3 text-orion-fg">Total</td>
                    <td className="px-4 py-3 text-right tabular-nums text-orion-fg">
                      {filas.reduce((s, f) => s + f.total, 0)}
                    </td>
                    <td colSpan={5} />
                    <td className="px-4 py-3 text-right tabular-nums text-orion-fg">
                      {fmt(totalMonto)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-success-fg">
                      {fmt(totalAceptado)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
