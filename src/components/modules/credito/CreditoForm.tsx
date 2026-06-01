'use client';

import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { OtorgarCreditoSchema, type OtorgarCreditoInput } from '@/lib/schemas/credito';
import { otorgarCredito } from '@/server/actions/creditos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CreditoForm({
  clienteId,
  companySlug,
  defaultValues,
}: {
  clienteId: string;
  companySlug: string;
  defaultValues?: Partial<OtorgarCreditoInput>;
}) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OtorgarCreditoInput>({
    resolver: zodResolver(OtorgarCreditoSchema) as Resolver<OtorgarCreditoInput>,
    defaultValues: {
      clienteId,
      lineaCredito: defaultValues?.lineaCredito ?? 0,
      moneda: defaultValues?.moneda ?? 'PEN',
      plazoDias: defaultValues?.plazoDias ?? 30,
    },
  });

  async function onSubmit(data: OtorgarCreditoInput) {
    const res = await otorgarCredito(data);
    if (res.success) {
      toast.success('Línea de crédito actualizada');
      router.push(`/${companySlug}/credito/clientes/${clienteId}`);
      router.refresh();
    } else {
      toast.error(res.error ?? 'Error al guardar');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* clienteId hidden */}
      <input type="hidden" {...register('clienteId')} />

      {/* Línea de crédito + moneda */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="lineaCredito">Línea de crédito</Label>
          <Input
            id="lineaCredito"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...register('lineaCredito', { valueAsNumber: true })}
          />
          {errors.lineaCredito && (
            <p className="text-xs text-danger-fg">{errors.lineaCredito.message}</p>
          )}
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

      {/* Plazo */}
      <div className="space-y-1.5">
        <Label htmlFor="plazoDias">Plazo (días)</Label>
        <Input
          id="plazoDias"
          type="number"
          step="1"
          min="0"
          max="180"
          placeholder="30"
          {...register('plazoDias', { valueAsNumber: true })}
        />
        <p className="text-xs text-orion-fg-faint">
          Días de plazo para el pago (0 = contado, máximo 180)
        </p>
        {errors.plazoDias && <p className="text-xs text-danger-fg">{errors.plazoDias.message}</p>}
      </div>

      {/* Acciones */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar crédito'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${companySlug}/credito/clientes/${clienteId}`)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
