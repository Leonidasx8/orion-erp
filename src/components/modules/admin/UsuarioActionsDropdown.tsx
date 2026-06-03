'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { MoreHorizontal, UserCog, UserX, UserCheck, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cambiarRol, suspenderUsuario, reactivarUsuario } from '@/server/actions/users';
import { cn } from '@/lib/utils';

type Props = {
  userId: string;
  estado: string;
  rolActual: string;
  rolesDisponibles: string[];
};

export function UsuarioActionsDropdown({ userId, estado, rolActual, rolesDisponibles }: Props) {
  const [open, setOpen] = useState(false);
  const [rolSubmenu, setRolSubmenu] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setRolSubmenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function close() {
    setOpen(false);
    setRolSubmenu(false);
  }

  function handleCambiarRol(nuevoRol: string) {
    close();
    startTransition(async () => {
      const res = await cambiarRol(userId, nuevoRol);
      if (res.success) toast.success(`Rol cambiado a ${nuevoRol}`);
      else toast.error('Error al cambiar rol');
    });
  }

  function handleSuspender() {
    close();
    startTransition(async () => {
      const res = await suspenderUsuario(userId);
      if (res.success) toast.success('Usuario suspendido');
      else toast.error('Error al suspender');
    });
  }

  function handleReactivar() {
    close();
    startTransition(async () => {
      const res = await reactivarUsuario(userId);
      if (res.success) toast.success('Usuario reactivado');
      else toast.error('Error al reactivar');
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'grid h-6 w-6 place-items-center rounded-md text-orion-fg-faint transition-colors hover:bg-orion-bg-muted hover:text-orion-fg',
          pending && 'opacity-40'
        )}
        aria-label="Acciones de usuario"
      >
        <MoreHorizontal size={14} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-44 rounded-lg border border-orion-border bg-orion-bg shadow-orion-2">
          {/* Cambiar rol */}
          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setRolSubmenu(true)}
              onMouseLeave={() => setRolSubmenu(false)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-orion-fg hover:bg-orion-bg-subtle"
            >
              <UserCog size={13} className="shrink-0 text-orion-fg-muted" />
              Cambiar rol
              <ChevronRight size={11} className="ml-auto text-orion-fg-faint" />
            </button>

            {rolSubmenu && (
              <div
                className="absolute right-full top-0 mr-1 w-40 rounded-lg border border-orion-border bg-orion-bg shadow-orion-2"
                onMouseEnter={() => setRolSubmenu(true)}
                onMouseLeave={() => setRolSubmenu(false)}
              >
                {rolesDisponibles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleCambiarRol(r)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] hover:bg-orion-bg-subtle',
                      r === rolActual ? 'font-semibold text-tenant-accent-fg' : 'text-orion-fg'
                    )}
                  >
                    {r === rolActual && (
                      <span className="h-1.5 w-1.5 rounded-full bg-tenant-accent" />
                    )}
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="my-0.5 border-t border-orion-border" />

          {/* Suspender / Reactivar */}
          {estado === 'suspendido' ? (
            <button
              type="button"
              onClick={handleReactivar}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-success-fg hover:bg-orion-bg-subtle"
            >
              <UserCheck size={13} className="shrink-0" />
              Reactivar
            </button>
          ) : estado !== 'invitado' ? (
            <button
              type="button"
              onClick={handleSuspender}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-danger-fg hover:bg-orion-bg-subtle"
            >
              <UserX size={13} className="shrink-0" />
              Suspender
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
