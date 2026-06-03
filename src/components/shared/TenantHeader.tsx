import Link from 'next/link';
import { ChevronRight, HelpCircle } from 'lucide-react';
import type { Tenant } from '@/lib/db/schema';
import { GlobalSearch } from './GlobalSearch';
import { NotificationsDropdown } from './NotificationsDropdown';
import { UserMenu } from './UserMenu';

export function TenantHeader({
  tenant,
  crumbs,
  userName,
  className,
}: {
  tenant: Tenant;
  crumbs?: { label: string; href?: string }[];
  userName?: string;
  className?: string;
}) {
  const trail: { label: string; href?: string }[] = crumbs ?? [
    { label: tenant.razonSocial.split(/\s+/)[0], href: `/${tenant.slug}` },
  ];

  return (
    <header
      className={`flex h-14 shrink-0 items-center gap-4 border-b border-orion-border bg-orion-bg px-6 ${className ?? ''}`}
    >
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
      <GlobalSearch />

      {/* Help */}
      <button
        type="button"
        className="grid h-8 w-8 place-items-center rounded-md text-orion-fg-muted hover:bg-orion-bg-muted hover:text-orion-fg"
      >
        <HelpCircle size={16} />
      </button>

      {/* Notifications */}
      <NotificationsDropdown />

      {/* User menu */}
      <UserMenu userName={userName} tenantSlug={tenant.slug} />
    </header>
  );
}
