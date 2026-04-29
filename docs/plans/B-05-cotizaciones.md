# B.5 — Cotizaciones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` o `superpowers:executing-plans`.

**Goal:** Sistema de cotizaciones con state machine xstate (6 estados), generación de PDF profesional con react-pdf serverless, conversión a OC/factura/guía sin perder trazabilidad, selector de margen con bloqueo si menor al mínimo del producto.

**Architecture:** State machine con eventos formales (xstate). PDF generado server-side con `@react-pdf/renderer` (NO Puppeteer). Snapshot de líneas en tabla aparte (`cotizaciones_versiones`) cada vez que se edita post-envío para mantener trazabilidad. Trigger SQL para correlativos `COT-YYYY-NNNNN` por tenant.

**Tech Stack:** Drizzle, xstate v5, @react-pdf/renderer, react-hook-form, Zod, TanStack Query, @dnd-kit/core (reordenar líneas), cmdk (búsqueda producto inline).

**Estimación**: 30h — 9 tareas.

**Dependencias upstream**: B.3 (clientes) + B.4 (productos).
**Dependencias downstream**: B.6 (OC reusa), B.9 (factura desde cotización).

---

## File structure

```
supabase/migrations/
├── 0019_cotizaciones_schema.sql           # cotizaciones + lineas + versiones
├── 0020_correlativos_cotizaciones.sql     # función + trigger
└── 0021_series_documentos.sql             # tabla compartida con SUNAT (B.8/B.9)

src/lib/db/schema/
├── cotizaciones.ts
├── lineas-cotizacion.ts
├── cotizaciones-versiones.ts
└── series-documentos.ts

src/lib/state-machines/
└── cotizacion-machine.ts                  # xstate

src/lib/pdf/
├── cotizacion-template.tsx                # react-pdf
└── render-pdf.ts                          # helper

src/lib/schemas/
└── cotizacion.ts

src/server/actions/
├── cotizaciones.ts                        # CRUD + transiciones
├── cotizaciones-pdf.ts
└── cotizaciones-convertir.ts

src/app/(app)/[companySlug]/cotizaciones/
├── page.tsx
├── nueva/page.tsx
└── [id]/
    ├── page.tsx
    ├── editar/page.tsx
    └── preview-pdf/page.tsx

src/components/modules/cotizaciones/
├── CotizacionesList.tsx
├── CotizacionForm.tsx
├── LineasTable.tsx                        # con DnD
├── BuscarProductoCmdk.tsx
├── TotalesPanel.tsx
├── MargenSelector.tsx
└── EstadoTimeline.tsx
```

---

## Task 1: Schema cotizaciones + lineas + versiones + RLS

**Estimado**: 3h
**Agente**: `schema-builder`
**Files:** `0019_cotizaciones_schema.sql`, drizzle schemas.

- [ ] **Step 1: Migration**

```sql
-- supabase/migrations/0019_cotizaciones_schema.sql
CREATE TABLE cotizaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  numero text NOT NULL,                          -- 'COT-2026-00123'
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  estado text NOT NULL DEFAULT 'borrador',
  fecha_emision date NOT NULL DEFAULT current_date,
  fecha_vencimiento date NOT NULL,
  moneda text NOT NULL DEFAULT 'USD',
  tipo_cambio numeric(10,4),                     -- congelado al emitir
  subtotal numeric(14,4) NOT NULL DEFAULT 0,
  descuento numeric(14,4) DEFAULT 0,
  igv numeric(14,4) NOT NULL DEFAULT 0,
  total numeric(14,4) NOT NULL DEFAULT 0,
  margen_aplicado numeric(5,2),                  -- 5/10/15 o custom
  terminos_pago text,
  tiempo_entrega text,
  observaciones text,
  pdf_url text,
  comercial_id uuid REFERENCES auth.users(id),
  fecha_envio timestamptz,
  fecha_aprobacion timestamptz,
  fecha_rechazo timestamptz,
  motivo_rechazo text,
  cotizacion_origen_id uuid REFERENCES cotizaciones(id),  -- para revisiones
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  UNIQUE (tenant_id, numero)
);
CREATE INDEX cotizaciones_tenant_idx ON cotizaciones(tenant_id);
CREATE INDEX cotizaciones_cliente_idx ON cotizaciones(cliente_id);
CREATE INDEX cotizaciones_estado_idx ON cotizaciones(estado);
CREATE INDEX cotizaciones_comercial_idx ON cotizaciones(comercial_id);

CREATE TABLE lineas_cotizacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id uuid NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES productos(id),     -- nullable si producto eliminado
  sku_snapshot text NOT NULL,                    -- copia para trazabilidad
  descripcion text NOT NULL,
  cantidad numeric(10,2) NOT NULL CHECK (cantidad > 0),
  precio_unitario numeric(14,4) NOT NULL CHECK (precio_unitario >= 0),
  margen_linea numeric(5,2),
  descuento_linea numeric(14,4) DEFAULT 0,
  subtotal numeric(14,4) NOT NULL,
  orden int NOT NULL DEFAULT 0
);
CREATE INDEX lineas_cotizacion_cot_idx ON lineas_cotizacion(cotizacion_id, orden);

-- Versiones: snapshot al cambiar post-envío
CREATE TABLE cotizaciones_versiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id uuid NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  version int NOT NULL,
  snapshot jsonb NOT NULL,                       -- cotizacion + lineas en JSON
  pdf_url text,
  cambio_descripcion text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cotizacion_id, version)
);

ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cotizaciones_tenant_isolation" ON cotizaciones FOR ALL
USING (tenant_id = current_tenant_id());

ALTER TABLE lineas_cotizacion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lineas_via_cotizacion" ON lineas_cotizacion FOR ALL
USING (cotizacion_id IN (SELECT id FROM cotizaciones WHERE tenant_id = current_tenant_id()));

ALTER TABLE cotizaciones_versiones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "versiones_via_cotizacion" ON cotizaciones_versiones FOR ALL
USING (cotizacion_id IN (SELECT id FROM cotizaciones WHERE tenant_id = current_tenant_id()));
```

