'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { marcarDespachada, marcarEntregada } from '@/server/actions/guias';

interface Props {
  guiaId: string;
  estado: string;
  estadoSunat: string;
  tenantSlug: string;
}

export function GuiaActions({ guiaId, estado }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function despachar() {
    startTransition(async () => {
      const res = await marcarDespachada(guiaId);
      if (res.success) {
        toast.success('Guía marcada como en camino');
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function entregar() {
    startTransition(async () => {
      const res = await marcarEntregada(guiaId);
      if (res.success) {
        toast.success('Guía marcada como entregada');
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  if (estado === 'pendiente_despacho' || estado === 'borrador') {
    return (
      <button
        onClick={despachar}
        disabled={pending}
        title="Marcar como despachada / en camino"
        className="hover:border-info-border flex items-center gap-1.5 rounded-md border border-orion-border px-2.5 py-1 text-[11px] font-medium text-orion-fg hover:bg-info-soft hover:text-info-fg disabled:opacity-50"
      >
        <Truck size={12} />
        Despachar
      </button>
    );
  }

  if (estado === 'en_camino') {
    return (
      <button
        onClick={entregar}
        disabled={pending}
        title="Marcar como entregada"
        className="hover:border-success-border flex items-center gap-1.5 rounded-md border border-orion-border px-2.5 py-1 text-[11px] font-medium text-orion-fg hover:bg-success-soft hover:text-success-fg disabled:opacity-50"
      >
        <CheckCircle size={12} />
        Entregado
      </button>
    );
  }

  if (estado === 'entregado') {
    return <span className="text-[11px] text-success-fg">✓ Entregado</span>;
  }

  return null;
}
