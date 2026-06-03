'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { actualizarPoliticaPrecios } from '@/server/actions/configuracion';

export function PoliticaPreciosForm({
  initial,
}: {
  initial: {
    margenMinimoGlobal: number;
    aprobacionMontoMaximo: number;
    igvAutomatico: boolean;
    descuentosPorLinea: boolean;
  };
}) {
  const [margen, setMargen] = useState(initial.margenMinimoGlobal);
  const [aprobacion, setAprobacion] = useState(initial.aprobacionMontoMaximo);
  const [igv, setIgv] = useState(initial.igvAutomatico);
  const [descuentos, setDescuentos] = useState(initial.descuentosPorLinea);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await actualizarPoliticaPrecios({
        margenMinimoGlobal: margen,
        aprobacionMontoMaximo: aprobacion,
        igvAutomatico: igv,
        descuentosPorLinea: descuentos,
      });
      if (res.success) {
        toast.success('Política de precios actualizada');
      } else {
        toast.error((res as { success: false; error: string }).error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-0">
      {/* Margen mínimo global */}
      <div className="flex items-start justify-between border-b border-orion-border py-3">
        <div>
          <p className="text-[13px] font-medium text-orion-fg">Margen mínimo global</p>
          <p className="text-[12px] text-orion-fg-muted">
            Bloquea emitir cotizaciones por debajo de este margen sin aprobación de Superadmin.
          </p>
        </div>
        <div className="ml-6 flex shrink-0 items-center gap-1.5">
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={margen}
            onChange={(e) => setMargen(parseFloat(e.target.value) || 0)}
            className="h-8 w-16 rounded-md border border-orion-border bg-orion-bg px-2 text-right text-[13px] font-medium tabular-nums text-orion-fg focus:border-tenant-accent focus:outline-none"
          />
          <span className="text-[13px] text-orion-fg-muted">%</span>
        </div>
      </div>

      {/* Aprobación obligatoria sobre */}
      <div className="flex items-start justify-between border-b border-orion-border py-3">
        <div>
          <p className="text-[13px] font-medium text-orion-fg">Aprobación obligatoria sobre</p>
          <p className="text-[12px] text-orion-fg-muted">
            Cotizaciones por encima de este monto requieren aprobación antes de ser enviadas.
          </p>
        </div>
        <div className="ml-6 flex shrink-0 items-center gap-1.5">
          <span className="text-[12px] text-orion-fg-muted">USD</span>
          <input
            type="number"
            min={0}
            step={100}
            value={aprobacion}
            onChange={(e) => setAprobacion(parseFloat(e.target.value) || 0)}
            className="h-8 w-24 rounded-md border border-orion-border bg-orion-bg px-2 text-right text-[13px] font-medium tabular-nums text-orion-fg focus:border-tenant-accent focus:outline-none"
          />
        </div>
      </div>

      {/* IGV automático */}
      <div className="flex items-center justify-between border-b border-orion-border py-3">
        <div>
          <p className="text-[13px] font-medium text-orion-fg">Aplicar IGV automático</p>
          <p className="text-[12px] text-orion-fg-muted">
            18% IGV se calcula sobre todas las líneas gravadas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIgv(!igv)}
          aria-pressed={igv}
          className={`relative h-5 w-9 rounded-full transition-colors ${igv ? 'bg-tenant-accent' : 'bg-orion-bg-muted'}`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${igv ? 'left-4' : 'left-0.5'}`}
          />
        </button>
      </div>

      {/* Descuentos por línea */}
      <div className="flex items-center justify-between py-3">
        <div>
          <p className="text-[13px] font-medium text-orion-fg">Permitir descuentos por línea</p>
          <p className="text-[12px] text-orion-fg-muted">
            Los comerciales pueden aplicar descuentos individuales por línea de cotización.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDescuentos(!descuentos)}
          aria-pressed={descuentos}
          className={`relative h-5 w-9 rounded-full transition-colors ${descuentos ? 'bg-tenant-accent' : 'bg-orion-bg-muted'}`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${descuentos ? 'left-4' : 'left-0.5'}`}
          />
        </button>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-tenant-accent px-4 text-[13px] font-medium text-white hover:brightness-95 disabled:opacity-60"
        >
          {pending ? 'Guardando…' : 'Guardar política'}
        </button>
      </div>
    </form>
  );
}
