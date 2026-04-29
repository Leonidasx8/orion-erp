import { createSSRClient } from '@/lib/supabase/server';
import { getCurrentTenant } from './current-tenant';
import { userCan } from './casbin';

export class PermissionError extends Error {
  constructor(public readonly permiso: string) {
    super(`Forbidden: ${permiso}`);
    this.name = 'PermissionError';
  }
}

export async function requirePermission(permiso: string) {
  const supabase = await createSSRClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new PermissionError(permiso);

  const tenant = await getCurrentTenant();
  const allowed = await userCan(user.id, tenant.id, permiso);
  if (!allowed) throw new PermissionError(permiso);

  return { user, tenant };
}

export async function userHasPermission(permiso: string): Promise<boolean> {
  try {
    await requirePermission(permiso);
    return true;
  } catch {
    return false;
  }
}
