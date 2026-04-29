import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { createSSRClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { tenantMembers } from '@/lib/db/schema';

export default async function AceptarInvitacionPage() {
  const supabase = await createSSRClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Activar todas las membresías pendientes de este usuario
  await db
    .update(tenantMembers)
    .set({ estado: 'activo', joinedAt: new Date() })
    .where(eq(tenantMembers.userId, user.id));

  redirect('/seleccionar-empresa');
}
