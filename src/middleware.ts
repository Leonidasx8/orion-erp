import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_PATHS = [
  '/login',
  '/login/mfa',
  '/login/recuperar',
  '/login/aceptar-invitacion',
  '/api/test-db',
];

// Rutas de preview del design system. La página adentro hace su propio gate
// con NODE_ENV !== 'development' → 404. Aquí solo evitamos el redirect a /login.
const DEV_PUBLIC_PATHS = ['/preview', '/api/dev-login'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path === '/' || PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }

  if (process.env.NODE_ENV === 'development' && DEV_PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // /admin y /seleccionar-empresa: autenticación suficiente, validación extra en layout
  if (path.startsWith('/admin') || path.startsWith('/seleccionar-empresa')) {
    return response;
  }

  // Para rutas API el slug está en la segunda posición: /api/[companySlug]/...
  const segments = path.split('/').filter(Boolean);
  const slug = segments[0] === 'api' ? segments[1] : segments[0];
  if (!slug) return response;

  const { data, error } = await supabase
    .from('vw_user_tenant_access')
    .select('tenant_id')
    .eq('slug', slug)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) {
    // API routes → 403 JSON, frontend routes → redirect
    if (segments[0] === 'api') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/seleccionar-empresa', request.url));
  }

  response.headers.set('x-tenant-id', data.tenant_id as string);
  response.headers.set('x-tenant-slug', slug);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/health|pitch\\.html|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)',
  ],
};