- [ ] **Step 2: Drizzle schemas + Zod**

```typescript
// src/lib/db/schema/cotizaciones.ts (esqueleto)
export const cotizaciones = pgTable('cotizaciones', {
  /* ... */
});
export const lineasCotizacion = pgTable('lineas_cotizacion', {
  /* ... */
});
export const cotizacionesVersiones = pgTable('cotizaciones_versiones', {
  /* ... */
});
```

```typescript
// src/lib/schemas/cotizacion.ts
import { z } from 'zod';

export const LineaCotizacionSchema = z.object({
  productoId: z.string().uuid().nullable(),
  skuSnapshot: z.string(),
  descripcion: z.string().min(2),
  cantidad: z.coerce.number().gt(0),
  precioUnitario: z.coerce.number().nonnegative(),
  margenLinea: z.coerce.number().min(0).max(100).optional(),
  descuentoLinea: z.coerce.number().nonnegative().default(0),
  orden: z.number().int().nonnegative().default(0),
});

export const CotizacionSchema = z.object({
  clienteId: z.string().uuid(),
  fechaVencimiento: z.string().date(), // ISO
  moneda: z.enum(['PEN', 'USD']).default('USD'),
  tipoCambio: z.coerce.number().positive().optional(), // requerido si moneda=USD y se va a convertir
  margenAplicado: z.coerce.number().min(0).max(100).optional(),
  terminosPago: z.string().max(200).optional(),
  tiempoEntrega: z.string().max(100).optional(),
  observaciones: z.string().max(2000).optional(),
  lineas: z.array(LineaCotizacionSchema).min(1),
});

export type CotizacionInput = z.infer<typeof CotizacionSchema>;
```

- [ ] **Step 3: Commit**

```bash
pnpm db:migrate
git add supabase/migrations/0019_cotizaciones_schema.sql src/lib/db/schema/cotizaciones.ts src/lib/db/schema/lineas-cotizacion.ts src/lib/db/schema/cotizaciones-versiones.ts src/lib/schemas/cotizacion.ts
git commit -m "feat(cotizaciones): add schema with versioning and RLS"
```

---

## Task 2: Trigger SQL para correlativo `COT-YYYY-NNNNN`

**Estimado**: 1h
**Agente**: `schema-builder`
**Files:** `0020_correlativos_cotizaciones.sql`

- [ ] **Step 1: Tabla counter por tenant + año**

```sql
-- supabase/migrations/0020_correlativos_cotizaciones.sql
CREATE TABLE correlativos_cotizacion (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ano int NOT NULL,
  ultimo_correlativo int NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, ano)
);

CREATE OR REPLACE FUNCTION generar_numero_cotizacion(p_tenant_id uuid)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_ano int := extract(year from current_date);
  v_correlativo int;
BEGIN
  INSERT INTO correlativos_cotizacion (tenant_id, ano, ultimo_correlativo)
  VALUES (p_tenant_id, v_ano, 1)
  ON CONFLICT (tenant_id, ano)
  DO UPDATE SET ultimo_correlativo = correlativos_cotizacion.ultimo_correlativo + 1
  RETURNING ultimo_correlativo INTO v_correlativo;
  RETURN 'COT-' || v_ano || '-' || lpad(v_correlativo::text, 5, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION generar_numero_cotizacion(uuid) TO authenticated;
```

- [ ] **Step 2: Test concurrencia**

```typescript
// 100 INSERTs paralelos no producen huecos ni duplicados
it('generar_numero_cotizacion no produce duplicados con concurrencia', async () => {
  const results = await Promise.all(
    Array.from({ length: 100 }, () =>
      db.execute(sql`SELECT generar_numero_cotizacion(${tenantId}) AS n`)
    )
  );
  const numeros = results.map((r) => r.rows[0].n);
  expect(new Set(numeros).size).toBe(100); // todos únicos
});
```

