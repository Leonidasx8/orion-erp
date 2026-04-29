# B.0 — Tenants y Plataforma Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea. Steps usan checkbox (`- [ ]`) syntax para tracking.

**Goal:** Construir el módulo Superadmin Global de Dignita con onboarding wizard de 5 pasos para crear nuevos tenants, gestión de platform admins, y audit log de plataforma.

**Architecture:** Tablas de plataforma (sin RLS porque solo platform admins las leen) + `tenants` y `tenant_members` que SÍ tienen RLS para los demás módulos. Wizard implementado con Server Actions transaccionales que aseguran consistencia (tenant + roles base + serie SUNAT + usuario inicial todo en un commit).

**Tech Stack:** Drizzle ORM (Postgres), Supabase Auth (magic link), shadcn/ui (Card, Form, Steps), react-hook-form, Zod, Server Actions.

**Estimación**: 18h — 6 tareas.

**Dependencias upstream**: Setup + DevOps (12h) — ver master plan.
**Dependencias downstream**: Bloquea TODO el resto (B.1, B.2, ...).

---

## File structure

```
supabase/migrations/
├── 0001_extensions.sql                     # pgcrypto, pg_trgm, pg_cron, pgmq
├── 0002_tenants_schema.sql                 # tenants, tenant_usage_metrics
├── 0003_platform_admins.sql                # platform_admins, platform_audit_log
└── 0004_tenant_members.sql                 # tenant_members + RLS

src/lib/db/schema/
├── tenants.ts                              # Drizzle schema tenants
├── platform-admins.ts
├── tenant-members.ts
└── index.ts                                # re-exports

src/lib/schemas/
└── tenant.ts                               # Zod schemas onboarding

src/server/actions/
├── tenants.ts                              # crear, suspender, listar
└── platform-audit.ts                       # log

src/app/(app)/admin/
├── layout.tsx                              # check platform admin
├── page.tsx                                # dashboard
├── tenants/
│   ├── page.tsx                            # listado
│   ├── nuevo/
│   │   ├── page.tsx                        # wizard wrapper
│   │   ├── _components/
│   │   │   ├── WizardStep1Datos.tsx
│   │   │   ├── WizardStep2Branding.tsx
│   │   │   ├── WizardStep3Admin.tsx
│   │   │   ├── WizardStep4Fiscal.tsx
│   │   │   └── WizardStep5Plan.tsx
│   │   └── _state/
│   │       └── wizard-machine.ts           # xstate o context
│   └── [id]/
│       ├── page.tsx                        # detalle
│       └── editar/page.tsx
├── usuarios-globales/
│   └── page.tsx
└── auditoria/
    └── page.tsx

src/components/modules/admin/
├── TenantCard.tsx
├── TenantsList.tsx
├── PlatformAdminInvite.tsx
└── AuditLogTable.tsx

tests/
├── unit/
│   └── tenants/
│       ├── slug-validation.test.ts
│       └── wizard-state.test.ts
└── integration/
    └── tenants/
        └── onboarding-flow.test.ts
```

---

## Task 1: Schema `tenants` y `tenant_usage_metrics` + RLS

**Estimado**: 3h
**Agente**: `schema-builder`
**Files:**

- Create: `supabase/migrations/0001_extensions.sql`
- Create: `supabase/migrations/0002_tenants_schema.sql`
- Create: `src/lib/db/schema/tenants.ts`
- Create: `src/lib/db/schema/index.ts`
- Test: `tests/integration/tenants/schema.test.ts`

- [ ] **Step 1: Crear migration de extensiones**

```sql
-- supabase/migrations/0001_extensions.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pgmq;
```

- [ ] **Step 2: Crear migration de tenants**

```sql
-- supabase/migrations/0002_tenants_schema.sql

CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  razon_social text NOT NULL,
  ruc text NOT NULL,
  direccion_fiscal text,
  ubigeo text,
  logo_url text,
  color_primario text DEFAULT '#0070f3',
  color_secundario text DEFAULT '#7928ca',
  favicon_url text,
  plan text NOT NULL DEFAULT 'starter',  -- 'starter' | 'pro' | 'enterprise'
  estado text NOT NULL DEFAULT 'activo', -- 'activo' | 'suspendido' | 'baja'
  config_sunat jsonb,                    -- ruta + token NUBEFACT, encriptado
  fecha_alta timestamptz NOT NULL DEFAULT now(),
  fecha_baja timestamptz,
  created_by uuid,                       -- platform_admin que lo creó
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]{2,30}$'),
  CONSTRAINT ruc_format CHECK (ruc ~ '^(10|20)[0-9]{9}$')
);

CREATE INDEX tenants_slug_idx ON tenants(slug);
CREATE INDEX tenants_estado_idx ON tenants(estado);

CREATE TABLE tenant_usage_metrics (
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  periodo date NOT NULL,                 -- primer día del mes
  cotizaciones_emitidas int DEFAULT 0,
  facturas_emitidas int DEFAULT 0,
  guias_emitidas int DEFAULT 0,
  storage_mb_usado numeric(10,2) DEFAULT 0,
  PRIMARY KEY (tenant_id, periodo)
);

-- Las dos NO tienen RLS porque solo platform_admins las consultan
-- (ver Task 4 para chequeo en Server Action).
```

- [ ] **Step 3: Crear Drizzle schema**

