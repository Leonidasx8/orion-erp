'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { descartarGuia } from '@/server/actions/guias';

interface Props {
  guiaId: string;
  estadoSunat: string;
  estado: string;
  companySlug: string;
}

export function DescartarGuiaButton({ guiaId, estadoSunat, estado, companySlug }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const descartable =
    estado !== 'anulada' &&
    (estadoSunat === 'error_red' ||
      estadoSunat === 'error' ||
      estadoSunat === 'rechazada' ||
      estadoSunat === 'sin_enviar');

  if (!descartable) return null;

  function handleDescartar() {
    if (
      !window.confirm(
        'La guía quedará marcada como descartada y no se enviará a SUNAT. ¿Continuar?'
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await descartarGuia(guiaId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Guía descartada. Puedes emitir una nueva guía corregida.');
      router.push(`/${companySlug}/guias/nueva`);
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleDescartar}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:hover:bg-red-950/30"
    >
      <Trash2 size={13} />
      Descartar y re-emitir
    </button>
  );
}
