'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, Package, FileText, Loader2 } from 'lucide-react';
import { buscarGlobal, type SearchResult } from '@/server/actions/search';
import { cn } from '@/lib/utils';

const TIPO_ICON = {
  cliente: Users,
  producto: Package,
  cotizacion: FileText,
} as const;

const TIPO_LABEL = {
  cliente: 'Cliente',
  producto: 'Producto',
  cotizacion: 'Cotización',
} as const;

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ⌘K / Ctrl+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setSelected(0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await buscarGlobal(query);
        setResults(res);
        setSelected(0);
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && results[selected]) {
      navigate(results[selected].href);
    }
  }

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-auto flex h-8 w-72 items-center gap-2 rounded-md border border-orion-border bg-orion-bg-subtle px-2.5 text-xs text-orion-fg-faint hover:border-orion-border-strong hover:bg-orion-bg-hover"
      >
        <Search size={14} />
        <span className="flex-1 truncate text-left">Buscar productos, clientes, cotizaciones…</span>
        <kbd className="rounded-sm border border-b-2 border-orion-border bg-orion-bg px-1.5 py-px font-mono text-[10px] text-orion-fg-muted">
          ⌘K
        </kbd>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Panel */}
          <div
            className="relative w-full max-w-lg rounded-xl border border-orion-border bg-orion-bg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            {/* Input row */}
            <div className="flex items-center gap-2 border-b border-orion-border px-3 py-2.5">
              {isPending ? (
                <Loader2 size={16} className="shrink-0 animate-spin text-orion-fg-faint" />
              ) : (
                <Search size={16} className="shrink-0 text-orion-fg-faint" />
              )}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar productos, clientes, cotizaciones…"
                className="flex-1 bg-transparent text-sm text-orion-fg placeholder:text-orion-fg-faint focus:outline-none"
              />
              <kbd
                className="rounded border border-orion-border bg-orion-bg-subtle px-1.5 py-px font-mono text-[10px] text-orion-fg-faint"
                onClick={() => setOpen(false)}
              >
                Esc
              </kbd>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <ul className="max-h-80 overflow-y-auto py-1.5">
                {results.map((r, i) => {
                  const Icon = TIPO_ICON[r.tipo];
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => navigate(r.href)}
                        className={cn(
                          'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                          i === selected
                            ? 'bg-orion-bg-hover text-orion-fg'
                            : 'text-orion-fg-subtle hover:bg-orion-bg-hover hover:text-orion-fg'
                        )}
                        onMouseEnter={() => setSelected(i)}
                      >
                        <Icon
                          size={15}
                          className={cn(
                            'shrink-0',
                            i === selected ? 'text-orion-fg-muted' : 'text-orion-fg-faint'
                          )}
                        />
                        <span className="flex-1 truncate font-medium">{r.titulo}</span>
                        <span className="shrink-0 text-xs text-orion-fg-faint">{r.subtitulo}</span>
                        <span className="shrink-0 rounded bg-orion-bg-muted px-1.5 py-px text-[10px] text-orion-fg-faint">
                          {TIPO_LABEL[r.tipo]}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Empty state */}
            {query.trim().length >= 2 && results.length === 0 && !isPending && (
              <div className="px-4 py-6 text-center text-sm text-orion-fg-faint">
                Sin resultados para &ldquo;{query}&rdquo;
              </div>
            )}

            {/* Hint */}
            {query.trim().length < 2 && (
              <div className="px-4 py-3 text-xs text-orion-fg-faint">
                Escribe al menos 2 caracteres para buscar
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
