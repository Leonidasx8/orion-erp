import Link from 'next/link';
import { db } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema';
import { TenantsList } from '@/components/modules/admin/TenantsList';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Tenants — Dignita' };

export default async function TenantsPage() {
  const list = await db.select().from(tenants).orderBy(tenants.fechaAlta);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <Button asChild>
          <Link href="/admin/tenants/nuevo">Crear tenant</Link>
        </Button>
      </div>

      <TenantsList tenants={list} />
    </div>
  );
}
