'use client';

import { CheckCircle2, XCircle, Clock, FileText, Download, AlertTriangle } from 'lucide-react';
import { EstadoBadge } from '@/components/shared/EstadoBadge';
import { Money } from '@/components/shared/Money';
import { FacturaAcciones } from './FacturaAcciones';
import type { Estado } from '@/components/shared/EstadoBadge';

export type LineaDetalleRow = {
  id: string;
  descripcion: string;
  skuSnapshot: string;
  cantidad: string;
  unidadMedida: string;
  precioUnitario: string;
  tipoAfectacionIgv: string;
  totalBaseIgv: string;
  totalIgv: string;
  total: string;
};

export type FacturaDetalleData = {
  id: string;
  numeroCompleto: string;
  tipoDocumento: string;
  serie: string;
  numero: number;
  fechaEmision: string;
  fechaVencimiento: string | null;
  clienteRazon: string;
  clienteNumDoc: string;
  clienteTipoDoc: string;
  clienteDireccion: string | null;
  moneda: string;
  tipoCambio: string | null;
  totalGravadas: string;
  totalExoneradas: string;
  igv: string;
  total: string;
  totalEnLetras: string | null;
  formaPago: string;
  observaciones: string | null;
  estado: string;
  estadoSunat: string;
  sunatCodigo: number | null;
  sunatMensaje: string | null;
  cdrUrl: string | null;
  xmlUrl: string | null;
  pdfUrl: string | null;
  lineas: LineaDetalleRow[];
};

