'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import {
  cotizacionSchema,
  type CotizacionInput,
  monedasCotizacion,
} from '@/lib/schemas/cotizacion';
import { calcularTotales, formatMoneda } from '@/lib/cotizaciones/calculo';
import { crearCotizacion, actualizarCotizacion } from '@/server/actions/cotizaciones';
import type { Cliente, Producto, Cotizacion, CotizacionItem } from '@/lib/db/schema';

type ClienteOpcion = Pick<
  Cliente,
  | 'id'
  | 'tipoPersona'
  | 'razonSocial'
  | 'nombres'
  | 'apellidoPaterno'
  | 'apellidoMaterno'
  | 'numeroDocumento'
>;

type ProductoOpcion = Pick<
  Producto,
  'id' | 'codigo' | 'nombre' | 'unidadMedida' | 'precioUnitario' | 'tieneIgv'
>;

interface Props {
  companySlug: string;
  clientes: ClienteOpcion[];
  productos: ProductoOpcion[];
  cotizacion?: Cotizacion;
  items?: CotizacionItem[];
}

function nombreCliente(c: ClienteOpcion): string {
  if (c.tipoPersona === 'juridica' && c.razonSocial) {
    return `${c.razonSocial} — ${c.numeroDocumento}`;
  }
  const partes = [c.nombres, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean);
  return `${partes.join(' ')} — ${c.numeroDocumento}`;
}

const hoy = () => new Date().toISOString().slice(0, 10);
const en30dias = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const itemVacio = (): CotizacionInput['items'][number] => ({
  productoId: undefined,
  codigo: undefined,
  descripcion: '',
  unidadMedida: 'NIU',
  cantidad: 1,
  precioUnitario: 0,
  descuentoPorcentaje: 0,
  afectaIgv: true,
});

