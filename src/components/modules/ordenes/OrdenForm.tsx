'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { ordenCompraSchema, type OrdenCompraInput } from '@/lib/schemas/orden-compra';
import { crearOrdenCompra } from '@/server/actions/ordenes-compra';
import { Money } from '@/components/shared/Money';
import { cn } from '@/lib/utils';

export type ProveedorOption = { id: string; label: string };
export type ProductoOption = {
  id: string;
  codigo: string;
  nombre: string;
  precio: number;
  tieneIgv: boolean;
};

interface Props {
  companySlug: string;
  proveedores: ProveedorOption[];
  productos: ProductoOption[];
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const plusDaysIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const IGV_RATE = 0.18;

export function OrdenForm({ companySlug, proveedores, productos }: Props) {
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
  } = useForm<OrdenCompraInput>({
    resolver: zodResolver(ordenCompraSchema) as Resolver<OrdenCompraInput>,
    defaultValues: {
      proveedorId: '',
      moneda: 'USD',
      fechaEmision: todayIso(),
      fechaEntregaEsperada: plusDaysIso(14),
      lineas: [
        {
          skuSnapshot: '',
          descripcion: '',
          cantidad: 1,
          precioUnitario: 0,
          afectaIgv: true,
          orden: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lineas' });
  const moneda = useWatch({ control, name: 'moneda' });
  const lineasW = useWatch({ control, name: 'lineas' }) ?? [];

  const totales = useMemo(() => {
    let subtotal = 0;
    let igv = 0;
    for (const l of lineasW) {
      const cantidad = Number(l?.cantidad) || 0;
      const precio = Number(l?.precioUnitario) || 0;
      const sub = cantidad * precio;
      subtotal += sub;
      if (l?.afectaIgv !== false) igv += sub * IGV_RATE;
    }
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      igv: Math.round(igv * 100) / 100,
      total: Math.round((subtotal + igv) * 100) / 100,
    };
  }, [lineasW]);

  const aplicarProducto = (idx: number, productoId: string) => {
    const opts = { shouldDirty: true };
    if (productoId === '__manual__') {
      setValue(`lineas.${idx}.productoId`, undefined, opts);
      return;
    }
    const p = productosById.get(productoId);
    if (!p) return;
    setValue(`lineas.${idx}.productoId`, p.id, opts);
    setValue(`lineas.${idx}.skuSnapshot`, p.codigo, opts);
    setValue(`lineas.${idx}.descripcion`, p.nombre, opts);
    setValue(`lineas.${idx}.precioUnitario`, p.precio, opts);
    setValue(`lineas.${idx}.afectaIgv`, p.tieneIgv, opts);
  };

  const onSubmit = (data: OrdenCompraInput) => {
    setServerError(null);
    startTransition(async () => {
      const res = await crearOrdenCompra(data);
      if (!res.success) {
        setServerError(res.error);
        return;
      }
      router.push(`/${companySlug}/ordenes/${(res.data as { id: string }).id}`);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Card>
        <CardHead>
          <CardTitle>Cabecera</CardTitle>
        </CardHead>
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
          <Field label="Proveedor *" error={errors.proveedorId?.message}>
            <select {...register('proveedorId')} className={inputCls} defaultValue="">
              <option value="" disabled>
                Selecciona un proveedor
              </option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Moneda *">
            <select {...register('moneda')} className={inputCls}>
              <option value="USD">USD — Dólares</option>
              <option value="PEN">PEN — Soles</option>
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

          <Field label="Fecha entrega esperada">
            <input type="date" {...register('fechaEntregaEsperada')} className={inputCls} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHead>
          <CardTitle>Líneas · {fields.length} items</CardTitle>
          <button
            type="button"
            onClick={() =>
              append({
                skuSnapshot: '',
                descripcion: '',
                cantidad: 1,
                precioUnitario: 0,
                afectaIgv: true,
                orden: fields.length,
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
                <Th>SKU *</Th>
                <Th>Descripción *</Th>
                <Th align="right">Cant. *</Th>
                <Th align="right">Precio *</Th>
                <Th align="center">IGV</Th>
                <Th align="right">Subtotal</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {fields.map((f, idx) => {
                const it = lineasW[idx];
                const cantidad = Number(it?.cantidad) || 0;
                const precio = Number(it?.precioUnitario) || 0;
                const subtotal = cantidad * precio;
                const itemErr = errors.lineas?.[idx];
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
                    <Td className="w-[110px]">
                      <input
                        {...register(`lineas.${idx}.skuSnapshot`)}
                        className={cn(inputCls, 'h-8 font-mono text-[11.5px]')}
                      />
                    </Td>
                    <Td className="min-w-[220px]">
                      <input
                        {...register(`lineas.${idx}.descripcion`)}
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
                        {...register(`lineas.${idx}.cantidad`)}
                        className={cn(inputCls, 'h-8 text-right text-[12.5px] tabular-nums')}
                      />
                    </Td>
                    <Td align="right" className="w-[110px]">
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        {...register(`lineas.${idx}.precioUnitario`)}
                        className={cn(inputCls, 'h-8 text-right text-[12.5px] tabular-nums')}
                      />
                    </Td>
                    <Td align="center" className="w-[60px]">
                      <input
                        type="checkbox"
                        {...register(`lineas.${idx}.afectaIgv`)}
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
        {errors.lineas && typeof errors.lineas.message === 'string' && (
          <div className="border-t border-orion-border bg-danger-soft px-4 py-2 text-[12px] text-danger-fg">
            {errors.lineas.message}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHead>
            <CardTitle>Términos</CardTitle>
          </CardHead>
          <div className="grid grid-cols-1 gap-4 p-4">
            <Field label="Términos de pago">
              <input {...register('terminosPago')} className={inputCls} />
            </Field>
            <Field label="Dirección de entrega">
              <input {...register('direccionEntrega')} className={inputCls} />
            </Field>
            <Field label="Observaciones">
              <textarea
                {...register('observaciones')}
                rows={3}
                className={cn(inputCls, 'min-h-[72px] resize-y')}
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
          {pending ? 'Guardando…' : 'Crear orden'}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/${companySlug}/ordenes`)}
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
