# B.3 — Gestión de Clientes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` o `superpowers:executing-plans`.

**Goal:** CRUD de clientes B2B/B2C con autocompletado de RUC/DNI vía apis.net.pe (cache 30 días en DB), múltiples direcciones y contactos por cliente, exportación a Excel.

**Architecture:** Tabla `clientes` + `direcciones_cliente` + `contactos_cliente` + `validaciones_documento` (cache TTL 30d). Server Actions con Casbin checks. Form de cliente con autocompletado debounced (300ms) y fallback a captura manual si la API no responde.

**Tech Stack:** Drizzle, Zod, react-hook-form, TanStack Table, papaparse + ExcelJS para export, fetch con cache HTTP de Next.js.

**Estimación**: 18h (re-estimado del original 22h del brain — sin repo guía pero la integración apis.net.pe es trivial).

**Dependencias upstream**: B.1 + B.2.
**Dependencias downstream**: B.5 (cotizaciones referencian clientes), B.9 (facturas), B.10 (CxC).

---

## File structure

```
supabase/migrations/
├── 0012_clientes_schema.sql
├── 0013_direcciones_contactos.sql
└── 0014_validaciones_documento.sql

src/lib/db/schema/
├── clientes.ts
├── direcciones-cliente.ts
├── contactos-cliente.ts
└── validaciones-documento.ts

src/lib/sunat/
└── consultar-documento.ts                 # apis.net.pe wrapper

src/lib/schemas/
└── cliente.ts                             # Zod

src/server/actions/
└── clientes.ts

src/app/(app)/[companySlug]/clientes/
├── page.tsx                               # listado
├── nuevo/page.tsx
└── [id]/page.tsx                          # detalle con tabs

src/components/modules/clientes/
├── ClientesList.tsx
├── ClienteForm.tsx
├── DocAutocomplete.tsx                    # autocompletado RUC/DNI
└── tabs/
    ├── DireccionesTab.tsx
    ├── ContactosTab.tsx
    └── HistorialTab.tsx
```

---

## Task 1: Schema clientes + direcciones + contactos + RLS

**Estimado**: 3h
**Agente**: `schema-builder`
**Files:** `0012_clientes_schema.sql`, `0013_direcciones_contactos.sql`, `src/lib/db/schema/clientes.ts`, schemas relacionados.

- [ ] **Step 1: Migration clientes**

```sql
-- supabase/migrations/0012_clientes_schema.sql
CREATE TABLE clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo_documento text NOT NULL,                  -- '1' (DNI), '6' (RUC), '4' (CE), '7' (PAS)
  numero_documento text NOT NULL,
  razon_social text NOT NULL,
  nombre_comercial text,
  email text,
  telefono text,
  direccion_fiscal text,
  ubigeo text,
  condicion_pago text DEFAULT 'contado',         -- 'contado' | 'credito_X_dias'
  estado text NOT NULL DEFAULT 'activo',         -- 'activo' | 'suspendido'
  notas text,
  search_vector tsvector,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  UNIQUE (tenant_id, tipo_documento, numero_documento)
);

CREATE INDEX clientes_tenant_idx ON clientes(tenant_id);
CREATE INDEX clientes_search_idx ON clientes USING gin(search_vector);
CREATE INDEX clientes_doc_idx ON clientes(tipo_documento, numero_documento);

-- Trigger para search_vector
CREATE OR REPLACE FUNCTION clientes_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('spanish', coalesce(NEW.razon_social, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(NEW.numero_documento, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(NEW.nombre_comercial, '')), 'B');
  NEW.updated_at := now();
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER clientes_search_update BEFORE INSERT OR UPDATE ON clientes
FOR EACH ROW EXECUTE FUNCTION clientes_search_trigger();

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clientes_tenant_isolation" ON clientes FOR ALL
USING (tenant_id = current_tenant_id());
```

- [ ] **Step 2: Migration direcciones + contactos**

