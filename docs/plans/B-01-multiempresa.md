# B.1 — Multiempresa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` o `superpowers:executing-plans`.

**Goal:** Selector path-based de empresa, persistencia de la última empresa visitada en `user_metadata`, JWT custom claims con `current_tenant_id`, y middleware que valida acceso al tenant en cada request `/[companySlug]/*`.

**Architecture:** Path-based routing en Next.js App Router. RLS no se toca acá (las policies se aplican por tabla en sus respectivos módulos), pero esta capa instala la infraestructura para que RLS pueda usar `auth.jwt() ->> 'current_tenant_id'`.

**Tech Stack:** Next.js middleware, Supabase Auth hook (`custom_access_token_hook`), Drizzle, Server Actions.

**Estimación**: 8h — 4 tareas.

**Dependencias upstream**: B.0 (tablas `tenants` y `tenant_members` existen).
**Dependencias downstream**: B.2, B.3, B.4 — todos los módulos de tenant.

---

## File structure

```
supabase/migrations/
└── 0006_jwt_custom_claims.sql              # custom_access_token_hook

src/middleware.ts                           # validación de [companySlug]
src/lib/auth/
├── current-tenant.ts                       # getCurrentTenant() helper
└── tenant-access.ts                        # userBelongsToTenant()

src/app/(app)/
├── seleccionar-empresa/
│   └── page.tsx
└── [companySlug]/
    └── layout.tsx                          # valida + provee context
```

---

## Task 1: Middleware con validación de `[companySlug]`

**Estimado**: 2h
**Agente**: `architect` (define flujo) → `backend-developer`
**Files:**

- Create: `src/middleware.ts`
- Create: `src/lib/auth/tenant-access.ts`
- Test: `tests/integration/middleware.test.ts`

- [ ] **Step 1: Helper `userBelongsToTenant`**

```typescript
// src/lib/auth/tenant-access.ts
import { db } from '@/lib/db/client';
import { tenants, tenantMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function userBelongsToTenant(
  userId: string,
  slug: string
): Promise<{ tenantId: string } | null> {
  const result = await db
    .select({ id: tenants.id })
    .from(tenants)
    .innerJoin(tenantMembers, eq(tenantMembers.tenantId, tenants.id))
    .where(
      and(
        eq(tenants.slug, slug),
        eq(tenantMembers.userId, userId),
        eq(tenants.estado, 'activo'),
        eq(tenantMembers.estado, 'activo')
      )
    )
    .limit(1);
  return result[0] ? { tenantId: result[0].id } : null;
}

export async function getTenantBySlug(slug: string) {
  const [t] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return t ?? null;
}
```

- [ ] **Step 2: Middleware**

```typescript
// src/middleware.ts
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_PATHS = ['/login', '/login/mfa', '/login/recuperar', '/login/aceptar-invitacion'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Rutas públicas
  if (path === '/' || PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }

  // Inicializar Supabase con cookies (SSR)
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sin sesión: redirect a login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // /admin: validación de platform admin se hace en el layout (DB call)
  if (path.startsWith('/admin')) {
    return response;
  }

  // /seleccionar-empresa: ya autenticado, dejar pasar
  if (path.startsWith('/seleccionar-empresa')) {
    return response;
  }

  // /[companySlug]/...: validar acceso
  const segments = path.split('/').filter(Boolean);
  const slug = segments[0];

  if (slug) {
    // Llamada al DB en middleware: aceptable para Edge Runtime con Drizzle si tu setup lo soporta;
    // alternativa: hacer fetch a un endpoint /api/tenant-check (cacheable).
    // Para mantenerlo simple, hacemos un select directo via Supabase RPC.
    const { data, error } = await supabase
      .from('vw_user_tenant_access') // vista que une tenants+tenant_members
      .select('tenant_id')
      .eq('slug', slug)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.redirect(new URL('/seleccionar-empresa', request.url));
    }

    response.headers.set('x-tenant-id', data.tenant_id);
    response.headers.set('x-tenant-slug', slug);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health).*)'],
};
```

- [ ] **Step 3: Vista `vw_user_tenant_access` (acelera la validación)**

```sql
-- supabase/migrations/0006_jwt_custom_claims.sql (parte 1, vista)
CREATE OR REPLACE VIEW vw_user_tenant_access AS
SELECT
  tm.user_id,
  tm.tenant_id,
  t.slug
FROM tenant_members tm
INNER JOIN tenants t ON t.id = tm.tenant_id
WHERE tm.estado = 'activo' AND t.estado = 'activo';

GRANT SELECT ON vw_user_tenant_access TO authenticated;
```

- [ ] **Step 4: Test middleware**

