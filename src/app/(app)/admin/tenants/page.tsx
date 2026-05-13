import Link from 'next/link';
import { count } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { tenants, tenantMembers } from '@/lib/db/schema';
import { TenantsList } from '@/components/modules/admin/TenantsList';
import { Button } from '@/components/ui/button';
import { Download, Plus } from 'lucide-react';

export const metadata = { title: 'Tenants — Sistema Orión' };

export default async function TenantsPage() {
  const list = await db.select().from(tenants).orderBy(tenants.fechaAlta);

  // User count per tenant
  const userCounts = await db
    .select({
      tenantId: tenantMembers.tenantId,
      cnt: count(),
    })
    .from(tenantMembers)
    .groupBy(tenantMembers.tenantId);

  const userCountMap = new Map(userCounts.map((r) => [r.tenantId, r.cnt]));

  const enriched = list.map((t) => ({
    ...t,
    userCount: userCountMap.get(t.id) ?? 0,
  }));

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tenants</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gestión de empresas en la plataforma
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download size={13} />
            Exportar
          </Button>
          <Button size="sm" className="gap-1.5" asChild>
            <Link href="/admin/tenants/nuevo">
              <Plus size={13} />
              Nuevo tenant
            </Link>
          </Button>
        </div>
      </div>

      <TenantsList tenants={enriched} />
    </div>
  );
}
