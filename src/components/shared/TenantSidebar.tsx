'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Package,
  FileText,
  ShoppingCart,
  Layers,
  Truck,
  Receipt,
  Wallet,
  BarChart3,
  Settings,
  History,
} from 'lucide-react';
import type { Tenant } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  badge?: string | number;
  disabled?: boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const TENANT_LOGOS: Record<string, string> = {
  idex: '/idex-logo.png',
  agroalves: '/agroalves-logo.png',
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Operación',
    items: [
      { href: '', label: 'Dashboard', icon: Home },
      { href: '/clientes', label: 'Clientes', icon: Users },
      { href: '/productos', label: 'Productos', icon: Package },
      { href: '/cotizaciones', label: 'Cotizaciones', icon: FileText },
      { href: '/ordenes', label: 'Compras a Proveedores', icon: ShoppingCart },
      { href: '/inventario', label: 'Inventario', icon: Layers },
    ],
  },
  {
    label: 'Facturación',
    items: [
      { href: '/guias', label: 'Guías remisión', icon: Truck, disabled: true },
      { href: '/facturas', label: 'Facturas', icon: Receipt },
      { href: '/credito', label: 'Crédito y CxC', icon: Wallet },
    ],
  },
  {
    label: 'Análisis',
    items: [
      { href: '/reportes', label: 'Reportes', icon: BarChart3 },
      { href: '/auditoria', label: 'Auditoría', icon: History, disabled: true },
    ],
  },
  {
    label: 'Administración',
    items: [
      { href: '/usuarios', label: 'Usuarios', icon: Users, disabled: true },
      { href: '/configuracion', label: 'Configuración', icon: Settings, disabled: true },
    ],
  },
];

export function TenantSidebar({
  tenant,
  userName,
  userRole,
}: {
  tenant: Tenant;
  userName?: string;
  userRole?: string;
}) {
  const pathname = usePathname();
  const tenantBase = `/${tenant.slug}`;
  const initials = brandInitials(tenant.razonSocial);

  return (
    <aside className="row-span-2 row-start-1 flex min-h-0 w-60 flex-col border-r border-orion-border bg-orion-bg">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-orion-border px-4">
        {TENANT_LOGOS[tenant.slug] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={TENANT_LOGOS[tenant.slug]}
            alt={tenant.razonSocial}
            className="h-10 w-auto max-w-[180px] object-contain"
          />
        ) : (
          <>
            <span
              className={cn(
                'grid h-7 w-7 place-items-center rounded-md text-xs font-bold tracking-tight text-white',
                'bg-tenant-accent'
              )}
            >
              {initials}
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight text-orion-fg">
                {brandName(tenant.razonSocial)}
              </div>
              <div className="font-mono text-[11px] text-orion-fg-faint">/{tenant.slug}</div>
            </div>
          </>
        )}
      </div>

      {/* Navigation sections */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 pt-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-1">
            <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-orion-fg-faint">
              {section.label}
            </div>
            {section.items.map((item) => {
              const href = `${tenantBase}${item.href}`;
              const isActive = isItemActive(pathname, href, item.href === '');
              const Icon = item.icon;

              if (item.disabled) {
                return (
                  <div
                    key={item.href}
                    title="Próximamente"
                    className="my-px flex cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-orion-fg-faint opacity-60"
                  >
                    <Icon size={16} className="text-orion-fg-faint" />
                    <span className="flex-1 truncate">{item.label}</span>
                    <span className="rounded-full bg-orion-bg-muted px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-orion-fg-muted">
                      Pronto
                    </span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={href}
                  className={cn(
                    'my-px flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                    isActive
                      ? 'bg-tenant-accent-soft text-tenant-accent-fg'
                      : 'text-orion-fg-muted hover:bg-orion-bg-muted hover:text-orion-fg'
                  )}
                >
                  <Icon
                    size={16}
                    className={cn(isActive ? 'text-tenant-accent' : 'text-orion-fg-faint')}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 text-[10px] font-semibold',
                        isActive
                          ? 'bg-tenant-accent text-white'
                          : 'bg-orion-bg-muted text-orion-fg-muted'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer — user */}
      {(userName || userRole) && (
        <div className="flex items-center gap-2.5 border-t border-orion-border p-3">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-orion-bg-muted text-[11px] font-semibold text-orion-fg-muted">
            {userInitials(userName)}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[12.5px] font-medium text-orion-fg">
              {userName ?? '—'}
            </div>
            <div className="truncate text-[11px] text-orion-fg-faint">{userRole ?? ''}</div>
          </div>
        </div>
      )}
    </aside>
  );
}

function isItemActive(pathname: string, href: string, isDashboard: boolean): boolean {
  if (isDashboard) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function brandInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '·';
  const words = trimmed.split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function brandName(razonSocial: string): string {
  // Mantén "Idex" en lugar de "IDEX SAC" en el header del sidebar — más limpio.
  // Si el primer token es la marca, lo usamos; si no, los primeros 12 caracteres.
  const first = razonSocial.split(/\s+/)[0];
  return first.length <= 12 ? first : razonSocial.slice(0, 12);
}

function userInitials(name?: string): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
