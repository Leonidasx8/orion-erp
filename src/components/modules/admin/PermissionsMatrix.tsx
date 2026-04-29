'use client';

import { useState, useTransition } from 'react';
import { AlertTriangle } from 'lucide-react';
import { actualizarPermisosDeRol } from '@/server/actions/roles';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { PermisoDefinido, Rol } from '@/lib/db/schema';

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
  const [selected, setSelected] = useState<Set<string>>(new Set(permisosActuales));
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const grouped = permisosDef.reduce<Record<string, PermisoDefinido[]>>((acc, p) => {
    if (!acc[p.modulo]) acc[p.modulo] = [];
    acc[p.modulo].push(p);
    return acc;
  }, {});

  const toggle = (codigo: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(codigo)) {
        next.delete(codigo);
      } else {
        next.add(codigo);
      }
      return next;
    });
  };

  const guardar = () => {
    startTransition(async () => {
      const res = await actualizarPermisosDeRol(rol.id, Array.from(selected));
      setFeedback(
        res.success ? { ok: true, msg: 'Permisos actualizados' } : { ok: false, msg: res.error }
      );
    });
  };

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([modulo, perms]) => (
        <section key={modulo}>
          <h3 className="mb-2 font-semibold capitalize">{modulo}</h3>
          <ul className="space-y-1.5">
            {perms.map((p) => (
              <li key={p.codigo} className="flex items-start gap-2">
                <Checkbox
                  id={p.codigo}
                  checked={selected.has(p.codigo)}
                  onCheckedChange={() => !readOnly && toggle(p.codigo)}
                  disabled={readOnly}
                  className="mt-0.5"
                />
                <label
                  htmlFor={p.codigo}
                  className="flex cursor-pointer items-center gap-1.5 text-sm"
                >
                  {p.esSensible && (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                  )}
                  <span>{p.descripcion}</span>
                  <code className="text-xs text-muted-foreground">{p.codigo}</code>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {!readOnly && (
        <div className="flex items-center gap-3">
          <Button onClick={guardar} disabled={pending}>
            {pending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
          {feedback && (
            <p className={`text-sm ${feedback.ok ? 'text-green-600' : 'text-destructive'}`}>
              {feedback.msg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
