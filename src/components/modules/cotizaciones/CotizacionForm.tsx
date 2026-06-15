'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ExternalLink, Plus, Send, Trash2 } from 'lucide-react';
import { cotizacionSchema, type CotizacionInput } from '@/lib/schemas/cotizacion';
import { calcularTotales } from '@/lib/cotizaciones/calculo';
import { crearCotizacion, actualizarCotizacion } from '@/server/actions/cotizaciones';
import { Money } from '@/components/shared/Money';
import { ProductoCombobox } from '@/components/shared/ProductoCombobox';
import { EstadoBadge } from '@/components/shared/EstadoBadge';
import { cn } from '@/lib/utils';

export type ClienteOption = { id: string; label: string };
export type ProductoOption = {
  id: string;
  codigo: string;
  nombre: string;
  precio: number;
  costoUnitario: number | null;
  margenMinimo: number | null;
  tieneIgv: boolean;
  unidadMedida: string;
  stockActual: number | null;
};

export type CotizacionFormInitial = {
  id: string;
  clienteId: string;
  moneda: 'PEN' | 'USD';
  tipoCambio: number | null;
  fechaEmision: string;
  fechaVencimiento: string;
  descuentoGlobal: number;
  notas: string | null;
  terminosCondiciones: string | null;
  formaPago: string | null;
  tiempoEntrega: string | null;
  lugarEntrega: string | null;
  incluyeIgv: boolean;
  contactoClienteNombre: string | null;
  contactoClienteCargo: string | null;
  contactoClienteEmail: string | null;
  items: Array<{
    productoId: string | null;
    codigo: string | null;
    descripcion: string;
    unidadMedida: string;
    cantidad: number;
    precioUnitario: number;
    descuentoPorcentaje: number;
    afectaIgv: boolean;
    tiempoEntregaDias: number | null;
  }>;
};

