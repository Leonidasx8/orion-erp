import { db } from '@/lib/db/client';
import { tenants, tenantMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function userBelongsToTenant(
  userId: string,
  slug: string
): Promise<{ tenantId: string } | null> {
  const result = await db
    .select({ id: tenants.id })
    .from(tenants)
    .innerJoin(tenantMembers, eq(tenantMembers.tenantId, tenants.id))
    .where(
      and(
        eq(tenants.slug, slug),
        eq(tenantMembers.userId, userId),
        eq(tenants.estado, 'activo'),
        eq(tenantMembers.estado, 'activo')
      )
    )
    .limit(1);

  return result[0] ? { tenantId: result[0].id } : null;
}

export async function getTenantBySlug(slug: string) {
  const [t] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return t ?? null;
}
