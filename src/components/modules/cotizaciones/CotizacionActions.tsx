'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  Copy,
  FileText,
  Mail,
  MessageCircle,
  Send,
  ShoppingCart,
  X,
} from 'lucide-react';
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
  clienteTelefono?: string | null;
  clienteEmail?: string | null;
  numeroCotizacion?: string;
  totalDisplay?: string;
}

export function CotizacionActions({
  cotizacionId,
  estado,
  tenantSlug,
  permissions,
  clienteTelefono,
  clienteEmail,
  numeroCotizacion,
  totalDisplay,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rechazandoMotivo, setRechazandoMotivo] = useState('');
  const [showRechazo, setShowRechazo] = useState(false);
  const [showEnviarModal, setShowEnviarModal] = useState(false);
  const [soloCompartir, setSoloCompartir] = useState(false);

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

      {/* Reenviar (compartir de nuevo sin cambiar estado) */}
      {permissions.reenviar && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setSoloCompartir(true);
            setShowEnviarModal(true);
          }}
          className={btnCls}
        >
          <Bell size={13} />
          Reenviar
        </button>
      )}

      {/* Enviar (borrador → enviada) */}
      {puedeEnviar && (
        <button
          type="button"
          onClick={() => {
            setSoloCompartir(false);
            setShowEnviarModal(true);
          }}
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

      {/* Modal envío: WhatsApp + Gmail */}
      {showEnviarModal && (
        <EnviarModal
          cotizacionId={cotizacionId}
          tenantSlug={tenantSlug}
          numeroCotizacion={numeroCotizacion}
          totalDisplay={totalDisplay}
          clienteTelefono={clienteTelefono}
          clienteEmail={clienteEmail}
          soloCompartir={soloCompartir}
          pending={pending}
          onEnviar={handleEnviar}
          onClose={() => setShowEnviarModal(false)}
        />
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

// ─── Modal de envío ──────────────────────────────────────────────────────────

function EnviarModal({
  cotizacionId,
  tenantSlug,
  numeroCotizacion,
  totalDisplay,
  clienteTelefono,
  clienteEmail,
  soloCompartir,
  pending,
  onEnviar,
  onClose,
}: {
  cotizacionId: string;
  tenantSlug: string;
  numeroCotizacion?: string;
  totalDisplay?: string;
  clienteTelefono?: string | null;
  clienteEmail?: string | null;
  soloCompartir: boolean;
  pending: boolean;
  onEnviar: () => void;
  onClose: () => void;
}) {
  const telDigits = (clienteTelefono ?? '').replace(/\D/g, '');
  const tieneTelefono = telDigits.length > 0;
  const tieneEmail = Boolean(clienteEmail);

  /** Descarga el PDF al equipo para poder adjuntarlo manualmente en el canal. */
  function descargarPdf() {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/api/${tenantSlug}/cotizaciones/${cotizacionId}/pdf`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cotizacion-${numeroCotizacion ?? cotizacionId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /** Marca como enviada solo si estamos en el flujo de envío (no en reenviar). */
  function marcarEnviada() {
    if (!soloCompartir) onEnviar();
  }

  function handleWhatsApp() {
    descargarPdf();
    const fullPhone = telDigits.startsWith('51') ? telDigits : `51${telDigits}`;
    const msg = encodeURIComponent(
      `Hola, le compartimos la cotización ${numeroCotizacion ?? ''}${totalDisplay ? ` por ${totalDisplay}` : ''}. Adjuntamos el PDF en este chat.`
    );
    window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
    toast.success('PDF descargado — adjúntalo en el chat de WhatsApp');
    marcarEnviada();
    onClose();
  }

  function handleEmail() {
    descargarPdf();
    const to = encodeURIComponent(clienteEmail ?? '');
    const su = encodeURIComponent(`Cotización ${numeroCotizacion ?? ''}`);
    const body = encodeURIComponent(
      `Estimado cliente,\n\nAdjuntamos la cotización ${numeroCotizacion ?? ''}${totalDisplay ? ` por ${totalDisplay}` : ''} en formato PDF.\n\nQuedamos atentos a sus comentarios.\n\nSaludos cordiales.`
    );
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${body}`,
      '_blank'
    );
    toast.success('PDF descargado — adjúntalo en el correo de Gmail');
    marcarEnviada();
    onClose();
  }

  function handleSoloEstado() {
    onEnviar();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl border border-orion-border bg-orion-bg p-5 shadow-xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-orion-fg">
            {soloCompartir ? 'Reenviar cotización' : 'Enviar cotización'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-6 w-6 place-items-center rounded-md text-orion-fg-faint hover:bg-orion-bg-muted"
          >
            <X size={14} />
          </button>
        </div>
        <p className="mb-4 text-[12px] text-orion-fg-muted">
          {soloCompartir ? (
            'Se descargará el PDF y se abrirá el canal con el mensaje listo. Adjunta el PDF descargado antes de enviar.'
          ) : (
            <>
              Se descargará el PDF y se abrirá el canal con el mensaje listo; adjunta el PDF
              descargado. El estado cambiará a <strong>Enviada</strong>.
            </>
          )}
        </p>

        <div className="space-y-2">
          {/* WhatsApp */}
          <button
            type="button"
            onClick={handleWhatsApp}
            disabled={pending || !tieneTelefono}
            className="flex w-full items-center gap-3 rounded-lg border border-orion-border bg-orion-bg px-4 py-3 text-left transition-colors hover:bg-orion-bg-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366]/10">
              <MessageCircle size={18} className="text-[#25D366]" />
            </span>
            <div>
              <div className="text-[13px] font-medium text-orion-fg">Enviar por WhatsApp</div>
              <div className="text-[11px] text-orion-fg-faint">
                {tieneTelefono
                  ? `+${telDigits.startsWith('51') ? '' : '51'}${telDigits}`
                  : 'Sin teléfono registrado'}
              </div>
            </div>
          </button>

          {/* Gmail */}
          <button
            type="button"
            onClick={handleEmail}
            disabled={pending || !tieneEmail}
            className="flex w-full items-center gap-3 rounded-lg border border-orion-border bg-orion-bg px-4 py-3 text-left transition-colors hover:bg-orion-bg-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/10">
              <Mail size={18} className="text-blue-500" />
            </span>
            <div>
              <div className="text-[13px] font-medium text-orion-fg">Enviar por correo (Gmail)</div>
              <div className="text-[11px] text-orion-fg-faint">
                {clienteEmail ?? 'Sin correo registrado'}
              </div>
            </div>
          </button>

          {/* Solo cambiar estado (solo en flujo de envío) */}
          {!soloCompartir && (
            <button
              type="button"
              onClick={handleSoloEstado}
              disabled={pending}
              className="flex w-full items-center gap-3 rounded-lg border border-orion-border bg-orion-bg-subtle px-4 py-3 text-left transition-colors hover:bg-orion-bg-hover disabled:opacity-60"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orion-bg-muted">
                <Check size={18} className="text-orion-fg-muted" />
              </span>
              <div>
                <div className="text-[13px] font-medium text-orion-fg">Solo cambiar estado</div>
                <div className="text-[11px] text-orion-fg-faint">
                  Marcar como enviada sin notificar al cliente
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
