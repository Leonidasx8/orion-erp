'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Resolver } from 'react-hook-form';
import { type z } from 'zod';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';
import { ajusteManualSchema } from '@/lib/schemas/kardex';
import { ajusteManualStock } from '@/server/actions/kardex';
import { cn } from '@/lib/utils';

type FormValues = z.infer<typeof ajusteManualSchema>;

const MOTIVOS = [
  'Diferencia por inventario físico',
  'Producto dañado / merma',
  'Devolución sin documento',
  'Corrección de error operativo',
  'Otro',
] as const;

export type AjusteManualFormProps = {
  tenantSlug: string;
  producto: {
    id: string;
    codigo: string;
    nombre: string;
    unidadMedida: string | null;
    stockActual: number;
    costoPromedio: number;
  };
};

export function AjusteManualForm({ tenantSlug, producto }: AjusteManualFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(ajusteManualSchema) as Resolver<FormValues>,
    defaultValues: {
      productoId: producto.id,
      tipo: 'ajuste_pos',
      cantidad: 1,
      motivo: '',
    },
  });

  const tipo = watch('tipo');
  const cantidad = watch('cantidad') ?? 0;

  const stockDespues =
    tipo === 'ajuste_pos' ? producto.stockActual + cantidad : producto.stockActual - cantidad;
  const valorAntes = producto.stockActual * producto.costoPromedio;
  const valorDespues = stockDespues * producto.costoPromedio;

  async function onSubmit(data: FormValues) {
    setSubmitting(true);
    const res = await ajusteManualStock(data);
    setSubmitting(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success(
      `Ajuste registrado — nuevo saldo: ${res.data.nuevoSaldo} ${producto.unidadMedida ?? 'u.'}`
    );
    router.push(`/${tenantSlug}/inventario/${producto.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-orion-fg">
          Ajuste manual de inventario
        </h1>
        <p className="mt-0.5 text-[13px] text-orion-fg-muted">
          Requiere motivo · genera auditoría · permiso Superadmin
        </p>
      </div>

      {/* Critical warning */}
      <div className="border-danger-border flex items-start gap-3 rounded-lg border bg-danger-soft px-4 py-3 text-[13px] text-danger-fg">
        <Shield size={15} className="mt-0.5 shrink-0" />
        <div>
          <div className="font-medium">Acción crítica · queda registrada permanentemente</div>
          <div className="text-danger-fg/75 mt-0.5 text-[11.5px]">
            Los ajustes manuales generan una entrada en auditoría con fecha, usuario y motivo. No
            son reversibles desde la UI.
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" {...register('productoId')} />
        <div className="grid grid-cols-[3fr_2fr] gap-4">
          {/* Left — form */}
          <div className="rounded-lg border border-orion-border bg-orion-bg">
            <div className="border-b border-orion-border px-4 py-3">
              <span className="text-[13px] font-medium text-orion-fg">Detalle del ajuste</span>
            </div>
            <div className="grid grid-cols-2 gap-4 p-4">
              {/* Producto (read-only) */}
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-orion-fg">
                  Producto <span className="text-danger-fg">*</span>
                </label>
                <div className="flex items-center gap-2 rounded-md border border-orion-border bg-orion-bg-subtle px-3 py-2 text-[13px] text-orion-fg">
                  <span className="font-mono text-[11.5px] text-orion-fg-muted">
                    {producto.codigo}
                  </span>
                  <span className="mx-1.5 text-orion-fg-faint">—</span>
                  <span className="truncate">{producto.nombre}</span>
                </div>
                <span className="text-[11.5px] text-orion-fg-muted">
                  Stock actual: {producto.stockActual} {producto.unidadMedida ?? 'u.'} · costo
                  promedio $
                  {producto.costoPromedio.toLocaleString('en-US', {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4,
                  })}
                </span>
              </div>

              {/* Tipo */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-orion-fg">
                  Tipo de ajuste <span className="text-danger-fg">*</span>
                </label>
                <select
                  {...register('tipo')}
                  className="h-9 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] text-orion-fg focus:outline-none focus:ring-1 focus:ring-tenant-accent"
                >
                  <option value="ajuste_pos">Entrada (+)</option>
                  <option value="ajuste_neg">Salida (−)</option>
                </select>
                {errors.tipo && (
                  <span className="text-[11.5px] text-danger-fg">{errors.tipo.message}</span>
                )}
              </div>

              {/* Cantidad */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-orion-fg">
                  Cantidad <span className="text-danger-fg">*</span>
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  {...register('cantidad', { valueAsNumber: true })}
                  className={cn(
                    'h-9 rounded-md border border-orion-border bg-orion-bg px-3 font-mono text-[13px] text-orion-fg focus:outline-none focus:ring-1 focus:ring-tenant-accent',
                    errors.cantidad && 'border-danger-border'
                  )}
                />
                {errors.cantidad && (
                  <span className="text-[11.5px] text-danger-fg">{errors.cantidad.message}</span>
                )}
              </div>

              {/* Motivo preset */}
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-orion-fg">
                  Motivo <span className="text-danger-fg">*</span>
                </label>
                <select
                  className="h-9 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] text-orion-fg focus:outline-none focus:ring-1 focus:ring-tenant-accent"
                  onChange={(e) => {
                    const motivo = document.getElementById(
                      'motivo-textarea'
                    ) as HTMLTextAreaElement;
                    if (motivo && e.target.value !== 'Otro') motivo.value = e.target.value;
                  }}
                >
                  {MOTIVOS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Comentario / motivo final */}
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-orion-fg">
                  Comentario adicional <span className="text-danger-fg">*</span>
                </label>
                <textarea
                  id="motivo-textarea"
                  rows={3}
                  {...register('motivo')}
                  placeholder="Describe el motivo con detalle (mínimo 5 caracteres)…"
                  className={cn(
                    'resize-none rounded-md border border-orion-border bg-orion-bg px-3 py-2 text-[13px] text-orion-fg placeholder:text-orion-fg-faint focus:outline-none focus:ring-1 focus:ring-tenant-accent',
                    errors.motivo && 'border-danger-border'
                  )}
                />
                {errors.motivo && (
                  <span className="text-[11.5px] text-danger-fg">{errors.motivo.message}</span>
                )}
                <span className="text-[11px] text-orion-fg-faint">
                  Mínimo 5 caracteres · será visible en auditoría
                </span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-orion-border px-4 py-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex h-9 items-center rounded-md border border-orion-border px-4 text-[13px] font-medium text-orion-fg hover:bg-orion-bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-tenant-accent px-4 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                <Shield size={13} />
                {submitting ? 'Guardando…' : 'Confirmar ajuste'}
              </button>
            </div>
          </div>

          {/* Right — preview + audit */}
          <div className="flex flex-col gap-4">
            {/* Preview card */}
            <div className="rounded-lg border border-orion-border bg-orion-bg">
              <div className="border-b border-orion-border px-4 py-3">
                <span className="text-[13px] font-medium text-orion-fg">Vista previa</span>
              </div>
              <div className="flex flex-col gap-2.5 p-4 text-[12.5px]">
                <div className="flex justify-between">
                  <span className="text-orion-fg-muted">Stock antes</span>
                  <span className="tabular-nums">
                    {producto.stockActual} {producto.unidadMedida ?? 'u.'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orion-fg-muted">Movimiento</span>
                  <span
                    className={cn(
                      'font-medium tabular-nums',
                      tipo === 'ajuste_pos' ? 'text-success-fg' : 'text-danger-fg'
                    )}
                  >
                    {tipo === 'ajuste_pos' ? '+' : '−'}
                    {Number(cantidad || 0).toLocaleString('en-US', {
                      maximumFractionDigits: 2,
                    })}{' '}
                    {producto.unidadMedida ?? 'u.'}
                  </span>
                </div>
                <hr className="border-orion-border/60" />
                <div className="flex justify-between">
                  <span className="font-medium text-orion-fg">Stock después</span>
                  <span
                    className={cn(
                      'text-[16px] font-semibold tabular-nums',
                      stockDespues < 0 ? 'text-danger-fg' : 'text-orion-fg'
                    )}
                  >
                    {stockDespues.toLocaleString('en-US', { maximumFractionDigits: 2 })}{' '}
                    {producto.unidadMedida ?? 'u.'}
                  </span>
                </div>
                {stockDespues < 0 && (
                  <p className="text-[11px] text-danger-fg">
                    Stock negativo — el sistema bloqueará este ajuste.
                  </p>
                )}
                <hr className="border-orion-border/60" />
                <div className="flex justify-between">
                  <span className="text-orion-fg-muted">Valor antes</span>
                  <span className="tabular-nums">
                    $
                    {valorAntes.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orion-fg-muted">Valor después</span>
                  <span className="tabular-nums">
                    $
                    {Math.max(0, valorDespues).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Audit info card */}
            <div className="rounded-lg border border-orion-border bg-orion-bg">
              <div className="border-b border-orion-border px-4 py-3">
                <span className="text-[13px] font-medium text-orion-fg">
                  Quedará registrado en auditoría
                </span>
              </div>
              <div className="p-4 text-[12px] text-orion-fg-muted">
                <p>
                  El ajuste quedará registrado en{' '}
                  <span className="font-medium text-orion-fg">kardex_movimientos</span> con tu
                  usuario, timestamp y motivo indicado.
                </p>
                <div className="mt-3 rounded-md bg-orion-bg-subtle p-2 font-mono text-[10.5px] leading-relaxed text-orion-fg-muted">
                  event: inventory.adjust
                  <br />
                  product: {producto.codigo}
                  <br />
                  delta: {tipo === 'ajuste_pos' ? '+' : '−'}
                  {Number(cantidad || 0).toLocaleString()}
                  <br />
                  prev_stock: {producto.stockActual} → {Math.max(0, stockDespues)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
