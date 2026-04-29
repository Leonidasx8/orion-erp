import Link from 'next/link';
import type { Tenant } from '@/lib/db/schema';
import { Badge } from '@/components/ui/badge';

export function TenantHeader({ tenant }: { tenant: Tenant }) {
  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{tenant.razonSocial}</span>
        <Badge variant="secondary" className="font-mono text-xs">
          {tenant.plan}
        </Badge>
      </div>
      <Link href="/seleccionar-empresa" className="text-sm text-muted-foreground hover:underline">
        Cambiar empresa
      </Link>
    </header>
  );
}
