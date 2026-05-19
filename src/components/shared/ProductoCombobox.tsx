'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
}

interface Props {
  value: string | null | undefined;
  productos: Producto[];
  onChange: (id: string) => void;
  className?: string;
}

const triggerCls =
  'flex h-8 w-full items-center justify-between gap-1 rounded-md border border-orion-border bg-orion-bg px-2.5 text-[12px] text-orion-fg cursor-pointer focus:border-tenant-accent focus:outline-none focus:ring-2 focus:ring-tenant-accent/30';

export function ProductoCombobox({ value, productos, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [rect, setRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = value ? productos.find((p) => p.id === value) : null;
  const label = selected ? `${selected.codigo} · ${selected.nombre}` : '— Manual —';

  const q = query.trim().toLowerCase();
  const filtered = q
    ? productos.filter(
        (p) => p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q)
      )
    : productos;

  function openDropdown() {
    if (triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect());
    }
    setQuery('');
    setOpen(true);
  }

  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onMousedown(e: MouseEvent) {
      const target = e.target as Node;
      if (!dropdownRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onMousedown);
    document.addEventListener('keydown', onKeydown);
    return () => {
      document.removeEventListener('mousedown', onMousedown);
      document.removeEventListener('keydown', onKeydown);
    };
  }, [open]);

  function select(id: string) {
    onChange(id);
    setOpen(false);
  }

  const dropdown =
    open && rect
      ? createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: rect.bottom + 2,
              left: rect.left,
              width: Math.max(rect.width, 280),
              zIndex: 9999,
            }}
            className="rounded-md border border-orion-border bg-orion-bg shadow-lg"
          >
            <div className="border-b border-orion-border p-1.5">
              <div className="relative">
                <Search
                  size={12}
                  className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-orion-fg-muted"
                />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar código o nombre..."
                  className="block w-full rounded border border-orion-border bg-orion-bg py-1 pl-6 pr-2 text-[12px] text-orion-fg placeholder:text-orion-fg-subtle focus:border-tenant-accent focus:outline-none"
                />
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto py-0.5">
              <button
                type="button"
                onClick={() => select('__manual__')}
                className={cn(
                  'w-full px-3 py-1.5 text-left text-[12px] text-orion-fg-muted hover:bg-orion-bg-muted',
                  !value && 'bg-orion-bg-muted font-medium'
                )}
              >
                — Manual —
              </button>
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-[12px] text-orion-fg-muted">Sin resultados</p>
              ) : (
                filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => select(p.id)}
                    className={cn(
                      'flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-orion-bg-muted',
                      value === p.id && 'bg-tenant-accent/10 font-medium'
                    )}
                  >
                    <span className="shrink-0 font-mono text-[10.5px] text-orion-fg-muted">
                      {p.codigo}
                    </span>
                    <span className="truncate text-orion-fg">{p.nombre}</span>
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDropdown}
        className={cn(triggerCls, !selected && 'text-orion-fg-muted')}
      >
        <span className="truncate">{label}</span>
        <ChevronDown size={12} className="shrink-0 text-orion-fg-muted" />
      </button>
      {dropdown}
    </div>
  );
}
