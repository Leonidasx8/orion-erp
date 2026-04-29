# B.2 — Autenticación y Roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` o `superpowers:executing-plans`.

**Goal:** Login con magic link, MFA TOTP obligatorio para Superadmins, sistema RBAC dinámico con Casbin + Supabase RLS combinados, vista `productos_publicos` que oculta costos a roles sin permiso, UI editable de roles y permisos.

**Architecture:** Casbin enforcer con adapter Postgres (`casbin_rule` table) + 3 roles base sembrados al crear tenant + UI matriz de permisos editable por Tenant Superadmin. RLS sigue siendo la primera línea de defensa (separación tenant); Casbin es la segunda (acción permitida).

**Tech Stack:** Supabase Auth (magic link, MFA TOTP), `casbin` + `node-casbin-pg-adapter`, react-hook-form, shadcn/ui.

**Estimación**: 20h — 8 tareas.

**Dependencias upstream**: B.0 + B.1.
**Dependencias downstream**: TODOS los módulos restantes (B.3, B.4, B.5...).

---

## File structure

```
supabase/migrations/
├── 0007_roles_permisos_schema.sql
├── 0008_seed_permisos_definidos.sql
├── 0009_casbin_rule.sql
├── 0010_seed_roles_base.sql                  # Trigger: al crear tenant, sembrar 3 roles
└── 0011_productos_publicos_view.sql          # vista (B.4 la consume)

src/lib/db/schema/
├── roles.ts
├── permisos.ts
└── audit-permisos.ts

src/lib/auth/
├── casbin.ts                                  # enforcer + helpers
├── permissions-store.ts                       # zustand client
├── use-permission.ts                          # hook UI
└── require-permission.ts                      # server helper

src/app/(auth)/
├── login/page.tsx
├── login/mfa/page.tsx
├── login/aceptar-invitacion/page.tsx
└── login/callback/route.ts

src/app/(app)/[companySlug]/admin/
├── usuarios/page.tsx
├── usuarios/[id]/page.tsx
├── usuarios/invitar/page.tsx
├── roles/page.tsx
└── roles/nuevo/page.tsx

src/server/actions/
├── auth.ts                                    # invitar, suspender
├── roles.ts                                   # CRUD roles + permisos
└── mfa.ts                                     # enroll, verify
```

---

## Task 1: Schema roles, permisos, casbin_rule, audit + RLS

**Estimado**: 3h
**Agente**: `schema-builder`
**Files:**

- Create: `supabase/migrations/0007_roles_permisos_schema.sql`
- Create: `supabase/migrations/0009_casbin_rule.sql`
- Create: `src/lib/db/schema/roles.ts`
- Create: `src/lib/db/schema/permisos.ts`
- Create: `src/lib/db/schema/audit-permisos.ts`

- [ ] **Step 1: Schema SQL completo**

```sql
-- supabase/migrations/0007_roles_permisos_schema.sql
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  es_predefinido boolean NOT NULL DEFAULT false,
  descripcion text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nombre)
);
CREATE INDEX roles_tenant_idx ON roles(tenant_id);

CREATE TABLE permisos_definidos (
  codigo text PRIMARY KEY,
  modulo text NOT NULL,
  accion text NOT NULL,
  descripcion text NOT NULL,
  es_sensible boolean NOT NULL DEFAULT false
);

CREATE TABLE rol_permisos (
  rol_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  permiso_codigo text REFERENCES permisos_definidos(codigo) ON DELETE CASCADE,
  PRIMARY KEY (rol_id, permiso_codigo)
);

CREATE TABLE audit_permisos (
  id bigserial PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id),
  user_id uuid REFERENCES auth.users(id),
  accion text NOT NULL,
  rol_id uuid,
  permiso_codigo text,
  detalles jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_permisos_tenant_idx ON audit_permisos(tenant_id, created_at DESC);

-- RLS: roles y rol_permisos solo visibles al tenant
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_tenant_isolation" ON roles FOR ALL
USING (tenant_id = current_tenant_id() OR tenant_id IS NULL);

ALTER TABLE rol_permisos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rol_permisos_via_rol" ON rol_permisos FOR ALL
USING (rol_id IN (SELECT id FROM roles WHERE tenant_id = current_tenant_id() OR tenant_id IS NULL));

-- permisos_definidos: catálogo global, lectura para todos los autenticados
ALTER TABLE permisos_definidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permisos_definidos_read_all" ON permisos_definidos FOR SELECT
TO authenticated USING (true);

ALTER TABLE audit_permisos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_permisos_tenant_isolation" ON audit_permisos FOR SELECT
USING (tenant_id = current_tenant_id());
```

- [ ] **Step 2: Schema casbin_rule**

```sql
-- supabase/migrations/0009_casbin_rule.sql
CREATE TABLE casbin_rule (
  id bigserial PRIMARY KEY,
  ptype varchar(100) NOT NULL,
  v0 varchar(255),
  v1 varchar(255),
  v2 varchar(255),
  v3 varchar(255),
  v4 varchar(255),
  v5 varchar(255)
);
CREATE INDEX casbin_rule_idx ON casbin_rule(ptype, v0, v1);

-- Solo accesible por service_role (Casbin enforcer corre del lado server)
ALTER TABLE casbin_rule ENABLE ROW LEVEL SECURITY;
-- Sin policies: usuarios autenticados NO pueden leer/escribir directo
```

- [ ] **Step 3: Drizzle schemas**

```typescript
// src/lib/db/schema/roles.ts
import { pgTable, uuid, text, timestamptz, boolean, primaryKey } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  esPredefinido: boolean('es_predefinido').notNull().default(false),
  descripcion: text('descripcion'),
  createdBy: uuid('created_by'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
});

export const rolPermisos = pgTable(
  'rol_permisos',
  {
    rolId: uuid('rol_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permisoCodigo: text('permiso_codigo').notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.rolId, t.permisoCodigo] }) })
);

export type Rol = typeof roles.$inferSelect;
export type NewRol = typeof roles.$inferInsert;
```