```typescript
// src/lib/db/schema/tenants.ts
import {
  pgTable,
  uuid,
  text,
  timestamptz,
  jsonb,
  numeric,
  integer,
  date,
  primaryKey,
} from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  razonSocial: text('razon_social').notNull(),
  ruc: text('ruc').notNull(),
  direccionFiscal: text('direccion_fiscal'),
  ubigeo: text('ubigeo'),
  logoUrl: text('logo_url'),
  colorPrimario: text('color_primario').default('#0070f3'),
  colorSecundario: text('color_secundario').default('#7928ca'),
  faviconUrl: text('favicon_url'),
  plan: text('plan').notNull().default('starter'),
  estado: text('estado').notNull().default('activo'),
  configSunat: jsonb('config_sunat'),
  fechaAlta: timestamptz('fecha_alta').notNull().defaultNow(),
  fechaBaja: timestamptz('fecha_baja'),
  createdBy: uuid('created_by'),
});

export const tenantUsageMetrics = pgTable(
  'tenant_usage_metrics',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    periodo: date('periodo').notNull(),
    cotizacionesEmitidas: integer('cotizaciones_emitidas').default(0),
    facturasEmitidas: integer('facturas_emitidas').default(0),
    guiasEmitidas: integer('guias_emitidas').default(0),
    storageMbUsado: numeric('storage_mb_usado', { precision: 10, scale: 2 }).default('0'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tenantId, t.periodo] }),
  })
);

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type TenantUsageMetrics = typeof tenantUsageMetrics.$inferSelect;
```

- [ ] **Step 4: Crear barrel export**

```typescript
// src/lib/db/schema/index.ts
export * from './tenants';
// (más exports se agregan en tareas siguientes)
```

- [ ] **Step 5: Test de slug validation**

```typescript
// tests/integration/tenants/schema.test.ts
import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema';

describe('tenants schema constraints', () => {
  it('rejects slug with uppercase', async () => {
    await expect(
      db.insert(tenants).values({
        slug: 'IDEX',
        razonSocial: 'Test',
        ruc: '20614847370',
      })
    ).rejects.toThrow(/slug_format/);
  });

  it('rejects RUC with wrong prefix', async () => {
    await expect(
      db.insert(tenants).values({
        slug: 'idex',
        razonSocial: 'Test',
        ruc: '30614847370', // empieza con 30, no permitido
      })
    ).rejects.toThrow(/ruc_format/);
  });

  it('accepts valid tenant', async () => {
    const [t] = await db
      .insert(tenants)
      .values({
        slug: 'idex-test',
        razonSocial: 'Idex Test',
        ruc: '20614847370',
      })
      .returning();
    expect(t.id).toBeTruthy();
    await db.delete(tenants).where(eq(tenants.id, t.id));
  });
});
```

- [ ] **Step 6: Run migrations + tests**

```bash
pnpm db:migrate
pnpm test:integration tests/integration/tenants/schema.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0001_extensions.sql supabase/migrations/0002_tenants_schema.sql src/lib/db/schema/tenants.ts src/lib/db/schema/index.ts tests/integration/tenants/schema.test.ts
git commit -m "feat(tenants): add tenants and usage_metrics tables with constraints"
```

---

## Task 2: Schema `platform_admins`, `tenant_members`, `platform_audit_log`

**Estimado**: 3h
**Agente**: `schema-builder`
**Files:**

- Create: `supabase/migrations/0003_platform_admins.sql`
- Create: `supabase/migrations/0004_tenant_members.sql`
- Create: `src/lib/db/schema/platform-admins.ts`
- Create: `src/lib/db/schema/tenant-members.ts`
- Test: `tests/integration/tenants/membership.test.ts`

- [ ] **Step 1: Migration platform_admins + audit log**

```sql
-- supabase/migrations/0003_platform_admins.sql

CREATE TABLE platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  email text NOT NULL,
  invited_by uuid REFERENCES platform_admins(user_id),
  invited_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  estado text NOT NULL DEFAULT 'activo'  -- 'activo' | 'suspendido'
);

CREATE TABLE platform_audit_log (
  id bigserial PRIMARY KEY,
  actor_user_id uuid REFERENCES auth.users(id),
  actor_email text NOT NULL,             -- denormalizado por si el user se borra
  accion text NOT NULL,                  -- 'tenant.created', 'tenant.suspended', etc.
  target_type text,                      -- 'tenant', 'platform_admin'
  target_id uuid,
  detalles jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX platform_audit_log_actor_idx ON platform_audit_log(actor_user_id);
CREATE INDEX platform_audit_log_created_at_idx ON platform_audit_log(created_at DESC);
CREATE INDEX platform_audit_log_target_idx ON platform_audit_log(target_type, target_id);
```

- [ ] **Step 2: Migration tenant_members con RLS**

```sql
-- supabase/migrations/0004_tenant_members.sql

CREATE TABLE tenant_members (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rol_nombre text NOT NULL,              -- referencia el rol en el tenant
  invitado_por uuid REFERENCES auth.users(id),
  invitado_at timestamptz NOT NULL DEFAULT now(),
  ultimo_login_at timestamptz,
  estado text NOT NULL DEFAULT 'pendiente',  -- 'pendiente' | 'activo' | 'suspendido'
  PRIMARY KEY (user_id, tenant_id)
);

CREATE INDEX tenant_members_tenant_idx ON tenant_members(tenant_id);
CREATE INDEX tenant_members_user_idx ON tenant_members(user_id);

ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;

-- Un user puede ver sus propias membresías
CREATE POLICY "tenant_members_self_select" ON tenant_members FOR SELECT
USING (user_id = auth.uid());

-- Tenant admins ven los miembros del tenant (lo refinamos en B.2 con Casbin)
-- Por ahora: si user es member del tenant, lo ve
CREATE POLICY "tenant_members_same_tenant_select" ON tenant_members FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  )
);

-- INSERT/UPDATE/DELETE: solo Service Role (Server Actions con bypass)
-- No se permite escribir desde sesión normal de usuario.
```

