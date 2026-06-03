'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Building2, Settings, LogOut } from 'lucide-react';
function userInitials(name?: string): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function UserMenu({ userName, tenantSlug }: { userName?: string; tenantSlug: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function handleSignOut() {
    setOpen(false);
    startTransition(async () => {
      // Sign out via fetch to a dedicated route
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md px-2 py-1 text-[13px] text-orion-fg-muted hover:bg-orion-bg-muted hover:text-orion-fg"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-orion-bg-muted text-[11px] font-semibold text-orion-fg-muted">
          {userInitials(userName)}
        </span>
        <span className="font-medium text-orion-fg">{userName ?? 'Usuario'}</span>
        <ChevronDown
          size={12}
          className={`text-orion-fg-faint transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-orion-border bg-orion-bg py-1 shadow-orion-2">
          {/* User info */}
          <div className="border-b border-orion-border px-4 py-2.5">
            <div className="text-[13px] font-medium text-orion-fg">{userName ?? 'Usuario'}</div>
            <div className="mt-0.5 text-[11px] text-orion-fg-faint">/{tenantSlug}</div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push('/seleccionar-empresa');
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-orion-fg hover:bg-orion-bg-hover"
            >
              <Building2 size={14} className="text-orion-fg-faint" />
              Cambiar empresa
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push(`/${tenantSlug}/configuracion`);
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-orion-fg hover:bg-orion-bg-hover"
            >
              <Settings size={14} className="text-orion-fg-faint" />
              Configuración
            </button>
          </div>

          <div className="border-t border-orion-border py-1">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isPending}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-danger-fg hover:bg-danger-soft disabled:opacity-60"
            >
              <LogOut size={14} />
              {isPending ? 'Cerrando sesión…' : 'Cerrar sesión'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
