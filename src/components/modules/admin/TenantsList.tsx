'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Tenant } from '@/lib/db/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Filter, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';

type TenantWithCount = Tenant & { userCount?: number };

// ─── helpers ──────────────────────────────────────────────────────────────────

function slugInitials(slug: string): string {
  const parts = slug.replace(/-/g, ' ').split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return slug.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ['bg-primary', 'bg-green-600', 'bg-slate-400'];

function formatFecha(d: Date | null | undefined): string {
  if (!d) return '—';
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function EstadoBadge({ estado }: { estado: string }) {
  if (estado === 'activo') {
    return (
      <Badge className="border-transparent bg-green-100 text-green-700 hover:bg-green-100">
        activo
      </Badge>
    );
  }
  if (estado === 'prueba') {
    return (
      <Badge className="border-transparent bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
        prueba
      </Badge>
    );
  }
  return <Badge variant="destructive">{estado}</Badge>;
}

// ─── component ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export function TenantsList({ tenants }: { tenants: TenantWithCount[] }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return tenants;
    return tenants.filter(
      (t) =>
        t.razonSocial.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.ruc.includes(q)
    );
  }, [tenants, query]);

  // Reset page when filter changes
  useMemo(() => setPage(1), [query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, filtered.length);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 rounded-t-lg border border-b-0 bg-muted/20 px-3 py-2.5">
        <div className="flex flex-1 items-center gap-2">
          {/* Search */}
          <div className="flex h-8 min-w-[280px] items-center gap-2 rounded-md border bg-background px-2.5">
            <Search size={13} className="shrink-0 text-muted-foreground" />
            <input
              className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Buscar por nombre, RUC, slug…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Filter size={12} />
            Plan
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Filter size={12} />
            Estado
          </Button>
          {query && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setQuery('')}>
              Limpiar
            </Button>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} resultados</span>
      </div>

      {/* Table */}
      <div className="rounded-b-lg border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="w-8 px-3 py-2">
                <span className="block h-3.5 w-3.5 rounded border border-muted-foreground/40" />
              </th>
              <th className="px-4 py-2 font-medium">Tenant</th>
              <th className="px-4 py-2 font-medium">RUC</th>
              <th className="px-4 py-2 font-medium">Slug</th>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 text-right font-medium">Usuarios</th>
              <th className="px-4 py-2 text-right font-medium">Docs (mes)</th>
              <th className="px-4 py-2 font-medium">Creado</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {tenants.length === 0
                    ? 'Aún no hay tenants. Crea el primero.'
                    : 'Sin resultados para la búsqueda.'}
                </td>
              </tr>
            ) : (
              paginated.map((t, i) => {
                const initials = slugInitials(t.slug);
                const avatarBg = AVATAR_COLORS[i % AVATAR_COLORS.length] ?? 'bg-slate-400';
                return (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/20">
                    {/* Checkbox */}
                    <td className="px-3 py-2.5">
                      <span className="block h-3.5 w-3.5 rounded border border-muted-foreground/40" />
                    </td>

                    {/* Tenant */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`grid h-7 w-7 shrink-0 place-items-center rounded-[6px] text-[11px] font-semibold text-white ${avatarBg}`}
                        >
                          {initials}
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            <Link href={`/admin/tenants/${t.id}`} className="hover:underline">
                              {t.razonSocial}
                            </Link>
                          </div>
                          <div className="text-[11.5px] text-muted-foreground">{t.razonSocial}</div>
                        </div>
                      </div>
                    </td>

                    {/* RUC */}
                    <td className="px-4 py-2.5 font-mono text-sm">{t.ruc}</td>

                    {/* Slug */}
                    <td className="px-4 py-2.5 font-mono text-sm text-muted-foreground">
                      /{t.slug}
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-2.5">
                      <Badge variant="secondary" className="capitalize">
                        {t.plan}
                      </Badge>
                    </td>

                    {/* Usuarios */}
                    <td className="px-4 py-2.5 text-right text-sm">{t.userCount ?? '—'}</td>

                    {/* Docs mes */}
                    <td className="px-4 py-2.5 text-right text-sm text-muted-foreground">—</td>

                    {/* Creado */}
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">
                      {formatFecha(t.fechaAlta)}
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-2.5">
                      <EstadoBadge estado={t.estado} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2.5 text-muted-foreground">
                      <MoreHorizontal size={14} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination footer */}
        <div className="flex items-center border-t px-4 py-2.5">
          <span className="text-xs text-muted-foreground">
            {filtered.length === 0
              ? 'Sin resultados'
              : `Mostrando ${from}–${to} de ${filtered.length}`}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={12} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight size={12} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