```sql
-- supabase/migrations/0013_direcciones_contactos.sql
CREATE TABLE direcciones_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'entrega',          -- 'fiscal' | 'entrega' | 'facturacion'
  direccion text NOT NULL,
  ubigeo text,
  referencia text,
  es_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX direcciones_cliente_idx ON direcciones_cliente(cliente_id);

CREATE TABLE contactos_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  cargo text,
  email text,
  telefono text,
  whatsapp text,
  es_principal boolean DEFAULT false,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contactos_cliente_idx ON contactos_cliente(cliente_id);

ALTER TABLE direcciones_cliente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "direcciones_via_cliente" ON direcciones_cliente FOR ALL
USING (cliente_id IN (SELECT id FROM clientes WHERE tenant_id = current_tenant_id()));

ALTER TABLE contactos_cliente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contactos_via_cliente" ON contactos_cliente FOR ALL
USING (cliente_id IN (SELECT id FROM clientes WHERE tenant_id = current_tenant_id()));
```

- [ ] **Step 3: Drizzle schemas**

```typescript
// src/lib/db/schema/clientes.ts
import { pgTable, uuid, text, timestamptz } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const clientes = pgTable('clientes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  tipoDocumento: text('tipo_documento').notNull(),
  numeroDocumento: text('numero_documento').notNull(),
  razonSocial: text('razon_social').notNull(),
  nombreComercial: text('nombre_comercial'),
  email: text('email'),
  telefono: text('telefono'),
  direccionFiscal: text('direccion_fiscal'),
  ubigeo: text('ubigeo'),
  condicionPago: text('condicion_pago').default('contado'),
  estado: text('estado').notNull().default('activo'),
  notas: text('notas'),
  createdBy: uuid('created_by'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at'),
});

export type Cliente = typeof clientes.$inferSelect;
export type NewCliente = typeof clientes.$inferInsert;
```

(análogos para `direcciones_cliente.ts` y `contactos_cliente.ts`)

- [ ] **Step 4: Test RLS cross-tenant**

```typescript
// tests/integration/clientes/rls.test.ts
it('user de tenant A no ve clientes de tenant B', async () => {
  const { userA, tenantB } = await setupTenantsAB();
  await db.insert(clientes).values({ tenantId: tenantB.id /* ... */ });
  const supA = createClientForUser(userA);
  const { data } = await supA.from('clientes').select('*');
  expect(data?.every((c) => c.tenant_id !== tenantB.id)).toBe(true);
});
```

- [ ] **Step 5: Commit**

```bash
pnpm db:migrate
pnpm test:integration tests/integration/clientes/rls.test.ts
git add supabase/migrations/0012_clientes_schema.sql supabase/migrations/0013_direcciones_contactos.sql src/lib/db/schema/clientes.ts src/lib/db/schema/direcciones-cliente.ts src/lib/db/schema/contactos-cliente.ts tests/integration/clientes/rls.test.ts
git commit -m "feat(clientes): add clientes, direcciones, contactos schemas with RLS"
```

---

## Task 2: Wrapper apis.net.pe con caché TTL 30d

**Estimado**: 3h
**Agente**: `backend-developer`
**Files:** `0014_validaciones_documento.sql`, `src/lib/db/schema/validaciones-documento.ts`, `src/lib/sunat/consultar-documento.ts`

- [ ] **Step 1: Migration validaciones_documento**

```sql
-- supabase/migrations/0014_validaciones_documento.sql
CREATE TABLE validaciones_documento (
  tipo_doc text NOT NULL,                        -- 'RUC' | 'DNI'
  numero text NOT NULL,
  datos jsonb NOT NULL,
  fuente text NOT NULL DEFAULT 'apis.net.pe',
  validado_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tipo_doc, numero)
);
CREATE INDEX validaciones_doc_validado_at_idx ON validaciones_documento(validado_at);

-- Sin RLS: es cache global, todos los tenants comparten
GRANT SELECT, INSERT, UPDATE ON validaciones_documento TO authenticated;
```

- [ ] **Step 2: Wrapper apis.net.pe**