```typescript
// tests/integration/middleware.test.ts
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { createTestUser, addUserToTenant } from '@/lib/test-helpers';

describe('middleware tenant access', () => {
  it('redirects unauthenticated to /login', async () => {
    const req = new NextRequest('http://localhost/idex/clientes');
    const res = await middleware(req);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('redirects to /seleccionar-empresa if user not member', async () => {
    const user = await createTestUser();
    // user no es member de 'idex'
    const req = new NextRequest('http://localhost/idex/clientes', {
      headers: { cookie: `sb-access-token=${user.token}` },
    });
    const res = await middleware(req);
    expect(res.headers.get('location')).toContain('/seleccionar-empresa');
  });

  it('passes if user is member', async () => {
    const user = await createTestUser();
    await addUserToTenant(user.id, 'idex', 'Comercial');
    const req = new NextRequest('http://localhost/idex/clientes', {
      headers: { cookie: `sb-access-token=${user.token}` },
    });
    const res = await middleware(req);
    expect(res.status).not.toBe(307);
    expect(res.headers.get('x-tenant-slug')).toBe('idex');
  });
});
```

- [ ] **Step 5: Run + commit**

```bash
pnpm db:migrate
pnpm test:integration tests/integration/middleware.test.ts
git add src/middleware.ts src/lib/auth/tenant-access.ts supabase/migrations/0006_jwt_custom_claims.sql tests/integration/middleware.test.ts
git commit -m "feat(multiempresa): add tenant access middleware with view-based check"
```

---

## Task 2: JWT custom claim hook + función `current_tenant_id()`

**Estimado**: 2h
**Agente**: `schema-builder` + `security-engineer`
**Files:**

- Modify: `supabase/migrations/0006_jwt_custom_claims.sql`
- Create: `src/lib/db/rls-helpers.sql` (referencia)

- [ ] **Step 1: Función custom_access_token_hook**

```sql
-- supabase/migrations/0006_jwt_custom_claims.sql (parte 2, hook)

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  current_tenant uuid;
  user_id uuid;
BEGIN
  user_id := (event->>'user_id')::uuid;

  -- Tomar el current_tenant_id de user_metadata
  SELECT (event->'user_metadata'->>'current_tenant_id')::uuid INTO current_tenant;

  -- Validar que el user efectivamente es member del tenant que dice
  IF current_tenant IS NOT NULL THEN
    PERFORM 1
    FROM tenant_members
    WHERE user_id = user_id
      AND tenant_id = current_tenant
      AND estado = 'activo';
    IF NOT FOUND THEN
      current_tenant := NULL;  -- ignorar claim inválido
    END IF;
  END IF;

  IF current_tenant IS NOT NULL THEN
    event := jsonb_set(event, '{claims,current_tenant_id}', to_jsonb(current_tenant::text));
  END IF;

  RETURN event;
END;
$$;

-- Permitir a Supabase Auth invocarlo
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;
```

- [ ] **Step 2: Habilitar el hook en Supabase config**

```toml
# supabase/config.toml (agregar sección)
[auth.hook.custom_access_token]
enabled = true
uri = "pg-functions://postgres/public/custom_access_token_hook"
```

- [ ] **Step 3: Helper SQL para policies (queda para reusar en futuros módulos)**

```sql
-- src/lib/db/rls-helpers.sql (referencia, no se ejecuta acá; los módulos lo importan)

-- Función para obtener tenant del JWT
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() ->> 'current_tenant_id')::uuid;
$$;
```

Pero como esta función se usa en muchas migrations futuras, la creamos ahora:

```sql
-- añadir a 0006_jwt_custom_claims.sql

CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() ->> 'current_tenant_id')::uuid;
$$;

GRANT EXECUTE ON FUNCTION current_tenant_id() TO authenticated;
```

- [ ] **Step 4: Test del claim**

```typescript
// tests/integration/jwt-claim.test.ts
import { describe, it, expect } from 'vitest';
import { createSupabaseAdmin } from '@/lib/test-helpers/supabase-admin';

describe('JWT custom claim', () => {
  it('injects current_tenant_id when user_metadata has it', async () => {
    const admin = createSupabaseAdmin();
    const {
      data: { user },
    } = await admin.auth.admin.createUser({
      email: 'jwt-test@example.com',
      user_metadata: { current_tenant_id: '00000000-0000-0000-0000-000000000001' },
      email_confirm: true,
    });

    // Sign in to get session
    const {
      data: { session },
    } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'jwt-test@example.com',
    });

    // Decode JWT (no verify, just inspect)
    const payload = JSON.parse(
      Buffer.from(session!.access_token.split('.')[1], 'base64').toString()
    );

    // No va a estar porque no es member del tenant — el hook lo elimina
    expect(payload.current_tenant_id).toBeUndefined();
  });

  // Un test más completo que crea user + tenant + member va al final, después de B.2
});
```

