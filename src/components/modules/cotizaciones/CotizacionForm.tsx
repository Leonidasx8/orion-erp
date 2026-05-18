'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { cotizacionSchema, type CotizacionInput } from '@/lib/schemas/cotizacion';
import { calcularTotales } from '@/lib/cotizaciones/calculo';
import { crearCotizacion, actualizarCotizacion } from '@/server/actions/cotizaciones';
import { Money } from '@/components/shared/Money';
import { cn } from '@/lib/utils';

export type ClienteOption = { id: string; label: string };
export type ProductoOption = {
  id: string;
  codigo: string;
  nombre: string;
  precio: number;
  tieneIgv: boolean;
  unidadMedida: string;
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
  }>;
};

interface Props {
  companySlug: string;
  clientes: ClienteOption[];
  productos: ProductoOption[];
  initial?: CotizacionFormInitial;
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const plusDaysIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export function CotizacionForm({ companySlug, clientes, productos, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

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
          })),
        }
      : {
          clienteId: '',
          moneda: 'PEN',
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

  const aplicarProducto = (idx: number, productoId: string) => {
    const opts = { shouldDirty: true };
    if (productoId === '__manual__') {
      setValue(`items.${idx}.productoId`, undefined, opts);
      return;
    }
    const p = productosById.get(productoId);
    if (!p) return;
    setValue(`items.${idx}.productoId`, p.id, opts);
    setValue(`items.${idx}.codigo`, p.codigo, opts);
    setValue(`items.${idx}.descripcion`, p.nombre, opts);
    setValue(`items.${idx}.unidadMedida`, p.unidadMedida, opts);
    setValue(`items.${idx}.precioUnitario`, p.precio, opts);
    setValue(`items.${idx}.afectaIgv`, p.tieneIgv, opts);
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Cabecera */}
      <Card>
        <CardHead>
          <CardTitle>Cabecera</CardTitle>
        </CardHead>
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
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

          <Field label="Moneda *">
            <select {...register('moneda')} className={inputCls}>
              <option value="PEN">PEN — Soles</option>
              <option value="USD">USD — Dólares</option>
            </select>
          </Field>

          <Field
            label={moneda === 'USD' ? 'Tipo de cambio *' : 'Tipo de cambio'}
            error={errors.tipoCambio?.message}
          >
            <input
              type="number"
              step="0.0001"
              min="0"
              disabled={moneda === 'PEN'}
              {...register('tipoCambio')}
              className={cn(inputCls, 'tabular-nums')}
              placeholder={moneda === 'PEN' ? 'No aplica' : '3.7500'}
            />
          </Field>

          <Field label="Fecha emisión *" error={errors.fechaEmision?.message}>
            <input type="date" {...register('fechaEmision')} className={inputCls} />
          </Field>

          <Field label="Fecha vencimiento *" error={errors.fechaVencimiento?.message}>
            <input type="date" {...register('fechaVencimiento')} className={inputCls} />
          </Field>
        </div>
      </Card>

      {/* Líneas */}
      <Card>
        <CardHead>
          <CardTitle>Líneas · {fields.length} items</CardTitle>
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
              })
            }
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] font-medium text-orion-fg hover:bg-orion-bg-muted"
          >
            <Plus size={13} />
            Añadir línea
          </button>
        </CardHead>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr>
                <Th>Producto</Th>
                <Th>Descripción *</Th>
                <Th align="right">Cant. *</Th>
                <Th align="right">Precio *</Th>
                <Th align="right">Desc. %</Th>
                <Th align="center">IGV</Th>
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
                return (
                  <tr key={f.id} className="border-b border-orion-border last:border-0">
                    <Td className="min-w-[180px]">
                      <select
                        defaultValue={f.productoId ?? '__manual__'}
                        onChange={(e) => aplicarProducto(idx, e.target.value)}
                        className={cn(inputCls, 'h-8 text-[12px]')}
                      >
                        <option value="__manual__">— Manual —</option>
                        {productos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.codigo} · {p.nombre}
                          </option>
                        ))}
                      </select>
                    </Td>
                    <Td className="min-w-[220px]">
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
                    <Td align="right" className="w-[90px]">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register(`items.${idx}.cantidad`)}
                        className={cn(inputCls, 'h-8 text-right text-[12.5px] tabular-nums')}
                      />
                    </Td>
                    <Td align="right" className="w-[110px]">
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        {...register(`items.${idx}.precioUnitario`)}
                        className={cn(inputCls, 'h-8 text-right text-[12.5px] tabular-nums')}
                      />
                    </Td>
                    <Td align="right" className="w-[80px]">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        {...register(`items.${idx}.descuentoPorcentaje`)}
                        className={cn(inputCls, 'h-8 text-right text-[12.5px] tabular-nums')}
                      />
                    </Td>
                    <Td align="center" className="w-[60px]">
                      <input
                        type="checkbox"
                        {...register(`items.${idx}.afectaIgv`)}
                        className="h-4 w-4 cursor-pointer accent-tenant-accent"
                      />
                    </Td>
                    <Td align="right" className="w-[110px] tabular-nums text-orion-fg">
                      <Money value={subtotal} ccy={moneda} dp={2} />
                    </Td>
                    <Td className="w-10">
                      <button
                        type="button"
                        onClick={() => remove(idx)}
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
      </Card>

      {/* Totales + términos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHead>
            <CardTitle>Notas y términos</CardTitle>
          </CardHead>
          <div className="grid grid-cols-1 gap-4 p-4">
            <Field label="Notas">
              <textarea
                {...register('notas')}
                rows={3}
                className={cn(inputCls, 'min-h-[72px] resize-y')}
              />
            </Field>
            <Field label="Términos y condiciones">
              <textarea
                {...register('terminosCondiciones')}
                rows={4}
                className={cn(inputCls, 'min-h-[96px] resize-y')}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHead>
            <CardTitle>Totales</CardTitle>
          </CardHead>
          <div className="flex flex-col gap-2 p-4 text-[12.5px]">
            <Row label="Subtotal">
              <Money value={totales.subtotal} ccy={moneda} dp={2} />
            </Row>
            <Row label="IGV 18%">
              <Money value={totales.igv} ccy={moneda} dp={2} />
            </Row>
            <div className="my-1 flex items-center gap-2">
              <label className="text-orion-fg-muted">Descuento global</label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('descuentoGlobal')}
                className={cn(inputCls, 'ml-auto h-7 w-24 text-right text-[12px] tabular-nums')}
              />
            </div>
            <div className="my-1 h-px bg-orion-border" />
            <div className="flex items-center">
              <span className="text-[13px] font-semibold text-orion-fg">Total</span>
              <span className="ml-auto text-[20px] font-semibold tabular-nums text-orion-fg">
                <Money value={totales.total} ccy={moneda} dp={2} />
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Condiciones comerciales */}
      <Card>
        <CardHead>
          <CardTitle>Condiciones comerciales</CardTitle>
        </CardHead>
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
          <Field label="Forma de pago">
            <input
              {...register('formaPago')}
              placeholder="Ej: 50% anticipo, saldo contra entrega"
              className={inputCls}
            />
          </Field>
          <Field label="Tiempo de entrega">
            <input
              {...register('tiempoEntrega')}
              placeholder="Ej: 5 días hábiles"
              className={inputCls}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Lugar de entrega">
              <input
                {...register('lugarEntrega')}
                placeholder="Ej: Almacén del cliente / Recojo en tienda"
                className={inputCls}
              />
            </Field>
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              id="incluyeIgv"
              {...register('incluyeIgv')}
              className="h-4 w-4 cursor-pointer accent-tenant-accent"
            />
            <label htmlFor="incluyeIgv" className="cursor-pointer text-[13px] text-orion-fg">
              Precio unitario incluye IGV
            </label>
          </div>
        </div>
      </Card>

      {/* Atención de (contacto cliente) */}
      <Card>
        <CardHead>
          <CardTitle>
            Atención de{' '}
            <span className="text-[11px] font-normal text-orion-fg-muted">(opcional)</span>
          </CardTitle>
        </CardHead>
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
          <Field label="Nombre contacto">
            <input
              {...register('contactoClienteNombre')}
              placeholder="Nombre del contacto"
              className={inputCls}
            />
          </Field>
          <Field label="Cargo">
            <input {...register('contactoClienteCargo')} placeholder="Cargo" className={inputCls} />
          </Field>
          <Field label="Email">
            <input
              type="email"
              {...register('contactoClienteEmail')}
              placeholder="email@empresa.com"
              className={inputCls}
            />
          </Field>
        </div>
      </Card>

      {serverError && (
        <div className="rounded-md border border-danger bg-danger-soft px-3 py-2 text-[13px] text-danger-fg">
          {serverError}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-tenant-accent px-4 text-[13px] font-medium text-white hover:brightness-95 disabled:opacity-60"
        >
          {pending ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear cotización'}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/${companySlug}/cotizaciones`)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg px-4 text-[13px] font-medium text-orion-fg hover:bg-orion-bg-muted"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

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