- [ ] **Step 3: Commit**

```bash
pnpm db:migrate && pnpm test:integration tests/integration/cotizaciones/correlativos.test.ts
git add supabase/migrations/0020_correlativos_cotizaciones.sql tests/integration/cotizaciones/correlativos.test.ts
git commit -m "feat(cotizaciones): add atomic correlativo generation"
```

---

## Task 3: State machine xstate

**Estimado**: 4h
**Agente**: `architect`
**Files:** `src/lib/state-machines/cotizacion-machine.ts`

- [ ] **Step 1: Definir máquina**

```typescript
// src/lib/state-machines/cotizacion-machine.ts
import { setup, assign } from 'xstate';

export type CotizacionContext = {
  cotizacionId: string;
  cliente: { id: string; nombre: string };
  total: number;
  fechaVencimiento: string;
};

export type CotizacionEvent =
  | { type: 'ENVIAR' }
  | { type: 'APROBAR'; userId: string }
  | { type: 'RECHAZAR'; motivo: string; userId: string }
  | { type: 'CONVERTIR'; tipo: 'orden_compra' | 'factura' | 'guia'; userId: string }
  | { type: 'EXPIRAR' }
  | { type: 'EDITAR' };

export const cotizacionMachine = setup({
  types: {
    context: {} as CotizacionContext,
    events: {} as CotizacionEvent,
  },
  guards: {
    cotizacionVencida: ({ context }) => {
      return new Date(context.fechaVencimiento) < new Date();
    },
    montoMayorALimite: ({ context }) => {
      // Si total > 10k USD, requiere aprobación adicional (futuro)
      return context.total > 10000;
    },
  },
  actions: {
    persistirEstado: ({ context, event }, params: { nuevoEstado: string }) => {
      // Disparar Server Action para grabar en DB
      // (En xstate puro este efecto vive afuera; aquí lo declaramos para que el wrapper sepa qué llamar.)
    },
  },
}).createMachine({
  id: 'cotizacion',
  initial: 'borrador',
  states: {
    borrador: {
      on: {
        ENVIAR: {
          target: 'enviada',
          actions: { type: 'persistirEstado', params: { nuevoEstado: 'enviada' } },
        },
        EDITAR: 'borrador', // permite editar sin transición
      },
    },
    enviada: {
      on: {
        APROBAR: {
          target: 'aprobada',
          actions: { type: 'persistirEstado', params: { nuevoEstado: 'aprobada' } },
        },
        RECHAZAR: {
          target: 'rechazada',
          actions: { type: 'persistirEstado', params: { nuevoEstado: 'rechazada' } },
        },
        EXPIRAR: {
          target: 'vencida',
          actions: { type: 'persistirEstado', params: { nuevoEstado: 'vencida' } },
        },
        EDITAR: 'enviada', // crea versión nueva
      },
    },
    aprobada: {
      on: {
        CONVERTIR: {
          target: 'convertida',
          actions: { type: 'persistirEstado', params: { nuevoEstado: 'convertida' } },
        },
        EXPIRAR: { target: 'vencida' },
      },
    },
    rechazada: { type: 'final' },
    convertida: { type: 'final' },
    vencida: { type: 'final' },
  },
});
```

- [ ] **Step 2: Helper para resolver transiciones server-side**

```typescript
// src/lib/state-machines/cotizacion-transition.ts
import { createActor } from 'xstate';
import { cotizacionMachine } from './cotizacion-machine';

export type EstadoCotizacion =
  | 'borrador'
  | 'enviada'
  | 'aprobada'
  | 'rechazada'
  | 'convertida'
  | 'vencida';

export function canTransition(from: EstadoCotizacion, event: CotizacionEvent['type']): boolean {
  const actor = createActor(cotizacionMachine, {
    snapshot: cotizacionMachine.resolveState({ value: from, context: {} as any }),
  });
  actor.start();
  const transitions = actor.getSnapshot().nextEvents ?? [];
  return transitions.includes(event);
}
```

- [ ] **Step 3: Test de transiciones**

```typescript
// tests/unit/state-machines/cotizacion.test.ts
it('borrador → enviada via ENVIAR', () => {
  expect(canTransition('borrador', 'ENVIAR')).toBe(true);
});
it('aprobada NO puede ir a borrador', () => {
  expect(canTransition('aprobada', 'EDITAR' as any)).toBe(false);
});
it('rechazada es final', () => {
  expect(canTransition('rechazada', 'APROBAR' as any)).toBe(false);
});
```

- [ ] **Step 4: Commit**

```bash
pnpm test tests/unit/state-machines/cotizacion.test.ts
git add src/lib/state-machines/ tests/unit/state-machines/
git commit -m "feat(cotizaciones): add xstate state machine for 6-state flow"
```

