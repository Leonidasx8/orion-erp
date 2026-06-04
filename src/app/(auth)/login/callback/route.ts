import { NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const supabase = await createSSRClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL('/login?error=session', url.origin));
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Usar supabase-js (REST/HTTPS) en lugar de Drizzle para evitar
    // la limitación de conexión directa postgres en free tier.
    const admin = await createServerAdminClient();

    // Platform admins siempre van a /admin, ignorando last_slug
    const { data: pa } = await admin
      .from('platform_admins')
      .select('id')
      .eq('user_id', user.id)
      .eq('activo', true)
      .limit(1)
      .single();

    if (pa) {
      return NextResponse.redirect(new URL('/admin', url.origin));
    }

    // Usuarios normales: respetar último tenant visitado
    const lastSlug = user?.user_metadata?.current_tenant_slug as string | undefined;
    if (lastSlug) {
      return NextResponse.redirect(new URL(`/${lastSlug}`, url.origin));
    }

    const { data: membership } = await admin
      .from('tenant_members')
      .select('tenant_id, tenants!inner(slug, estado)')
      .eq('user_id', user.id)
      .eq('estado', 'activo')
      .limit(1);

    const activeMembership = membership?.find(
      (m: { tenants: { estado: string } | null }) => m.tenants?.estado === 'activo'
    );

    if (activeMembership) {
      return NextResponse.redirect(new URL('/seleccionar-empresa', url.origin));
    }
  }

  return NextResponse.redirect(new URL('/seleccionar-empresa', url.origin));
}
