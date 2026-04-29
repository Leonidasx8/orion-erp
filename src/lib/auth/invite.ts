import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

export async function invitarUsuarioMagicLink(email: string, nombre: string) {
  const supabase = await createServerAdminClient();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { nombre },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login/aceptar-invitacion`,
  });
  if (error) throw error;
  return data.user;
}
