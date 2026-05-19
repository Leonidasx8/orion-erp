'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Inbox, Receipt } from 'lucide-react';
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

  function handleConvertirFactura() {
    if (!disponible) return;
    startTransition(async () => {
      const res = await convertirCotizacionAFactura(cotizacionId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(`Factura ${res.data.numeroCompleto} generada`);
      router.push(`/${tenantSlug}/facturas/${res.data.facturaId}`);
    });
  }

  const hint = disponible ? undefined : 'Disponible cuando esté aceptada';

  return (
    <div className="flex flex-col gap-2 p-4">
      <ConversionItem
        icon={<Receipt size={16} />}
        titulo="Convertir a factura"
        disponible={disponible}
        pending={pending}
        hint={hint}
        onClick={handleConvertirFactura}
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