```typescript
// src/lib/db/schema/permisos.ts
import { pgTable, text, boolean } from 'drizzle-orm/pg-core';

export const permisosDefinidos = pgTable('permisos_definidos', {
  codigo: text('codigo').primaryKey(),
  modulo: text('modulo').notNull(),
  accion: text('accion').notNull(),
  descripcion: text('descripcion').notNull(),
  esSensible: boolean('es_sensible').notNull().default(false),
});

export type PermisoDefinido = typeof permisosDefinidos.$inferSelect;
```

- [ ] **Step 4: Test RLS de roles**

```typescript
// tests/integration/auth/rls-roles.test.ts
import { describe, it, expect } from 'vitest';
import { createClientForUser } from '@/lib/test-helpers/supabase';
import { setupTenantsAB } from '@/lib/test-helpers/setup';

describe('roles RLS', () => {
  it('user of tenant A cannot read roles of tenant B', async () => {
    const { userA, tenantB } = await setupTenantsAB();
    const supA = await createClientForUser(userA);
    const { data } = await supA.from('roles').select('*').eq('tenant_id', tenantB.id);
    expect(data).toHaveLength(0);
  });
});
```

- [ ] **Step 5: Run + commit**

```bash
pnpm db:migrate
pnpm test:integration tests/integration/auth/rls-roles.test.ts
git add supabase/migrations/0007_roles_permisos_schema.sql supabase/migrations/0009_casbin_rule.sql src/lib/db/schema/roles.ts src/lib/db/schema/permisos.ts tests/integration/auth/rls-roles.test.ts
git commit -m "feat(auth): add roles, permisos, casbin_rule schemas with RLS"
```

---

## Task 2: Seed catálogo `permisos_definidos`

**Estimado**: 1h
**Agente**: `schema-builder`
**Files:**

- Create: `supabase/migrations/0008_seed_permisos_definidos.sql`

- [ ] **Step 1: Migration con todos los permisos del brain**

Usar el catálogo completo de `05-rbac-casbin.md` líneas 84-150. Resumido:

```sql
-- supabase/migrations/0008_seed_permisos_definidos.sql

INSERT INTO permisos_definidos (codigo, modulo, accion, descripcion, es_sensible) VALUES
  ('tenants.crear', 'tenants', 'crear', 'Crear nuevos tenants', true),
  ('tenants.suspender', 'tenants', 'suspender', 'Suspender un tenant', true),
  ('clientes.ver', 'clientes', 'ver', 'Ver lista de clientes', false),
  ('clientes.crear', 'clientes', 'crear', 'Crear cliente', false),
  ('clientes.editar', 'clientes', 'editar', 'Editar cliente existente', false),
  ('clientes.eliminar', 'clientes', 'eliminar', 'Eliminar cliente', true),
  ('clientes.exportar', 'clientes', 'exportar', 'Exportar lista a Excel', false),
  ('productos.ver', 'productos', 'ver', 'Ver catálogo', false),
  ('productos.crear', 'productos', 'crear', 'Crear producto', false),
  ('productos.editar', 'productos', 'editar', 'Editar producto', false),
  ('productos.eliminar', 'productos', 'eliminar', 'Eliminar producto', true),
  ('productos.ver_costo', 'productos', 'ver_costo', 'Ver precio de compra (costo)', true),
  ('productos.editar_margen', 'productos', 'editar_margen', 'Cambiar margen mínimo', true),
  ('productos.importar', 'productos', 'importar', 'Importar masivamente desde Excel', false),
  ('cotizaciones.ver', 'cotizaciones', 'ver', 'Ver cotizaciones', false),
  ('cotizaciones.crear', 'cotizaciones', 'crear', 'Crear cotización', false),
  ('cotizaciones.editar', 'cotizaciones', 'editar', 'Editar cotización borrador', false),
  ('cotizaciones.aprobar', 'cotizaciones', 'aprobar', 'Aprobar cotización', false),
  ('cotizaciones.eliminar', 'cotizaciones', 'eliminar', 'Eliminar cotización', true),
  ('cotizaciones.cambiar_margen', 'cotizaciones', 'cambiar_margen', 'Modificar margen en línea', false),
  ('cotizaciones.descuento_excepcional', 'cotizaciones', 'descuento_excepcional', 'Aplicar descuento mayor al estándar', true),
  ('ordenes.ver', 'ordenes', 'ver', 'Ver órdenes de compra', false),
  ('ordenes.crear', 'ordenes', 'crear', 'Crear orden de compra', false),
  ('ordenes.aprobar', 'ordenes', 'aprobar', 'Aprobar orden', false),
  ('inventario.ver', 'inventario', 'ver', 'Ver kardex', false),
  ('inventario.ajuste_manual', 'inventario', 'ajuste_manual', 'Ajustar stock manualmente', true),
  ('guias.ver', 'guias', 'ver', 'Ver guías', false),
  ('guias.crear', 'guias', 'crear', 'Crear guía de remisión', false),
  ('guias.anular', 'guias', 'anular', 'Anular guía', true),
  ('facturas.ver', 'facturas', 'ver', 'Ver facturas', false),
  ('facturas.emitir', 'facturas', 'emitir', 'Emitir factura/boleta', false),
  ('facturas.anular', 'facturas', 'anular', 'Anular factura (NC)', true),
  ('facturas.reenviar_sunat', 'facturas', 'reenviar_sunat', 'Forzar reenvío a SUNAT', true),
  ('credito.ver', 'credito', 'ver', 'Ver cuentas por cobrar', false),
  ('credito.otorgar', 'credito', 'otorgar', 'Otorgar/modificar línea de crédito', true),
  ('credito.registrar_pago', 'credito', 'registrar_pago', 'Registrar pago de cliente', false),
  ('reportes.ver', 'reportes', 'ver', 'Ver dashboard y reportes', false),
  ('reportes.exportar', 'reportes', 'exportar', 'Exportar reportes a Excel', false),
  ('admin.usuarios.ver', 'admin', 'usuarios.ver', 'Ver usuarios del tenant', false),
  ('admin.usuarios.invitar', 'admin', 'usuarios.invitar', 'Invitar nuevos usuarios', true),
  ('admin.usuarios.suspender', 'admin', 'usuarios.suspender', 'Suspender usuarios', true),
  ('admin.roles.ver', 'admin', 'roles.ver', 'Ver roles y permisos', false),
  ('admin.roles.editar', 'admin', 'roles.editar', 'Crear/editar roles y permisos', true),
  ('admin.config.editar', 'admin', 'config.editar', 'Editar configuración del tenant', true)
ON CONFLICT (codigo) DO UPDATE SET
  modulo = EXCLUDED.modulo,
  accion = EXCLUDED.accion,
  descripcion = EXCLUDED.descripcion,
  es_sensible = EXCLUDED.es_sensible;
```

