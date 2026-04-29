import { cache } from 'react';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema';

export const getCurrentTenant = cache(async () => {
  const h = await headers();
  const tenantId = h.get('x-tenant-id');
  const slug = h.get('x-tenant-slug');

  if (!tenantId || !slug) {
    throw new Error('getCurrentTenant called outside of tenant route');
  }

  const [t] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!t) throw new Error(`Tenant not found: ${tenantId}`);

  return t;
});
