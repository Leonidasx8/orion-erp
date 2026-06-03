'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, AlertCircle, FileWarning, ShoppingCart, Clock, Loader2 } from 'lucide-react';
import { cargarNotificaciones, type Notificacion } from '@/server/actions/notifications';
import { cn } from '@/lib/utils';

const ICON = {
  cxc_vencida: AlertCircle,
  factura_error: FileWarning,
  oc_pendiente: ShoppingCart,
  cotizacion_vencida: Clock,
} as const;

const COLOR = {
  cxc_vencida: 'text-danger-fg',
  factura_error: 'text-warn-fg',
  oc_pendiente: 'text-blue-500',
  cotizacion_vencida: 'text-orion-fg-muted',
} as const;

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function handleOpen() {
    setOpen((v) => !v);
    if (!loaded) {
      setLoading(true);
      try {
        const data = await cargarNotificaciones();
        setNotifs(data);
        setLoaded(true);
      } finally {
        setLoading(false);
      }
    }
  }

  const urgentes = notifs.filter((n) => n.urgente).length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="relative grid h-8 w-8 place-items-center rounded-md text-orion-fg-muted hover:bg-orion-bg-muted hover:text-orion-fg"
      >
        <Bell size={16} />
        {urgentes > 0 && (
          <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white">
            {urgentes > 9 ? '9+' : urgentes}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-xl border border-orion-border bg-orion-bg shadow-orion-2">
          <div className="flex items-center justify-between border-b border-orion-border px-4 py-2.5">
            <span className="text-[13px] font-semibold text-orion-fg">Notificaciones</span>
            {urgentes > 0 && (
              <span className="rounded-full bg-danger-soft px-1.5 py-0.5 text-[10px] font-semibold text-danger-fg">
                {urgentes} urgente{urgentes > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-orion-fg-faint" />
              </div>
            )}

            {!loading && notifs.length === 0 && (
              <div className="py-8 text-center text-[12px] text-orion-fg-faint">
                Sin notificaciones pendientes
              </div>
            )}

            {!loading &&
              notifs.map((n) => {
                const Icon = ICON[n.tipo];
                return (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-orion-bg-hover',
                      n.urgente && 'bg-danger-soft/30'
                    )}
                  >
                    <Icon size={15} className={cn('mt-0.5 shrink-0', COLOR[n.tipo])} />
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-medium text-orion-fg">
                        {n.titulo}
                      </div>
                      <div className="truncate text-[11px] text-orion-fg-muted">{n.detalle}</div>
                    </div>
                    {n.urgente && (
                      <span className="ml-auto shrink-0 rounded-full bg-danger px-1.5 py-px text-[9px] font-bold text-white">
                        !
                      </span>
                    )}
                  </Link>
                );
              })}
          </div>

          {notifs.length > 0 && (
            <div className="border-t border-orion-border px-4 py-2 text-center">
              <span className="text-[11px] text-orion-fg-faint">
                {notifs.length} notificaciones · actualiza al abrir
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
