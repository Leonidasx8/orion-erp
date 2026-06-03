'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Check, Minus } from 'lucide-react';
import { actualizarPermisosDeRol } from '@/server/actions/roles';
import type { PermisoDefinido, Rol } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

const MODULO_LABELS: Record<string, string> = {
  clientes: 'Clientes',
  productos: 'Productos',
  cotizaciones: 'Cotizaciones',
  ordenes: 'Órdenes compra',
  inventario: 'Inventario',
  guias: 'Guías remisión',
  facturas: 'Facturas',
  credito: 'Crédito',
  reportes: 'Reportes',
  admin: 'Administración',
  transportistas: 'Transportistas',
  vehiculos: 'Vehículos',
};

// ─── Toggle cell ──────────────────────────────────────────────────────────────

function ToggleCell({
  active,
  exists,
  onChange,
  readOnly,
}: {
  active: boolean;
  exists: boolean;
  onChange: () => void;
  readOnly: boolean;
}) {
  if (!exists) {
    return (
      <td className="px-3 py-2 text-center">
        <Minus size={12} className="inline text-orion-fg-faint opacity-30" />
      </td>
    );
  }
  if (readOnly) {
    return (
      <td className="px-3 py-2 text-center">
        {active ? (
          <Check size={13} className="inline text-success-fg" />
        ) : (
          <Minus size={13} className="inline text-orion-fg-faint" />
        )}
      </td>
    );
  }
  return (
    <td className="px-3 py-2 text-center">
      <button
        type="button"
        onClick={onChange}
        aria-pressed={active}
        className={cn(
          'relative inline-flex h-4 w-7 items-center rounded-full transition-colors',
          active ? 'bg-tenant-accent' : 'border border-orion-border bg-orion-bg-muted'
        )}
      >
        <span
          className={cn(
            'h-3 w-3 rounded-full bg-white shadow-sm transition-transform',
            active ? 'translate-x-3.5' : 'translate-x-0.5'
          )}
        />
      </button>
    </td>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PermissionsMatrix({
  permisosDef,
  rol,
  permisosActuales,
  readOnly,
}: {
  permisosDef: PermisoDefinido[];
  rol: Rol;
  permisosActuales: string[];
  readOnly: boolean;
}) {
  const [selected, setSelected] = useState(new Set(permisosActuales));
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  // Group permissions: module → { ver, crear, editar, eliminar, others[] }
  type ModuleCols = {
    ver?: string;
    crear?: string;
    editar?: string;
    eliminar?: string;
    others: PermisoDefinido[];
  };

  const modules = new Map<string, ModuleCols>();

  for (const p of permisosDef) {
    if (!modules.has(p.modulo)) modules.set(p.modulo, { others: [] });
    const m = modules.get(p.modulo)!;
    const action = p.accion.toLowerCase();
    if (action === 'ver') m.ver = p.codigo;
    else if (action === 'crear') m.crear = p.codigo;
    else if (action === 'editar') m.editar = p.codigo;
    else if (action === 'eliminar') m.eliminar = p.codigo;
    else m.others.push(p);
  }

  function toggle(codigo: string) {
    if (readOnly) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(codigo)) next.delete(codigo);
      else next.add(codigo);
      return next;
    });
    setSaved(false);
  }

  function guardar() {
    startTransition(async () => {
      const res = await actualizarPermisosDeRol(rol.id, Array.from(selected));
      if (res.success) {
        toast.success('Permisos guardados');
        setSaved(true);
      } else {
        toast.error((res as { success: false; error: string }).error);
      }
    });
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-orion-border bg-orion-bg-subtle">
              <th
                className="px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wider text-orion-fg-muted"
                style={{ minWidth: 200 }}
              >
                Módulo · Acción
              </th>
              <th className="w-16 px-3 py-2 text-center text-[10.5px] font-semibold uppercase tracking-wider text-orion-fg-muted">
                Ver
              </th>
              <th className="w-16 px-3 py-2 text-center text-[10.5px] font-semibold uppercase tracking-wider text-orion-fg-muted">
                Crear
              </th>
              <th className="w-16 px-3 py-2 text-center text-[10.5px] font-semibold uppercase tracking-wider text-orion-fg-muted">
                Editar
              </th>
              <th className="w-20 px-3 py-2 text-center text-[10.5px] font-semibold uppercase tracking-wider text-orion-fg-muted">
                Eliminar
              </th>
              <th className="px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wider text-orion-fg-muted">
                Notas
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-orion-border">
            {Array.from(modules.entries()).map(([modulo, cols]) => (
              <>
                {/* Main module row */}
                <tr key={modulo} className="hover:bg-orion-bg-subtle">
                  <td className="px-3 py-2 text-[12.5px] font-medium text-orion-fg">
                    {MODULO_LABELS[modulo] ?? modulo}
                  </td>
                  <ToggleCell
                    exists={!!cols.ver}
                    active={!!cols.ver && selected.has(cols.ver)}
                    onChange={() => cols.ver && toggle(cols.ver)}
                    readOnly={readOnly}
                  />
                  <ToggleCell
                    exists={!!cols.crear}
                    active={!!cols.crear && selected.has(cols.crear)}
                    onChange={() => cols.crear && toggle(cols.crear)}
                    readOnly={readOnly}
                  />
                  <ToggleCell
                    exists={!!cols.editar}
                    active={!!cols.editar && selected.has(cols.editar)}
                    onChange={() => cols.editar && toggle(cols.editar)}
                    readOnly={readOnly}
                  />
                  <ToggleCell
                    exists={!!cols.eliminar}
                    active={!!cols.eliminar && selected.has(cols.eliminar)}
                    onChange={() => cols.eliminar && toggle(cols.eliminar)}
                    readOnly={readOnly}
                  />
                  <td className="px-3 py-2 text-[11px] text-orion-fg-muted">—</td>
                </tr>

                {/* Non-standard actions as sub-rows */}
                {cols.others.map((p) => (
                  <tr key={p.codigo} className="bg-orion-bg-subtle/50 hover:bg-orion-bg-subtle">
                    <td className="py-1.5 pl-6 pr-3 text-[11.5px] text-orion-fg-muted">
                      · {p.accion.replace(/_/g, ' ')}
                    </td>
                    <td colSpan={4} className="px-3 py-1.5 text-center">
                      {!readOnly ? (
                        <button
                          type="button"
                          onClick={() => toggle(p.codigo)}
                          aria-pressed={selected.has(p.codigo)}
                          className={cn(
                            'relative inline-flex h-4 w-7 items-center rounded-full transition-colors',
                            selected.has(p.codigo)
                              ? 'bg-tenant-accent'
                              : 'border border-orion-border bg-orion-bg-muted'
                          )}
                        >
                          <span
                            className={cn(
                              'h-3 w-3 rounded-full bg-white shadow-sm transition-transform',
                              selected.has(p.codigo) ? 'translate-x-3.5' : 'translate-x-0.5'
                            )}
                          />
                        </button>
                      ) : selected.has(p.codigo) ? (
                        <Check size={13} className="inline text-success-fg" />
                      ) : (
                        <Minus size={13} className="inline text-orion-fg-faint" />
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-orion-fg-muted">—</td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <div className="mt-3 flex items-center gap-3 border-t border-orion-border pt-3">
          <button
            type="button"
            onClick={guardar}
            disabled={pending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-tenant-accent px-4 text-[13px] font-medium text-white hover:brightness-95 disabled:opacity-60"
          >
            {pending ? 'Guardando…' : 'Guardar cambios'}
          </button>
          {saved && <span className="text-[12px] text-success-fg">Guardado</span>}
        </div>
      )}
    </div>
  );
}
