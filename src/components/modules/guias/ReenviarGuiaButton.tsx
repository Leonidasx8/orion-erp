'use client';

import { useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { reenviarGuiaSunat } from '@/server/actions/guias';

interface Props {
  guiaId: string;
  estadoSunat: string;
}

export function ReenviarGuiaButton({ guiaId, estadoSunat }: Props) {
  const [pending, startTransition] = useTransition();

  const isError =
    estadoSunat === 'error_red' ||
    estadoSunat === 'error' ||
    estadoSunat === 'rechazada' ||
    estadoSunat === 'pendiente';

  if (!isError) return null;

  function handleReenviar() {
    startTransition(async () => {
      const res = await reenviarGuiaSunat(guiaId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Guía enviada a cola de SUNAT. El worker la procesará en ~30s.');
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleReenviar}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] font-medium text-orion-fg hover:bg-orion-bg-muted disabled:opacity-60"
    >
      <RefreshCw size={13} className={pending ? 'animate-spin' : ''} />
      Reenviar a SUNAT
    </button>
  );
}
