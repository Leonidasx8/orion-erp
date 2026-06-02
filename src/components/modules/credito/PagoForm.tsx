'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { PagoSchema, type PagoInput } from '@/lib/schemas/credito';
import { registrarPago } from '@/server/actions/pagos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export type FacturaPendienteOption = {
  id: string;
  numeroCompleto: string;
  moneda: string;
  saldoPendiente: number;
};

const METODOS = [
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'otro', label: 'Otro' },
] as const;

export function PagoForm({
  facturas,
  companySlug,
  defaultFacturaId,
}: {
  facturas: FacturaPendienteOption[];
  companySlug: string;
  defaultFacturaId?: string;
}) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PagoInput>({
    resolver: zodResolver(PagoSchema) as Resolver<PagoInput>,
    defaultValues: {
      facturaId: defaultFacturaId ?? facturas[0]?.id ?? '',
      moneda: 'PEN',
      fechaPago: new Date().toISOString().slice(0, 10),
      metodo: 'transferencia',
    },
  });

  const monedaPago = watch('moneda');
  const facturaSeleccionadaId = watch('facturaId');
  const facturaSeleccionada = facturas.find((f) => f.id === facturaSeleccionadaId);
  const monedaFactura = facturaSeleccionada?.moneda ?? 'PEN';
  const mostrarTipoCambio = monedaPago !== monedaFactura;

  // reset tipo cambio cuando vuelve a coincidir la moneda
  useEffect(() => {
    if (!mostrarTipoCambio) {
      setValue('tipoCambioAplicado', undefined);
    }
  }, [mostrarTipoCambio, setValue]);

  async function onSubmit(data: PagoInput) {
    const res = await registrarPago(data);
    if (res.success) {
      toast.success('Pago registrado correctamente');
      router.push(`/${companySlug}/credito`);
    } else {
      const msg =
        res.error === 'monto_excede_saldo'
          ? 'El monto supera el saldo pendiente de la factura'
          : res.error === 'tipo_cambio_required'
            ? 'Ingresa el tipo de cambio cuando la moneda difiere de la factura'
            : res.error;
      toast.error(msg);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Factura */}
      <div className="space-y-1.5">
        <Label htmlFor="facturaId">Factura pendiente</Label>
        {facturas.length === 0 ? (
          <p className="text-sm text-orion-fg-muted">
            No hay facturas pendientes de pago para este cliente.
          </p>
        ) : (
          <select
            id="facturaId"
            {...register('facturaId')}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {facturas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.numeroCompleto} — {f.moneda}{' '}
                {f.saldoPendiente.toLocaleString('es-PE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                pendiente
              </option>
            ))}
          </select>
        )}
        {errors.facturaId && <p className="text-xs text-danger-fg">{errors.facturaId.message}</p>}
      </div>

      {/* Monto + moneda */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="monto">Monto</Label>
          <Input
            id="monto"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            {...register('monto')}
          />
          {errors.monto && <p className="text-xs text-danger-fg">{errors.monto.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="moneda">Moneda</Label>
          <select
            id="moneda"
            {...register('moneda')}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="PEN">PEN — Soles</option>
            <option value="USD">USD — Dólares</option>
          </select>
          {errors.moneda && <p className="text-xs text-danger-fg">{errors.moneda.message}</p>}
        </div>
      </div>

      {/* Tipo de cambio — solo si moneda difiere */}
      {mostrarTipoCambio && (
        <div className="space-y-1.5">
          <Label htmlFor="tipoCambioAplicado">
            Tipo de cambio{' '}
            <span className="text-orion-fg-muted">
              ({monedaPago} → {monedaFactura})
            </span>
          </Label>
          <Input
            id="tipoCambioAplicado"
            type="number"
            step="0.0001"
            min="0.0001"
            placeholder="3.7500"
            {...register('tipoCambioAplicado')}
          />
          {errors.tipoCambioAplicado && (
            <p className="text-xs text-danger-fg">{errors.tipoCambioAplicado.message}</p>
          )}
        </div>
      )}

      {/* Fecha + método */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="fechaPago">Fecha de pago</Label>
          <Input id="fechaPago" type="date" {...register('fechaPago')} />
          {errors.fechaPago && <p className="text-xs text-danger-fg">{errors.fechaPago.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="metodo">Método de pago</Label>
          <select
            id="metodo"
            {...register('metodo')}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {METODOS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          {errors.metodo && <p className="text-xs text-danger-fg">{errors.metodo.message}</p>}
        </div>
      </div>

      {/* Referencia */}
      <div className="space-y-1.5">
        <Label htmlFor="referencia">Referencia / N° operación (opcional)</Label>
        <Input
          id="referencia"
          type="text"
          placeholder="Ej. 12345678"
          maxLength={100}
          {...register('referencia')}
        />
        {errors.referencia && <p className="text-xs text-danger-fg">{errors.referencia.message}</p>}
      </div>

      {/* Observaciones */}
      <div className="space-y-1.5">
        <Label htmlFor="observaciones">Observaciones (opcional)</Label>
        <Textarea
          id="observaciones"
          placeholder="Notas adicionales sobre el pago..."
          maxLength={500}
          rows={3}
          {...register('observaciones')}
        />
        {errors.observaciones && (
          <p className="text-xs text-danger-fg">{errors.observaciones.message}</p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting || facturas.length === 0}>
          {isSubmitting ? 'Registrando...' : 'Registrar pago'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${companySlug}/credito`)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