- [ ] **Step 5: Commit**

```bash
pnpm db:migrate
git add supabase/migrations/0006_jwt_custom_claims.sql supabase/config.toml tests/integration/jwt-claim.test.ts
git commit -m "feat(multiempresa): add JWT custom claim hook and current_tenant_id() helper"
```

---

## Task 3: Pantalla `/seleccionar-empresa`

**Estimado**: 2h
**Agente**: `frontend-developer`
**Files:**

- Create: `src/app/(app)/seleccionar-empresa/page.tsx`
- Create: `src/components/modules/auth/TenantPicker.tsx`
- Create: `src/server/actions/seleccionar-empresa.ts`

- [ ] **Step 1: Server Action `seleccionarEmpresa`**

```typescript
// src/server/actions/seleccionar-empresa.ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { userBelongsToTenant } from '@/lib/auth/tenant-access';

export async function seleccionarEmpresa(slug: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const access = await userBelongsToTenant(user.id, slug);
  if (!access) {
    return { success: false as const, error: 'no-access' };
  }

  // Persistir en user_metadata para que el JWT la incluya en próximos refresh
  await supabase.auth.updateUser({
    data: { current_tenant_id: access.tenantId, current_tenant_slug: slug },
  });

  // Forzar refresh de la sesión para que el nuevo JWT tenga el claim
  await supabase.auth.refreshSession();

  redirect(`/${slug}`);
}
```

- [ ] **Step 2: Page que carga tenants del usuario**

```typescript
// src/app/(app)/seleccionar-empresa/page.tsx
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { tenants, tenantMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { TenantPicker } from '@/components/modules/auth/TenantPicker';

export default async function SeleccionarEmpresaPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const memberships = await db
    .select({ tenant: tenants, rol: tenantMembers.rolNombre })
    .from(tenantMembers)
    .innerJoin(tenants, eq(tenants.id, tenantMembers.tenantId))
    .where(
      and(
        eq(tenantMembers.userId, user.id),
        eq(tenantMembers.estado, 'activo'),
        eq(tenants.estado, 'activo'),
      )
    );

  // Si solo tiene una empresa, ir directo
  if (memberships.length === 1) {
    redirect(`/${memberships[0].tenant.slug}`);
  }

  // Si no tiene ninguna: mostrar mensaje
  if (memberships.length === 0) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold">No tienes empresas asignadas</h1>
          <p className="text-muted-foreground mt-2">Contactá al administrador para que te invite.</p>
        </div>
      </div>
    );
  }

  return <TenantPicker memberships={memberships} />;
}
```

- [ ] **Step 3: TenantPicker component**

```typescript
// src/components/modules/auth/TenantPicker.tsx
'use client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { seleccionarEmpresa } from '@/server/actions/seleccionar-empresa';
import { useTransition } from 'react';
import type { Tenant } from '@/lib/db/schema';

type Membership = { tenant: Tenant; rol: string };

export function TenantPicker({ memberships }: { memberships: Membership[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl font-bold mb-6 text-center">Seleccioná tu empresa</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {memberships.map(({ tenant, rol }) => (
            <Card key={tenant.id} className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                {tenant.logoUrl && <img src={tenant.logoUrl} alt="" className="h-12 mb-2" />}
                <CardTitle>{tenant.razonSocial}</CardTitle>
                <CardDescription>Rol: {rol}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  disabled={pending}
                  onClick={() => startTransition(() => seleccionarEmpresa(tenant.slug))}
                >
                  Entrar a /{tenant.slug}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Smoke + commit**

Manual: login con un user que pertenezca a 2 tenants, verificar que aparece picker. Click en una → redirige a `/[slug]`.

```bash
git add src/app/\(app\)/seleccionar-empresa/page.tsx src/components/modules/auth/TenantPicker.tsx src/server/actions/seleccionar-empresa.ts
git commit -m "feat(multiempresa): add tenant picker page and selection action"
```

---

## Task 4: Helper `getCurrentTenant()` + layout `/[companySlug]`

**Estimado**: 2h
**Agente**: `backend-developer`
**Files:**

- Create: `src/lib/auth/current-tenant.ts`
- Create: `src/app/(app)/[companySlug]/layout.tsx`
- Modify: `src/app/(app)/seleccionar-empresa/page.tsx` (recordar última empresa al login)

- [ ] **Step 1: Helper getCurrentTenant**

```typescript
// src/lib/auth/current-tenant.ts
import { headers } from 'next/headers';
import { db } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { cache } from 'react';