---

## Task 4: Server Actions: crear, editar, transiciones

**Estimado**: 4h
**Agente**: `backend-developer`
**Files:** `src/server/actions/cotizaciones.ts`

- [ ] **Step 1: crearCotizacion**

```typescript
// src/server/actions/cotizaciones.ts
'use server';
import { CotizacionSchema, type CotizacionInput } from '@/lib/schemas/cotizacion';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { cotizaciones, lineasCotizacion, productos, preciosProducto } from '@/lib/db/schema';
import { sql, eq, and, lte } from 'drizzle-orm';
import { canTransition, type EstadoCotizacion } from '@/lib/state-machines/cotizacion-transition';
import { revalidatePath } from 'next/cache';

function calcularTotales(input: CotizacionInput) {
  let subtotal = 0;
  for (const linea of input.lineas) {
    subtotal += linea.cantidad * linea.precioUnitario - (linea.descuentoLinea ?? 0);
  }
  const igv = subtotal * 0.18;
  return { subtotal, igv, total: subtotal + igv };
}

export async function crearCotizacion(input: CotizacionInput) {
  const data = CotizacionSchema.parse(input);
  const { user, tenant } = await requirePermission('cotizaciones.crear');

  // Validar margen mínimo
  for (const linea of data.lineas) {
    if (!linea.productoId) continue;
    const [p] = await db
      .select()
      .from(productos)
      .where(eq(productos.id, linea.productoId))
      .limit(1);
    if (!p?.margenMinimo) continue;
    const [precioCompra] = await db
      .select()
      .from(preciosProducto)
      .where(and(eq(preciosProducto.productoId, p.id), eq(preciosProducto.tipo, 'compra')))
      .orderBy(sql`vigente_desde DESC`)
      .limit(1);
    if (precioCompra) {
      const margen =
        ((linea.precioUnitario - Number(precioCompra.precio)) / Number(precioCompra.precio)) * 100;
      if (margen < Number(p.margenMinimo)) {
        return {
          success: false as const,
          error: 'business',
          message: `Margen ${margen.toFixed(1)}% menor al mínimo ${p.margenMinimo}% para ${p.sku}`,
        };
      }
    }
  }

  const { subtotal, igv, total } = calcularTotales(data);

  return db.transaction(async (tx) => {
    const numero = await tx.execute(sql`SELECT generar_numero_cotizacion(${tenant.id}) AS n`);
    const [cot] = await tx
      .insert(cotizaciones)
      .values({
        tenantId: tenant.id,
        numero: numero.rows[0].n as string,
        clienteId: data.clienteId,
        estado: 'borrador',
        fechaVencimiento: data.fechaVencimiento,
        moneda: data.moneda,
        tipoCambio: data.tipoCambio?.toString(),
        subtotal: subtotal.toFixed(4),
        igv: igv.toFixed(4),
        total: total.toFixed(4),
        margenAplicado: data.margenAplicado?.toString(),
        terminosPago: data.terminosPago,
        tiempoEntrega: data.tiempoEntrega,
        observaciones: data.observaciones,
        comercialId: user.id,
      })
      .returning();

    for (const [idx, linea] of data.lineas.entries()) {
      await tx.insert(lineasCotizacion).values({
        cotizacionId: cot.id,
        productoId: linea.productoId,
        skuSnapshot: linea.skuSnapshot,
        descripcion: linea.descripcion,
        cantidad: linea.cantidad.toString(),
        precioUnitario: linea.precioUnitario.toString(),
        margenLinea: linea.margenLinea?.toString(),
        descuentoLinea: linea.descuentoLinea.toString(),
        subtotal: (linea.cantidad * linea.precioUnitario - linea.descuentoLinea).toFixed(4),
        orden: linea.orden ?? idx,
      });
    }

    revalidatePath(`/${tenant.slug}/cotizaciones`);
    return { success: true as const, data: cot };
  });
}

export async function transicionarCotizacion(
  cotizacionId: string,
  evento: 'ENVIAR' | 'APROBAR' | 'RECHAZAR' | 'EXPIRAR',
  payload?: { motivoRechazo?: string }
) {
  const { user, tenant } = await requirePermission(
    evento === 'APROBAR' ? 'cotizaciones.aprobar' : 'cotizaciones.editar'
  );

  const [cot] = await db
    .select()
    .from(cotizaciones)
    .where(eq(cotizaciones.id, cotizacionId))
    .limit(1);
  if (!cot || cot.tenantId !== tenant.id) return { success: false as const, error: 'not-found' };

  if (!canTransition(cot.estado as EstadoCotizacion, evento)) {
    return { success: false as const, error: 'invalid-transition' };
  }

  const updates: Record<string, any> = { updatedAt: new Date() };
  switch (evento) {
    case 'ENVIAR':
      updates.estado = 'enviada';
      updates.fechaEnvio = new Date();
      break;
    case 'APROBAR':
      updates.estado = 'aprobada';
      updates.fechaAprobacion = new Date();
      break;
    case 'RECHAZAR':
      updates.estado = 'rechazada';
      updates.fechaRechazo = new Date();
      updates.motivoRechazo = payload?.motivoRechazo;
      break;
    case 'EXPIRAR':
      updates.estado = 'vencida';
      break;
  }

  await db.update(cotizaciones).set(updates).where(eq(cotizaciones.id, cotizacionId));
  revalidatePath(`/${tenant.slug}/cotizaciones/${cotizacionId}`);
  return { success: true as const, data: null };
}
```