- [ ] **Step 2: Seed roles base on tenant creation (trigger SQL)**

```sql
-- supabase/migrations/0010_seed_roles_base.sql

-- Función que siembra los 3 roles base + asignación de permisos
CREATE OR REPLACE FUNCTION seed_roles_base_para_tenant(p_tenant_id uuid, p_creator uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  rol_super uuid;
  rol_comercial uuid;
  rol_facturacion uuid;
BEGIN
  -- Superadmin: TODOS los permisos del tenant
  INSERT INTO roles (tenant_id, nombre, es_predefinido, descripcion, created_by)
  VALUES (p_tenant_id, 'Superadmin', true, 'Acceso total al tenant', p_creator)
  RETURNING id INTO rol_super;

  INSERT INTO rol_permisos (rol_id, permiso_codigo)
  SELECT rol_super, codigo FROM permisos_definidos
  WHERE modulo NOT IN ('tenants');  -- Superadmin del tenant NO crea otros tenants

  -- Comercial
  INSERT INTO roles (tenant_id, nombre, es_predefinido, descripcion, created_by)
  VALUES (p_tenant_id, 'Comercial', true, 'Vendedores: cotizaciones y clientes', p_creator)
  RETURNING id INTO rol_comercial;

  INSERT INTO rol_permisos (rol_id, permiso_codigo) VALUES
    (rol_comercial, 'clientes.ver'), (rol_comercial, 'clientes.crear'),
    (rol_comercial, 'clientes.editar'), (rol_comercial, 'clientes.exportar'),
    (rol_comercial, 'productos.ver'), (rol_comercial, 'productos.importar'),
    (rol_comercial, 'cotizaciones.ver'), (rol_comercial, 'cotizaciones.crear'),
    (rol_comercial, 'cotizaciones.editar'),
    (rol_comercial, 'ordenes.ver'),
    (rol_comercial, 'inventario.ver'),
    (rol_comercial, 'reportes.ver');

  -- Facturación
  INSERT INTO roles (tenant_id, nombre, es_predefinido, descripcion, created_by)
  VALUES (p_tenant_id, 'Facturación', true, 'Emisión SUNAT y CxC', p_creator)
  RETURNING id INTO rol_facturacion;

  INSERT INTO rol_permisos (rol_id, permiso_codigo) VALUES
    (rol_facturacion, 'clientes.ver'),
    (rol_facturacion, 'productos.ver'), (rol_facturacion, 'productos.ver_costo'),
    (rol_facturacion, 'cotizaciones.ver'), (rol_facturacion, 'cotizaciones.aprobar'),
    (rol_facturacion, 'facturas.ver'), (rol_facturacion, 'facturas.emitir'),
    (rol_facturacion, 'facturas.anular'), (rol_facturacion, 'facturas.reenviar_sunat'),
    (rol_facturacion, 'guias.ver'), (rol_facturacion, 'guias.crear'), (rol_facturacion, 'guias.anular'),
    (rol_facturacion, 'credito.ver'), (rol_facturacion, 'credito.otorgar'), (rol_facturacion, 'credito.registrar_pago'),
    (rol_facturacion, 'inventario.ver'), (rol_facturacion, 'inventario.ajuste_manual'),
    (rol_facturacion, 'reportes.ver'), (rol_facturacion, 'reportes.exportar');
END;
$$;

GRANT EXECUTE ON FUNCTION seed_roles_base_para_tenant(uuid, uuid) TO service_role;
```

- [ ] **Step 3: Modificar `crearTenant` (B.0 task 4) para invocar la función**

Hay que volver al Server Action de B.0 y agregar dentro de la transacción:

```typescript
// dentro de db.transaction en crearTenant (B.0)
await tx.execute(sql`SELECT seed_roles_base_para_tenant(${t.id}, ${user.id})`);
```

- [ ] **Step 4: Commit**

```bash
pnpm db:migrate
git add supabase/migrations/0008_seed_permisos_definidos.sql supabase/migrations/0010_seed_roles_base.sql src/server/actions/tenants.ts
git commit -m "feat(auth): seed permisos catalog and roles base function"
```

---

## Task 3: Casbin enforcer con adapter Postgres

**Estimado**: 3h
**Agente**: `security-engineer`
**Files:**

- Create: `src/lib/auth/casbin/model.conf`
- Create: `src/lib/auth/casbin/index.ts`
- Create: `src/lib/auth/casbin/adapter.ts`
- Create: `src/lib/auth/casbin/sync.ts`

- [ ] **Step 1: Casbin model**

```ini
; src/lib/auth/casbin/model.conf
[request_definition]
r = sub, dom, obj

[policy_definition]
p = sub, dom, obj

[role_definition]
g = _, _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && r.obj == p.obj
```

Modelo: subject (user_id), domain (tenant_id), object (permiso codigo). Roles vinculan user → rol dentro de un dominio.

- [ ] **Step 2: Adapter Postgres**