- [ ] **Step 3: Drizzle schema**

```typescript
// src/lib/db/schema/platform-admins.ts
import { pgTable, uuid, text, timestamptz, bigserial, jsonb, inet } from 'drizzle-orm/pg-core';

export const platformAdmins = pgTable('platform_admins', {
  userId: uuid('user_id').primaryKey(),
  nombre: text('nombre').notNull(),
  email: text('email').notNull(),
  invitedBy: uuid('invited_by'),
  invitedAt: timestamptz('invited_at').notNull().defaultNow(),
  lastLoginAt: timestamptz('last_login_at'),
  estado: text('estado').notNull().default('activo'),
});

export const platformAuditLog = pgTable('platform_audit_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  actorUserId: uuid('actor_user_id'),
  actorEmail: text('actor_email').notNull(),
  accion: text('accion').notNull(),
  targetType: text('target_type'),
  targetId: uuid('target_id'),
  detalles: jsonb('detalles'),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
});

export type PlatformAdmin = typeof platformAdmins.$inferSelect;
export type NewPlatformAdmin = typeof platformAdmins.$inferInsert;
```

```typescript
// src/lib/db/schema/tenant-members.ts
import { pgTable, uuid, text, timestamptz, primaryKey } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const tenantMembers = pgTable(
  'tenant_members',
  {
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    rolNombre: text('rol_nombre').notNull(),
    invitadoPor: uuid('invitado_por'),
    invitadoAt: timestamptz('invitado_at').notNull().defaultNow(),
    ultimoLoginAt: timestamptz('ultimo_login_at'),
    estado: text('estado').notNull().default('pendiente'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.tenantId] }),
  })
);

export type TenantMember = typeof tenantMembers.$inferSelect;
export type NewTenantMember = typeof tenantMembers.$inferInsert;
```

- [ ] **Step 4: Update barrel**

```typescript
// src/lib/db/schema/index.ts
export * from './tenants';
export * from './platform-admins';
export * from './tenant-members';
```

- [ ] **Step 5: Test RLS aislamiento**

```typescript
// tests/integration/tenants/membership.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createClientForUser } from '@/lib/test-helpers/supabase';

describe('tenant_members RLS', () => {
  let userA: any, userB: any, tenantA: any, tenantB: any;

  beforeAll(async () => {
    // setup: 2 users, 2 tenants, userA member de tenantA, userB de tenantB
    // (helper omitted for brevity — implementar en src/lib/test-helpers)
  });

  it('userA sees only their membership', async () => {
    const supA = createClientForUser(userA);
    const { data } = await supA.from('tenant_members').select('*');
    expect(data).toHaveLength(1);
    expect(data[0].tenant_id).toBe(tenantA.id);
  });

  it('userA does NOT see userB membership', async () => {
    const supA = createClientForUser(userA);
    const { data } = await supA.from('tenant_members').select('*').eq('user_id', userB.id);
    expect(data).toHaveLength(0);
  });
});
```

- [ ] **Step 6: Run tests**

```bash
pnpm test:integration tests/integration/tenants/membership.test.ts
```

Expected: tests pass.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0003_platform_admins.sql supabase/migrations/0004_tenant_members.sql src/lib/db/schema/platform-admins.ts src/lib/db/schema/tenant-members.ts src/lib/db/schema/index.ts tests/integration/tenants/membership.test.ts
git commit -m "feat(tenants): add platform_admins, tenant_members with RLS"
```

---

## Task 3: Wizard onboarding paso 1-2 (datos básicos + branding)

**Estimado**: 4h
**Agente**: `architect` (decide forma del wizard) → `frontend-developer` (implementa)
**Files:**

- Create: `src/app/(app)/admin/tenants/nuevo/page.tsx`
- Create: `src/app/(app)/admin/tenants/nuevo/_components/WizardStep1Datos.tsx`
- Create: `src/app/(app)/admin/tenants/nuevo/_components/WizardStep2Branding.tsx`
- Create: `src/app/(app)/admin/tenants/nuevo/_state/wizard-state.ts`
- Create: `src/lib/schemas/tenant.ts`
- Create: `src/server/actions/tenants.ts` (función `verificarSlugDisponible`)

- [ ] **Step 1: Zod schema del wizard**

```typescript
// src/lib/schemas/tenant.ts
import { z } from 'zod';

export const slugSchema = z
  .string()
  .min(2, { message: 'Mínimo 2 caracteres' })
  .max(30, { message: 'Máximo 30 caracteres' })
  .regex(/^[a-z0-9-]+$/, { message: 'Solo minúsculas, números y guiones' });

export const rucSchema = z
  .string()
  .length(11, { message: 'RUC debe tener 11 dígitos' })
  .regex(/^(10|20)/, { message: 'RUC debe empezar con 10 o 20' });

export const TenantStep1Schema = z.object({
  razonSocial: z.string().min(3).max(150),
  ruc: rucSchema,
  slug: slugSchema,
  direccionFiscal: z.string().min(5).max(200),
  ubigeo: z.string().regex(/^[0-9]{6}$/, { message: 'Ubigeo de 6 dígitos' }),
});

export const TenantStep2Schema = z.object({
  logoUrl: z.string().url().optional(),
  colorPrimario: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  colorSecundario: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  faviconUrl: z.string().url().optional(),
});

export const TenantStep3Schema = z.object({
  adminEmail: z.string().email(),
  adminNombre: z.string().min(2).max(100),
});