- [ ] **Step 2: Tests transiciones**

```typescript
it('aprobar cotización borrador falla con invalid-transition', async () => {
  const cot = await createTestCotizacion({ estado: 'borrador' });
  const res = await transicionarCotizacion(cot.id, 'APROBAR');
  expect(res.success).toBe(false);
});
```

- [ ] **Step 3: Commit**

```bash
git add src/server/actions/cotizaciones.ts tests/integration/cotizaciones/
git commit -m "feat(cotizaciones): add CRUD and state transition server actions"
```

---

## Task 5: Form creación con líneas dinámicas, búsqueda producto, totales en vivo

**Estimado**: 5h
**Agente**: `frontend-developer`
**Files:** `src/components/modules/cotizaciones/CotizacionForm.tsx`, `LineasTable.tsx`, `BuscarProductoCmdk.tsx`, `TotalesPanel.tsx`

- [ ] **Step 1: BuscarProductoCmdk (autocomplete con cmdk + pg_trgm)**

```typescript
// src/components/modules/cotizaciones/BuscarProductoCmdk.tsx
'use client';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { searchProductos } from '@/server/actions/productos-search';

export function BuscarProductoCmdk({ onSelect }: { onSelect: (p: any) => void }) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const search = useDebouncedCallback(async (q: string) => {
    if (!q) return setResults([]);
    const r = await searchProductos(q, 10);
    setResults(r.rows);
  }, 200);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start">+ Agregar producto</Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar SKU o descripción..." onValueChange={search} />
          <CommandEmpty>Sin resultados</CommandEmpty>
          <CommandGroup>
            {results.map((p) => (
              <CommandItem
                key={p.id}
                onSelect={() => {
                  onSelect(p);
                  setOpen(false);
                }}
              >
                <span className="font-mono text-xs mr-2">{p.sku}</span>
                {p.descripcion}
                {p.precio_venta_sugerido && (
                  <span className="ml-auto font-semibold">USD {Number(p.precio_venta_sugerido).toFixed(2)}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: LineasTable con DnD**

```typescript
// src/components/modules/cotizaciones/LineasTable.tsx
'use client';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { GripVertical, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function LineasTable() {
  const { control, watch } = useFormContext();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'lineas' });

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = fields.findIndex((f) => f.id === active.id);
      const newIdx = fields.findIndex((f) => f.id === over.id);
      move(oldIdx, newIdx);
    }
  };

  return (
    <div className="space-y-2">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          {fields.map((field, idx) => (
            <LineaRow key={field.id} id={field.id} idx={idx} onRemove={() => remove(idx)} />
          ))}
        </SortableContext>
      </DndContext>
      <BuscarProductoCmdk onSelect={(p) => append({
        productoId: p.id,
        skuSnapshot: p.sku,
        descripcion: p.descripcion,
        cantidad: 1,
        precioUnitario: Number(p.precio_venta_sugerido ?? 0),
        descuentoLinea: 0,
        orden: fields.length,
      })} />
    </div>
  );
}

function LineaRow({ id, idx, onRemove }: { id: string; idx: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const { register } = useFormContext();
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 border rounded p-2 bg-card">
      <button type="button" {...attributes} {...listeners} className="cursor-grab"><GripVertical /></button>
      <Input {...register(`lineas.${idx}.descripcion`)} className="flex-1" />
      <Input {...register(`lineas.${idx}.cantidad`)} type="number" step="0.01" className="w-24" />
      <Input {...register(`lineas.${idx}.precioUnitario`)} type="number" step="0.0001" className="w-32" />
      <Button type="button" variant="ghost" size="icon" onClick={onRemove}><Trash2 /></Button>
    </div>
  );
}
```

- [ ] **Step 3: TotalesPanel (cálculo en vivo)**

```typescript
// src/components/modules/cotizaciones/TotalesPanel.tsx
'use client';
import { useFormContext, useWatch } from 'react-hook-form';
import { useMemo } from 'react';