```typescript
// src/lib/sunat/consultar-documento.ts
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { validacionesDocumento } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

const RucSchema = z.object({
  numeroDocumento: z.string(),
  razonSocial: z.string(),
  nombreComercial: z.string().nullable().optional(),
  estado: z.string(),
  condicion: z.string(),
  direccion: z.string().nullable(),
  ubigeo: z.string().nullable(),
  viaTipo: z.string().nullable().optional(),
  viaNombre: z.string().nullable().optional(),
});

const DniSchema = z.object({
  numeroDocumento: z.string(),
  nombres: z.string(),
  apellidoPaterno: z.string(),
  apellidoMaterno: z.string(),
});

const TTL_DAYS = 30;

export class ApiNetPeError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiNetPeError';
  }
}

async function fetchFromApi<T>(url: string, schema: z.ZodSchema<T>): Promise<T> {
  const token = process.env.APIS_NET_PE_TOKEN;
  if (!token) throw new Error('APIS_NET_PE_TOKEN missing');
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 60 * 60 * 24 * 30 }, // Vercel cache 30 días
  });
  if (!res.ok) throw new ApiNetPeError(res.status, `apis.net.pe ${res.status}`);
  const json = await res.json();
  return schema.parse(json);
}

export async function consultarRuc(ruc: string): Promise<z.infer<typeof RucSchema>> {
  // 1. Cache DB
  const cached = await db
    .select()
    .from(validacionesDocumento)
    .where(
      and(
        eq(validacionesDocumento.tipoDoc, 'RUC'),
        eq(validacionesDocumento.numero, ruc),
        sql`${validacionesDocumento.validadoAt} > now() - interval '${sql.raw(String(TTL_DAYS))} days'`
      )
    )
    .limit(1);
  if (cached[0]) return RucSchema.parse(cached[0].datos);

  // 2. API
  const data = await fetchFromApi(`https://api.apis.net.pe/v2/sunat/ruc?numero=${ruc}`, RucSchema);

  // 3. Persist cache
  await db
    .insert(validacionesDocumento)
    .values({
      tipoDoc: 'RUC',
      numero: ruc,
      datos: data,
      validadoAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [validacionesDocumento.tipoDoc, validacionesDocumento.numero],
      set: { datos: data, validadoAt: new Date() },
    });

  return data;
}

export async function consultarDni(dni: string): Promise<z.infer<typeof DniSchema>> {
  const cached = await db
    .select()
    .from(validacionesDocumento)
    .where(
      and(
        eq(validacionesDocumento.tipoDoc, 'DNI'),
        eq(validacionesDocumento.numero, dni),
        sql`${validacionesDocumento.validadoAt} > now() - interval '30 days'`
      )
    )
    .limit(1);
  if (cached[0]) return DniSchema.parse(cached[0].datos);

  const data = await fetchFromApi(`https://api.apis.net.pe/v2/reniec/dni?numero=${dni}`, DniSchema);
  await db
    .insert(validacionesDocumento)
    .values({
      tipoDoc: 'DNI',
      numero: dni,
      datos: data,
      validadoAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [validacionesDocumento.tipoDoc, validacionesDocumento.numero],
      set: { datos: data, validadoAt: new Date() },
    });

  return data;
}
```

- [ ] **Step 3: Tests con MSW**

```typescript
// tests/unit/sunat/consultar-documento.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { consultarRuc, ApiNetPeError } from '@/lib/sunat/consultar-documento';

const server = setupServer(
  http.get('https://api.apis.net.pe/v2/sunat/ruc', ({ request }) => {
    const ruc = new URL(request.url).searchParams.get('numero');
    if (ruc === '20614847370') {
      return HttpResponse.json({
        numeroDocumento: '20614847370',
        razonSocial: 'GRUPO IDEX SAC',
        estado: 'ACTIVO',
        condicion: 'HABIDO',
        direccion: 'AV LARCO 1234',
        ubigeo: '150122',
      });
    }
    return new HttpResponse(null, { status: 404 });
  })
);

beforeAll(() => server.listen());
afterAll(() => server.close());

describe('consultarRuc', () => {
  it('returns valid RUC data', async () => {
    const data = await consultarRuc('20614847370');
    expect(data.razonSocial).toBe('GRUPO IDEX SAC');
  });

  it('throws ApiNetPeError on 404', async () => {
    await expect(consultarRuc('00000000000')).rejects.toThrow(ApiNetPeError);
  });

  it('uses cache on second call', async () => {
    let apiHits = 0;
    server.use(
      http.get('https://api.apis.net.pe/v2/sunat/ruc', () => {
        apiHits++;
        return HttpResponse.json({
          /* ... */
        });
      })
    );
    await consultarRuc('20614847370');
    await consultarRuc('20614847370');
    expect(apiHits).toBe(1); // segunda llamada usa cache
  });
});
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0014_validaciones_documento.sql src/lib/db/schema/validaciones-documento.ts src/lib/sunat/consultar-documento.ts tests/unit/sunat/consultar-documento.test.ts
git commit -m "feat(clientes): add apis.net.pe wrapper with 30-day DB cache"
```

---

## Task 3: Server Actions CRUD + Zod schemas

**Estimado**: 3h
**Agente**: `backend-developer`
**Files:** `src/lib/schemas/cliente.ts`, `src/server/actions/clientes.ts`

- [ ] **Step 1: Zod schemas**

```typescript
// src/lib/schemas/cliente.ts
import { z } from 'zod';

