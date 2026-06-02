'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  ClipboardList,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Building2, label: 'Tenants', href: '/admin/tenants' },
  { icon: Users, label: 'Usuarios globales', href: '/admin/usuarios' },
  { icon: ClipboardList, label: 'Auditoría', href: '/admin/auditoria' },
  { icon: Settings, label: 'Configuración', href: '/admin/configuracion' },
  { icon: ShieldCheck, label: 'Seguridad', href: '/admin/seguridad' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-0.5 text-sm">
      {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
        // Exact match for dashboard, prefix match for others
        const isActive = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-violet-600 font-medium text-white'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            <Icon size={15} strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
