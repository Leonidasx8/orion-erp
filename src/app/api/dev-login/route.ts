/**
 * /api/dev-login?email=admin@orion.demo
 *
 * SOLO PARA DEMO LOCAL. Loguea directo sin magic link.
 * Bloqueado en producción.
 *
 * Uso: pegar la URL en el browser; setea la cookie de sesión
 * y redirige al destino correcto (/admin o /seleccionar-empresa).
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSSRClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { platformAdmins, tenantMembers, tenants } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

const ALLOWED_EMAILS = new Set(['admin@orion.demo', 'lucas@orion.demo']);

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const url = new URL(request.url);
  const email = url.searchParams.get('email')?.toLowerCase();
  const forcePicker = url.searchParams.get('to') === 'picker';
  if (!email || !ALLOWED_EMAILS.has(email)) {
    return NextResponse.json(
      { error: 'Email no permitido', allowed: [...ALLOWED_EMAILS] },
      { status: 400 }
    );
  }

  // Admin client para generar link (server-side)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkErr || !linkData.properties?.email_otp) {
    return NextResponse.json({ error: linkErr?.message ?? 'No OTP generado' }, { status: 500 });
  }

  // SSR client (escribe cookies del lado del server) — verifyOtp setea sesión automáticamente
  const ssr = await createSSRClient();
  const { data: sess, error: verifyErr } = await ssr.auth.verifyOtp({
    email,
    token: linkData.properties.email_otp,
    type: 'email',
  });
  if (verifyErr || !sess.user) {
    return NextResponse.json(
      { error: verifyErr?.message ?? 'No se pudo crear sesión' },
      { status: 500 }
    );
  }

  // Resolver destino igual que /login/callback
  const user = sess.user;
  let dest = '/seleccionar-empresa';

  const lastSlug = user.user_metadata?.current_tenant_slug as string | undefined;
  if (lastSlug && !forcePicker) {
    dest = `/${lastSlug}`;
  } else {
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

    if (membership.length === 0) {
      const [pa] = await db
        .select()
        .from(platformAdmins)
        .where(and(eq(platformAdmins.userId, user.id), eq(platformAdmins.activo, true)))
        .limit(1);
      if (pa) dest = '/admin';
    }
  }

  return NextResponse.redirect(new URL(dest, url.origin));
}
