'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Inbox, Receipt, X } from 'lucide-react';
import { toast } from 'sonner';
import { generarOCsDesdeCotizacion } from '@/server/actions/cotizaciones';
import { convertirCotizacionAFactura } from '@/server/actions/facturas';
import { cn } from '@/lib/utils';

interface Props {
  cotizacionId: string;
  tenantSlug: string;
  disponible: boolean;
}

export function CotizacionConversionSidebar({ cotizacionId, tenantSlug, disponible }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<'idle' | 'factura'>('idle');
  const [formaPago, setFormaPago] = useState<'contado' | 'credito'>('contado');
  const [plazoDias, setPlazoDias] = useState(30);

  function handleGenerarOC() {
    if (!disponible) return;
    startTransition(async () => {
      const res = await generarOCsDesdeCotizacion(cotizacionId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      const n = res.data.ordenesCreadas;
      toast.success(n === 1 ? 'Se creó 1 compra a proveedor' : `Se crearon ${n} compras`);
      router.push(`/${tenantSlug}/ordenes`);
    });
  }

  function handleConfirmarFactura() {
    startTransition(async () => {
      const res = await convertirCotizacionAFactura(cotizacionId, {
        formaPago,
        plazoDias: formaPago === 'credito' ? plazoDias : undefined,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      const msg =
        formaPago === 'credito'
          ? `Factura ${res.data.numeroCompleto} a crédito (${plazoDias}d) — CxC abierta`
          : `Factura ${res.data.numeroCompleto} generada`;
      toast.success(msg);
      router.push(`/${tenantSlug}/facturas/${res.data.facturaId}`);
    });
  }

  const hint = disponible ? undefined : 'Disponible cuando esté aceptada';

  if (step === 'factura' && disponible) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-medium text-orion-fg">Convertir a factura</span>
          <button
            onClick={() => setStep('idle')}
            className="text-orion-fg-muted hover:text-orion-fg"
          >
            <X size={14} />
          </button>
        </div>

        {/* Forma de pago */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-orion-fg-muted">Forma de pago</label>
          <select
            value={formaPago}
            onChange={(e) => setFormaPago(e.target.value as 'contado' | 'credito')}
            className="focus:ring-orion-brand h-8 rounded-md border border-orion-border bg-orion-bg px-2 text-[12px] text-orion-fg focus:outline-none focus:ring-1"
          >
            <option value="contado">Contado</option>
            <option value="credito">Crédito</option>
          </select>
        </div>

        {/* Plazo (solo si crédito) */}
        {formaPago === 'credito' && (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-orion-fg-muted">Plazo (días)</label>
            <input
              type="number"
              min={1}
              max={180}
              value={plazoDias}
              onChange={(e) => setPlazoDias(Number(e.target.value))}
              className="focus:ring-orion-brand h-8 rounded-md border border-orion-border bg-orion-bg px-2 text-[12px] text-orion-fg focus:outline-none focus:ring-1"
            />
            <span className="text-[10px] text-orion-fg-muted">
              Vence: {new Date(Date.now() + plazoDias * 86400000).toLocaleDateString('es-PE')} — CxC
              se abre automáticamente
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setStep('idle')}
            disabled={pending}
            className="flex-1 rounded-md border border-orion-border px-3 py-1.5 text-[12px] text-orion-fg hover:bg-orion-bg-subtle disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmarFactura}
            disabled={pending}
            className="bg-orion-brand flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Procesando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <ConversionItem
        icon={<Receipt size={16} />}
        titulo="Convertir a factura"
        disponible={disponible}
        pending={pending}
        hint={hint}
        onClick={() => disponible && setStep('factura')}
      />
      <ConversionItem
        icon={<Inbox size={16} />}
        titulo="Generar compra a proveedor"
        disponible={disponible}
        pending={pending}
        hint={hint}
        onClick={handleGenerarOC}
      />
    </div>
  );
}

function ConversionItem({
  icon,
  titulo,
  disponible,
  pending,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  titulo: string;
  disponible: boolean;
  pending: boolean;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!disponible || pending}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md border border-orion-border p-2.5 text-left',
        disponible
          ? 'cursor-pointer hover:border-tenant-accent hover:bg-tenant-accent-soft'
          : 'cursor-default opacity-50'
      )}
    >
      <span className="text-orion-fg-muted">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-medium text-orion-fg">{titulo}</div>
        {hint && <div className="text-[11px] text-orion-fg-muted">{hint}</div>}
      </div>
    </button>
  );
}
