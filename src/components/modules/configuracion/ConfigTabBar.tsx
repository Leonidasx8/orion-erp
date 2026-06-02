'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Building2, Briefcase, FileText, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'empresa', label: 'Empresa', icon: Building2 },
  { id: 'comercial', label: 'Comercial', icon: Briefcase },
  { id: 'facturacion', label: 'Facturación SUNAT', icon: FileText },
  { id: 'usuarios', label: 'Usuarios y permisos', icon: Users },
] as const;

export type TabId = (typeof TABS)[number]['id'];

interface Props {
  active: TabId;
}

export function ConfigTabBar({ active }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(id: TabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', id);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-orion-border bg-orion-bg-subtle p-1">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => go(id)}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors',
            active === id
              ? 'bg-orion-bg text-orion-fg shadow-orion-1'
              : 'text-orion-fg-muted hover:text-orion-fg'
          )}
        >
          <Icon size={13} />
          {label}
        </button>
      ))}
    </div>
  );
}
