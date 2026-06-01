'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { bloquearCredito, desbloquearCredito } from '@/server/actions/creditos';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function BloqueoActions({
  clienteId,
  bloqueado,
  motivoBloqueo,
}: {
  clienteId: string;
  companySlug: string;
  bloqueado: boolean;
  motivoBloqueo: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showMotivoForm, setShowMotivoForm] = useState(false);
  const [motivo, setMotivo] = useState('');

  function handleDesbloquear() {
    startTransition(async () => {
      const res = await desbloquearCredito(clienteId);
      if (res.success) {
        toast.success('Cuenta desbloqueada');
        router.refresh();
      } else {
        toast.error(res.error ?? 'Error al desbloquear');
      }
    });
  }

  function handleBloquear() {
    if (!motivo.trim()) {
      toast.error('Ingresa un motivo para bloquear la cuenta');
      return;
    }
    startTransition(async () => {
      const res = await bloquearCredito(clienteId, motivo.trim());
      if (res.success) {
        toast.success('Cuenta bloqueada');
        setShowMotivoForm(false);
        setMotivo('');
        router.refresh();
      } else {
        toast.error(res.error ?? 'Error al bloquear');
      }
    });
  }

  if (bloqueado) {
    return (
      <div className="flex items-center gap-3">
        {motivoBloqueo && (
          <p className="text-xs text-orion-fg-muted">
            <span className="font-medium">Motivo:</span> {motivoBloqueo}
          </p>
        )}
        <Button size="sm" variant="outline" onClick={handleDesbloquear} disabled={isPending}>
          {isPending ? 'Procesando...' : 'Desbloquear cuenta'}
        </Button>
      </div>
    );
  }

  if (showMotivoForm) {
    return (
      <div className="bg-warn-soft/30 space-y-3 rounded-md border border-warn-soft p-4">
        <p className="text-sm font-medium text-warn-fg">Bloquear cuenta del cliente</p>
        <div className="space-y-1.5">
          <Label htmlFor="motivo-bloqueo">Motivo de bloqueo</Label>
          <Textarea
            id="motivo-bloqueo"
            placeholder="Ej. Deuda vencida mayor a 90 días..."
            rows={2}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={300}
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="destructive" onClick={handleBloquear} disabled={isPending}>
            {isPending ? 'Bloqueando...' : 'Confirmar bloqueo'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowMotivoForm(false);
              setMotivo('');
            }}
            disabled={isPending}
          >
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="hover:border-danger-fg/50 text-danger-fg"
      onClick={() => setShowMotivoForm(true)}
    >
      Bloquear cuenta
    </Button>
  );
}
