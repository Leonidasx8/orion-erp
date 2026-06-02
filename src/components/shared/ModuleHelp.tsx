'use client';

import { useState, useEffect } from 'react';
import { Info, X } from 'lucide-react';

interface Props {
  module: string; // clave única por módulo, ej: 'clientes'
  title: string;
  description: string;
  tips?: string[];
}

export function ModuleHelp({ module, title, description, tips }: Props) {
  const key = `orion-help-${module}`;
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true); // empieza oculto hasta leer localStorage

  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved !== 'dismissed') {
      setDismissed(false);
      setVisible(true);
    }
  }, [key]);

  function dismiss() {
    localStorage.setItem(key, 'dismissed');
    setDismissed(true);
    setVisible(false);
  }

  function toggle() {
    setVisible((v) => !v);
  }

  return (
    <div className="relative">
      {/* Botón ⓘ siempre visible */}
      <button
        onClick={toggle}
        title={visible ? 'Cerrar ayuda' : 'Ver ayuda del módulo'}
        className={`grid h-7 w-7 place-items-center rounded-full transition-colors ${
          visible
            ? 'bg-info-soft text-info-fg'
            : 'text-orion-fg-faint hover:bg-orion-bg-subtle hover:text-orion-fg-muted'
        }`}
      >
        <Info size={15} />
      </button>

      {/* Panel de ayuda */}
      {visible && (
        <div className="border-info-border absolute left-0 top-9 z-30 w-80 rounded-xl border bg-orion-bg p-4 shadow-lg">
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="text-[13px] font-semibold text-orion-fg">{title}</p>
            <div className="flex shrink-0 items-center gap-1">
              {!dismissed && (
                <button
                  onClick={dismiss}
                  className="rounded px-1.5 py-0.5 text-[10px] text-orion-fg-muted hover:bg-orion-bg-subtle"
                  title="No volver a mostrar automáticamente"
                >
                  No mostrar
                </button>
              )}
              <button
                onClick={toggle}
                className="grid h-5 w-5 place-items-center rounded text-orion-fg-muted hover:bg-orion-bg-subtle"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          <p className="text-[12px] leading-relaxed text-orion-fg-muted">{description}</p>

          {tips && tips.length > 0 && (
            <ul className="mt-2 space-y-1">
              {tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-orion-fg-muted">
                  <span className="mt-0.5 shrink-0 text-info-fg">·</span>
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