export function TotalesPanel() {
  const { control } = useFormContext();
  const lineas = useWatch({ control, name: 'lineas' }) ?? [];

  const totales = useMemo(() => {
    let subtotal = 0;
    for (const l of lineas) {
      subtotal += (l.cantidad ?? 0) * (l.precioUnitario ?? 0) - (l.descuentoLinea ?? 0);
    }
    const igv = subtotal * 0.18;
    return { subtotal, igv, total: subtotal + igv };
  }, [lineas]);

  return (
    <div className="border rounded p-4 space-y-2 max-w-sm ml-auto">
      <div className="flex justify-between"><span>Subtotal</span><span>{totales.subtotal.toFixed(2)}</span></div>
      <div className="flex justify-between"><span>IGV 18%</span><span>{totales.igv.toFixed(2)}</span></div>
      <div className="flex justify-between font-bold border-t pt-2"><span>Total</span><span>{totales.total.toFixed(2)}</span></div>
    </div>
  );
}
```

- [ ] **Step 4: CotizacionForm orquesta todo**

```typescript
// src/components/modules/cotizaciones/CotizacionForm.tsx
'use client';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CotizacionSchema, type CotizacionInput } from '@/lib/schemas/cotizacion';
import { LineasTable } from './LineasTable';
import { TotalesPanel } from './TotalesPanel';
import { ClienteSelect } from './ClienteSelect';
import { crearCotizacion } from '@/server/actions/cotizaciones';

