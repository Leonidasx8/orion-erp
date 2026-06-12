'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  bloquearCredito,
  desbloquearCredito,
  bloquearCreditoPen,
  desbloquearCreditoPen,
} from '@/server/actions/creditos';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

function BloqueoMoneda({
  label,
  bloqueado,
  motivoBloqueo,
  onBloquear,
  onDesbloquear,
}: {
  label: string;
  bloqueado: boolean;
  motivoBloqueo: string | null;
  onBloquear: (motivo: string) => Promise<void>;
  onDesbloquear: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleDesbloquear() {
    startTransition(async () => {
      await onDesbloquear();
    });
  }

  function handleBloquear() {
    if (!motivo.trim()) {
      toast.error('Ingresa un motivo para bloquear');
      return;
    }
    startTransition(async () => {
      await onBloquear(motivo.trim());
      setShowForm(false);
      setMotivo('');
    });
  }

  return (
    <div className="rounded-md border border-orion-border p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-orion-fg-muted">{label}</span>
        {bloqueado && (
          <span className="inline-flex items-center rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger-fg">
            Bloqueada
          </span>
        )}
      </div>

      {bloqueado ? (
        <div className="flex items-center gap-3">
          {motivoBloqueo && (
            <p className="text-xs text-orion-fg-muted">
              <span className="font-medium">Motivo:</span> {motivoBloqueo}
            </p>
          )}
          <Button size="sm" variant="outline" onClick={handleDesbloquear} disabled={isPending}>
            {isPending ? 'Procesando...' : 'Desbloquear'}
          </Button>
        </div>
      ) : showForm ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`motivo-${label}`}>Motivo de bloqueo</Label>
            <Textarea
              id={`motivo-${label}`}
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
                setShowForm(false);
                setMotivo('');
              }}
              disabled={isPending}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="hover:border-danger-fg/50 text-danger-fg"
          onClick={() => setShowForm(true)}
        >
          Bloquear
        </Button>
      )}
    </div>
  );
}

export function BloqueoActions({
  clienteId,
  bloqueado,
  motivoBloqueo,
  bloqueadoPen,
  motivoBloqueopPen,
}: {
  clienteId: string;
  bloqueado: boolean;
  motivoBloqueo: string | null;
  bloqueadoPen: boolean;
  motivoBloqueopPen: string | null;
}) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <BloqueoMoneda
        label="USD — Dólares"
        bloqueado={bloqueado}
        motivoBloqueo={motivoBloqueo}
        onBloquear={async (motivo) => {
          const res = await bloquearCredito(clienteId, motivo);
          if (res.success) {
            toast.success('Cuenta USD bloqueada');
            router.refresh();
          } else {
            toast.error(res.error ?? 'Error al bloquear');
          }
        }}
        onDesbloquear={async () => {
          const res = await desbloquearCredito(clienteId);
          if (res.success) {
            toast.success('Cuenta USD desbloqueada');
            router.refresh();
          } else {
            toast.error(res.error ?? 'Error al desbloquear');
          }
        }}
      />
      <BloqueoMoneda
        label="PEN — Soles"
        bloqueado={bloqueadoPen}
        motivoBloqueo={motivoBloqueopPen}
        onBloquear={async (motivo) => {
          const res = await bloquearCreditoPen(clienteId, motivo);
          if (res.success) {
            toast.success('Cuenta PEN bloqueada');
            router.refresh();
          } else {
            toast.error(res.error ?? 'Error al bloquear');
          }
        }}
        onDesbloquear={async () => {
          const res = await desbloquearCreditoPen(clienteId);
          if (res.success) {
            toast.success('Cuenta PEN desbloqueada');
            router.refresh();
          } else {
            toast.error(res.error ?? 'Error al desbloquear');
          }
        }}
      />
    </div>
  );
}
