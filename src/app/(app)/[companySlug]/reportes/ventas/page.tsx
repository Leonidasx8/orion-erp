'use client';

import { useState, useTransition, useCallback } from 'react';
import {
  getReporteVentas,
  type FiltrosVentas,
  type FilaReporte,
} from '@/server/actions/reportes-ventas';
import { PageHead } from '@/components/shared/PageHead';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function primerDiaMes(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(n);
}

function labelGroupBy(g: FiltrosVentas['groupBy']): string {
  const labels: Record<FiltrosVentas['groupBy'], string> = {
    mes: 'Mes',
    comercial: 'Comercial',
    cliente: 'Cliente',
    producto: 'Producto',
  };
  return labels[g];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ReportesVentasPage() {
  const [desde, setDesde] = useState(primerDiaMes());
  const [hasta, setHasta] = useState(hoy());
  const [groupBy, setGroupBy] = useState<FiltrosVentas['groupBy']>('mes');
  const [clienteId, setClienteId] = useState('');

  const [filas, setFilas] = useState<FilaReporte[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasBuscado, setHasBuscado] = useState(false);

  const [isPending, startTransition] = useTransition();

  const handleBuscar = useCallback(() => {
    if (!desde || !hasta) return;
    setError(null);

    startTransition(async () => {
      try {
        const filtros: FiltrosVentas = {
          desde,
          hasta,
          groupBy,
          ...(clienteId.trim() ? { clienteId: clienteId.trim() } : {}),
        };
        const resultado = await getReporteVentas(filtros);
        setFilas(resultado);
        setHasBuscado(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar el reporte');
        setFilas([]);
      }
    });
  }, [desde, hasta, groupBy, clienteId]);

  // ─── Totales ───────────────────────────────────────────────────────────────

  const totalFacturas = filas.reduce((acc, f) => acc + f.facturas, 0);
  const totalMonto = filas.reduce((acc, f) => acc + f.total, 0);
  const colGrupo = labelGroupBy(groupBy);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        title="Reporte de ventas"
        subtitle="Facturas y boletas aceptadas por SUNAT, agrupadas por el criterio elegido."
      />

      {/* ── Filtros ── */}
      <div className="rounded-lg border border-orion-border bg-orion-bg p-4 shadow-orion-1">
        <div className="flex flex-wrap items-end gap-4">
          {/* Desde */}
          <div className="flex flex-col gap-1">
            <label htmlFor="desde" className="text-[12px] font-medium text-orion-fg-muted">
              Desde
            </label>
            <input
              id="desde"
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="focus:ring-orion-brand h-9 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] text-orion-fg focus:outline-none focus:ring-2"
            />
          </div>

          {/* Hasta */}
          <div className="flex flex-col gap-1">
            <label htmlFor="hasta" className="text-[12px] font-medium text-orion-fg-muted">
              Hasta
            </label>
            <input
              id="hasta"
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="focus:ring-orion-brand h-9 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] text-orion-fg focus:outline-none focus:ring-2"
            />
          </div>

          {/* Agrupar por */}
          <div className="flex flex-col gap-1">
            <label htmlFor="groupBy" className="text-[12px] font-medium text-orion-fg-muted">
              Agrupar por
            </label>
            <select
              id="groupBy"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as FiltrosVentas['groupBy'])}
              className="focus:ring-orion-brand h-9 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] text-orion-fg focus:outline-none focus:ring-2"
            >
              <option value="mes">Mes</option>
              <option value="comercial">Comercial</option>
              <option value="cliente">Cliente</option>
              <option value="producto">Producto</option>
            </select>
          </div>

          {/* Cliente ID (opcional) */}
          <div className="flex flex-col gap-1">
            <label htmlFor="clienteId" className="text-[12px] font-medium text-orion-fg-muted">
              Cliente UUID (opcional)
            </label>
            <input
              id="clienteId"
              type="text"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              placeholder="uuid del cliente..."
              className="focus:ring-orion-brand h-9 w-64 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] text-orion-fg placeholder:text-orion-fg-muted focus:outline-none focus:ring-2"
            />
          </div>

          {/* Botón */}
          <button
            onClick={handleBuscar}
            disabled={isPending || !desde || !hasta}
            className="bg-orion-brand h-9 rounded-md px-5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Cargando…' : 'Generar reporte'}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="border-danger-border bg-danger-subtle rounded-md border px-4 py-3 text-[13px] text-danger-fg">
          {error}
        </div>
      )}

      {/* ── Tabla ── */}
      {hasBuscado && (
        <div className="rounded-lg border border-orion-border bg-orion-bg shadow-orion-1">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-orion-border bg-orion-bg-subtle">
                  <th className="px-4 py-3 text-left font-medium text-orion-fg-muted">
                    {colGrupo}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-orion-fg-muted">
                    Documentos
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-orion-fg-muted">
                    Total (PEN)
                  </th>
                </tr>
              </thead>
              <tbody>
                {filas.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-orion-fg-muted">
                      No hay datos para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filas.map((fila, idx) => (
                    <tr
                      key={`${fila.grupo}-${idx}`}
                      className="border-b border-orion-border last:border-b-0 hover:bg-orion-bg-subtle"
                    >
                      <td className="px-4 py-2.5 text-orion-fg">{fila.grupo}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-orion-fg">
                        {fila.facturas.toLocaleString('es-PE')}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-orion-fg">
                        {formatMoney(fila.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Pie de total */}
              {filas.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-orion-border bg-orion-bg-subtle font-semibold">
                    <td className="px-4 py-3 text-orion-fg">Total</td>
                    <td className="px-4 py-3 text-right tabular-nums text-orion-fg">
                      {totalFacturas.toLocaleString('es-PE')}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-orion-fg">
                      {formatMoney(totalMonto)}
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