export const TipoDocSchema = z.enum(['1', '4', '6', '7']); // DNI, CE, RUC, PAS

export const ClienteSchema = z
  .object({
    tipoDocumento: TipoDocSchema,
    numeroDocumento: z.string().min(8).max(15),
    razonSocial: z.string().min(2).max(150),
    nombreComercial: z.string().max(100).optional(),
    email: z.string().email().optional().or(z.literal('')),
    telefono: z.string().max(30).optional(),
    direccionFiscal: z.string().max(200).optional(),
    ubigeo: z
      .string()
      .regex(/^[0-9]{6}$/)
      .optional(),
    condicionPago: z.string().default('contado'),
    notas: z.string().max(1000).optional(),
  })
  .refine(
    (data) => {
      if (data.tipoDocumento === '6')
        return data.numeroDocumento.length === 11 && /^(10|20)/.test(data.numeroDocumento);
      if (data.tipoDocumento === '1') return data.numeroDocumento.length === 8;
      return true;
    },
    { message: 'Documento inválido para el tipo seleccionado' }
  );

export type ClienteInput = z.infer<typeof ClienteSchema>;
```

- [ ] **Step 2: Server actions**

```typescript
// src/server/actions/clientes.ts
'use server';
import { ClienteSchema, type ClienteInput } from '@/lib/schemas/cliente';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { clientes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function crearCliente(input: ClienteInput) {
  const data = ClienteSchema.parse(input);
  const { user, tenant } = await requirePermission('clientes.crear');

  // Check duplicado
  const [existing] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(
      and(
        eq(clientes.tenantId, tenant.id),
        eq(clientes.tipoDocumento, data.tipoDocumento),
        eq(clientes.numeroDocumento, data.numeroDocumento)
      )
    )
    .limit(1);
  if (existing) return { success: false as const, error: 'duplicate', existingId: existing.id };

  const [created] = await db
    .insert(clientes)
    .values({
      ...data,
      tenantId: tenant.id,
      createdBy: user.id,
    })
    .returning();

  revalidatePath(`/${tenant.slug}/clientes`);
  return { success: true as const, data: created };
}

export async function actualizarCliente(id: string, input: ClienteInput) {
  const data = ClienteSchema.parse(input);
  const { tenant } = await requirePermission('clientes.editar');
  await db
    .update(clientes)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(clientes.id, id), eq(clientes.tenantId, tenant.id)));
  revalidatePath(`/${tenant.slug}/clientes/${id}`);
  return { success: true as const, data: null };
}

export async function eliminarCliente(id: string) {
  const { tenant } = await requirePermission('clientes.eliminar');
  // Soft delete
  await db
    .update(clientes)
    .set({ estado: 'suspendido' })
    .where(and(eq(clientes.id, id), eq(clientes.tenantId, tenant.id)));
  revalidatePath(`/${tenant.slug}/clientes`);
  return { success: true as const, data: null };
}

export async function exportarClientesExcel() {
  await requirePermission('clientes.exportar');
  const { tenant } = await requirePermission('clientes.exportar');
  const list = await db.select().from(clientes).where(eq(clientes.tenantId, tenant.id));
  // Generar Excel con ExcelJS, devolver base64 o redirigir a Storage URL
  // Implementación detallada: ver helper src/lib/excel/export-clientes.ts
  // ...
  return { success: true as const, data: { downloadUrl: '...' } };
}
```

- [ ] **Step 3: Test crear cliente**

```typescript
// tests/integration/clientes/crear.test.ts
it('crear cliente con permiso correcto inserta y revalida', async () => {
  const { user, tenant } = await loginUserWithRole('Comercial');
  const result = await crearCliente({
    tipoDocumento: '6',
    numeroDocumento: '20614847370',
    razonSocial: 'GRUPO IDEX SAC',
  });
  expect(result.success).toBe(true);
});

