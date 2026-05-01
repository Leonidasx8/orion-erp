'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Send, Check, X, Copy, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  enviarCotizacion,
  aceptarCotizacion,
  rechazarCotizacion,
  duplicarCotizacion,
  eliminarCotizacion,
} from '@/server/actions/cotizaciones';
import type { EstadoCotizacion } from '@/lib/db/schema';

interface Props {
  companySlug: string;
  cotizacionId: string;
  estado: EstadoCotizacion;
  permisos: {
    editar: boolean;
    enviar: boolean;
    aceptar: boolean;
    rechazar: boolean;
    duplicar: boolean;
    eliminar: boolean;
  };
}

export function CotizacionAcciones({ companySlug, cotizacionId, estado, permisos }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rechazoOpen, setRechazoOpen] = useState(false);
  const [eliminarOpen, setEliminarOpen] = useState(false);
  const [motivo, setMotivo] = useState('');

  const refresh = () => {
    router.refresh();
  };

  const ejecutar = (
    fn: () => Promise<{ success: true; data: unknown } | { success: false; error: string }>,
    okMsg: string
  ) =>
    startTransition(async () => {
      const result = await fn();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(okMsg);
      refresh();
    });

  const onDuplicar = () =>
    startTransition(async () => {
      const result = await duplicarCotizacion(cotizacionId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Cotización duplicada');
      router.push(`/${companySlug}/cotizaciones/${result.data.id}`);
    });

  const onEliminar = () =>
    startTransition(async () => {
      const result = await eliminarCotizacion(cotizacionId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Cotización eliminada');
      router.push(`/${companySlug}/cotizaciones`);
    });

  const onRechazar = () => {
    if (!motivo.trim()) {
      toast.error('Ingresa un motivo');
      return;
    }
    startTransition(async () => {
      const result = await rechazarCotizacion(cotizacionId, motivo);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Cotización rechazada');
      setRechazoOpen(false);
      setMotivo('');
      refresh();
    });
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {permisos.editar && estado === 'borrador' && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/${companySlug}/cotizaciones/${cotizacionId}/editar`}>
              <Pencil className="mr-1.5 h-4 w-4" />
              Editar
            </Link>
          </Button>
        )}

        {permisos.enviar && estado === 'borrador' && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => ejecutar(() => enviarCotizacion(cotizacionId), 'Cotización enviada')}
          >
            <Send className="mr-1.5 h-4 w-4" />
            Enviar
          </Button>
        )}

        {permisos.aceptar && estado === 'enviada' && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => ejecutar(() => aceptarCotizacion(cotizacionId), 'Cotización aceptada')}
          >
            <Check className="mr-1.5 h-4 w-4" />
            Marcar aceptada
          </Button>
        )}

        {permisos.rechazar && estado === 'enviada' && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setRechazoOpen(true)}
          >
            <X className="mr-1.5 h-4 w-4" />
            Rechazar
          </Button>
        )}

        {permisos.duplicar && (
          <Button size="sm" variant="outline" disabled={pending} onClick={onDuplicar}>
            <Copy className="mr-1.5 h-4 w-4" />
            Duplicar
          </Button>
        )}

        {permisos.eliminar && estado === 'borrador' && (
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            disabled={pending}
            onClick={() => setEliminarOpen(true)}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Eliminar
          </Button>
        )}
      </div>

      <Dialog open={rechazoOpen} onOpenChange={setRechazoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar cotización</DialogTitle>
            <DialogDescription>
              Ingresa el motivo del rechazo. Esta acción es irreversible.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Cliente eligió otro proveedor, presupuesto excedido, …"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechazoOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={onRechazar} disabled={pending}>
              Confirmar rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={eliminarOpen} onOpenChange={setEliminarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar cotización</DialogTitle>
            <DialogDescription>Esta acción no se puede deshacer. ¿Continuar?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEliminarOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={onEliminar} disabled={pending}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
