import { NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { platformAdmins, tenantMembers, tenants } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

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

  if (user) {
    // Verificar si tiene membresías en tenants activos
    const membership = await db
      .select({ slug: tenants.slug })
      .from(tenantMembers)
      .innerJoin(tenants, eq(tenants.id, tenantMembers.tenantId))
      .where(
        and(
          eq(tenantMembers.userId, user.id),
          eq(tenantMembers.estado, 'activo'),
          eq(tenants.estado, 'activo')
        )
      )
      .limit(1);

    if (membership.length > 0) {
      // Tiene tenants → picker o auto-redirect
      return NextResponse.redirect(new URL('/seleccionar-empresa', url.origin));
    }

    // Sin tenants: platform admin puro → panel admin
    const [pa] = await db
      .select()
      .from(platformAdmins)
      .where(and(eq(platformAdmins.userId, user.id), eq(platformAdmins.activo, true)))
      .limit(1);
    if (pa) {
      return NextResponse.redirect(new URL('/admin', url.origin));
    }
  }

  return NextResponse.redirect(new URL('/seleccionar-empresa', url.origin));
}