it('crear cliente sin permiso lanza ForbiddenError', async () => {
  const { user, tenant } = await loginUserWithRole('Facturación'); // sin clientes.crear
  await expect(
    crearCliente({
      /*...*/
    })
  ).rejects.toThrow('Sin permiso: clientes.crear');
});
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/schemas/cliente.ts src/server/actions/clientes.ts tests/integration/clientes/crear.test.ts
git commit -m "feat(clientes): add CRUD server actions with Casbin checks"
```

---

## Task 4: Listado + búsqueda + paginación TanStack Table

**Estimado**: 3h
**Agente**: `frontend-developer`
**Files:** `src/app/(app)/[companySlug]/clientes/page.tsx`, `src/components/modules/clientes/ClientesList.tsx`

- [ ] **Step 1: Page (Server Component)**

```typescript
// src/app/(app)/[companySlug]/clientes/page.tsx
import { db } from '@/lib/db/client';
import { clientes } from '@/lib/db/schema';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { requirePermission } from '@/lib/auth/require-permission';
import { ClientesList } from '@/components/modules/clientes/ClientesList';
import { eq, desc } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function ClientesPage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  await requirePermission('clientes.ver');
  const tenant = await getCurrentTenant();
  const { companySlug } = await params;
  const { search = '', page = '1' } = await searchParams;
  const pageNum = parseInt(page);
  const PAGE_SIZE = 50;

  // TODO: filtrar por search usando search_vector / tsquery
  const list = await db
    .select()
    .from(clientes)
    .where(eq(clientes.tenantId, tenant.id))
    .orderBy(desc(clientes.createdAt))
    .limit(PAGE_SIZE)
    .offset((pageNum - 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Button asChild><Link href={`/${companySlug}/clientes/nuevo`}>Nuevo cliente</Link></Button>
      </div>
      <ClientesList data={list} companySlug={companySlug} />
    </div>
  );
}
```

- [ ] **Step 2: ClientesList con TanStack Table**

```typescript
// src/components/modules/clientes/ClientesList.tsx
'use client';
import { useReactTable, getCoreRowModel, getFilteredRowModel, type ColumnDef } from '@tanstack/react-table';
import type { Cliente } from '@/lib/db/schema';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const columns = (slug: string): ColumnDef<Cliente>[] => [
  {
    accessorKey: 'numeroDocumento',
    header: 'Documento',
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        <Badge variant="outline" className="mr-1">{tipoLabel(row.original.tipoDocumento)}</Badge>
        {row.original.numeroDocumento}
      </span>
    ),
  },
  {
    accessorKey: 'razonSocial',
    header: 'Razón social',
    cell: ({ row }) => (
      <Link href={`/${slug}/clientes/${row.original.id}`} className="text-primary hover:underline">
        {row.original.razonSocial}
      </Link>
    ),
  },
  { accessorKey: 'condicionPago', header: 'Condición' },
  { accessorKey: 'estado', header: 'Estado', cell: ({ getValue }) => <Badge>{getValue() as string}</Badge> },
];

function tipoLabel(tipo: string) {
  return { '1': 'DNI', '4': 'CE', '6': 'RUC', '7': 'PAS' }[tipo] ?? tipo;
}

