'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

// Map URL segments → display labels
const SEG: Record<string, string> = {
  clientes: 'Clientes',
  productos: 'Productos',
  cotizaciones: 'Cotizaciones',
  ordenes: 'Órdenes de Compra',
  inventario: 'Inventario',
  facturas: 'Facturas',
  credito: 'Crédito y CxC',
  guias: 'Guías remisión',
  reportes: 'Reportes',
  auditoria: 'Auditoría',
  pipeline: 'Pipeline',
  configuracion: 'Configuración',
  admin: 'Admin',
  usuarios: 'Usuarios',
  roles: 'Roles',
  nueva: 'Nueva',
  nuevo: 'Nuevo',
  editar: 'Editar',
  ajuste: 'Ajuste manual',
  pagos: 'Pagos',
  precios: 'Precios',
  ventas: 'Ventas',
  'actualizar-precios': 'Actualizar precios',
};

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function segLabel(s: string): string {
  if (SEG[s]) return SEG[s];
  if (isUuid(s)) return 'Detalle';
  // SKU-like codes (TER-50AWG-1/4, COT-2026-000001, etc.) — show as-is but truncated
  return s.length > 20 ? s.slice(0, 20) + '…' : s;
}

export function SmartBreadcrumbs({
  tenantSlug,
  tenantName,
}: {
  tenantSlug: string;
  tenantName: string;
}) {
  const pathname = usePathname();

  // Path: /[slug]/module/sub/...
  const parts = pathname.split('/').filter(Boolean);
  // parts[0] = slug, rest = segments
  const segments = parts.slice(1); // drop the slug

  if (segments.length === 0) {
    // Dashboard
    return (
      <nav className="flex min-w-0 items-center gap-1.5 text-[13px] text-orion-fg-muted">
        <span className="font-medium text-orion-fg">{tenantName}</span>
      </nav>
    );
  }

  type Crumb = { label: string; href?: string };
  const crumbs: Crumb[] = [{ label: tenantName, href: `/${tenantSlug}` }];

  // Build path progressively
  let current = `/${tenantSlug}`;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    current += `/${seg}`;
    const isLast = i === segments.length - 1;
    crumbs.push({ label: segLabel(seg), href: isLast ? undefined : current });
  }

  return (
    <nav className="flex min-w-0 items-center gap-1 text-[13px]">
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={`${c.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={12} className="shrink-0 text-orion-fg-faint" />}
            {c.href && !isLast ? (
              <Link href={c.href} className="text-orion-fg-muted hover:text-orion-fg">
                {c.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-medium text-orion-fg' : 'text-orion-fg-muted'}>
                {c.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
