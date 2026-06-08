'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Cloud, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { crearFactura } from '@/server/actions/facturas';
import { calcularLinea, calcularTotalesFactura } from '@/lib/schemas/factura';
import { ProductoCombobox } from '@/components/shared/ProductoCombobox';

type ClienteOption = {
  id: string;
  label: string;
  tipoDocumento: string;
  numeroDocumento: string;
};

type ProductoOption = {
  id: string;
  codigo: string;
  nombre: string;
  precioUnitario: number;
};

type LineaInput = {
  productoId?: string;
  descripcion: string;
  codigo: string;
  unidadMedida: string;
  cantidad: number;
  precioUnitario: number;
  tipoAfectacionIgv: '10' | '20';
};

type Props = {
  companySlug: string;
  tipoPorDefecto: '01' | '03';
  clientes: ClienteOption[];
  serieFactura: string | null;
  serieBoleta: string | null;
  productos: ProductoOption[];
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyLinea(): LineaInput {
  return {
    descripcion: '',
    codigo: '',
    unidadMedida: 'NIU',
    cantidad: 1,
    precioUnitario: 0,
    tipoAfectacionIgv: '10',
  };
}

export function FacturaForm({
  companySlug,
  tipoPorDefecto,
  clientes,
  serieFactura,
  serieBoleta,
  productos,
}: Props) {
  const router = useRouter();
  const [tipoDoc, setTipoDoc] = useState<'01' | '03'>(tipoPorDefecto);
  const [clienteId, setClienteId] = useState('');
  const [fechaEmision, setFechaEmision] = useState(today());
  const [formaPago, setFormaPago] = useState<'contado' | 'credito'>('contado');
  const [plazoDias, setPlazoDias] = useState(30);
  const [observaciones, setObservaciones] = useState('');
  const [lineas, setLineas] = useState<LineaInput[]>([emptyLinea()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serie = tipoDoc === '01' ? serieFactura : serieBoleta;

  const validLineas = lineas.filter(
    (l) => l.descripcion.trim() && l.cantidad > 0 && l.precioUnitario > 0
  );
  const totales = calcularTotalesFactura(validLineas);

  function updateLinea(i: number, patch: Partial<LineaInput>) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function selectProducto(i: number, productoId: string) {
    const p = productos.find((x) => x.id === productoId);
    if (!p) return;
    updateLinea(i, {
      productoId,
      descripcion: p.nombre,
      codigo: p.codigo,
      precioUnitario: p.precioUnitario,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteId) {
      setError('Selecciona un cliente');
      return;
    }
    if (!serie) {
      setError(
        `No hay serie configurada para ${tipoDoc === '01' ? 'Factura' : 'Boleta'}. Configura la serie en Configuración → Facturación.`
      );
      return;
    }
    if (validLineas.length === 0) {
      setError('Agrega al menos un ítem con descripción, cantidad y precio válidos');
      return;
    }

    setLoading(true);
    setError(null);

    const vencimiento =
      formaPago === 'credito'
        ? new Date(new Date(fechaEmision).getTime() + plazoDias * 86400000)
            .toISOString()
            .slice(0, 10)
        : undefined;

    const result = await crearFactura({
      tipoDocumento: tipoDoc,
      serie,
      clienteId,
      fechaEmision,
      fechaVencimiento: vencimiento,
      moneda: 'PEN',
      formaPago,
      observaciones: observaciones || undefined,
      items: validLineas,
    });

    setLoading(false);

    if (result.success) {
      toast.success(
        `${tipoDoc === '01' ? 'Factura' : 'Boleta'} ${result.data.numeroCompleto} creada`
      );
      router.push(`/${companySlug}/facturas/${result.data.facturaId}`);
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Header with actions */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-orion-fg">
            Nueva {tipoDoc === '01' ? 'Factura' : 'Boleta'}
          </h1>
          <p className="mt-0.5 text-[12px] text-orion-fg-muted">
            {tipoDoc === '01' ? 'Para clientes con RUC' : 'Para personas naturales'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-9 items-center rounded-md border border-orion-border bg-orion-bg px-4 text-[13px] font-medium text-orion-fg hover:bg-orion-bg-muted"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-tenant-accent px-5 text-[13px] font-medium text-white hover:brightness-95 disabled:opacity-60"
          >
            {loading ? 'Guardando…' : `Guardar ${tipoDoc === '01' ? 'factura' : 'boleta'}`}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger-fg">
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        {/* Left column (3fr) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Tipo de comprobante */}
          <div className="rounded-lg border border-orion-border bg-orion-bg p-4">
            <p className="mb-3 text-[13px] font-semibold text-orion-fg">Tipo de comprobante</p>
            <div className="flex gap-3">
              {[
                { val: '01', label: 'Factura', serie: serieFactura, sub: 'Para clientes con RUC' },
                { val: '03', label: 'Boleta', serie: serieBoleta, sub: 'Para personas naturales' },
              ].map((t) => (
                <button
                  key={t.val}
                  type="button"
                  onClick={() => setTipoDoc(t.val as '01' | '03')}
                  className={`flex-1 rounded-lg border px-4 py-3 text-left transition-colors ${
                    tipoDoc === t.val
                      ? 'border-tenant-accent bg-tenant-accent-soft text-tenant-accent-fg'
                      : 'border-orion-border bg-orion-bg-subtle text-orion-fg hover:bg-orion-bg-hover'
                  }`}
                >
                  <div className="text-[13px] font-semibold">{t.label}</div>
                  <div className="mt-0.5 font-mono text-[11px] opacity-70">
                    {t.serie ?? 'Sin serie configurada'}
                  </div>
                  <div className="mt-0.5 text-[11px] opacity-60">{t.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Datos del comprobante */}
          <div className="rounded-lg border border-orion-border bg-orion-bg p-4">
            <p className="mb-3 text-[13px] font-semibold text-orion-fg">Datos del comprobante</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="mb-1 block text-[12px] font-medium text-orion-fg-muted">
                  Cliente <span className="text-danger-fg">*</span>
                </label>
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="h-8 w-full rounded-md border border-orion-border bg-orion-bg px-2.5 text-[12px] text-orion-fg focus:border-tenant-accent focus:outline-none"
                  required
                >
                  <option value="">— Seleccionar cliente —</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} ({c.tipoDocumento} {c.numeroDocumento})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-medium text-orion-fg-muted">
                  Fecha emisión <span className="text-danger-fg">*</span>
                </label>
                <input
                  type="date"
                  value={fechaEmision}
                  onChange={(e) => setFechaEmision(e.target.value)}
                  className="h-8 w-full rounded-md border border-orion-border bg-orion-bg px-2.5 text-[12px] text-orion-fg focus:border-tenant-accent focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-medium text-orion-fg-muted">
                  Forma de pago
                </label>
                <select
                  value={formaPago}
                  onChange={(e) => setFormaPago(e.target.value as 'contado' | 'credito')}
                  className="h-8 w-full rounded-md border border-orion-border bg-orion-bg px-2.5 text-[12px] text-orion-fg focus:border-tenant-accent focus:outline-none"
                >
                  <option value="contado">Contado</option>
                  <option value="credito">Crédito</option>
                </select>
              </div>

              {formaPago === 'credito' && (
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-orion-fg-muted">
                    Plazo (días)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={plazoDias}
                    onChange={(e) => setPlazoDias(Number(e.target.value))}
                    className="h-8 w-full rounded-md border border-orion-border bg-orion-bg px-2.5 text-[12px] text-orion-fg focus:border-tenant-accent focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Ítems */}
          <div className="rounded-lg border border-orion-border bg-orion-bg p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-orion-fg">Ítems</p>
              <button
                type="button"
                onClick={() => setLineas((prev) => [...prev, emptyLinea()])}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg px-2.5 text-[12px] font-medium text-orion-fg-muted hover:bg-orion-bg-muted hover:text-orion-fg"
              >
                <Plus size={12} />
                Añadir ítem
              </button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_2fr_80px_100px_60px_32px] gap-2 text-[10px] font-semibold uppercase tracking-wider text-orion-fg-faint">
                <span>Producto</span>
                <span>Descripción</span>
                <span className="text-right">Cant.</span>
                <span className="text-right">Precio unit.</span>
                <span className="text-center">IGV</span>
                <span />
              </div>

              {lineas.map((l, i) => {
                const calc =
                  l.descripcion && l.cantidad > 0 && l.precioUnitario > 0 ? calcularLinea(l) : null;
                return (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_2fr_80px_100px_60px_32px] items-center gap-2"
                  >
                    <ProductoCombobox
                      value={l.productoId ?? null}
                      productos={productos}
                      onChange={(id) => selectProducto(i, id)}
                    />
                    <input
                      value={l.descripcion}
                      onChange={(e) => updateLinea(i, { descripcion: e.target.value })}
                      placeholder="Descripción del servicio o producto"
                      className="h-8 rounded-md border border-orion-border bg-orion-bg px-2.5 text-[12px] text-orion-fg placeholder:text-orion-fg-faint focus:border-tenant-accent focus:outline-none"
                    />
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={l.cantidad || ''}
                      onChange={(e) =>
                        updateLinea(i, { cantidad: parseFloat(e.target.value) || 0 })
                      }
                      className="h-8 rounded-md border border-orion-border bg-orion-bg px-2.5 text-right text-[12px] text-orion-fg focus:border-tenant-accent focus:outline-none"
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={l.precioUnitario || ''}
                      onChange={(e) =>
                        updateLinea(i, { precioUnitario: parseFloat(e.target.value) || 0 })
                      }
                      className="h-8 rounded-md border border-orion-border bg-orion-bg px-2.5 text-right text-[12px] text-orion-fg focus:border-tenant-accent focus:outline-none"
                    />
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={l.tipoAfectacionIgv === '10'}
                        onChange={(e) =>
                          updateLinea(i, { tipoAfectacionIgv: e.target.checked ? '10' : '20' })
                        }
                        className="h-4 w-4 rounded border-orion-border text-tenant-accent"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setLineas((prev) => prev.filter((_, idx) => idx !== i))}
                      disabled={lineas.length === 1}
                      className="grid h-7 w-7 place-items-center rounded-md text-orion-fg-faint hover:bg-danger-soft hover:text-danger-fg disabled:opacity-30"
                    >
                      <Trash2 size={13} />
                    </button>
                    {calc && (
                      <div className="col-span-6 text-right text-[11px] text-orion-fg-muted">
                        Subtotal: S/{' '}
                        {calc.totalLinea.toLocaleString('es-PE', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Observaciones */}
          <div className="rounded-lg border border-orion-border bg-orion-bg p-4">
            <label className="mb-1 block text-[12px] font-medium text-orion-fg-muted">
              Observaciones (opcional)
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-orion-border bg-orion-bg px-3 py-2 text-[12px] text-orion-fg placeholder:text-orion-fg-faint focus:border-tenant-accent focus:outline-none"
              placeholder="Notas internas, referencias, etc."
            />
          </div>
        </div>

        {/* Right column (2fr) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Validación previa SUNAT */}
          <div className="rounded-lg border border-tenant-accent bg-tenant-accent-soft p-4">
            <div className="mb-3 flex items-center gap-2">
              <Cloud size={14} className="text-tenant-accent-fg" />
              <span className="text-[13px] font-semibold text-tenant-accent-fg">
                Validación previa SUNAT
              </span>
            </div>
            <div className="space-y-1.5">
              {[
                `RUC del cliente ${clienteId ? 'seleccionado' : '— selecciona un cliente'}`,
                `Serie ${serie ?? '— sin serie configurada'} ${serie ? 'disponible' : ''}`,
                'Numeración correlativa lista',
                'Tipo de cambio SBS disponible',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px]">
                  {clienteId || i > 0 ? (
                    <Check size={12} className="shrink-0 text-success-fg" />
                  ) : (
                    <AlertCircle size={12} className="shrink-0 text-warn-fg" />
                  )}
                  <span className={clienteId || i > 0 ? 'text-tenant-accent-fg' : 'text-warn-fg'}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totales */}
          <div className="rounded-lg border border-orion-border bg-orion-bg-subtle p-4">
            <p className="mb-3 text-[13px] font-semibold text-orion-fg">Totales</p>
            {validLineas.length > 0 ? (
              <div className="space-y-1 text-[13px]">
                <div className="flex justify-between text-orion-fg-muted">
                  <span>Base gravada</span>
                  <span className="tabular-nums">
                    S/{' '}
                    {totales.totalGravadas.toLocaleString('es-PE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-orion-fg-muted">
                  <span>IGV (18%)</span>
                  <span className="tabular-nums">
                    S/{' '}
                    {totales.igv.toLocaleString('es-PE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between border-t border-orion-border pt-1 font-semibold text-orion-fg">
                  <span>Total</span>
                  <span className="tabular-nums">
                    S/{' '}
                    {totales.total.toLocaleString('es-PE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-orion-fg-faint">
                Agrega ítems para ver el resumen de totales.
              </p>
            )}
          </div>

          {/* Al guardar, ocurrirá esto */}
          <div className="rounded-lg border border-orion-border bg-orion-bg p-4">
            <p className="mb-3 text-[13px] font-semibold text-orion-fg">
              Al guardar, ocurrirá esto
            </p>
            <ol className="space-y-2">
              {[
                'Se asigna el correlativo definitivo',
                'Se firma el XML con certificado digital',
                'Se encola para envío a SUNAT vía Nubefact',
                'Se descuenta stock y actualiza CxC',
                'Se envía PDF + XML al cliente por email',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-orion-fg-muted">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-orion-bg-muted text-[10px] font-semibold text-orion-fg-muted">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </form>
  );
}
