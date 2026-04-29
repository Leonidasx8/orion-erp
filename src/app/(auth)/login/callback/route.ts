import { NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=invalid', url.origin));
  }

  const supabase = await createSSRClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/login?error=session', url.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si ya tenía una empresa seleccionada, ir directo
  const lastSlug = user?.user_metadata?.current_tenant_slug as string | undefined;
  if (lastSlug) {
    return NextResponse.redirect(new URL(`/${lastSlug}`, url.origin));
  }

  return NextResponse.redirect(new URL('/seleccionar-empresa', url.origin));
}