export const TenantStep4Schema = z.object({
  series: z
    .array(
      z.object({
        tipoDocumento: z.enum(['01', '03', '07', '08', '09', '31']),
        serie: z.string().regex(/^[FBT][0-9]{3}$/),
        correlativoInicial: z.coerce.number().int().nonnegative().default(0),
      })
    )
    .min(1),
  nubefactRuta: z.string().url(),
  nubefactToken: z.string().min(20),
});

export const TenantStep5Schema = z.object({
  plan: z.enum(['starter', 'pro', 'enterprise']),
});

export const TenantWizardSchema = TenantStep1Schema.merge(TenantStep2Schema)
  .merge(TenantStep3Schema)
  .merge(TenantStep4Schema)
  .merge(TenantStep5Schema);

export type TenantWizardInput = z.infer<typeof TenantWizardSchema>;
```

- [ ] **Step 2: Server Action `verificarSlugDisponible`**

```typescript
// src/server/actions/tenants.ts
'use server';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requirePlatformAdmin } from '@/lib/auth/platform-admin';
import { slugSchema } from '@/lib/schemas/tenant';

export async function verificarSlugDisponible(slug: string) {
  await requirePlatformAdmin();
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) {
    return { available: false as const, error: parsed.error.errors[0].message };
  }
  const existing = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, parsed.data))
    .limit(1);
  return { available: existing.length === 0, error: null };
}
```

- [ ] **Step 3: Helper requirePlatformAdmin**

```typescript
// src/lib/auth/platform-admin.ts
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { platformAdmins } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { ForbiddenError } from '@/lib/types';

export async function requirePlatformAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ForbiddenError('platform.admin');
  const [pa] = await db
    .select()
    .from(platformAdmins)
    .where(and(eq(platformAdmins.userId, user.id), eq(platformAdmins.estado, 'activo')))
    .limit(1);
  if (!pa) throw new ForbiddenError('platform.admin');
  return { user, platformAdmin: pa };
}
```

- [ ] **Step 4: Wizard state (React Context)**

```typescript
// src/app/(app)/admin/tenants/nuevo/_state/wizard-state.ts
'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { TenantWizardInput } from '@/lib/schemas/tenant';

type WizardData = Partial<TenantWizardInput>;