```typescript
// src/lib/auth/casbin/adapter.ts
import { PostgresAdapter } from 'casbin-pg-adapter';

let adapter: PostgresAdapter | null = null;

export async function getAdapter() {
  if (!adapter) {
    adapter = await PostgresAdapter.newAdapter({
      connectionString: process.env.DATABASE_URL!,
      // Tabla casbin_rule ya existe (migration 0009)
    });
  }
  return adapter;
}
```

- [ ] **Step 3: Enforcer singleton**

```typescript
// src/lib/auth/casbin/index.ts
import { newEnforcer, type Enforcer } from 'casbin';
import { getAdapter } from './adapter';
import path from 'path';

let enforcer: Enforcer | null = null;
let lastReload = 0;
const RELOAD_TTL_MS = 30_000;

export async function getEnforcer(): Promise<Enforcer> {
  const now = Date.now();
  if (!enforcer) {
    const adapter = await getAdapter();
    enforcer = await newEnforcer(
      path.join(process.cwd(), 'src/lib/auth/casbin/model.conf'),
      adapter
    );
    lastReload = now;
  }
  if (now - lastReload > RELOAD_TTL_MS) {
    await enforcer.loadPolicy();
    lastReload = now;
  }
  return enforcer;
}

export async function userCan(userId: string, tenantId: string, permiso: string): Promise<boolean> {
  const e = await getEnforcer();
  return e.enforce(userId, tenantId, permiso);
}

export async function reloadPolicy(): Promise<void> {
  if (enforcer) await enforcer.loadPolicy();
  lastReload = Date.now();
}
```

- [ ] **Step 4: Sync DB ↔ Casbin (al cambiar rol_permisos)**

```typescript
// src/lib/auth/casbin/sync.ts
import { db } from '@/lib/db/client';
import { roles, rolPermisos, tenantMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getEnforcer, reloadPolicy } from '.';

/**
 * Reescribe TODAS las policies de Casbin para un tenant a partir del estado de la DB.
 * Llamar después de cambios en roles/rol_permisos/tenant_members.
 */
export async function syncTenantToCasbin(tenantId: string) {
  const e = await getEnforcer();

  // 1. Borrar policies del tenant
  await e.deleteDomain(tenantId);

  // 2. Roles → permisos (p, rol_id, tenant_id, permiso_codigo)
  const rolesPerms = await db
    .select({
      rolId: roles.id,
      tenantId: roles.tenantId,
      permisoCodigo: rolPermisos.permisoCodigo,
    })
    .from(rolPermisos)
    .innerJoin(roles, eq(rolPermisos.rolId, roles.id))
    .where(eq(roles.tenantId, tenantId));

  for (const rp of rolesPerms) {
    await e.addPolicy(rp.rolId, rp.tenantId, rp.permisoCodigo);
  }

  // 3. Members → rol (g, user_id, rol_id, tenant_id)
  // tenant_members guarda rol_nombre — necesitamos mapearlo a rol_id
  const members = await db
    .select({
      userId: tenantMembers.userId,
      tenantId: tenantMembers.tenantId,
      rolId: roles.id,
    })
    .from(tenantMembers)
    .innerJoin(
      roles,
      and(eq(tenantMembers.tenantId, roles.tenantId), eq(tenantMembers.rolNombre, roles.nombre))
    )
    .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.estado, 'activo')));

  for (const m of members) {
    await e.addGroupingPolicy(m.userId, m.rolId, m.tenantId);
  }

  await e.savePolicy();
  await reloadPolicy();
}
```

- [ ] **Step 5: Test enforcer**

```typescript
// tests/unit/auth/casbin-enforce.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { userCan } from '@/lib/auth/casbin';
import { syncTenantToCasbin } from '@/lib/auth/casbin/sync';
import { setupTenantWithRoles } from '@/lib/test-helpers';

describe('casbin enforce', () => {
  let userId: string, tenantId: string, otherTenantId: string;

  beforeAll(async () => {
    const setup = await setupTenantWithRoles({
      memberRol: 'Comercial',
    });
    userId = setup.userId;
    tenantId = setup.tenantId;
    otherTenantId = setup.otherTenantId;
    await syncTenantToCasbin(tenantId);
  });

  it('Comercial puede crear cotización', async () => {
    expect(await userCan(userId, tenantId, 'cotizaciones.crear')).toBe(true);
  });

  it('Comercial NO puede ver costo de productos', async () => {
    expect(await userCan(userId, tenantId, 'productos.ver_costo')).toBe(false);
  });

  it('Comercial NO puede crear cotización en otro tenant', async () => {
    expect(await userCan(userId, otherTenantId, 'cotizaciones.crear')).toBe(false);
  });
});
```

- [ ] **Step 6: Commit**

```bash
pnpm test tests/unit/auth/casbin-enforce.test.ts
git add src/lib/auth/casbin/ tests/unit/auth/casbin-enforce.test.ts
git commit -m "feat(auth): add Casbin enforcer with Postgres adapter and sync"
```

---

## Task 4: Helpers `requirePermission()` server + `usePermission()` cliente

**Estimado**: 2h
**Agente**: `security-engineer`
**Files:**

- Create: `src/lib/auth/require-permission.ts`
- Create: `src/lib/auth/permissions-store.ts`
- Create: `src/lib/auth/use-permission.ts`
- Create: `src/components/shared/PermissionGate.tsx`

- [ ] **Step 1: Server helper**

```typescript
// src/lib/auth/require-permission.ts
import { createClient } from '@/lib/supabase/server';
import { getCurrentTenant } from './current-tenant';
import { userCan } from './casbin';
import { ForbiddenError } from '@/lib/types';

export async function requirePermission(permiso: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ForbiddenError(permiso);
  const tenant = await getCurrentTenant();
  const allowed = await userCan(user.id, tenant.id, permiso);
  if (!allowed) throw new ForbiddenError(permiso);
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
```

- [ ] **Step 2: Cliente store**

```typescript
// src/lib/auth/permissions-store.ts
'use client';
import { create } from 'zustand';

type State = { permisos: Set<string> };

export const usePermissionsStore = create<State>(() => ({ permisos: new Set() }));

export function setPermisos(permisos: string[]) {
  usePermissionsStore.setState({ permisos: new Set(permisos) });
}
```

