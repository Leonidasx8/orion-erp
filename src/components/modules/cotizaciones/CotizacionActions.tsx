'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, Copy, FileText, Send, ShoppingCart, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  enviarCotizacion,
  aceptarCotizacion,
  rechazarCotizacion,
  duplicarCotizacion,
  generarOCsDesdeCotizacion,
} from '@/server/actions/cotizaciones';
import { cn } from '@/lib/utils';

interface Props {
  cotizacionId: string;
  estado: string;
  tenantSlug: string;
  permissions: {
    enviar: boolean;
    aprobar: boolean;
    rechazar: boolean;
    duplicar: boolean;
    reenviar: boolean;
    generarOC?: boolean;
  };
}

export function CotizacionActions({ cotizacionId, estado, tenantSlug, permissions }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rechazandoMotivo, setRechazandoMotivo] = useState('');
  const [showRechazo, setShowRechazo] = useState(false);

  const esBorrador = estado === 'borrador';
  const esEnviada = estado === 'enviada';
  const esAceptada = estado === 'aceptada';
  const puedeEnviar = esBorrador && permissions.enviar;
  const puedeAprobar = esEnviada && permissions.aprobar;
  const puedeRechazar = esEnviada && permissions.rechazar;
  const puedeGenerarOC = esAceptada && (permissions.generarOC ?? true);

  const handleEnviar = () => {
    setError(null);
    startTransition(async () => {
      const res = await enviarCotizacion(cotizacionId);
      if (!res.success) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };

  const handleDuplicar = () => {
    setError(null);
    startTransition(async () => {
      const res = await duplicarCotizacion(cotizacionId);
      if (!res.success) {
        setError(res.error);
        return;
      }
      router.push(`/${tenantSlug}/cotizaciones/${(res.data as { id: string }).id}`);
    });
  };

  const handleAprobar = () => {
    setError(null);
    startTransition(async () => {
      const res = await aceptarCotizacion(cotizacionId);
      if (!res.success) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };

  const handleRechazar = () => {
    setError(null);
    startTransition(async () => {
      const res = await rechazarCotizacion(cotizacionId, rechazandoMotivo);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setShowRechazo(false);
      setRechazandoMotivo('');
      router.refresh();
    });
  };

  const handleGenerarOC = () => {
    startTransition(async () => {
      const res = await generarOCsDesdeCotizacion(cotizacionId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      const n = res.data.ordenesCreadas;
      toast.success(
        n === 1 ? 'Se creó 1 compra a proveedor' : `Se crearon ${n} compras a proveedor`
      );
      router.push(`/${tenantSlug}/ordenes`);
    });
  };

  return (
    <>
      {error && <span className="text-[12px] text-danger-fg">{error}</span>}

      {/* PDF */}
      <button
        type="button"
        onClick={() => window.open(`/api/${tenantSlug}/cotizaciones/${cotizacionId}/pdf`, '_blank')}
        className={btnCls}
      >
        <FileText size={13} />
        PDF
      </button>

      {/* Reenviar email */}
      {permissions.reenviar && (
        <button type="button" disabled={pending} className={btnCls}>
          <Bell size={13} />
          Reenviar
        </button>
      )}

      {/* Enviar (borrador → enviada) */}
      {puedeEnviar && (
        <button
          type="button"
          onClick={handleEnviar}
          disabled={pending}
          className={cn(
            btnCls,
            'border-transparent bg-tenant-accent text-white hover:brightness-95'
          )}
        >
          <Send size={13} />
          {pending ? 'Enviando…' : 'Enviar'}
        </button>
      )}

      {/* Duplicar */}
      {permissions.duplicar && (
        <button type="button" onClick={handleDuplicar} disabled={pending} className={btnCls}>
          <Copy size={13} />
          Duplicar
        </button>
      )}

      {/* Generar OC (cuando aceptada) */}
      {puedeGenerarOC && (
        <button
          type="button"
          onClick={handleGenerarOC}
          disabled={pending}
          className={cn(
            btnCls,
            'border-transparent bg-tenant-accent text-white hover:brightness-95'
          )}
        >
          <ShoppingCart size={13} />
          {pending ? 'Generando…' : 'Generar compra'}
        </button>
      )}

      {/* Rechazar (cuando enviada) */}
      {puedeRechazar && !showRechazo && (
        <button
          type="button"
          onClick={() => setShowRechazo(true)}
          disabled={pending}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-orion-border px-3 text-[13px] font-medium text-danger-fg hover:bg-danger-soft"
        >
          <X size={13} />
          Rechazar
        </button>
      )}

      {/* Aprobar (cuando enviada) */}
      {puedeAprobar && (
        <button
          type="button"
          onClick={handleAprobar}
          disabled={pending}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-tenant-accent px-3 text-[13px] font-medium text-white hover:brightness-95 disabled:opacity-60"
        >
          <Check size={13} />
          {pending ? 'Aprobando…' : 'Aprobar'}
        </button>
      )}

      {/* Modal rechazo inline */}
      {showRechazo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl border border-orion-border bg-orion-bg p-5 shadow-xl">
            <h2 className="mb-3 text-[14px] font-semibold text-orion-fg">Motivo de rechazo</h2>
            <textarea
              value={rechazandoMotivo}
              onChange={(e) => setRechazandoMotivo(e.target.value)}
              rows={3}
              placeholder="Describe el motivo…"
              className="focus:ring-tenant-accent/30 block w-full resize-none rounded-md border border-orion-border bg-orion-bg px-3 py-2 text-[13px] text-orion-fg placeholder:text-orion-fg-subtle focus:border-tenant-accent focus:outline-none focus:ring-2"
            />
            {error && <p className="mt-1 text-[12px] text-danger-fg">{error}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowRechazo(false);
                  setRechazandoMotivo('');
                  setError(null);
                }}
                className={btnCls}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRechazar}
                disabled={pending || rechazandoMotivo.trim().length < 3}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-danger px-3 text-[13px] font-medium text-white hover:brightness-95 disabled:opacity-60"
              >
                {pending ? 'Rechazando…' : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const btnCls =
  'inline-flex h-8 items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] font-medium text-orion-fg hover:bg-orion-bg-muted disabled:opacity-60';