export function CotizacionForm({ companySlug, clientes, productos, cotizacion, items }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const productosMap = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);

  const defaultValues: CotizacionInput = cotizacion
    ? {
        clienteId: cotizacion.clienteId,
        moneda: cotizacion.moneda as 'PEN' | 'USD',
        tipoCambio: cotizacion.tipoCambio ? Number(cotizacion.tipoCambio) : undefined,
        fechaEmision: cotizacion.fechaEmision,
        fechaVencimiento: cotizacion.fechaVencimiento,
        descuentoGlobal: Number(cotizacion.descuentoGlobal),
        notas: cotizacion.notas ?? undefined,
        terminosCondiciones: cotizacion.terminosCondiciones ?? undefined,
        items: items?.map((it) => ({
          productoId: it.productoId ?? undefined,
          codigo: it.codigo ?? undefined,
          descripcion: it.descripcion,
          unidadMedida: it.unidadMedida,
          cantidad: Number(it.cantidad),
          precioUnitario: Number(it.precioUnitario),
          descuentoPorcentaje: Number(it.descuentoPorcentaje),
          afectaIgv: it.afectaIgv,
        })) ?? [itemVacio()],
      }
    : {
        clienteId: '',
        moneda: 'PEN',
        tipoCambio: undefined,
        fechaEmision: hoy(),
        fechaVencimiento: en30dias(),
        descuentoGlobal: 0,
        notas: undefined,
        terminosCondiciones: undefined,
        items: [itemVacio()],
      };

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CotizacionInput>({
    resolver: zodResolver(cotizacionSchema) as Resolver<CotizacionInput>,
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watched = watch();

  const totales = useMemo(
    () =>
      calcularTotales(
        (watched.items ?? []).map((it) => ({
          cantidad: Number(it.cantidad) || 0,
          precioUnitario: Number(it.precioUnitario) || 0,
          descuentoPorcentaje: Number(it.descuentoPorcentaje) || 0,
          afectaIgv: !!it.afectaIgv,
        })),
        Number(watched.descuentoGlobal) || 0
      ),
    [watched.items, watched.descuentoGlobal]
  );

  const moneda = watched.moneda ?? 'PEN';

  function aplicarProducto(idx: number, productoId: string) {
    const p = productosMap.get(productoId);
    if (!p) return;
    setValue(`items.${idx}.productoId`, p.id);
    setValue(`items.${idx}.codigo`, p.codigo ?? undefined);
    setValue(`items.${idx}.descripcion`, p.nombre);
    setValue(`items.${idx}.unidadMedida`, p.unidadMedida);
    setValue(`items.${idx}.precioUnitario`, Number(p.precioUnitario ?? 0));
    setValue(`items.${idx}.afectaIgv`, !!p.tieneIgv);
  }

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      if (cotizacion) {
        const result = await actualizarCotizacion(cotizacion.id, data);
        if (!result.success) {
          setServerError(result.error);
          toast.error(result.error);
          return;
        }
        toast.success('Cotización actualizada');
        router.push(`/${companySlug}/cotizaciones/${cotizacion.id}`);
        router.refresh();
        return;
      }

      const result = await crearCotizacion(data);
      if (!result.success) {
        setServerError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success('Cotización creada');
      router.push(`/${companySlug}/cotizaciones/${result.data.id}`);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {serverError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Datos generales</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="clienteId">Cliente *</Label>
                <Select
                  value={watched.clienteId || ''}
                  onValueChange={(v) => setValue('clienteId', v, { shouldValidate: true })}
                >
                  <SelectTrigger id="clienteId">
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {nombreCliente(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.clienteId && (
                  <p className="mt-1 text-xs text-destructive">{errors.clienteId.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="moneda">Moneda</Label>
                <Select
                  value={watched.moneda}
                  onValueChange={(v) =>
                    setValue('moneda', v as 'PEN' | 'USD', { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="moneda">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monedasCotizacion.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tipoCambio">Tipo de cambio {moneda === 'USD' ? '*' : ''}</Label>
                <Input
                  id="tipoCambio"
                  type="number"
                  step="0.0001"
                  disabled={moneda !== 'USD'}
                  {...register('tipoCambio')}
                />
                {errors.tipoCambio && (
                  <p className="mt-1 text-xs text-destructive">{errors.tipoCambio.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="fechaEmision">Fecha emisión *</Label>
                <Input id="fechaEmision" type="date" {...register('fechaEmision')} />
              </div>

              <div>
                <Label htmlFor="fechaVencimiento">Fecha vencimiento *</Label>
                <Input id="fechaVencimiento" type="date" {...register('fechaVencimiento')} />
                {errors.fechaVencimiento && (
                  <p className="mt-1 text-xs text-destructive">{errors.fechaVencimiento.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Ítems</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => append(itemVacio())}>
                <Plus className="mr-1.5 h-4 w-4" />
                Agregar línea
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, idx) => {
                const it = watched.items?.[idx];
                const cant = Number(it?.cantidad) || 0;
                const precio = Number(it?.precioUnitario) || 0;
                const desc = Number(it?.descuentoPorcentaje) || 0;
                const bruto = cant * precio;
                const subtotalLinea = bruto - bruto * (desc / 100);

                return (
                  <div key={field.id} className="grid grid-cols-12 gap-2 rounded-md border p-3">
                    <div className="col-span-12 sm:col-span-4">
                      <Label className="text-xs">Producto</Label>
                      <Select
                        value={it?.productoId ?? ''}
                        onValueChange={(v) => aplicarProducto(idx, v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Buscar producto…" />
                        </SelectTrigger>
                        <SelectContent>
                          {productos.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              <span className="font-mono text-xs">{p.codigo}</span> {p.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-12 sm:col-span-8">
                      <Label className="text-xs">Descripción *</Label>
                      <Input {...register(`items.${idx}.descripcion`)} />
                      {errors.items?.[idx]?.descripcion && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.items[idx]?.descripcion?.message}
                        </p>
                      )}
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <Label className="text-xs">UOM</Label>
                      <Input {...register(`items.${idx}.unidadMedida`)} />
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <Label className="text-xs">Cantidad *</Label>
                      <Input type="number" step="0.01" {...register(`items.${idx}.cantidad`)} />
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <Label className="text-xs">Precio *</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        {...register(`items.${idx}.precioUnitario`)}
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-2">
                      <Label className="text-xs">Desc. %</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        {...register(`items.${idx}.descuentoPorcentaje`)}
                      />
                    </div>

                    <div className="col-span-6 flex items-end gap-2 sm:col-span-2">
                      <label className="flex items-center gap-2 text-xs">
                        <Checkbox
                          checked={!!it?.afectaIgv}
                          onCheckedChange={(v) => setValue(`items.${idx}.afectaIgv`, !!v)}
                        />
                        IGV
                      </label>
                    </div>

                    <div className="col-span-12 flex items-end justify-end sm:col-span-2">
                      <span className="text-sm font-medium tabular-nums">
                        {formatMoneda(subtotalLinea, moneda)}
                      </span>
                    </div>

                    <div className="col-span-12 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(idx)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Quitar
                      </Button>
                    </div>
                  </div>
                );
              })}
              {errors.items && !Array.isArray(errors.items) && (
                <p className="text-xs text-destructive">{errors.items.message}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notas y términos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="notas">Notas internas</Label>
                <Textarea id="notas" rows={3} {...register('notas')} />
              </div>
              <div>
                <Label htmlFor="terminosCondiciones">Términos y condiciones</Label>
                <Textarea
                  id="terminosCondiciones"
                  rows={4}
                  {...register('terminosCondiciones')}
                  placeholder="Validez de la oferta, forma de pago, tiempo de entrega…"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Totales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Subtotal" value={formatMoneda(totales.subtotal, moneda)} />
              {totales.totalDescuentosLineas > 0 && (
                <Row
                  label="Descuentos línea"
                  value={`− ${formatMoneda(totales.totalDescuentosLineas, moneda)}`}
                  muted
                />
              )}
              <div>
                <Label htmlFor="descuentoGlobal" className="text-xs">
                  Descuento global
                </Label>
                <Input
                  id="descuentoGlobal"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('descuentoGlobal')}
                />
              </div>
              <Row label="Base imponible" value={formatMoneda(totales.baseImponible, moneda)} />
              <Row label="IGV (18%)" value={formatMoneda(totales.igv, moneda)} />
              <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatMoneda(totales.total, moneda)}</span>
              </div>

              <div className="space-y-2 pt-4">
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? 'Guardando…' : cotizacion ? 'Guardar cambios' : 'Crear cotización'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.back()}
                  disabled={pending}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </form>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${muted ? 'text-muted-foreground' : ''}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