type WizardContextValue = {
  currentStep: number;
  data: WizardData;
  setData: (d: WizardData) => void;
  next: () => void;
  back: () => void;
  goTo: (step: number) => void;
};

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setDataState] = useState<WizardData>({});

  const setData = (d: WizardData) => setDataState((prev) => ({ ...prev, ...d }));
  const next = () => setCurrentStep((s) => Math.min(s + 1, 5));
  const back = () => setCurrentStep((s) => Math.max(s - 1, 1));
  const goTo = (step: number) => setCurrentStep(step);

  return (
    <WizardContext.Provider value={{ currentStep, data, setData, next, back, goTo }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used within WizardProvider');
  return ctx;
}
```

- [ ] **Step 5: Step 1 component (datos básicos)**

```typescript
// src/app/(app)/admin/tenants/nuevo/_components/WizardStep1Datos.tsx
'use client';
import { useEffect, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TenantStep1Schema } from '@/lib/schemas/tenant';
import { verificarSlugDisponible } from '@/server/actions/tenants';
import { useWizard } from '../_state/wizard-state';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

type Step1Input = z.infer<typeof TenantStep1Schema>;

export function WizardStep1Datos() {
  const { data, setData, next } = useWizard();
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const form = useForm<Step1Input>({
    resolver: zodResolver(TenantStep1Schema),
    defaultValues: data as Step1Input,
  });

  const checkSlug = useDebouncedCallback(async (slug: string) => {
    if (!slug || slug.length < 2) return setSlugStatus('idle');
    setSlugStatus('checking');
    const res = await verificarSlugDisponible(slug);
    setSlugStatus(res.available ? 'available' : 'taken');
  }, 300);

  const slug = form.watch('slug');
  useEffect(() => {
    if (slug) checkSlug(slug);
  }, [slug, checkSlug]);

  const onSubmit = (values: Step1Input) => {
    if (slugStatus !== 'available') {
      form.setError('slug', { message: 'Slug no disponible' });
      return;
    }
    setData(values);
    next();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField name="razonSocial" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Razón Social</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="ruc" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>RUC</FormLabel>
            <FormControl><Input {...field} maxLength={11} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="slug" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Slug (URL: /{field.value || '...'})</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            {slugStatus === 'checking' && <p className="text-xs text-muted-foreground">Verificando...</p>}
            {slugStatus === 'available' && <p className="text-xs text-green-600">✓ Disponible</p>}
            {slugStatus === 'taken' && <p className="text-xs text-red-600">✗ Ya en uso</p>}
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="direccionFiscal" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Dirección fiscal</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="ubigeo" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Ubigeo (6 dígitos)</FormLabel>
            <FormControl><Input {...field} maxLength={6} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" disabled={slugStatus !== 'available'}>Siguiente →</Button>
      </form>
    </Form>
  );
}
```

- [ ] **Step 6: Step 2 component (branding)**

```typescript
// src/app/(app)/admin/tenants/nuevo/_components/WizardStep2Branding.tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TenantStep2Schema } from '@/lib/schemas/tenant';
import { useWizard } from '../_state/wizard-state';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { uploadToStorage } from '@/lib/storage/upload';
// helper que sube a supabase storage bucket "tenant-branding"

type Step2Input = z.infer<typeof TenantStep2Schema>;

export function WizardStep2Branding() {
  const { data, setData, next, back } = useWizard();

  const form = useForm<Step2Input>({
    resolver: zodResolver(TenantStep2Schema),
    defaultValues: {
      colorPrimario: data.colorPrimario ?? '#0070f3',
      colorSecundario: data.colorSecundario ?? '#7928ca',
      logoUrl: data.logoUrl,
      faviconUrl: data.faviconUrl,
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadToStorage(file, 'tenant-branding/logos');
    form.setValue('logoUrl', url);
  };

  const onSubmit = (values: Step2Input) => {
    setData(values);
    next();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormItem>
          <FormLabel>Logo (PNG/SVG, max 2MB)</FormLabel>
          <Input type="file" accept="image/png,image/svg+xml" onChange={handleLogoUpload} />
          {form.watch('logoUrl') && (
            <img src={form.watch('logoUrl')} alt="logo preview" className="h-16 mt-2" />
          )}
        </FormItem>
        <FormField name="colorPrimario" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Color primario</FormLabel>
            <FormControl><Input type="color" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="colorSecundario" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Color secundario</FormLabel>
            <FormControl><Input type="color" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={back}>← Atrás</Button>
          <Button type="submit">Siguiente →</Button>
        </div>
      </form>
    </Form>
  );
}
```

- [ ] **Step 7: Page wrapper con steps indicator**

```typescript
// src/app/(app)/admin/tenants/nuevo/page.tsx
import { WizardProvider, useWizard } from './_state/wizard-state';
import { WizardStep1Datos } from './_components/WizardStep1Datos';
import { WizardStep2Branding } from './_components/WizardStep2Branding';
// ... step 3, 4, 5 imports (Task 4)

const STEPS = ['Datos', 'Branding', 'Admin', 'Fiscal', 'Plan'];

function WizardContent() {
  const { currentStep } = useWizard();
  return (
    <div className="max-w-2xl mx-auto py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Nuevo tenant</h1>
        <ol className="flex gap-2 mt-4">
          {STEPS.map((label, i) => (
            <li key={label} className={cn(
              'px-3 py-1 rounded text-sm',
              i + 1 === currentStep ? 'bg-primary text-primary-foreground' :
              i + 1 < currentStep ? 'bg-muted text-muted-foreground' :
              'bg-muted/50 text-muted-foreground'
            )}>
              {i + 1}. {label}
            </li>
          ))}
        </ol>
      </header>
      {currentStep === 1 && <WizardStep1Datos />}
      {currentStep === 2 && <WizardStep2Branding />}
      {/* steps 3-5 en Task 4 */}
    </div>
  );
}

export default function NewTenantPage() {
  return (
    <WizardProvider>
      <WizardContent />
    </WizardProvider>
  );
}
```

- [ ] **Step 8: Manual smoke test**

Run dev server, navigate to `/admin/tenants/nuevo`, verify:

- Form step 1 valida slug en vivo (debounced)
- Slug duplicado muestra "Ya en uso"
- Click "Siguiente" pasa al step 2
- Upload de logo se ve en preview
- Color picker funciona

- [ ] **Step 9: Commit**

```bash
git add src/lib/schemas/tenant.ts src/server/actions/tenants.ts src/lib/auth/platform-admin.ts src/app/\(app\)/admin/tenants/nuevo/
git commit -m "feat(tenants): add onboarding wizard steps 1-2 (datos + branding)"
```

---

## Task 4: Wizard pasos 3-5 + Server Action `crearTenant`

**Estimado**: 4h
**Agente**: `architect` (decide transacción) → `frontend-developer` + `backend-developer`
**Files:**

- Create: `src/app/(app)/admin/tenants/nuevo/_components/WizardStep3Admin.tsx`
- Create: `src/app/(app)/admin/tenants/nuevo/_components/WizardStep4Fiscal.tsx`
- Create: `src/app/(app)/admin/tenants/nuevo/_components/WizardStep5Plan.tsx`
- Modify: `src/server/actions/tenants.ts` (agregar `crearTenant`)
- Create: `tests/integration/tenants/onboarding-flow.test.ts`

- [ ] **Step 1: Steps 3, 4, 5 (forms simples — patrón ya en Task 3)**

Ver código tipo Task 3, ahora con `TenantStep3Schema`, `TenantStep4Schema`, `TenantStep5Schema` respectivamente. Step 5 termina con botón "Crear tenant" que invoca Server Action `crearTenant(data)`.

- [ ] **Step 2: Server Action `crearTenant` (transaccional)**

```typescript
// src/server/actions/tenants.ts (agregar a lo existente)
import { TenantWizardSchema, type TenantWizardInput } from '@/lib/schemas/tenant';
import { sql } from 'drizzle-orm';
import { tenants, tenantMembers, platformAuditLog } from '@/lib/db/schema';
// más imports: roles base, series_documentos (los crea Task 5 si no existen)
import { invitarUsuarioMagicLink } from '@/lib/auth/invite';
import { headers } from 'next/headers';
import { encrypt } from '@/lib/crypto'; // wrapper sobre crypto.subtle

export async function crearTenant(input: TenantWizardInput) {
  const { user, platformAdmin } = await requirePlatformAdmin();
  const data = TenantWizardSchema.parse(input);

  const headersList = headers();
  const ip = headersList.get('x-forwarded-for') ?? 'unknown';
  const userAgent = headersList.get('user-agent') ?? '';

  try {
    const tenantId = await db.transaction(async (tx) => {
      // 1. INSERT tenant (config_sunat encriptado)
      const [t] = await tx
        .insert(tenants)
        .values({
          slug: data.slug,
          razonSocial: data.razonSocial,
          ruc: data.ruc,
          direccionFiscal: data.direccionFiscal,
          ubigeo: data.ubigeo,
          logoUrl: data.logoUrl,
          colorPrimario: data.colorPrimario,
          colorSecundario: data.colorSecundario,
          plan: data.plan,
          configSunat: {
            ruta: data.nubefactRuta,
            token: encrypt(data.nubefactToken),
          },
          createdBy: user.id,
        })
        .returning();

      // 2. Seed roles base (Superadmin, Comercial, Facturación) — ver B.2 task seed
      // En B.0 dejamos esto stub; el seed real lo crea B.2.
      // Por ahora, tenant queda sin roles hasta que B.2 esté.

      // 3. Seed series_documentos
      for (const s of data.series) {
        await tx.execute(sql`
          INSERT INTO series_documentos (tenant_id, tipo_documento, serie, correlativo_actual)
          VALUES (${t.id}, ${s.tipoDocumento}, ${s.serie}, ${s.correlativoInicial})
          ON CONFLICT (tenant_id, tipo_documento, serie) DO NOTHING
        `);
      }

      // 4. Invitar al primer usuario (magic link via Supabase Auth Admin API)
      const newUser = await invitarUsuarioMagicLink(data.adminEmail, data.adminNombre);

      // 5. INSERT tenant_member con rol Superadmin
      await tx.insert(tenantMembers).values({
        userId: newUser.id,
        tenantId: t.id,
        rolNombre: 'Superadmin',
        invitadoPor: user.id,
        estado: 'pendiente',
      });

      // 6. Audit log
      await tx.insert(platformAuditLog).values({
        actorUserId: user.id,
        actorEmail: platformAdmin.email,
        accion: 'tenant.created',
        targetType: 'tenant',
        targetId: t.id,
        detalles: {
          slug: data.slug,
          ruc: data.ruc,
          adminEmail: data.adminEmail,
          plan: data.plan,
        },
        ipAddress: ip,
        userAgent,
      });

      return t.id;
    });

    return { success: true as const, data: { tenantId } };
  } catch (e) {
    if (e instanceof z.ZodError)
      return { success: false as const, error: 'validation', details: e.errors };
    throw e;
  }
}
```

- [ ] **Step 3: Helper `invitarUsuarioMagicLink`**

```typescript
// src/lib/auth/invite.ts
import { createAdminClient } from '@/lib/supabase/admin';

export async function invitarUsuarioMagicLink(email: string, nombre: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { nombre },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login/aceptar-invitacion`,
  });
  if (error) throw error;
  return data.user;
}
```

- [ ] **Step 4: Test integration end-to-end**

```typescript
// tests/integration/tenants/onboarding-flow.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { crearTenant } from '@/server/actions/tenants';
import { db } from '@/lib/db/client';
import { tenants, tenantMembers, platformAuditLog } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { setupPlatformAdmin } from '@/lib/test-helpers/setup';

describe('onboarding wizard end-to-end', () => {
  let cleanupIds: string[] = [];

  beforeAll(async () => {
    await setupPlatformAdmin('test-pa@dignita.local');
  });

  afterAll(async () => {
    for (const id of cleanupIds) {
      await db.delete(tenants).where(eq(tenants.id, id));
    }
  });

  it('creates tenant + member + audit log atomically', async () => {
    const result = await crearTenant({
      razonSocial: 'Test SA',
      ruc: '20999999999',
      slug: 'test-sa',
      direccionFiscal: 'Av Test 123',
      ubigeo: '150101',
      colorPrimario: '#000000',
      colorSecundario: '#ffffff',
      adminEmail: 'admin-test@example.com',
      adminNombre: 'Admin Test',
      series: [
        { tipoDocumento: '01', serie: 'F001', correlativoInicial: 0 },
        { tipoDocumento: '03', serie: 'B001', correlativoInicial: 0 },
      ],
      nubefactRuta: 'https://api.nubefact.com/api/v1/test',
      nubefactToken: 'fake_token_123456789012345',
      plan: 'starter',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    cleanupIds.push(result.data.tenantId);

    // Verificar que se creó el tenant
    const [t] = await db.select().from(tenants).where(eq(tenants.id, result.data.tenantId));
    expect(t.slug).toBe('test-sa');

    // Verificar tenant_member
    const members = await db
      .select()
      .from(tenantMembers)
      .where(eq(tenantMembers.tenantId, result.data.tenantId));
    expect(members).toHaveLength(1);
    expect(members[0].rolNombre).toBe('Superadmin');

    // Verificar audit log
    const logs = await db
      .select()
      .from(platformAuditLog)
      .where(eq(platformAuditLog.targetId, result.data.tenantId));
    expect(logs).toHaveLength(1);
    expect(logs[0].accion).toBe('tenant.created');
  });

  it('rejects duplicate slug', async () => {
    const result = await crearTenant({
      slug: 'test-sa', // ya existe
      // ... resto válido
    } as any);
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 5: Run tests + manual smoke**

```bash
pnpm test:integration tests/integration/tenants/onboarding-flow.test.ts
```

Manual: completar wizard en `/admin/tenants/nuevo`, verificar que llega email magic link al admin.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/admin/tenants/nuevo/_components/WizardStep3*.tsx src/app/\(app\)/admin/tenants/nuevo/_components/WizardStep4*.tsx src/app/\(app\)/admin/tenants/nuevo/_components/WizardStep5*.tsx src/server/actions/tenants.ts src/lib/auth/invite.ts tests/integration/tenants/onboarding-flow.test.ts
git commit -m "feat(tenants): complete onboarding wizard with transactional creation"
```

---

## Task 5: Listado y detalle de tenants

**Estimado**: 2h
**Agente**: `frontend-developer`
**Files:**

- Create: `src/app/(app)/admin/page.tsx`
- Create: `src/app/(app)/admin/layout.tsx`
- Create: `src/app/(app)/admin/tenants/page.tsx`
- Create: `src/app/(app)/admin/tenants/[id]/page.tsx`
- Create: `src/components/modules/admin/TenantsList.tsx`
- Create: `src/components/modules/admin/TenantCard.tsx`

- [ ] **Step 1: Layout admin con guard**

```typescript
// src/app/(app)/admin/layout.tsx
import { requirePlatformAdmin } from '@/lib/auth/platform-admin';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requirePlatformAdmin();
  } catch {
    redirect('/seleccionar-empresa');
  }
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-muted/30 p-4">
        <h2 className="font-bold mb-4">Plataforma</h2>
        <nav className="space-y-1">
          <a href="/admin" className="block px-3 py-2 rounded hover:bg-muted">Dashboard</a>
          <a href="/admin/tenants" className="block px-3 py-2 rounded hover:bg-muted">Tenants</a>
          <a href="/admin/usuarios-globales" className="block px-3 py-2 rounded hover:bg-muted">Admins</a>
          <a href="/admin/auditoria" className="block px-3 py-2 rounded hover:bg-muted">Auditoría</a>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Dashboard `/admin`**

```typescript
// src/app/(app)/admin/page.tsx
import { db } from '@/lib/db/client';
import { tenants, platformAuditLog } from '@/lib/db/schema';
import { count, eq, desc } from 'drizzle-orm';

export default async function AdminDashboard() {
  const [{ activos }] = await db
    .select({ activos: count() })
    .from(tenants)
    .where(eq(tenants.estado, 'activo'));

  const recentLogs = await db
    .select()
    .from(platformAuditLog)
    .orderBy(desc(platformAuditLog.createdAt))
    .limit(10);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Plataforma</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-6">
          <p className="text-sm text-muted-foreground">Tenants activos</p>
          <p className="text-3xl font-bold">{activos}</p>
        </div>
        {/* más KPIs cuando estén disponibles */}
      </div>
      <section>
        <h2 className="text-lg font-semibold mb-2">Actividad reciente</h2>
        <ul className="divide-y rounded-lg border">
          {recentLogs.map((l) => (
            <li key={l.id} className="px-4 py-2 text-sm">
              <span className="text-muted-foreground">{l.createdAt.toISOString().slice(0, 16)}</span>
              {' — '}
              <span className="font-medium">{l.actorEmail}</span> {l.accion}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Listado de tenants**

```typescript
// src/app/(app)/admin/tenants/page.tsx
import { db } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema';
import { TenantsList } from '@/components/modules/admin/TenantsList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function TenantsPage() {
  const list = await db.select().from(tenants).orderBy(tenants.fechaAlta);
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <Button asChild><Link href="/admin/tenants/nuevo">Crear tenant →</Link></Button>
      </div>
      <TenantsList tenants={list} />
    </div>
  );
}
```

- [ ] **Step 4: TenantsList component**

```typescript
// src/components/modules/admin/TenantsList.tsx
'use client';
import type { Tenant } from '@/lib/db/schema';
import { useReactTable, getCoreRowModel, getFilteredRowModel } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useState, useMemo } from 'react';

export function TenantsList({ tenants }: { tenants: Tenant[] }) {
  const [filter, setFilter] = useState('');
  const filtered = useMemo(
    () => tenants.filter((t) =>
      t.razonSocial.toLowerCase().includes(filter.toLowerCase()) ||
      t.slug.includes(filter.toLowerCase())
    ),
    [tenants, filter]
  );
  return (
    <div className="space-y-2">
      <Input placeholder="Buscar..." value={filter} onChange={(e) => setFilter(e.target.value)} />
      <table className="w-full border-collapse">
        <thead><tr className="border-b text-left text-sm">
          <th className="py-2">Razón social</th><th>Slug</th><th>RUC</th><th>Plan</th><th>Estado</th><th>Alta</th>
        </tr></thead>
        <tbody>
          {filtered.map((t) => (
            <tr key={t.id} className="border-b hover:bg-muted/30">
              <td className="py-2"><Link href={`/admin/tenants/${t.id}`}>{t.razonSocial}</Link></td>
              <td>{t.slug}</td>
              <td className="font-mono text-sm">{t.ruc}</td>
              <td><Badge variant="secondary">{t.plan}</Badge></td>
              <td><Badge variant={t.estado === 'activo' ? 'default' : 'destructive'}>{t.estado}</Badge></td>
              <td className="text-sm text-muted-foreground">{t.fechaAlta.toISOString().slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 5: Detalle tenant**

```typescript
// src/app/(app)/admin/tenants/[id]/page.tsx
import { db } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t] = await db.select().from(tenants).where(eq(tenants.id, id));
  if (!t) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.razonSocial}</h1>
      <dl className="grid grid-cols-2 gap-4 max-w-2xl">
        <div><dt className="text-sm text-muted-foreground">Slug</dt><dd>{t.slug}</dd></div>
        <div><dt className="text-sm text-muted-foreground">RUC</dt><dd className="font-mono">{t.ruc}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Plan</dt><dd>{t.plan}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Estado</dt><dd>{t.estado}</dd></div>
      </dl>
      {/* Tabs adicionales: usuarios, fiscal, uso, auditoría — futura iteración */}
    </div>
  );
}
```

- [ ] **Step 6: Smoke + commit**

```bash
git add src/app/\(app\)/admin/page.tsx src/app/\(app\)/admin/layout.tsx src/app/\(app\)/admin/tenants/page.tsx src/app/\(app\)/admin/tenants/\[id\]/page.tsx src/components/modules/admin/
git commit -m "feat(tenants): add admin dashboard, tenants list and detail"
```

---

## Task 6: Audit log viewer + métricas de uso

**Estimado**: 2h
**Agente**: `backend-developer`
**Files:**

- Create: `src/app/(app)/admin/auditoria/page.tsx`
- Create: `src/components/modules/admin/AuditLogTable.tsx`
- Create: `supabase/migrations/0005_usage_metrics_cron.sql`

- [ ] **Step 1: Página auditoría con filtros**

```typescript
// src/app/(app)/admin/auditoria/page.tsx
import { db } from '@/lib/db/client';
import { platformAuditLog } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { AuditLogTable } from '@/components/modules/admin/AuditLogTable';

export default async function AuditPage() {
  // Server-side load de últimos 100 (cliente filtra/pagina)
  const logs = await db
    .select()
    .from(platformAuditLog)
    .orderBy(desc(platformAuditLog.createdAt))
    .limit(100);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Audit log</h1>
      <AuditLogTable logs={logs} />
    </div>
  );
}
```

- [ ] **Step 2: Audit log table component**

```typescript
// src/components/modules/admin/AuditLogTable.tsx
'use client';
import type { platformAuditLog } from '@/lib/db/schema';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useMemo } from 'react';

type Log = typeof platformAuditLog.$inferSelect;

export function AuditLogTable({ logs }: { logs: Log[] }) {
  const [accionFilter, setAccionFilter] = useState<string>('all');
  const [emailFilter, setEmailFilter] = useState('');

  const acciones = useMemo(() => Array.from(new Set(logs.map((l) => l.accion))), [logs]);
  const filtered = useMemo(
    () => logs.filter(
      (l) =>
        (accionFilter === 'all' || l.accion === accionFilter) &&
        (emailFilter === '' || l.actorEmail.includes(emailFilter))
    ),
    [logs, accionFilter, emailFilter]
  );

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input placeholder="Filtrar por email" value={emailFilter} onChange={(e) => setEmailFilter(e.target.value)} className="max-w-xs" />
        <Select value={accionFilter} onValueChange={setAccionFilter}>
          <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {acciones.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <table className="w-full border-collapse">
        <thead><tr className="border-b text-left text-sm">
          <th className="py-2">Fecha</th><th>Actor</th><th>Acción</th><th>Target</th><th>IP</th>
        </tr></thead>
        <tbody>
          {filtered.map((l) => (
            <tr key={l.id} className="border-b hover:bg-muted/30">
              <td className="py-2 text-sm">{l.createdAt.toISOString().slice(0, 19).replace('T', ' ')}</td>
              <td>{l.actorEmail}</td>
              <td><code className="text-xs">{l.accion}</code></td>
              <td className="text-sm text-muted-foreground">{l.targetType}/{l.targetId?.slice(0, 8)}</td>
              <td className="text-sm font-mono">{l.ipAddress}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Cron para métricas mensuales**

```sql
-- supabase/migrations/0005_usage_metrics_cron.sql

-- Función que recalcula métricas del mes actual para todos los tenants
CREATE OR REPLACE FUNCTION recalcular_metricas_uso()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  periodo_actual date := date_trunc('month', current_date)::date;
BEGIN
  -- Cotizaciones, facturas, guías se cuentan cuando esos módulos existan.
  -- Por ahora dejamos placeholder con 0; B.5/B.8/B.9 lo actualizan via INSERT.
  -- Storage: query a storage.objects filtrado por path /tenant/{tenantId}/
  INSERT INTO tenant_usage_metrics (tenant_id, periodo, cotizaciones_emitidas, facturas_emitidas, guias_emitidas, storage_mb_usado)
  SELECT
    t.id,
    periodo_actual,
    0, 0, 0, 0
  FROM tenants t
  WHERE t.estado = 'activo'
  ON CONFLICT (tenant_id, periodo) DO NOTHING;
END;
$$;

-- Cron diario a las 02:00
SELECT cron.schedule(
  'recalcular-metricas-diario',
  '0 2 * * *',
  $$SELECT recalcular_metricas_uso();$$
);
```

- [ ] **Step 4: Smoke + commit**

```bash
pnpm db:migrate
git add src/app/\(app\)/admin/auditoria/page.tsx src/components/modules/admin/AuditLogTable.tsx supabase/migrations/0005_usage_metrics_cron.sql
git commit -m "feat(tenants): add audit log viewer and usage metrics cron"
```

---

## Done criteria del módulo

- [ ] Platform admin (Leonidas) puede entrar a `/admin` y ver el dashboard.
- [ ] Wizard de 5 pasos completable; al confirmar, crea tenant + tenant_member + audit log atómicamente.
- [ ] Slug duplicado bloquea el wizard.
- [ ] Email magic link llega al primer admin del tenant nuevo.
- [ ] Tests pasan: schema constraints, RLS membresía, onboarding e2e.
- [ ] Audit log viewer muestra eventos con filtros.
- [ ] No hay leak de datos cross-tenant en las queries de membresía (RLS verificado).

---

## Notas para el reviewer

- **Encriptación de `nubefactToken`**: el plan usa un wrapper `encrypt()` placeholder. Implementación real con `crypto.subtle` (AES-GCM con clave en Vault o Vercel env). Decidir antes de B.8.
- **Roles base**: el plan mete a Lucas como `rolNombre: 'Superadmin'` en `tenant_members`, pero la tabla `roles` se crea en B.2. Hay un orden temporal: B.0 deja el tenant_member con un rol "string" que apunta a roles que se materializan en B.2. Verificar que B.2 inserte el rol "Superadmin" antes de que el primer login ocurra (o gate el login del Superadmin a "B.2 desplegado").
- **MFA** no se chequea en este módulo. B.2 lo agrega.
- El `WizardStep4Fiscal` tiene NUBEFACT URL/token; en desarrollo poner valores dummy.
