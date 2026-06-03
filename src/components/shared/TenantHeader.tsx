import { HelpCircle } from 'lucide-react';
import type { Tenant } from '@/lib/db/schema';
import { GlobalSearch } from './GlobalSearch';
import { NotificationsDropdown } from './NotificationsDropdown';
import { UserMenu } from './UserMenu';
import { SmartBreadcrumbs } from './SmartBreadcrumbs';

export function TenantHeader({
  tenant,
  userName,
  className,
}: {
  tenant: Tenant;
  userName?: string;
  className?: string;
  /** @deprecated — solo para páginas /preview. En prod usa SmartBreadcrumbs automático. */
  crumbs?: { label: string; href?: string }[];
}) {
  const tenantName = tenant.razonSocial.split(/\s+/)[0];

  return (
    <header
      className={`flex h-14 shrink-0 items-center gap-4 border-b border-orion-border bg-orion-bg px-6 ${className ?? ''}`}
    >
      {/* Breadcrumbs — auto-generated from URL */}
      <SmartBreadcrumbs tenantSlug={tenant.slug} tenantName={tenantName} />

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