interface Props {
  companySlug: string;
  clientes: ClienteOption[];
  productos: ProductoOption[];
  initial?: CotizacionFormInitial;
  defaultClienteId?: string;
  numero?: string;
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const plusDaysIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const btnPrimary =
  'inline-flex h-9 items-center gap-1.5 rounded-md bg-tenant-accent px-4 text-[13px] font-medium text-white hover:brightness-95 disabled:opacity-60';
const btnSecondary =
  'inline-flex h-9 items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg px-4 text-[13px] font-medium text-orion-fg hover:bg-orion-bg-muted disabled:opacity-60';

export function CotizacionForm({
  companySlug,
  clientes,
  productos,
  initial,
  defaultClienteId,
  numero,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  // costosByIdx: Map<lineIndex, costoUnitario> — for margin display only, not submitted
  const [costosByIdx, setCostosByIdx] = useState<Map<number, number>>(() => {
    const m = new Map<number, number>();
    if (initial) {
      const pm = new Map<string, ProductoOption>();
      productos.forEach((p) => pm.set(p.id, p));
      initial.items.forEach((it, idx) => {
        if (it.productoId) {
          const p = pm.get(it.productoId);
          if (p && p.costoUnitario != null) m.set(idx, p.costoUnitario);
        }
      });
    }
    return m;
  });
  const [margenMinimoByIdx, setMargenMinimoByIdx] = useState<Map<number, number>>(() => {
    const m = new Map<number, number>();
    if (initial) {
      const pm = new Map<string, ProductoOption>();
      productos.forEach((p) => pm.set(p.id, p));
      initial.items.forEach((it, idx) => {
        if (it.productoId) {
          const p = pm.get(it.productoId);
          if (p?.margenMinimo != null) m.set(idx, p.margenMinimo!);
        }
      });
    }
    return m;
  });
  const [stockByIdx, setStockByIdx] = useState<Map<number, number>>(() => new Map());
  const [targetMargen, setTargetMargen] = useState<5 | 10 | 15 | 'custom'>(10);
  const [customMargenPct, setCustomMargenPct] = useState('20');
  // previewId: cotización guardada como borrador para mostrar PDF inline
  const [previewId, setPreviewId] = useState<string | null>(initial?.id ?? null);
  const [previewPending, setPreviewPending] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const productosById = useMemo(() => {
    const m = new Map<string, ProductoOption>();
    productos.forEach((p) => m.set(p.id, p));
    return m;
  }, [productos]);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<CotizacionInput>({
    resolver: zodResolver(cotizacionSchema) as Resolver<CotizacionInput>,
    defaultValues: initial
      ? {
          clienteId: initial.clienteId,
          moneda: initial.moneda,
          tipoCambio: initial.tipoCambio ?? undefined,
          fechaEmision: initial.fechaEmision,
          fechaVencimiento: initial.fechaVencimiento,
          descuentoGlobal: initial.descuentoGlobal,
          notas: initial.notas ?? undefined,
          terminosCondiciones: initial.terminosCondiciones ?? undefined,
          formaPago: initial.formaPago ?? undefined,
          tiempoEntrega: initial.tiempoEntrega ?? undefined,
          lugarEntrega: initial.lugarEntrega ?? undefined,
          incluyeIgv: initial.incluyeIgv ?? false,
          contactoClienteNombre: initial.contactoClienteNombre ?? undefined,
          contactoClienteCargo: initial.contactoClienteCargo ?? undefined,
          contactoClienteEmail: initial.contactoClienteEmail ?? undefined,
          items: initial.items.map((it) => ({
            productoId: it.productoId ?? undefined,
            codigo: it.codigo ?? undefined,
            descripcion: it.descripcion,
            unidadMedida: it.unidadMedida,
            cantidad: it.cantidad,
            precioUnitario: it.precioUnitario,
            descuentoPorcentaje: it.descuentoPorcentaje,
            afectaIgv: it.afectaIgv,
            tiempoEntregaDias: it.tiempoEntregaDias ?? undefined,
          })),
        }
      : {
          clienteId: defaultClienteId ?? '',
          moneda: 'USD',
          fechaEmision: todayIso(),
          fechaVencimiento: plusDaysIso(3),
          descuentoGlobal: 0,
          items: [
            {
              descripcion: '',
              unidadMedida: 'NIU',
              cantidad: 1,
              precioUnitario: 0,
              descuentoPorcentaje: 0,
              afectaIgv: true,
            },
          ],
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const moneda = useWatch({ control, name: 'moneda' });
  const tipoCambioW = Number(useWatch({ control, name: 'tipoCambio' }) ?? 0);
  const itemsW = useWatch({ control, name: 'items' }) ?? [];
  const descuentoGlobalW = Number(useWatch({ control, name: 'descuentoGlobal' }) ?? 0);

  const totales = useMemo(
    () =>
      calcularTotales(
        itemsW.map((it) => ({
          cantidad: Number(it?.cantidad) || 0,
          precioUnitario: Number(it?.precioUnitario) || 0,
          descuentoPorcentaje: Number(it?.descuentoPorcentaje) || 0,
          afectaIgv: it?.afectaIgv !== false,
        })),
        descuentoGlobalW || 0
      ),
    [itemsW, descuentoGlobalW]
  );

  // Compute cost totals for margin panel
  const costoTotal = useMemo(() => {
    let total = 0;
    itemsW.forEach((it, idx) => {
      const costo = costosByIdx.get(idx);
      if (costo != null) {
        total += costo * (Number(it?.cantidad) || 0);
      }
    });
    return total;
  }, [itemsW, costosByIdx]);

  const hasCostData = costosByIdx.size > 0;
  const utilidadBruta = totales.subtotal - costoTotal;
  const margenConsolidado = totales.subtotal > 0 ? (utilidadBruta / totales.subtotal) * 100 : 0;

  // Minimum margin for warning: derive from product data per-line
  const lineasBajoMargen = useMemo(() => {
    return fields
      .map((_, idx) => {
        const it = itemsW[idx];
        const precio = Number(it?.precioUnitario) || 0;
        const costo = costosByIdx.get(idx);
        const minMargen = margenMinimoByIdx.get(idx);
        if (costo == null || minMargen == null || precio === 0) return null;
        const margenActual = ((precio - costo) / precio) * 100;
        if (margenActual < minMargen) {
          return { idx, margenActual, minMargen };
        }
        return null;
      })
      .filter((x): x is { idx: number; margenActual: number; minMargen: number } => x !== null);
  }, [fields, itemsW, costosByIdx, margenMinimoByIdx]);

  const applyMargen = (pct: number) => {
    itemsW.forEach((item, idx) => {
      // Use catalog cost if available; fall back to current price for manual items
      const costo = costosByIdx.get(idx) ?? Number(item?.precioUnitario);
      if (!costo || costo === 0) return;
      // margen sobre venta: precio = costo / (1 - pct/100) — consistente con el display
      const newPrice = Math.round((costo / (1 - pct / 100)) * 10000) / 10000;
      setValue(`items.${idx}.precioUnitario`, newPrice, { shouldDirty: true });
    });
  };

  const aplicarProducto = (idx: number, productoId: string) => {
    const opts = { shouldDirty: true };
    if (productoId === '__manual__') {
      setValue(`items.${idx}.productoId`, undefined, opts);
      // Clear cost/stock tracking for this line
      setCostosByIdx((prev) => {
        const next = new Map(prev);
        next.delete(idx);
        return next;
      });
      setMargenMinimoByIdx((prev) => {
        const next = new Map(prev);
        next.delete(idx);
        return next;
      });
      setStockByIdx((prev) => {
        const next = new Map(prev);
        next.delete(idx);
        return next;
      });
      return;
    }
    const p = productosById.get(productoId);
    if (!p) return;
    setValue(`items.${idx}.productoId`, p.id, opts);
    setValue(`items.${idx}.codigo`, p.codigo, opts);
    setValue(`items.${idx}.descripcion`, p.nombre, opts);
    setValue(`items.${idx}.unidadMedida`, p.unidadMedida, opts);
    // Use costoUnitario (supplier cost from CELSA) as cost basis for margin.
    // Fall back to precioUnitario only if costoUnitario not set.
    const costoBasis = p.costoUnitario ?? p.precio;
    // Set catalog list price; user applies margin via the margin buttons
    setValue(`items.${idx}.precioUnitario`, p.precio, opts);
    setValue(`items.${idx}.afectaIgv`, p.tieneIgv, opts);
    // Store supplier cost as cost base for margin display and recalculation
    setCostosByIdx((prev) => new Map(prev).set(idx, costoBasis));
    if (p.margenMinimo != null) {
      setMargenMinimoByIdx((prev) => new Map(prev).set(idx, p.margenMinimo!));
    } else {
      setMargenMinimoByIdx((prev) => {
        const next = new Map(prev);
        next.delete(idx);
        return next;
      });
    }
    if (p.stockActual != null) {
      setStockByIdx((prev) => new Map(prev).set(idx, p.stockActual!));
    } else {
      setStockByIdx((prev) => {
        const next = new Map(prev);
        next.delete(idx);
        return next;
      });
    }
  };

  const saveAsDraft = () => {
    // No-op: draft is the default state, just submit as normal
    handleSubmit(onSubmit)();
  };

  const onSubmit = (data: CotizacionInput) => {
    setServerError(null);
    startTransition(async () => {
      const res = initial
        ? await actualizarCotizacion(initial.id, data)
        : await crearCotizacion(data);

      if (!res.success) {
        setServerError(res.error);
        return;
      }

      const id = initial ? initial.id : (res.data as { id: string }).id;
      router.push(`/${companySlug}/cotizaciones/${id}`);
    });
  };

  const saveAndPreview = handleSubmit(
    async (data) => {
      setPreviewPending(true);
      setPreviewError(null);
      setServerError(null);
      try {
        const res = initial
          ? await actualizarCotizacion(initial.id, data)
          : await crearCotizacion(data);
        if (!res.success) {
          setPreviewError(res.error);
        } else {
          const id = initial ? initial.id : (res.data as { id: string }).id;
          setPreviewId(id);
        }
      } finally {
        setPreviewPending(false);
      }
    },
    () => {
      setPreviewError(
        'Selecciona un cliente y agrega al menos un ítem para generar la vista previa.'
      );
    }
  );

  const monedaSymbol = moneda === 'USD' ? 'USD' : 'PEN';

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Page-level header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-semibold text-orion-fg">
              {numero ? numero : 'Nueva cotización'}
            </h1>
            <EstadoBadge estado="borrador" />
          </div>
          <div className="mt-1 text-[12px] text-orion-fg-muted">
            {numero
              ? `${numero} · ${fields.length} items · ${monedaSymbol} ${totales.total.toFixed(2)}`
              : 'Se generará el correlativo al guardar.'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => router.back()} className={btnSecondary}>
            Cancelar
          </button>
          <button type="button" onClick={saveAsDraft} disabled={pending} className={btnSecondary}>
            Guardar borrador
          </button>
          <button type="submit" disabled={pending} className={btnPrimary}>
            <Send size={13} />
            {pending ? 'Enviando…' : 'Crear cotización'}
          </button>
        </div>
      </div>

      {serverError && (
        <div className="mb-4 rounded-md border border-danger bg-danger-soft px-3 py-2 text-[13px] text-danger-fg">
          {serverError}
        </div>
      )}

      {/* Two-column grid: 3fr left, 2fr right */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '3fr 2fr' }}>
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-4">
          {/* Card 1: Cliente y términos */}
          <Card>
            <CardHead>
              <CardTitle>Cliente y términos</CardTitle>
            </CardHead>
            <div className="flex flex-col gap-4 p-4">
              {/* Cliente select full width */}
              <Field label="Cliente *" error={errors.clienteId?.message}>
                <select
                  {...register('clienteId')}
                  className={inputCls}
                  defaultValue={initial?.clienteId ?? ''}
                >
                  <option value="" disabled>
                    Selecciona un cliente
                  </option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <p className="text-[11.5px] text-orion-fg-muted">
                Selecciona un cliente para ver la línea de crédito
              </p>

              {/* 2-col: Fecha emisión | Fecha vencimiento */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Fecha emisión *" error={errors.fechaEmision?.message}>
                  <input type="date" {...register('fechaEmision')} className={inputCls} />
                </Field>
                <Field label="Fecha vencimiento *" error={errors.fechaVencimiento?.message}>
                  <input type="date" {...register('fechaVencimiento')} className={inputCls} />
                </Field>
              </div>

              {/* Moneda (USD es la moneda base de venta). El tipo de cambio se
                  oculta pero se conserva por debajo para cotizaciones en PEN. */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Moneda *">
                  <select {...register('moneda')} className={inputCls}>
                    <option value="USD">USD — Dólares</option>
                    <option value="PEN">PEN — Soles</option>
                  </select>
                </Field>
              </div>
              <input type="hidden" {...register('tipoCambio')} />
            </div>
          </Card>

          {/* Card 2: Líneas */}
          <Card>
            <CardHead>
              <CardTitle>Líneas · {fields.length} items</CardTitle>
              {/* Search input right-aligned, cmd+K style */}
              <div className="ml-auto flex items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg-subtle px-2.5 py-1 text-[12px] text-orion-fg-muted">
                <span>Agregar producto…</span>
                <kbd className="rounded bg-orion-bg px-1 py-0.5 text-[10px] font-medium text-orion-fg-muted shadow-sm">
                  ⌘K
                </kbd>
              </div>
            </CardHead>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr>
                    <Th>SKU</Th>
                    <Th>Descripción</Th>
                    <Th align="right">Cant.</Th>
                    <Th align="right">Precio</Th>
                    <Th align="right">Margen</Th>
                    <Th align="right">Entrega</Th>
                    <Th align="right">Subtotal</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {fields.map((f, idx) => {
                    const it = itemsW[idx];
                    const cantidad = Number(it?.cantidad) || 0;
                    const precio = Number(it?.precioUnitario) || 0;
                    const desc = Number(it?.descuentoPorcentaje) || 0;
                    const subtotal = cantidad * precio * (1 - desc / 100);
                    const itemErr = errors.items?.[idx];

                    // Margin computation
                    const costo = costosByIdx.get(idx);
                    const minMargen = margenMinimoByIdx.get(idx);
                    let margenPct: number | null = null;
                    let margenBelowMin = false;
                    if (costo != null && precio > 0) {
                      margenPct = ((precio - costo) / precio) * 100;
                      if (minMargen != null) {
                        margenBelowMin = margenPct < minMargen;
                      }
                    }

                    // SKU from watched items
                    const sku = it?.codigo ?? null;

                    return (
                      <tr key={f.id} className="border-b border-orion-border last:border-0">
                        {/* SKU */}
                        <Td className="min-w-[180px]">
                          <ProductoCombobox
                            value={it?.productoId}
                            productos={productos}
                            onChange={(id) => aplicarProducto(idx, id)}
                          />
                          {sku && (
                            <p className="mt-0.5 font-mono text-[10.5px] text-orion-fg-muted">
                              {sku}
                            </p>
                          )}
                        </Td>
                        {/* Descripción */}
                        <Td className="min-w-[200px]">
                          <input
                            {...register(`items.${idx}.descripcion`)}
                            className={cn(inputCls, 'h-8 text-[12.5px]')}
                          />
                          {itemErr?.descripcion && (
                            <p className="mt-1 text-[10.5px] text-danger-fg">
                              {itemErr.descripcion.message}
                            </p>
                          )}
                        </Td>
                        {/* Cant. */}
                        <Td align="right" className="w-[96px]">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            {...register(`items.${idx}.cantidad`)}
                            className={cn(
                              inputCls,
                              'h-8 text-right text-[12.5px] tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
                            )}
                          />
                          {(() => {
                            const stock = stockByIdx.get(idx);
                            const qty = Number(itemsW[idx]?.cantidad) || 0;
                            if (stock != null && qty > stock) {
                              return (
                                <p
                                  className="mt-0.5 text-[10px] text-warn-fg"
                                  title={`Stock disponible: ${stock}`}
                                >
                                  ⚠ stock: {stock}
                                </p>
                              );
                            }
                            return null;
                          })()}
                        </Td>
                        {/* Precio — hidden registered input keeps RHF state; visible input is controlled */}
                        <Td align="right" className="w-[160px]">
                          <input type="hidden" {...register(`items.${idx}.precioUnitario`)} />
                          <input
                            type="number"
                            step="0.0001"
                            min="0"
                            value={precio || ''}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              setValue(`items.${idx}.precioUnitario`, isNaN(v) ? 0 : v, {
                                shouldDirty: true,
                              });
                            }}
                            className={cn(
                              inputCls,
                              'h-8 min-w-[140px] text-right text-[12.5px] tabular-nums'
                            )}
                          />
                        </Td>
                        {/* Margen */}
                        <Td align="right" className="w-[80px]">
                          {margenPct != null ? (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 tabular-nums',
                                margenBelowMin ? 'text-warn-fg' : 'text-orion-fg'
                              )}
                            >
                              {margenBelowMin && <AlertTriangle size={10} />}
                              {margenPct.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-orion-fg-muted">—</span>
                          )}
                        </Td>
                        {/* Entrega días */}
                        <Td align="right" className="w-[72px]">
                          <input
                            type="number"
                            min="1"
                            max="60"
                            step="1"
                            placeholder="—"
                            {...register(`items.${idx}.tiempoEntregaDias`)}
                            className={cn(
                              inputCls,
                              'h-8 w-16 text-right text-[12.5px] tabular-nums'
                            )}
                          />
                        </Td>
                        {/* Subtotal */}
                        <Td
                          align="right"
                          className="w-[100px] font-semibold tabular-nums text-orion-fg"
                        >
                          <Money value={subtotal} ccy={moneda} dp={2} />
                        </Td>
                        {/* Delete */}
                        <Td className="w-10">
                          <button
                            type="button"
                            onClick={() => {
                              remove(idx);
                              // Re-index cost maps: shift entries above removed idx down
                              setCostosByIdx((prev) => {
                                const next = new Map<number, number>();
                                prev.forEach((v, k) => {
                                  if (k < idx) next.set(k, v);
                                  else if (k > idx) next.set(k - 1, v);
                                });
                                return next;
                              });
                              setMargenMinimoByIdx((prev) => {
                                const next = new Map<number, number>();
                                prev.forEach((v, k) => {
                                  if (k < idx) next.set(k, v);
                                  else if (k > idx) next.set(k - 1, v);
                                });
                                return next;
                              });
                            }}
                            disabled={fields.length === 1}
                            className="grid h-7 w-7 place-items-center rounded-md text-orion-fg-muted hover:bg-danger-soft hover:text-danger-fg disabled:opacity-40"
                          >
                            <Trash2 size={13} />
                          </button>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {errors.items && typeof errors.items.message === 'string' && (
              <div className="border-t border-orion-border bg-danger-soft px-4 py-2 text-[12px] text-danger-fg">
                {errors.items.message}
              </div>
            )}

            {/* Card footer */}
            <div className="border-t border-orion-border px-4 py-3">
              <button
                type="button"
                onClick={() =>
                  append({
                    descripcion: '',
                    unidadMedida: 'NIU',
                    cantidad: 1,
                    precioUnitario: 0,
                    descuentoPorcentaje: 0,
                    afectaIgv: true,
                    tiempoEntregaDias: undefined,
                  })
                }
                className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-orion-fg-muted hover:text-orion-fg"
              >
                <Plus size={13} />
                Añadir ítem manual
              </button>
            </div>
          </Card>

          {/* Card 3: Términos y observaciones */}
          <Card>
            <CardHead>
              <CardTitle>Términos y observaciones</CardTitle>
            </CardHead>
            <div className="flex flex-col gap-4 p-4">
              <Field label="Términos de pago">
                <input
                  {...register('formaPago')}
                  placeholder="Ej: 50% anticipo, saldo contra entrega"
                  className={inputCls}
                />
              </Field>
              <Field label="Tiempo de entrega">
                <input
                  {...register('tiempoEntrega')}
                  placeholder="Ej: 7 días hábiles"
                  className={inputCls}
                />
              </Field>
              <Field label="Lugar de entrega">
                <input
                  {...register('lugarEntrega')}
                  placeholder="Ej: Almacén cliente, Lima"
                  className={inputCls}
                />
              </Field>
              <Field label="Observaciones (visibles en PDF)">
                <textarea
                  {...register('notas')}
                  rows={2}
                  placeholder="Observaciones que aparecerán en el PDF de la cotización"
                  className={cn(inputCls, 'resize-y')}
                />
              </Field>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-4">
          {/* Card 5: Totales */}
          <Card>
            <CardHead>
              <CardTitle>Totales</CardTitle>
            </CardHead>
            <div className="flex flex-col gap-2 p-4 text-[12.5px]">
              <Row label="Subtotal">
                <Money value={totales.subtotal} ccy={moneda} dp={2} />
              </Row>

              {/* Margen — operador only, no va al PDF */}
              <div className="flex items-center gap-2">
                <span className="text-orion-fg-muted">Margen</span>
                <div className="ml-auto flex items-center gap-1">
                  {([5, 10, 15] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setTargetMargen(v);
                        applyMargen(v);
                      }}
                      className={cn(
                        'rounded border px-2 py-0.5 text-[12px] font-medium transition-colors',
                        targetMargen === v
                          ? 'border-tenant-accent/50 bg-tenant-accent/10 text-tenant-accent'
                          : 'border-orion-border bg-orion-bg text-orion-fg hover:bg-orion-bg-muted'
                      )}
                    >
                      {v}%
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTargetMargen('custom')}
                    className={cn(
                      'rounded border px-2 py-0.5 text-[12px] font-medium transition-colors',
                      targetMargen === 'custom'
                        ? 'border-tenant-accent/50 bg-tenant-accent/10 text-tenant-accent'
                        : 'border-orion-border bg-orion-bg text-orion-fg hover:bg-orion-bg-muted'
                    )}
                  >
                    Custom
                  </button>
                </div>
              </div>
              {targetMargen === 'custom' && (
                <div className="flex items-center gap-2">
                  <span className="text-orion-fg-muted">Margen custom</span>
                  <div className="ml-auto flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="99"
                      step="0.1"
                      value={customMargenPct}
                      onChange={(e) => setCustomMargenPct(e.target.value)}
                      className={cn(inputCls, 'h-7 w-16 text-right text-[12px] tabular-nums')}
                    />
                    <span className="text-orion-fg-muted">%</span>
                    <button
                      type="button"
                      onClick={() => {
                        const n = parseFloat(customMargenPct);
                        if (!isNaN(n) && n >= 0 && n < 100) applyMargen(n);
                      }}
                      className="border-tenant-accent/50 bg-tenant-accent/10 rounded border px-2 py-0.5 text-[12px] font-medium text-tenant-accent"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              )}
              {lineasBajoMargen.length > 0 && (
                <div className="flex items-start gap-1.5 text-[11.5px] text-warn-fg">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  <span>{lineasBajoMargen.length} línea(s) bajo margen mínimo</span>
                </div>
              )}

              {/* Descuento global inline */}
              <div className="flex items-center gap-2">
                <span className="text-orion-fg-muted">Descuento global</span>
                <div className="ml-auto flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    {...register('descuentoGlobal')}
                    className={cn(inputCls, 'h-7 w-20 text-right text-[12px] tabular-nums')}
                  />
                  <span className="text-orion-fg-muted">%</span>
                </div>
              </div>

              <Row label="Base IGV">
                <Money value={totales.baseImponible} ccy={moneda} dp={2} />
              </Row>
              <Row label="IGV 18%">
                <Money value={totales.igv} ccy={moneda} dp={2} />
              </Row>

              <div className="my-1 h-px bg-orion-border" />

              {/* Total large */}
              <div className="flex items-center">
                <span className="text-[13px] font-semibold text-orion-fg">Total</span>
                <span className="ml-auto text-[20px] font-semibold tabular-nums text-orion-fg">
                  <Money value={totales.total} ccy={moneda} dp={2} />
                </span>
              </div>

              {/* USD exchange rate hint */}
              {moneda === 'USD' && tipoCambioW > 0 && (
                <p className="text-right text-[11px] text-orion-fg-muted">
                  ≈ S/ {(totales.total * tipoCambioW).toFixed(2)} al tipo de cambio
                </p>
              )}

              <div className="my-1 h-px bg-orion-border" />

              {/* Cost & margin section */}
              {hasCostData ? (
                <>
                  <Row label="Costo total">
                    <span className="text-orion-fg-muted">
                      <Money value={costoTotal} ccy={moneda} dp={2} />
                    </span>
                  </Row>
                  <div className="flex items-center">
                    <span className="text-orion-fg-muted">Utilidad bruta</span>
                    <span
                      className={cn(
                        'ml-auto font-medium tabular-nums',
                        utilidadBruta > 0 ? 'text-success-fg' : 'text-danger-fg'
                      )}
                    >
                      <Money value={utilidadBruta} ccy={moneda} dp={2} />
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-orion-fg-muted">Margen consolidado</span>
                    <span
                      className={cn(
                        'ml-auto font-medium tabular-nums',
                        lineasBajoMargen.length > 0 ? 'text-warn-fg' : 'text-success-fg'
                      )}
                    >
                      {margenConsolidado.toFixed(1)}%
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-[11.5px] text-orion-fg-muted">
                  — (asigna costos en el catálogo para ver utilidad)
                </p>
              )}
            </div>
          </Card>

          {/* Card 6: Vista previa PDF */}
          <Card>
            <CardHead>
              <CardTitle>Vista previa PDF</CardTitle>
              {previewId && (
                <a
                  href={`/api/${companySlug}/cotizaciones/${previewId}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-orion-fg-muted hover:text-orion-fg"
                  aria-label="Abrir PDF en pestaña nueva"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </CardHead>
            <div className="p-3">
              {previewId ? (
                <div className="flex flex-col gap-2">
                  <iframe
                    key={previewId}
                    src={`/api/${companySlug}/cotizaciones/${previewId}/pdf`}
                    className="w-full rounded border border-orion-border bg-orion-bg-subtle"
                    style={{ aspectRatio: '8.5 / 11' }}
                    title="Vista previa PDF"
                  />
                  <button
                    type="button"
                    onClick={saveAndPreview}
                    disabled={previewPending}
                    className={cn(btnSecondary, 'w-full justify-center text-[12px]')}
                  >
                    {previewPending ? 'Guardando…' : 'Actualizar vista previa PDF'}
                  </button>
                  {previewError && (
                    <p className="text-center text-[11px] text-danger-fg">{previewError}</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Skeleton */}
                  <div
                    className="w-full overflow-hidden rounded border border-orion-border bg-orion-bg-subtle p-3"
                    style={{ aspectRatio: '8.5 / 11' }}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <div className="grid h-6 w-6 shrink-0 place-items-center rounded bg-tenant-accent text-[9px] font-bold text-white">
                        IX
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="h-2 w-24 rounded-sm bg-orion-border" />
                        <div className="bg-orion-border/60 h-1.5 w-16 rounded-sm" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="bg-orion-border/50 h-2 w-full rounded-sm" />
                      <div className="bg-orion-border/50 h-2 w-[90%] rounded-sm" />
                      <div className="bg-orion-border/50 h-2 w-[75%] rounded-sm" />
                      <div className="bg-orion-border/50 h-2 w-[85%] rounded-sm" />
                      <div className="bg-orion-border/50 h-2 w-[60%] rounded-sm" />
                      <div className="bg-orion-border/50 h-2 w-[70%] rounded-sm" />
                    </div>
                    <div className="mt-4">
                      <span className="font-mono text-[9px] text-orion-fg-muted">
                        {numero ?? 'COT-XXXX'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={saveAndPreview}
                    disabled={previewPending}
                    className={cn(btnSecondary, 'w-full justify-center text-[12px]')}
                  >
                    {previewPending ? 'Guardando borrador…' : 'Actualizar vista previa PDF'}
                  </button>
                  {previewError && (
                    <p className="text-center text-[11px] text-danger-fg">{previewError}</p>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}

// ---- Sub-components ----

const inputCls =
  'block w-full rounded-md border border-orion-border bg-orion-bg px-2.5 py-1.5 text-[13px] text-orion-fg placeholder:text-orion-fg-subtle focus:border-tenant-accent focus:outline-none focus:ring-2 focus:ring-tenant-accent/30 disabled:bg-orion-bg-subtle disabled:text-orion-fg-muted';

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11.5px] font-medium text-orion-fg-muted">{label}</label>
      {children}
      {error && <p className="text-[11px] text-danger-fg">{error}</p>}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center">
      <span className="text-orion-fg-muted">{label}</span>
      <span className="ml-auto tabular-nums text-orion-fg">{children}</span>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-orion-border bg-orion-bg shadow-orion-1">
      {children}
    </div>
  );
}

function CardHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-orion-border px-4 py-3.5">
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[14px] font-semibold text-orion-fg">{children}</div>;
}

function Th({ children, align }: { children?: React.ReactNode; align?: 'right' | 'center' }) {
  return (
    <th
      className={cn(
        'border-b border-orion-border bg-orion-bg-subtle px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-orion-fg-muted',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
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
  children?: React.ReactNode;
  align?: 'right' | 'center';
  className?: string;
}) {
  return (
    <td
      className={cn(
        'px-2 py-1.5 align-middle',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
        className
      )}
    >
      {children}
    </td>
  );
}