export function ClientesList({ data, companySlug }: { data: Cliente[]; companySlug: string }) {
  const [filter, setFilter] = useState('');
  const cols = useMemo(() => columns(companySlug), [companySlug]);

  const table = useReactTable({
    data,
    columns: cols,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { globalFilter: filter },
    onGlobalFilterChange: setFilter,
  });

  return (
    <div className="space-y-2">
      <Input placeholder="Buscar por nombre, RUC, DNI..." value={filter} onChange={(e) => setFilter(e.target.value)} />
      <table className="w-full border-collapse">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b text-left text-sm">
              {hg.headers.map((h) => <th key={h.id} className="py-2">{h.column.columnDef.header as string}</th>)}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b hover:bg-muted/30">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/\[companySlug\]/clientes/page.tsx src/components/modules/clientes/ClientesList.tsx
git commit -m "feat(clientes): add list page with search and pagination"
```

---

## Task 5: Form crear/editar con autocompletado RUC

**Estimado**: 3h
**Agente**: `frontend-developer`
**Files:** `src/components/modules/clientes/ClienteForm.tsx`, `src/components/modules/clientes/DocAutocomplete.tsx`, pages nuevo/editar.

- [ ] **Step 1: DocAutocomplete component**

```typescript
// src/components/modules/clientes/DocAutocomplete.tsx
'use client';
import { useDebouncedCallback } from 'use-debounce';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { consultarDocumento } from '@/server/actions/clientes-validacion';

export function DocAutocomplete() {
  const form = useFormContext();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [warning, setWarning] = useState<string | null>(null);

  const lookup = useDebouncedCallback(async (tipo: string, numero: string) => {
    if (!numero || (tipo === '6' && numero.length !== 11) || (tipo === '1' && numero.length !== 8)) {
      return setStatus('idle');
    }
    setStatus('loading');
    setWarning(null);
    const res = await consultarDocumento(tipo, numero);
    if (res.success) {
      setStatus('success');
      // Autocompletar campos
      form.setValue('razonSocial', res.data.razonSocial ?? `${res.data.nombres} ${res.data.apellidoPaterno} ${res.data.apellidoMaterno}`);
      if (res.data.direccion) form.setValue('direccionFiscal', res.data.direccion);
      if (res.data.ubigeo) form.setValue('ubigeo', res.data.ubigeo);
    } else if (res.error === 'api-down') {
      setStatus('error');
      setWarning('apis.net.pe no responde. Podés ingresar los datos a mano.');
    } else {
      setStatus('error');
      setWarning(`Documento no encontrado: ${res.error}`);
    }
  }, 300);

  // Watch tipoDocumento + numeroDocumento
  const tipo = form.watch('tipoDocumento');
  const numero = form.watch('numeroDocumento');

  // useEffect dispara lookup
  useEffect(() => { if (tipo && numero) lookup(tipo, numero); }, [tipo, numero, lookup]);

  return (
    <div className="text-xs">
      {status === 'loading' && <span className="text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Consultando...</span>}
      {status === 'success' && <span className="text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Datos autocompletados</span>}
      {status === 'error' && warning && <span className="text-orange-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {warning}</span>}
    </div>
  );
}
```

- [ ] **Step 2: Server Action `consultarDocumento`**

```typescript
// src/server/actions/clientes-validacion.ts
'use server';
import { consultarRuc, consultarDni, ApiNetPeError } from '@/lib/sunat/consultar-documento';

export async function consultarDocumento(tipo: string, numero: string) {
  try {
    if (tipo === '6') {
      const data = await consultarRuc(numero);
      return { success: true as const, data };
    }
    if (tipo === '1') {
      const data = await consultarDni(numero);
      return { success: true as const, data };
    }
    return { success: false as const, error: 'unsupported-type' };
  } catch (e) {
    if (e instanceof ApiNetPeError) {
      if (e.status === 404) return { success: false as const, error: 'not-found' };
      if (e.status >= 500) return { success: false as const, error: 'api-down' };
    }
    return { success: false as const, error: 'unknown' };
  }
}
```

- [ ] **Step 3: ClienteForm**

```typescript
// src/components/modules/clientes/ClienteForm.tsx
'use client';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClienteSchema, type ClienteInput } from '@/lib/schemas/cliente';
import { crearCliente, actualizarCliente } from '@/server/actions/clientes';
import { DocAutocomplete } from './DocAutocomplete';
// ... shadcn imports

export function ClienteForm({ initialData, mode }: { initialData?: ClienteInput; mode: 'create' | 'edit' }) {
  const form = useForm<ClienteInput>({
    resolver: zodResolver(ClienteSchema),
    defaultValues: initialData,
  });

  const onSubmit = async (data: ClienteInput) => {
    const action = mode === 'create' ? crearCliente : (input: ClienteInput) => actualizarCliente(initialData!.id, input);
    const res = await action(data);
    if (res.success) router.push(`/${params.companySlug}/clientes`);
    else toast.error(res.error);
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField name="tipoDocumento" render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">DNI</SelectItem>
                  <SelectItem value="6">RUC</SelectItem>
                  <SelectItem value="4">Carnet de extranjería</SelectItem>
                  <SelectItem value="7">Pasaporte</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField name="numeroDocumento" render={({ field }) => (
            <FormItem>
              <FormLabel>Número</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <DocAutocomplete />
            </FormItem>
          )} />
        </div>
        <FormField name="razonSocial" render={({ field }) => (
          <FormItem>
            <FormLabel>Razón social / Nombre</FormLabel>
            <FormControl><Input {...field} /></FormControl>
          </FormItem>
        )} />
        {/* ... más campos */}
        <Button type="submit">Guardar</Button>
      </form>
    </FormProvider>
  );
}
```

- [ ] **Step 4: Pages nuevo y editar**

```typescript
// src/app/(app)/[companySlug]/clientes/nuevo/page.tsx
import { ClienteForm } from '@/components/modules/clientes/ClienteForm';
import { requirePermission } from '@/lib/auth/require-permission';

export default async function NuevoClientePage() {
  await requirePermission('clientes.crear');
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Nuevo cliente</h1>
      <ClienteForm mode="create" />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/modules/clientes/ClienteForm.tsx src/components/modules/clientes/DocAutocomplete.tsx src/app/\(app\)/\[companySlug\]/clientes/nuevo/ src/server/actions/clientes-validacion.ts
git commit -m "feat(clientes): add cliente form with RUC/DNI autocomplete"
```

---

## Task 6: Tabs detalle (direcciones, contactos, historial)

**Estimado**: 3h
**Agente**: `frontend-developer`
**Files:** `src/app/(app)/[companySlug]/clientes/[id]/page.tsx`, tabs en `src/components/modules/clientes/tabs/`

- [ ] **Step 1: Page con tabs**

```typescript
// src/app/(app)/[companySlug]/clientes/[id]/page.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { db } from '@/lib/db/client';
import { clientes, direccionesCliente, contactosCliente } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { ClienteForm } from '@/components/modules/clientes/ClienteForm';
import { DireccionesTab } from '@/components/modules/clientes/tabs/DireccionesTab';
import { ContactosTab } from '@/components/modules/clientes/tabs/ContactosTab';
import { HistorialTab } from '@/components/modules/clientes/tabs/HistorialTab';

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string; companySlug: string }> }) {
  const { id } = await params;
  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, id));
  if (!cliente) notFound();

  const direcciones = await db.select().from(direccionesCliente).where(eq(direccionesCliente.clienteId, id));
  const contactos = await db.select().from(contactosCliente).where(eq(contactosCliente.clienteId, id));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{cliente.razonSocial}</h1>
      <Tabs defaultValue="datos">
        <TabsList>
          <TabsTrigger value="datos">Datos</TabsTrigger>
          <TabsTrigger value="direcciones">Direcciones ({direcciones.length})</TabsTrigger>
          <TabsTrigger value="contactos">Contactos ({contactos.length})</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>
        <TabsContent value="datos"><ClienteForm initialData={cliente} mode="edit" /></TabsContent>
        <TabsContent value="direcciones"><DireccionesTab clienteId={id} initial={direcciones} /></TabsContent>
        <TabsContent value="contactos"><ContactosTab clienteId={id} initial={contactos} /></TabsContent>
        <TabsContent value="historial"><HistorialTab clienteId={id} /></TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: DireccionesTab y ContactosTab (CRUD inline)**

Cada uno: tabla con add/edit/delete en línea, calling Server Actions específicos. Pattern estándar.

- [ ] **Step 3: HistorialTab**

```typescript
// Trae cotizaciones + facturas + pagos del cliente
// Por ahora stub si B.5/B.9/B.10 no están: mostrar "Sin actividad aún"
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/\[companySlug\]/clientes/\[id\]/ src/components/modules/clientes/tabs/
git commit -m "feat(clientes): add cliente detail page with tabs (datos, direcciones, contactos, historial)"
```

---

## Done criteria del módulo

- [ ] Crear cliente con RUC `20614847370` → autocompleta razón social, dirección, ubigeo.
- [ ] Crear cliente con RUC inválido → muestra error sin crashear.
- [ ] Crear cliente con apis.net.pe caído → permite ingresar manualmente con warning visible.
- [ ] User con rol Comercial puede crear; sin permiso, falla con mensaje claro.
- [ ] Búsqueda en tabla por RUC/razón social funciona en <300ms (los datos ya en cliente).
- [ ] Cache 30 días verificado: dos crear cliente con mismo RUC en una semana → 1 sola llamada a apis.net.pe.

## Notas

- **Rate limit apis.net.pe**: 100/día gratis. Si Idex importa 200 clientes el día 1, se acaba la cuota. Solución: cache funciona tras la primera importación, pero la primera vuelta puede fallar. Considerar plan pago de apis.net.pe (~S/ 50/mes).
- **Búsqueda full-text**: el schema ya tiene `search_vector`. Para búsquedas grandes (>100 registros), filtrar server-side con `tsquery`. El listado actual filtra cliente-side; sirve hasta ~500 clientes.
- **Direcciones múltiples**: B.8 (guías) consume `direcciones_cliente` para destinos de envío.
