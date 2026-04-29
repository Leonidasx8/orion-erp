'use server';

import { redirect } from 'next/navigation';
import { createSSRClient } from '@/lib/supabase/server';
import { userBelongsToTenant } from '@/lib/auth/tenant-access';

export async function seleccionarEmpresa(slug: string) {
  const supabase = await createSSRClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const access = await userBelongsToTenant(user.id, slug);
  if (!access) {
    return { success: false as const, error: 'no-access' };
  }

  await supabase.auth.updateUser({
    data: { current_tenant_id: access.tenantId, current_tenant_slug: slug },
  });

  await supabase.auth.refreshSession();

  redirect(`/${slug}`);
}