function SunatStatusBox({
  estadoSunat,
  sunatCodigo,
  sunatMensaje,
  cdrUrl,
  xmlUrl,
  pdfUrl,
}: {
  estadoSunat: string;
  sunatCodigo: number | null;
  sunatMensaje: string | null;
  cdrUrl: string | null;
  xmlUrl: string | null;
  pdfUrl: string | null;
}) {
  const isAceptada = estadoSunat === 'aceptada';
  const isRechazada = estadoSunat === 'rechazada';
  const isPendiente = estadoSunat === 'pendiente' || estadoSunat === 'sin_enviar';

  return (
    <div
      className={`rounded-lg border p-4 ${
        isAceptada
          ? 'bg-success-soft/30 border-success-soft'
          : isRechazada
            ? 'bg-danger-soft/30 border-danger-soft'
            : 'border-orion-border bg-orion-bg-subtle'
      }`}
    >
      <div className="flex items-center gap-2 font-medium">
        {isAceptada && <CheckCircle2 size={16} className="text-success-fg" />}
        {isRechazada && <XCircle size={16} className="text-danger-fg" />}
        {isPendiente && <Clock size={16} className="text-orion-fg-muted" />}
        <span className="text-sm">Estado SUNAT</span>
        <EstadoBadge estado={estadoSunat as Estado} />
      </div>

      {sunatCodigo != null && (
        <p className="mt-2 text-xs text-orion-fg-muted">
          Código: <span className="font-mono">{sunatCodigo}</span>
          {sunatMensaje && ` — ${sunatMensaje}`}
        </p>
      )}

      {isPendiente && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-orion-fg-muted">
          <AlertTriangle size={12} />
          Pendiente de envío a NUBEFACT. El worker procesa cada 30s.
        </p>
      )}

      {(cdrUrl || xmlUrl || pdfUrl) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded border border-orion-border bg-white px-2.5 py-1 text-xs hover:bg-orion-bg-subtle"
            >
              <FileText size={12} />
              PDF SUNAT
            </a>
          )}
          {xmlUrl && (
            <a
              href={xmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded border border-orion-border bg-white px-2.5 py-1 text-xs hover:bg-orion-bg-subtle"
            >
              <Download size={12} />
              XML
            </a>
          )}
          {cdrUrl && (
            <a
              href={cdrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded border border-orion-border bg-white px-2.5 py-1 text-xs hover:bg-orion-bg-subtle"
            >
              <Download size={12} />
              CDR
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function FacturaDetalle({
  data,
  companySlug,
  ncAnulacion = null,
}: {
  data: FacturaDetalleData;
  companySlug: string;
  ncAnulacion?: { numeroCompleto: string; tipoMotivo: string; pdfUrl: string | null } | null;
}) {
  const moneda = data.moneda as 'PEN' | 'USD';
  const anulada = data.estado === 'anulada' || ncAnulacion != null;

  return (
    <div className="flex flex-col gap-6">
      {anulada && (
        <div className="bg-danger-soft/30 flex flex-wrap items-center gap-2 rounded-lg border border-danger-soft px-4 py-3 text-sm">
          <XCircle size={16} className="shrink-0 text-danger-fg" />
          <span className="font-medium text-danger-fg">Factura anulada</span>
          {ncAnulacion && (
            <span className="text-orion-fg-muted">
              mediante la Nota de Crédito{' '}
              <span className="font-mono font-medium">{ncAnulacion.numeroCompleto}</span> aceptada
              por SUNAT.
              {ncAnulacion.pdfUrl && (
                <>
                  {' '}
                  <a
                    href={ncAnulacion.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-orion-fg"
                  >
                    Ver PDF de la NC
                  </a>
                </>
              )}
            </span>
          )}
        </div>
      )}
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-semibold text-orion-fg">{data.numeroCompleto}</h1>
          <p className="text-sm text-orion-fg-muted">
            {data.tipoDocumento === '01' ? 'Factura' : 'Boleta'} · Emitida {data.fechaEmision}
            {data.fechaVencimiento && ` · Vence ${data.fechaVencimiento}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EstadoBadge estado={data.estado as Estado} />
          <FacturaAcciones
            facturaId={data.id}
            estadoSunat={data.estadoSunat}
            moneda={data.moneda}
            companySlug={companySlug}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Cliente */}
          <section className="rounded-lg border border-orion-border p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-orion-fg-muted">
              Cliente
            </h2>
            <p className="font-medium text-orion-fg">{data.clienteRazon}</p>
            <p className="text-sm text-orion-fg-muted">
              {data.clienteTipoDoc === '6' ? 'RUC' : 'DNI'}: {data.clienteNumDoc}
            </p>
            {data.clienteDireccion && (
              <p className="text-sm text-orion-fg-muted">{data.clienteDireccion}</p>
            )}
          </section>

          {/* Ítems */}
          <section className="rounded-lg border border-orion-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-orion-border bg-orion-bg-subtle text-left text-xs uppercase tracking-wide text-orion-fg-muted">
                    <th className="px-4 py-3">Descripción</th>
                    <th className="px-4 py-3 text-right">Cant.</th>
                    <th className="px-4 py-3 text-right">P. Unit.</th>
                    <th className="px-4 py-3 text-right">Base IGV</th>
                    <th className="px-4 py-3 text-right">IGV</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orion-border">
                  {data.lineas.map((l) => (
                    <tr key={l.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-orion-fg">{l.descripcion}</p>
                        <p className="font-mono text-xs text-orion-fg-muted">{l.skuSnapshot}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-orion-fg-muted">
                        {l.cantidad} {l.unidadMedida}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Money value={parseFloat(l.precioUnitario)} ccy={moneda} />
                      </td>
                      <td className="px-4 py-3 text-right text-orion-fg-muted">
                        <Money value={parseFloat(l.totalBaseIgv)} ccy={moneda} />
                      </td>
                      <td className="px-4 py-3 text-right text-orion-fg-muted">
                        <Money value={parseFloat(l.totalIgv)} ccy={moneda} />
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        <Money value={parseFloat(l.total)} ccy={moneda} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            <div className="flex justify-end border-t border-orion-border p-4">
              <dl className="flex flex-col gap-1 text-sm">
                {parseFloat(data.totalGravadas) > 0 && (
                  <div className="flex justify-between gap-12">
                    <dt className="text-orion-fg-muted">Base gravada</dt>
                    <dd>
                      <Money value={parseFloat(data.totalGravadas)} ccy={moneda} />
                    </dd>
                  </div>
                )}
                {parseFloat(data.totalExoneradas) > 0 && (
                  <div className="flex justify-between gap-12">
                    <dt className="text-orion-fg-muted">Exonerado</dt>
                    <dd>
                      <Money value={parseFloat(data.totalExoneradas)} ccy={moneda} />
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-12">
                  <dt className="text-orion-fg-muted">IGV 18%</dt>
                  <dd>
                    <Money value={parseFloat(data.igv)} ccy={moneda} />
                  </dd>
                </div>
                <div className="flex justify-between gap-12 border-t border-orion-border pt-1 font-semibold">
                  <dt>Total</dt>
                  <dd>
                    <Money value={parseFloat(data.total)} ccy={moneda} />
                  </dd>
                </div>
              </dl>
            </div>

            {data.totalEnLetras && (
              <p className="border-t border-orion-border px-4 pb-3 pt-2 text-xs italic text-orion-fg-muted">
                {data.totalEnLetras}
              </p>
            )}
          </section>

          {data.observaciones && (
            <p className="rounded border border-orion-border p-3 text-sm text-orion-fg-muted">
              {data.observaciones}
            </p>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <SunatStatusBox
            estadoSunat={data.estadoSunat}
            sunatCodigo={data.sunatCodigo}
            sunatMensaje={data.sunatMensaje}
            cdrUrl={data.cdrUrl}
            xmlUrl={data.xmlUrl}
            pdfUrl={data.pdfUrl}
          />

          <div className="rounded-lg border border-orion-border p-4 text-sm">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-orion-fg-muted">
              Pago
            </h2>
            <p className="capitalize text-orion-fg">{data.formaPago}</p>
            {data.moneda === 'USD' && data.tipoCambio && (
              <p className="mt-1 text-orion-fg-muted">TC: S/ {data.tipoCambio}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
