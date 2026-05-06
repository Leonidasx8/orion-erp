import Link from 'next/link';
import { Bell, ChevronDown, ChevronRight, HelpCircle, Search } from 'lucide-react';
import type { Tenant } from '@/lib/db/schema';

export function TenantHeader({
  tenant,
  crumbs,
  userName,
}: {
  tenant: Tenant;
  crumbs?: { label: string; href?: string }[];
  userName?: string;
}) {
  const trail: { label: string; href?: string }[] = crumbs ?? [
    { label: tenant.razonSocial.split(/\s+/)[0], href: `/${tenant.slug}` },
  ];

  return (
    <header className="col-start-2 row-start-1 flex h-14 items-center gap-4 border-b border-orion-border bg-orion-bg px-6">
      {/* Breadcrumbs */}
      <nav className="flex min-w-0 items-center gap-1.5 text-[13px] text-orion-fg-muted">
        {trail.map((c, i) => {
          const isLast = i === trail.length - 1;
          return (
            <span key={`${c.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={12} className="text-orion-fg-faint" />}
              {c.href && !isLast ? (
                <Link href={c.href} className="hover:text-orion-fg">
                  {c.label}
                </Link>
              ) : (
                <span className={isLast ? 'font-medium text-orion-fg' : undefined}>{c.label}</span>
              )}
            </span>
          );
        })}
      </nav>

      {/* Search */}
      <div className="ml-auto flex h-8 w-72 items-center gap-2 rounded-md border border-orion-border bg-orion-bg-subtle px-2.5 text-xs text-orion-fg-faint">
        <Search size={14} />
        <span className="flex-1 truncate">Buscar productos, clientes, cotizaciones…</span>
        <kbd className="rounded-sm border border-b-2 border-orion-border bg-orion-bg px-1.5 py-px font-mono text-[10px] text-orion-fg-muted">
          ⌘K
        </kbd>
      </div>

      {/* Help */}
      <button
        type="button"
        className="grid h-8 w-8 place-items-center rounded-md text-orion-fg-muted hover:bg-orion-bg-muted hover:text-orion-fg"
      >
        <HelpCircle size={16} />
      </button>

      {/* Notifications */}
      <button
        type="button"
        className="grid h-8 w-8 place-items-center rounded-md text-orion-fg-muted hover:bg-orion-bg-muted hover:text-orion-fg"
      >
        <Bell size={16} />
      </button>

      {/* User pill */}
      <Link
        href="/seleccionar-empresa"
        className="flex items-center gap-2 rounded-md px-2 py-1 text-[13px] text-orion-fg-muted hover:bg-orion-bg-muted hover:text-orion-fg"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-orion-bg-muted text-[11px] font-semibold text-orion-fg-muted">
          {userInitials(userName)}
        </span>
        <span className="font-medium text-orion-fg">{userName ?? 'Usuario'}</span>
        <ChevronDown size={12} className="text-orion-fg-faint" />
      </Link>
    </header>
  );
}

function userInitials(name?: string): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