- [ ] **Step 3: Hook + Provider**

```typescript
// src/lib/auth/use-permission.ts
'use client';
import { usePermissionsStore } from './permissions-store';

export function usePermission(permiso: string): boolean {
  return usePermissionsStore((s) => s.permisos.has(permiso));
}

export function useAnyPermission(permisos: string[]): boolean {
  return usePermissionsStore((s) => permisos.some((p) => s.permisos.has(p)));
}

export function useAllPermissions(permisos: string[]): boolean {
  return usePermissionsStore((s) => permisos.every((p) => s.permisos.has(p)));
}
```

```typescript
// src/components/shared/PermissionGate.tsx
'use client';
import { usePermission } from '@/lib/auth/use-permission';

export function PermissionGate({ permiso, children, fallback }: {
  permiso: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const allowed = usePermission(permiso);
  return allowed ? <>{children}</> : <>{fallback ?? null}</>;
}
```

- [ ] **Step 4: Cargar permisos al entrar al tenant**

Modificar `src/app/(app)/[companySlug]/layout.tsx` (B.1 task 4):

```typescript
// Agregar dentro del layout (después de getCurrentTenant)
import { db } from '@/lib/db/client';
import { rolPermisos, roles, tenantMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { PermissionsBootstrap } from '@/components/shared/PermissionsBootstrap';

const userPermisos = await db
  .selectDistinct({ codigo: rolPermisos.permisoCodigo })
  .from(tenantMembers)
  .innerJoin(roles, and(
    eq(roles.tenantId, tenantMembers.tenantId),
    eq(roles.nombre, tenantMembers.rolNombre),
  ))
  .innerJoin(rolPermisos, eq(rolPermisos.rolId, roles.id))
  .where(and(
    eq(tenantMembers.userId, user.id),
    eq(tenantMembers.tenantId, tenant.id),
  ));

return (
  <>
    <PermissionsBootstrap permisos={userPermisos.map((p) => p.codigo)} />
    {/* resto del layout */}
  </>
);
```

```typescript
// src/components/shared/PermissionsBootstrap.tsx
'use client';
import { useEffect } from 'react';
import { setPermisos } from '@/lib/auth/permissions-store';

export function PermissionsBootstrap({ permisos }: { permisos: string[] }) {
  useEffect(() => {
    setPermisos(permisos);
  }, [permisos]);
  return null;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/require-permission.ts src/lib/auth/permissions-store.ts src/lib/auth/use-permission.ts src/components/shared/PermissionGate.tsx src/components/shared/PermissionsBootstrap.tsx src/app/\(app\)/\[companySlug\]/layout.tsx
git commit -m "feat(auth): add requirePermission server helper and usePermission hook"
```

---

## Task 5: Login + magic link flow

**Estimado**: 2h
**Agente**: `frontend-developer`
**Files:**

- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/login/callback/route.ts`
- Create: `src/app/(auth)/login/aceptar-invitacion/page.tsx`

- [ ] **Step 1: Login page**

```typescript
// src/app/(auth)/login/page.tsx
'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const enviarMagicLink = async () => {
    setStatus('sending');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/login/callback` },
    });
    setStatus(error ? 'error' : 'sent');
  };

  if (status === 'sent') {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Revisá tu email</h1>
          <p className="text-muted-foreground mt-2">Te enviamos un link a {email}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Iniciar sesión</h1>
        <Input type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button onClick={enviarMagicLink} disabled={status === 'sending' || !email} className="w-full">
          {status === 'sending' ? 'Enviando...' : 'Enviar magic link'}
        </Button>
        {status === 'error' && <p className="text-sm text-red-600">Error al enviar. Reintentá.</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Callback route**

```typescript
// src/app/(auth)/login/callback/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (code) {
    const supabase = createClient();
    await supabase.exchangeCodeForSession(code);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Si user tiene last tenant en metadata, ir directo
    const lastSlug = user?.user_metadata?.current_tenant_slug;
    if (lastSlug) {
      return NextResponse.redirect(new URL(`/${lastSlug}`, url.origin));
    }
    return NextResponse.redirect(new URL('/seleccionar-empresa', url.origin));
  }
  return NextResponse.redirect(new URL('/login?error=invalid', url.origin));
}
```

- [ ] **Step 3: Aceptar invitación (primer login)**

```typescript
// src/app/(auth)/login/aceptar-invitacion/page.tsx
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { tenantMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export default async function AceptarInvitacionPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Marcar membresía pendiente como activa
  await db.update(tenantMembers).set({ estado: 'activo' }).where(eq(tenantMembers.userId, user.id));

  redirect('/seleccionar-empresa');
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(auth\)/
git commit -m "feat(auth): implement magic link login and invitation acceptance"
```

---

## Task 6: MFA TOTP enrollment + verification

**Estimado**: 3h
**Agente**: `security-engineer`
**Files:**

- Create: `src/app/(auth)/login/mfa/page.tsx`
- Create: `src/app/(app)/[companySlug]/admin/perfil/mfa/page.tsx`
- Create: `src/server/actions/mfa.ts`

- [ ] **Step 1: Server actions enroll/verify**

```typescript
// src/server/actions/mfa.ts
'use server';
import { createClient } from '@/lib/supabase/server';

export async function enrollMfa() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
  if (error) return { success: false as const, error: error.message };
  return {
    success: true as const,
    data: { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret },
  };
}

export async function verifyMfaEnroll(factorId: string, code: string) {
  const supabase = createClient();
  const { data: challenge } = await supabase.auth.mfa.challenge({ factorId });
  if (!challenge) return { success: false as const, error: 'challenge-failed' };
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: null };
}

