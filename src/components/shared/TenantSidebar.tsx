import Link from 'next/link';
import type { Tenant } from '@/lib/db/schema';

const NAV = [
  { href: '', label: 'Dashboard' },
  { href: '/clientes', label: 'Clientes' },
  { href: '/productos', label: 'Productos' },
  { href: '/cotizaciones', label: 'Cotizaciones' },
  { href: '/ordenes', label: 'Órdenes de compra' },
  { href: '/inventario', label: 'Inventario' },
  { href: '/guias', label: 'Guías' },
  { href: '/facturas', label: 'Facturas' },
  { href: '/credito', label: 'Crédito' },
  { href: '/reportes', label: 'Reportes' },
];

export function TenantSidebar({ tenant }: { tenant: Tenant }) {
  return (
    <aside className="w-60 shrink-0 border-r bg-muted/30 p-4">
      <div className="mb-6">
        {tenant.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tenant.logoUrl} alt={tenant.razonSocial} className="h-10 object-contain" />
        ) : (
          <span className="text-base font-bold leading-tight">{tenant.razonSocial}</span>
        )}
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">/{tenant.slug}</p>
      </div>
      <nav className="space-y-0.5 text-sm">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={`/${tenant.slug}${item.href}`}
            className="flex items-center rounded-md px-3 py-2 hover:bg-muted"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
