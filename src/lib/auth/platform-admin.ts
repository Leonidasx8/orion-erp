import { createSSRClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { platformAdmins } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export class ForbiddenError extends Error {
  constructor(resource: string) {
    super(`Acceso denegado: ${resource}`);
    this.name = 'ForbiddenError';
  }
}

export async function requirePlatformAdmin() {
  const supabase = await createSSRClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new ForbiddenError('platform.admin');

  const [pa] = await db
    .select()
    .from(platformAdmins)
    .where(and(eq(platformAdmins.userId, user.id), eq(platformAdmins.activo, true)))
    .limit(1);

  if (!pa) throw new ForbiddenError('platform.admin');
  return { user, platformAdmin: pa };
}