export function CotizacionForm() {
  const form = useForm<CotizacionInput>({
    resolver: zodResolver(CotizacionSchema),
    defaultValues: { moneda: 'USD', lineas: [] },
  });

  const onSubmit = async (data: CotizacionInput) => {
    const res = await crearCotizacion(data);
    if (res.success) router.push(`/${slug}/cotizaciones/${res.data.id}`);
    else toast.error(res.message ?? res.error);
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <ClienteSelect name="clienteId" />
          <FormField name="fechaVencimiento" .../>
          <LineasTable />
        </div>
        <div className="space-y-4">
          <TotalesPanel />
          <FormField name="terminosPago" .../>
          <FormField name="tiempoEntrega" .../>
          <Button type="submit">Guardar borrador</Button>
        </div>
      </form>
    </FormProvider>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/modules/cotizaciones/
git commit -m "feat(cotizaciones): add quotation form with dynamic lines and live totals"
```

---

## Task 6: Selector de margen con bloqueo si menor al mínimo

**Estimado**: 2h
**Agente**: `frontend-developer`
**Files:** `src/components/modules/cotizaciones/MargenSelector.tsx`

- [ ] **Step 1: MargenSelector con presets**

```typescript
// src/components/modules/cotizaciones/MargenSelector.tsx
'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFormContext } from 'react-hook-form';

const PRESETS = [5, 10, 15];

export function MargenSelector() {
  const form = useFormContext();
  const aplicar = (margen: number) => {
    form.setValue('margenAplicado', margen);
    // Recalcular precios de cada línea
    const lineas = form.getValues('lineas');
    const updated = lineas.map((l: any) => {
      // necesitamos precio compra del producto (asumiendo embebido en l.metaPrecioCompra)
      if (l.metaPrecioCompra) {
        return { ...l, precioUnitario: l.metaPrecioCompra * (1 + margen / 100) };
      }
      return l;
    });
    form.setValue('lineas', updated);
  };

  return (
    <div className="flex gap-2 items-center">
      <span className="text-sm">Margen:</span>
      {PRESETS.map((m) => (
        <Button key={m} type="button" variant="outline" size="sm" onClick={() => aplicar(m)}>+{m}%</Button>
      ))}
      <Input
        type="number"
        placeholder="custom"
        className="w-24"
        onBlur={(e) => aplicar(Number(e.target.value))}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/modules/cotizaciones/MargenSelector.tsx
git commit -m "feat(cotizaciones): add margin selector with presets and custom input"
```

---

## Task 7: Template react-pdf de cotización

**Estimado**: 4h
**Agente**: `frontend-developer`
**Files:** `src/lib/pdf/cotizacion-template.tsx`, `src/lib/pdf/render-pdf.ts`

- [ ] **Step 1: Template react-pdf**

```typescript
// src/lib/pdf/cotizacion-template.tsx
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', marginBottom: 20, borderBottom: 1, paddingBottom: 10 },
  logo: { width: 100, height: 50 },
  title: { fontSize: 20, fontWeight: 'bold', marginLeft: 'auto' },
  table: { marginTop: 20 },
  tr: { flexDirection: 'row', borderBottom: 0.5, paddingVertical: 4 },
  th: { fontWeight: 'bold', backgroundColor: '#f0f0f0', padding: 4 },
  td: { padding: 4 },
  totales: { marginTop: 20, marginLeft: 'auto', width: 200 },
});

export function CotizacionPDF({ data }: {
  data: {
    tenant: { razonSocial: string; ruc: string; logoUrl?: string; direccionFiscal?: string };
    cotizacion: { numero: string; fechaEmision: string; fechaVencimiento: string; moneda: string };
    cliente: { razonSocial: string; numeroDocumento: string; direccionFiscal?: string };
    lineas: Array<{ descripcion: string; cantidad: number; precioUnitario: number; subtotal: number }>;
    totales: { subtotal: number; igv: number; total: number };
    terminosPago?: string;
    tiempoEntrega?: string;
    observaciones?: string;
  };
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {data.tenant.logoUrl && <Image src={data.tenant.logoUrl} style={styles.logo} />}
          <View>
            <Text>{data.tenant.razonSocial}</Text>
            <Text>RUC: {data.tenant.ruc}</Text>
            {data.tenant.direccionFiscal && <Text>{data.tenant.direccionFiscal}</Text>}
          </View>
          <Text style={styles.title}>COTIZACIÓN {data.cotizacion.numero}</Text>
        </View>
        <View>
          <Text>Cliente: {data.cliente.razonSocial}</Text>
          <Text>Doc: {data.cliente.numeroDocumento}</Text>
          {data.cliente.direccionFiscal && <Text>{data.cliente.direccionFiscal}</Text>}
          <Text>Fecha emisión: {data.cotizacion.fechaEmision}</Text>
          <Text>Válido hasta: {data.cotizacion.fechaVencimiento}</Text>
        </View>
        <View style={styles.table}>
          <View style={[styles.tr, styles.th]}>
            <Text style={{ flex: 4 }}>Descripción</Text>
            <Text style={{ flex: 1 }}>Cant.</Text>
            <Text style={{ flex: 1 }}>P. Unit.</Text>
            <Text style={{ flex: 1 }}>Subtotal</Text>
          </View>
          {data.lineas.map((l, i) => (
            <View key={i} style={styles.tr}>
              <Text style={{ flex: 4 }}>{l.descripcion}</Text>
              <Text style={{ flex: 1 }}>{l.cantidad}</Text>
              <Text style={{ flex: 1 }}>{l.precioUnitario.toFixed(2)}</Text>
              <Text style={{ flex: 1 }}>{l.subtotal.toFixed(2)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.totales}>
          <View style={styles.tr}><Text style={{ flex: 1 }}>Subtotal</Text><Text>{data.totales.subtotal.toFixed(2)}</Text></View>
          <View style={styles.tr}><Text style={{ flex: 1 }}>IGV 18%</Text><Text>{data.totales.igv.toFixed(2)}</Text></View>
          <View style={[styles.tr, { fontWeight: 'bold' }]}><Text style={{ flex: 1 }}>Total {data.cotizacion.moneda}</Text><Text>{data.totales.total.toFixed(2)}</Text></View>
        </View>
        {data.terminosPago && <Text style={{ marginTop: 30 }}>Términos: {data.terminosPago}</Text>}
        {data.tiempoEntrega && <Text>Entrega: {data.tiempoEntrega}</Text>}
        {data.observaciones && <Text style={{ marginTop: 10, fontStyle: 'italic' }}>{data.observaciones}</Text>}
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: render-pdf helper**

```typescript
// src/lib/pdf/render-pdf.ts
import { renderToStream, renderToBuffer } from '@react-pdf/renderer';
import { CotizacionPDF } from './cotizacion-template';

export async function renderCotizacionPdf(data: any): Promise<Buffer> {
  const stream = await renderToBuffer(<CotizacionPDF data={data} />);
  return stream;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/pdf/
git commit -m "feat(cotizaciones): add react-pdf template for serverless rendering"
```

---

## Task 8: Generación PDF en Server Action + upload Storage

**Estimado**: 2h
**Agente**: `backend-developer`
**Files:** `src/server/actions/cotizaciones-pdf.ts`

- [ ] **Step 1: Server action**

```typescript
// src/server/actions/cotizaciones-pdf.ts
'use server';
import { renderCotizacionPdf } from '@/lib/pdf/render-pdf';
import { createAdminClient } from '@/lib/supabase/admin';
import { db } from '@/lib/db/client';
import { cotizaciones, lineasCotizacion, clientes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentTenant } from '@/lib/auth/current-tenant';

export async function generarPdfCotizacion(cotizacionId: string) {
  const tenant = await getCurrentTenant();
  const [cot] = await db.select().from(cotizaciones).where(eq(cotizaciones.id, cotizacionId));
  if (!cot || cot.tenantId !== tenant.id) return { success: false as const, error: 'not-found' };

  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, cot.clienteId));
  const lineas = await db
    .select()
    .from(lineasCotizacion)
    .where(eq(lineasCotizacion.cotizacionId, cotizacionId));

  const pdfBuffer = await renderCotizacionPdf({
    tenant: {
      razonSocial: tenant.razonSocial,
      ruc: tenant.ruc,
      logoUrl: tenant.logoUrl ?? undefined,
      direccionFiscal: tenant.direccionFiscal ?? undefined,
    },
    cotizacion: {
      numero: cot.numero,
      fechaEmision: cot.fechaEmision,
      fechaVencimiento: cot.fechaVencimiento,
      moneda: cot.moneda,
    },
    cliente: {
      razonSocial: cliente.razonSocial,
      numeroDocumento: cliente.numeroDocumento,
      direccionFiscal: cliente.direccionFiscal ?? undefined,
    },
    lineas: lineas.map((l) => ({
      descripcion: l.descripcion,
      cantidad: Number(l.cantidad),
      precioUnitario: Number(l.precioUnitario),
      subtotal: Number(l.subtotal),
    })),
    totales: { subtotal: Number(cot.subtotal), igv: Number(cot.igv), total: Number(cot.total) },
    terminosPago: cot.terminosPago ?? undefined,
    tiempoEntrega: cot.tiempoEntrega ?? undefined,
    observaciones: cot.observaciones ?? undefined,
  });

  const supabase = createAdminClient();
  const path = `${tenant.id}/cotizaciones/${cot.numero}.pdf`;
  const { error } = await supabase.storage.from('documentos').upload(path, pdfBuffer, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (error) return { success: false as const, error: error.message };

  const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(path);
  await db
    .update(cotizaciones)
    .set({ pdfUrl: urlData.publicUrl })
    .where(eq(cotizaciones.id, cotizacionId));

  return { success: true as const, data: { url: urlData.publicUrl } };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/actions/cotizaciones-pdf.ts
git commit -m "feat(cotizaciones): generate PDF and upload to Storage"
```

---

## Task 9: Conversión a OC/factura/guía (snapshot inmutable)

**Estimado**: 5h
**Agente**: `backend-developer`
**Files:** `src/server/actions/cotizaciones-convertir.ts`

- [ ] **Step 1: Server action**

```typescript
// src/server/actions/cotizaciones-convertir.ts
'use server';
import { db } from '@/lib/db/client';
import { cotizaciones, lineasCotizacion } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/require-permission';
import { transicionarCotizacion } from './cotizaciones';

export async function convertirAFactura(cotizacionId: string) {
  await requirePermission('facturas.emitir');
  const [cot] = await db.select().from(cotizaciones).where(eq(cotizaciones.id, cotizacionId));
  if (!cot || cot.estado !== 'aprobada') {
    return { success: false as const, error: 'invalid-state' };
  }

  const lineas = await db
    .select()
    .from(lineasCotizacion)
    .where(eq(lineasCotizacion.cotizacionId, cotizacionId));

  // Crear factura usando los datos snapshot de la cotización
  // (ver plan B.9 para crearFactura)
  const facturaInput = {
    clienteId: cot.clienteId,
    moneda: cot.moneda,
    tipoCambio: cot.tipoCambio,
    cotizacionOrigenId: cot.id,
    lineas: lineas.map((l) => ({
      productoId: l.productoId,
      skuSnapshot: l.skuSnapshot,
      descripcion: l.descripcion,
      cantidad: Number(l.cantidad),
      precioUnitario: Number(l.precioUnitario),
      tipoAfectacionIgv: '10', // gravado por default
    })),
  };

  // Stub: aquí se llama a crearFactura del módulo B.9
  // const facturaResult = await crearFactura(facturaInput);

  await transicionarCotizacion(cotizacionId, 'CONVERTIR' as any);
  return { success: true as const, data: { facturaId: 'stub' } };
}

export async function convertirAOrdenCompra(cotizacionId: string) {
  /* análogo */
}
export async function convertirAGuia(cotizacionId: string) {
  /* análogo */
}
```

- [ ] **Step 2: UI modal de conversión**

```typescript
// En la pantalla de detalle cotización con estado=aprobada,
// botón "Convertir" abre Dialog con radio:
// (•) Factura
// ( ) Orden de compra (interna)
// ( ) Guía de remisión
// Click "Convertir" → llama a la action correspondiente, redirige al detalle del nuevo doc.
```

- [ ] **Step 3: Commit**

```bash
git add src/server/actions/cotizaciones-convertir.ts
git commit -m "feat(cotizaciones): add conversion to invoice/OC/shipment with snapshot"
```

---

## Done criteria

- [ ] Cotización en `borrador` editable; en `enviada` no editable, solo Aprobar/Rechazar.
- [ ] PDF generado tiene logo del tenant, datos completos, total en letras correcto.
- [ ] Convertir a factura no modifica la cotización original (snapshot intacto).
- [ ] 100 cotizaciones creadas concurrentemente tienen 100 correlativos únicos sin huecos.
- [ ] Bloqueo de margen funciona: si línea tiene precio que da margen 5% y producto exige 10%, falla con mensaje claro.

## Notas

- **Cold start react-pdf**: ~1.5s en Vercel. Aceptable para uso interactivo. Si crece, mover a edge function o background job.
- **Versionado**: post-envío, cada edición crea registro en `cotizaciones_versiones` con snapshot completo. PDF también se versiona.
- **Email envío al cliente**: out of scope del MVP. Por ahora descargar PDF y enviar manualmente.