export async function verifyMfaLogin(code: string) {
  const supabase = createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp?.[0];
  if (!factor) return { success: false as const, error: 'no-factor' };
  const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: factor.id });
  if (!challenge) return { success: false as const, error: 'challenge-failed' };
  const { error } = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.id,
    code,
  });
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: null };
}
```

- [ ] **Step 2: UI enrollment (en perfil del Superadmin)**

```typescript
// src/app/(app)/[companySlug]/admin/perfil/mfa/page.tsx
'use client';
import { useState } from 'react';
import { enrollMfa, verifyMfaEnroll } from '@/server/actions/mfa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function MfaSetupPage() {
  const [stage, setStage] = useState<'idle' | 'enrolling' | 'verifying' | 'enabled'>('idle');
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setStage('enrolling');
    const res = await enrollMfa();
    if (!res.success) {
      setError(res.error);
      return setStage('idle');
    }
    setQr(res.data.qr);
    setSecret(res.data.secret);
    setFactorId(res.data.factorId);
    setStage('verifying');
  };

  const verify = async () => {
    if (!factorId) return;
    const res = await verifyMfaEnroll(factorId, code);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setStage('enabled');
  };

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-bold">Activar MFA</h1>
      {stage === 'idle' && <Button onClick={start}>Comenzar</Button>}
      {stage === 'verifying' && (
        <>
          <p className="text-sm">Escaneá el QR con tu app TOTP (Authy, Google Authenticator) y luego ingresá el código de 6 dígitos:</p>
          {qr && <div dangerouslySetInnerHTML={{ __html: qr }} className="border p-4" />}
          {secret && <p className="text-xs font-mono">Secret manual: {secret}</p>}
          <Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} placeholder="123456" />
          <Button onClick={verify}>Verificar</Button>
        </>
      )}
      {stage === 'enabled' && <p className="text-green-600">✓ MFA activado correctamente</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Página /login/mfa para verificación al login**

```typescript
// src/app/(auth)/login/mfa/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { verifyMfaLogin } from '@/server/actions/mfa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function MfaLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const res = await verifyMfaLogin(code);
    if (!res.success) return setError(res.error);
    router.push('/seleccionar-empresa');
  };

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Verificación MFA</h1>
        <Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} placeholder="123456" />
        <Button onClick={submit} className="w-full">Verificar</Button>
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Forzar MFA para Superadmins (middleware o layout)**

En `src/app/(app)/[companySlug]/admin/layout.tsx`:

```typescript
// Verificar que user tiene MFA activado si es Superadmin
const factors = await supabase.auth.mfa.listFactors();
if (!factors.data?.totp?.length || factors.data.totp[0].status !== 'verified') {
  redirect(`/${slug}/admin/perfil/mfa`); // forzar enrollment
}
```

- [ ] **Step 5: Commit**

```bash
git add src/server/actions/mfa.ts src/app/\(auth\)/login/mfa/page.tsx src/app/\(app\)/\[companySlug\]/admin/perfil/
git commit -m "feat(auth): add MFA TOTP enrollment and login verification"
```

---

## Task 7: UI gestión usuarios + invitación

**Estimado**: 3h
**Agente**: `frontend-developer`
**Files:**

- Create: `src/app/(app)/[companySlug]/admin/usuarios/page.tsx`
- Create: `src/app/(app)/[companySlug]/admin/usuarios/invitar/page.tsx`
- Create: `src/app/(app)/[companySlug]/admin/usuarios/[id]/page.tsx`
- Create: `src/server/actions/users.ts`

- [ ] **Step 1: Server actions invitar/suspender**

```typescript
// src/server/actions/users.ts
'use server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-permission';
import { invitarUsuarioMagicLink } from '@/lib/auth/invite';
import { db } from '@/lib/db/client';
import { tenantMembers, roles } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { syncTenantToCasbin } from '@/lib/auth/casbin/sync';
import { revalidatePath } from 'next/cache';

const InvitarSchema = z.object({
  email: z.string().email(),
  nombre: z.string().min(2),
  rolNombre: z.string(),
});

export async function invitarUsuario(input: z.infer<typeof InvitarSchema>) {
  const data = InvitarSchema.parse(input);
  const { user, tenant } = await requirePermission('admin.usuarios.invitar');

  // Verificar que rol existe en el tenant
  const [rol] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.tenantId, tenant.id), eq(roles.nombre, data.rolNombre)))
    .limit(1);
  if (!rol) return { success: false as const, error: 'role-not-found' };

  const newUser = await invitarUsuarioMagicLink(data.email, data.nombre);

  await db.insert(tenantMembers).values({
    userId: newUser.id,
    tenantId: tenant.id,
    rolNombre: data.rolNombre,
    invitadoPor: user.id,
    estado: 'pendiente',
  });

  await syncTenantToCasbin(tenant.id);
  revalidatePath(`/${tenant.slug}/admin/usuarios`);
  return { success: true as const, data: null };
}

export async function cambiarRol(targetUserId: string, nuevoRol: string) {
  const { tenant } = await requirePermission('admin.roles.editar');
  await db
    .update(tenantMembers)
    .set({ rolNombre: nuevoRol })
    .where(and(eq(tenantMembers.userId, targetUserId), eq(tenantMembers.tenantId, tenant.id)));
  await syncTenantToCasbin(tenant.id);
  revalidatePath(`/${tenant.slug}/admin/usuarios`);
  return { success: true as const, data: null };
}