export const getCurrentTenant = cache(async () => {
  const h = await headers();
  const tenantId = h.get('x-tenant-id');
  const slug = h.get('x-tenant-slug');
  if (!tenantId || !slug) {
    throw new Error('getCurrentTenant called outside of tenant route');
  }
  const [t] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!t) throw new Error(`Tenant not found: ${tenantId}`);
  return t;
});
```

- [ ] **Step 2: Layout `/[companySlug]`**

```typescript
// src/app/(app)/[companySlug]/layout.tsx
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { notFound } from 'next/navigation';
import { TenantHeader } from '@/components/shared/TenantHeader';
import { TenantSidebar } from '@/components/shared/TenantSidebar';

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  let tenant;
  try {
    tenant = await getCurrentTenant();
  } catch {
    notFound();
  }
  if (tenant.slug !== companySlug) notFound();

  return (
    <div className="flex min-h-screen">
      <TenantSidebar tenant={tenant} />
      <div className="flex-1 flex flex-col">
        <TenantHeader tenant={tenant} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: TenantHeader + TenantSidebar (esqueleto, se completa en cada módulo)**

```typescript
// src/components/shared/TenantSidebar.tsx
import type { Tenant } from '@/lib/db/schema';
import Link from 'next/link';

const NAV = [
  { href: '', label: 'Dashboard' },
  { href: '/clientes', label: 'Clientes' },
  { href: '/productos', label: 'Productos' },
  { href: '/cotizaciones', label: 'Cotizaciones' },
  { href: '/ordenes', label: 'Órdenes de compra' },
  { href: '/inventario', label: 'Inventario' },
  { href: '/guias', label: 'Guías' },
  { href: '/facturas', label: 'Facturas' },
  { href: '/credito', label: 'Crédito' },
  { href: '/reportes', label: 'Reportes' },
];

export function TenantSidebar({ tenant }: { tenant: Tenant }) {
  return (
    <aside className="w-60 border-r bg-muted/30 p-4">
      <div className="mb-6">
        {tenant.logoUrl ? (
          <img src={tenant.logoUrl} alt={tenant.razonSocial} className="h-10" />
        ) : (
          <span className="text-lg font-bold">{tenant.razonSocial}</span>
        )}
      </div>
      <nav className="space-y-1">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={`/${tenant.slug}${item.href}`}
            className="block px-3 py-2 rounded text-sm hover:bg-muted"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 4: Recordar última empresa al login**

Modificar `src/app/(auth)/login/callback/route.ts` (creado por B.2 en realidad — acá dejamos un TODO):

```typescript
// (en B.2 task de magic link callback)
// Después de auth exitoso:
const lastTenant = user.user_metadata?.current_tenant_slug;
if (lastTenant) {
  return redirect(`/${lastTenant}`);
}
return redirect('/seleccionar-empresa');
```

- [ ] **Step 5: Test E2E cross-tenant**

```typescript
// tests/e2e/multitenant-isolation.spec.ts
import { test, expect } from '@playwright/test';

test('user of idex cannot access /agroalves', async ({ page, browserName }) => {
  // Login como user de Idex
  await loginAs(page, 'idex-user@test.local');

  // Intentar /agroalves/clientes
  await page.goto('/agroalves/clientes');

  // Debe redirigir a /seleccionar-empresa
  await expect(page).toHaveURL(/seleccionar-empresa/);
});
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/current-tenant.ts src/app/\(app\)/\[companySlug\]/ src/components/shared/Tenant*.tsx tests/e2e/multitenant-isolation.spec.ts
git commit -m "feat(multiempresa): add tenant layout with sidebar nav and access guard"
```

---

## Done criteria del módulo

- [ ] Middleware redirige user no-member a `/seleccionar-empresa` cuando intenta `/{otro-slug}`.
- [ ] User con un solo tenant entra directo (sin picker).
- [ ] Cambio de tenant actualiza JWT (verificable: decode access_token y ver `current_tenant_id`).
- [ ] Test E2E pasa: cross-tenant access bloqueado.
- [ ] Función SQL `current_tenant_id()` retorna el UUID correcto durante una sesión.

## Notas

- **Performance del middleware**: el query a `vw_user_tenant_access` se ejecuta en cada request a `/[slug]/*`. Si crece la latencia, hacer cache en cookie con TTL 60s.
- El claim del JWT se actualiza al **refresh** de sesión, no inmediato. Por eso `seleccionarEmpresa` llama a `refreshSession()` explícitamente.
- **Defensa en profundidad**: este módulo controla acceso a la URL, pero RLS es la capa real. Cada tabla en módulos siguientes DEBE tener policies usando `current_tenant_id()`.
