'use client';

import { useState } from 'react';
import { Lock, Plus } from 'lucide-react';
import { PermissionsMatrix } from './PermissionsMatrix';
import { cn } from '@/lib/utils';
import type { PermisoDefinido, Rol } from '@/lib/db/schema';

type RolWithPerms = {
  rol: Rol;
  permisos: string[];
  userCount: number;
};

export function RolesPageLayout({
  roles,
  allPermisos,
}: {
  roles: RolWithPerms[];
  allPermisos: PermisoDefinido[];
  companySlug: string;
}) {
  const [selectedId, setSelectedId] = useState(roles[0]?.rol.id ?? '');
  const selected = roles.find((r) => r.rol.id === selectedId);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
      {/* Roles list */}
      <div className="h-fit rounded-lg border border-orion-border bg-orion-bg">
        <div className="flex items-center justify-between border-b border-orion-border px-3 py-2.5">
          <span className="text-[11.5px] font-semibold text-orion-fg">Roles del tenant</span>
          <button
            type="button"
            className="grid h-5 w-5 place-items-center rounded text-orion-fg-faint hover:bg-orion-bg-muted hover:text-orion-fg"
          >
            <Plus size={11} />
          </button>
        </div>
        <div>
          {roles.map(({ rol, userCount }) => (
            <button
              key={rol.id}
              type="button"
              onClick={() => setSelectedId(rol.id)}
              className={cn(
                'flex w-full items-center gap-2 border-b border-orion-border px-3 py-2.5 text-left last:border-0',
                selectedId === rol.id ? 'bg-tenant-accent-soft' : 'hover:bg-orion-bg-hover'
              )}
            >
              <span
                className={cn(
                  'flex-1 text-[12.5px]',
                  selectedId === rol.id
                    ? 'font-semibold text-tenant-accent-fg'
                    : 'font-medium text-orion-fg'
                )}
              >
                {rol.nombre}
              </span>
              {rol.esPredefinido && <Lock size={10} className="text-orion-fg-faint" />}
              <span className="text-[11px] text-orion-fg-faint">{userCount}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Permission matrix */}
      {selected && (
        <div className="rounded-lg border border-orion-border bg-orion-bg">
          <div className="flex items-center justify-between border-b border-orion-border px-4 py-3">
            <div>
              <span className="text-[13px] font-semibold text-orion-fg">{selected.rol.nombre}</span>
              {selected.rol.descripcion && (
                <span className="ml-2 text-[11px] text-orion-fg-muted">
                  {selected.rol.descripcion}
                </span>
              )}
            </div>
            {selected.rol.esPredefinido && (
              <span className="flex items-center gap-1 text-[11px] text-orion-fg-faint">
                <Lock size={10} /> Solo lectura
              </span>
            )}
          </div>
          <div className="p-4">
            <PermissionsMatrix
              permisosDef={allPermisos}
              rol={selected.rol}
              permisosActuales={selected.permisos}
              readOnly={selected.rol.nombre === 'Superadmin' && selected.rol.esPredefinido}
            />
          </div>
        </div>
      )}
    </div>
  );
}