export async function suspenderUsuario(targetUserId: string) {
  const { tenant } = await requirePermission('admin.usuarios.suspender');
  await db
    .update(tenantMembers)
    .set({ estado: 'suspendido' })
    .where(and(eq(tenantMembers.userId, targetUserId), eq(tenantMembers.tenantId, tenant.id)));
  await syncTenantToCasbin(tenant.id);
  revalidatePath(`/${tenant.slug}/admin/usuarios`);
  return { success: true as const, data: null };
}
```

- [ ] **Step 2: Listado de usuarios**

```typescript
// src/app/(app)/[companySlug]/admin/usuarios/page.tsx
import { db } from '@/lib/db/client';
import { tenantMembers, roles } from '@/lib/db/schema';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { requirePermission } from '@/lib/auth/require-permission';
import { eq, and } from 'drizzle-orm';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default async function UsuariosPage({ params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;
  await requirePermission('admin.usuarios.ver');
  const tenant = await getCurrentTenant();

  // Join con auth.users via Supabase admin API o vista
  const members = await db
    .select({
      userId: tenantMembers.userId,
      rolNombre: tenantMembers.rolNombre,
      estado: tenantMembers.estado,
      invitadoAt: tenantMembers.invitadoAt,
      ultimoLoginAt: tenantMembers.ultimoLoginAt,
    })
    .from(tenantMembers)
    .where(eq(tenantMembers.tenantId, tenant.id));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <Button asChild>
          <Link href={`/${companySlug}/admin/usuarios/invitar`}>Invitar usuario →</Link>
        </Button>
      </div>
      <table className="w-full border-collapse">
        <thead><tr className="border-b text-left text-sm">
          <th className="py-2">Usuario ID</th><th>Rol</th><th>Estado</th><th>Invitado</th><th>Último login</th>
        </tr></thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.userId} className="border-b hover:bg-muted/30">
              <td className="py-2"><Link href={`/${companySlug}/admin/usuarios/${m.userId}`}>{m.userId.slice(0, 8)}</Link></td>
              <td><Badge variant="secondary">{m.rolNombre}</Badge></td>
              <td><Badge variant={m.estado === 'activo' ? 'default' : 'destructive'}>{m.estado}</Badge></td>
              <td className="text-sm text-muted-foreground">{m.invitadoAt.toISOString().slice(0, 10)}</td>
              <td className="text-sm text-muted-foreground">{m.ultimoLoginAt?.toISOString().slice(0, 10) ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Form invitar**

```typescript
// src/app/(app)/[companySlug]/admin/usuarios/invitar/page.tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { invitarUsuario } from '@/server/actions/users';
import { useRouter, useParams } from 'next/navigation';
// ... imports

const Schema = z.object({
  email: z.string().email(),
  nombre: z.string().min(2),
  rolNombre: z.string().min(1),
});

export default function InvitarPage() {
  const router = useRouter();
  const params = useParams<{ companySlug: string }>();
  // load roles del tenant via fetch o passing-down from server
  const form = useForm<z.infer<typeof Schema>>({ resolver: zodResolver(Schema) });

  const onSubmit = async (data: z.infer<typeof Schema>) => {
    const res = await invitarUsuario(data);
    if (res.success) router.push(`/${params.companySlug}/admin/usuarios`);
  };

  return (/* form típico */);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/\[companySlug\]/admin/usuarios/ src/server/actions/users.ts
git commit -m "feat(auth): add users management UI with invite and role change"
```

---

## Task 8: UI matriz de permisos por rol

**Estimado**: 3h
**Agente**: `frontend-developer`
**Files:**

- Create: `src/app/(app)/[companySlug]/admin/roles/page.tsx`
- Create: `src/app/(app)/[companySlug]/admin/roles/nuevo/page.tsx`
- Create: `src/server/actions/roles.ts`
- Create: `src/components/modules/admin/PermissionsMatrix.tsx`

- [ ] **Step 1: Server actions roles**

```typescript
// src/server/actions/roles.ts
'use server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { roles, rolPermisos, auditPermisos } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { syncTenantToCasbin } from '@/lib/auth/casbin/sync';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

const CrearRolSchema = z.object({
  nombre: z.string().min(2).max(50),
  descripcion: z.string().max(200).optional(),
  permisos: z.array(z.string()).min(1),
});

export async function crearRolCustom(input: z.infer<typeof CrearRolSchema>) {
  const data = CrearRolSchema.parse(input);
  const { user, tenant } = await requirePermission('admin.roles.editar');
  const h = await headers();
  const ip = h.get('x-forwarded-for') ?? null;

  return db.transaction(async (tx) => {
    const [rol] = await tx
      .insert(roles)
      .values({
        tenantId: tenant.id,
        nombre: data.nombre,
        esPredefinido: false,
        descripcion: data.descripcion,
        createdBy: user.id,
      })
      .returning();

    for (const codigo of data.permisos) {
      await tx.insert(rolPermisos).values({ rolId: rol.id, permisoCodigo: codigo });
    }

    await tx.insert(auditPermisos).values({
      tenantId: tenant.id,
      userId: user.id,
      accion: 'rol.creado',
      rolId: rol.id,
      detalles: { nombre: data.nombre, permisos: data.permisos },
      ipAddress: ip,
    });

    await syncTenantToCasbin(tenant.id);
    revalidatePath(`/${tenant.slug}/admin/roles`);
    return { success: true as const, data: rol };
  });
}

export async function actualizarPermisosDeRol(rolId: string, permisos: string[]) {
  const { user, tenant } = await requirePermission('admin.roles.editar');
  const h = await headers();
  const ip = h.get('x-forwarded-for') ?? null;

  // Validar que el rol pertenece al tenant
  const [rol] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, rolId), eq(roles.tenantId, tenant.id)))
    .limit(1);
  if (!rol) return { success: false as const, error: 'role-not-found' };

  // No permitir editar Superadmin
  if (rol.nombre === 'Superadmin' && rol.esPredefinido) {
    return { success: false as const, error: 'cannot-edit-superadmin' };
  }

  return db.transaction(async (tx) => {
    // Diff actual vs nuevo para audit
    const actuales = await tx
      .select({ codigo: rolPermisos.permisoCodigo })
      .from(rolPermisos)
      .where(eq(rolPermisos.rolId, rolId));
    const actualesSet = new Set(actuales.map((p) => p.codigo));
    const nuevosSet = new Set(permisos);
    const agregados = permisos.filter((p) => !actualesSet.has(p));
    const removidos = [...actualesSet].filter((p) => !nuevosSet.has(p));

    // Borrar y reinsertar
    await tx.delete(rolPermisos).where(eq(rolPermisos.rolId, rolId));
    for (const codigo of permisos) {
      await tx.insert(rolPermisos).values({ rolId, permisoCodigo: codigo });
    }

    // Audit
    if (agregados.length > 0) {
      await tx.insert(auditPermisos).values({
        tenantId: tenant.id,
        userId: user.id,
        accion: 'permisos.agregados',
        rolId,
        detalles: { agregados },
        ipAddress: ip,
      });
    }
    if (removidos.length > 0) {
      await tx.insert(auditPermisos).values({
        tenantId: tenant.id,
        userId: user.id,
        accion: 'permisos.removidos',
        rolId,
        detalles: { removidos },
        ipAddress: ip,
      });
    }

    await syncTenantToCasbin(tenant.id);
    revalidatePath(`/${tenant.slug}/admin/roles`);
    return { success: true as const, data: null };
  });
}
```

- [ ] **Step 2: Matriz de permisos UI**

```typescript
// src/components/modules/admin/PermissionsMatrix.tsx
'use client';
import { useState } from 'react';
import { actualizarPermisosDeRol } from '@/server/actions/roles';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type PermisoDef = { codigo: string; modulo: string; accion: string; descripcion: string; esSensible: boolean };
type Rol = { id: string; nombre: string; esPredefinido: boolean };

export function PermissionsMatrix({
  permisosDef,
  rol,
  permisosActuales,
  readOnly,
}: {
  permisosDef: PermisoDef[];
  rol: Rol;
  permisosActuales: string[];
  readOnly: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(permisosActuales));
  const [saving, setSaving] = useState(false);

  // Agrupar por módulo
  const grouped = permisosDef.reduce((acc, p) => {
    (acc[p.modulo] ??= []).push(p);
    return acc;
  }, {} as Record<string, PermisoDef[]>);

  const toggle = (codigo: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(codigo) ? next.delete(codigo) : next.add(codigo);
      return next;
    });
  };

  const guardar = async () => {
    setSaving(true);
    const res = await actualizarPermisosDeRol(rol.id, Array.from(selected));
    setSaving(false);
    if (res.success) toast.success('Permisos actualizados');
    else toast.error(res.error);
  };

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([modulo, perms]) => (
        <section key={modulo}>
          <h3 className="font-semibold capitalize mb-2">{modulo}</h3>
          <ul className="space-y-1">
            {perms.map((p) => (
              <li key={p.codigo} className="flex items-center gap-2">
                <Checkbox
                  id={p.codigo}
                  checked={selected.has(p.codigo)}
                  onCheckedChange={() => !readOnly && toggle(p.codigo)}
                  disabled={readOnly}
                />
                <label htmlFor={p.codigo} className="text-sm flex items-center gap-2">
                  {p.esSensible && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                  <span>{p.descripcion}</span>
                  <code className="text-xs text-muted-foreground">{p.codigo}</code>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!readOnly && <Button onClick={guardar} disabled={saving}>Guardar</Button>}
    </div>
  );
}
```

- [ ] **Step 3: Página listado roles + matriz**

```typescript
// src/app/(app)/[companySlug]/admin/roles/page.tsx
import { db } from '@/lib/db/client';
import { roles, rolPermisos, permisosDefinidos } from '@/lib/db/schema';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { requirePermission } from '@/lib/auth/require-permission';
import { eq } from 'drizzle-orm';
import { PermissionsMatrix } from '@/components/modules/admin/PermissionsMatrix';
// usaríamos Tabs de shadcn para alternar entre roles

export default async function RolesPage({ params }: { params: Promise<{ companySlug: string }> }) {
  await requirePermission('admin.roles.ver');
  const tenant = await getCurrentTenant();
  const { companySlug } = await params;

  const tenantRoles = await db.select().from(roles).where(eq(roles.tenantId, tenant.id));
  const allPermisos = await db.select().from(permisosDefinidos);

  // Por simplicidad mostramos el primer rol; con shadcn Tabs se pueden mostrar todos
  const firstRol = tenantRoles[0];
  const perms = await db.select({ codigo: rolPermisos.permisoCodigo }).from(rolPermisos).where(eq(rolPermisos.rolId, firstRol.id));

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Roles y permisos</h1>
        <Link href={`/${companySlug}/admin/roles/nuevo`}>+ Crear rol custom</Link>
      </div>
      {/* Render con Tabs uno por rol */}
      <PermissionsMatrix
        permisosDef={allPermisos}
        rol={firstRol}
        permisosActuales={perms.map((p) => p.codigo)}
        readOnly={firstRol.nombre === 'Superadmin' && firstRol.esPredefinido}
      />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/\[companySlug\]/admin/roles/ src/server/actions/roles.ts src/components/modules/admin/PermissionsMatrix.tsx
git commit -m "feat(auth): add role management UI with permissions matrix"
```

---

## Done criteria del módulo

- [ ] Login con magic link funciona, sesión persiste.
- [ ] MFA enrollment + verification flow completo para Superadmin.
- [ ] Casbin enforcer enforcer.enforce(user, tenant, permiso) retorna correctamente.
- [ ] Toggle de un permiso en UI cambia el comportamiento de un Server Action sin restart.
- [ ] User con rol Comercial NO ve costos de productos (probado E2E al llegar B.4).
- [ ] Audit log registra cambios con IP y user.
- [ ] Test cross-tenant: user de Idex no puede ejecutar `cotizaciones.crear` con tenant_id de Agroalves en el JWT.

## Notas

- **Sync Casbin**: cada vez que cambian rol_permisos o tenant_members, llamar `syncTenantToCasbin(tenantId)`. Si esto crece (>500 policies), considerar incremental sync.
- **Vista `productos_publicos`** se crea en B.4 (porque depende de productos). Acá dejamos solo la migration placeholder.
- **MFA bypass**: hay un riesgo de que un user no enrolle MFA y aun así pueda hacer acciones de Superadmin. Layout `/admin` debe redirigir a `/admin/perfil/mfa` si no está enrolled.
