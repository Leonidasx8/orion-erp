# B.7 — Inventario y Kardex Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` o `superpowers:executing-plans`.

**Goal:** Sistema de movimientos de stock inmutable (kardex), vista de stock actual, costo promedio o FIFO según política, ajustes manuales con auditoría, alertas de stock crítico, integración con ventas (factura → salida) y compras (OC → entrada).

**Architecture:** Tabla `kardex_movimientos` append-only con índice `(producto_id, fecha)`. Vista `stock_actual` calculada por SUM. Función SQL `registrar_movimiento_stock()` con `SELECT FOR UPDATE` para concurrencia. Triggers que disparan movimientos automáticamente al confirmar OC recibida o factura emitida. Política inicial: **costo promedio ponderado** (más simple que FIFO, suficiente para Idex/Agroalves).

**Tech Stack:** Drizzle, Postgres triggers + functions, Vitest para tests de concurrencia con `Promise.all`.

**Estimación**: 28h — 9 tareas (incluye 4h de diseño previo).

**Dependencias upstream**: B.4 (productos).
**Dependencias downstream**: B.6 (entradas), B.9 (salidas por venta), B.11 (reportes de stock).

---

## File structure

```
docs/DECISIONS/
└── 0010-kardex-costing-policy.md          # ADR: costo promedio ponderado vs FIFO

supabase/migrations/
├── 0024_kardex_movimientos.sql
├── 0025_costos_inventario.sql
├── 0026_stock_views.sql
└── 0027_kardex_triggers.sql               # triggers para integración OC/factura

src/lib/db/schema/
├── kardex-movimientos.ts
└── costos-inventario.ts

src/lib/schemas/
└── kardex.ts

src/server/actions/
├── kardex.ts                              # ajuste manual, consulta
└── kardex-internal.ts                     # helpers para llamar desde B.6/B.9

src/app/(app)/[companySlug]/inventario/
├── page.tsx                               # resumen + búsqueda producto
├── [productoId]/page.tsx                  # kardex detalle
├── ajustes/page.tsx
├── critico/page.tsx
└── historial/page.tsx

src/components/modules/inventario/
├── StockResumen.tsx
├── KardexTimeline.tsx
├── AjusteManualForm.tsx
└── StockCriticoTable.tsx
```

---

## Task 0: Diseño previo (OBLIGATORIO antes de codear)

**Estimado**: 4h
**Agente**: `architect`
**Files:** `docs/DECISIONS/0010-kardex-costing-policy.md`

🔴 **Sin esta task, las siguientes están bloqueadas.** Decisiones a tomar:

1. **Política de costing**: FIFO vs costo promedio ponderado (recomendado por simplicidad).
2. **Stock negativo**: ¿permitido o bloqueado? Recomendación: bloqueado por default, configurable por producto.
3. **Multi-warehouse**: ¿Idex tiene un solo almacén o varios? Si varios, schema cambia (FK warehouse_id en cada movimiento).
4. **Reservas**: stock comprometido en cotizaciones aprobadas no facturadas — ¿se descuenta del disponible? Decisión: NO en MVP. Se cuenta solo lo facturado.
5. **Anular factura**: genera movimiento inverso (entrada por el monto y costo originales).

- [ ] **Step 1: Reunión con cliente para confirmar política**

Lucas debe confirmar: ¿costo promedio o FIFO? ¿stock negativo?

- [ ] **Step 2: ADR**

```markdown
# 0010 — Política de costing y stock negativo

## Status

Accepted (2026-XX-XX)

## Decisión

- Costing: **costo promedio ponderado** (recalculado en cada entrada).
- Stock negativo: **bloqueado por default**. Se puede permitir per-producto vía flag `permite_stock_negativo`.
- Multi-warehouse: **NO** en MVP. Schema preparado para agregarlo (columna `warehouse_id` nullable desde el día 1).

## Por qué costo promedio

- Más simple de implementar y entender para el equipo de Idex.
- Correcto para SUNAT (la ley peruana acepta costo promedio o PEPS/FIFO).
- Si en el futuro se necesita FIFO, los datos en `kardex_movimientos` permiten reconstruir.

## Por qué bloquear stock negativo

- Idex no maneja preventas; vender lo que no se tiene es un bug.
- Si Agroalves o un futuro tenant lo necesita, flag por producto.
```

- [ ] **Step 3: Commit**

```bash
git add docs/DECISIONS/0010-kardex-costing-policy.md
git commit -m "docs(adr): document kardex costing policy decision"
```

---

## Task 1: Schema kardex_movimientos + costos_inventario + RLS

**Estimado**: 3h
**Agente**: `schema-builder`
**Files:** `0024_kardex_movimientos.sql`, `0025_costos_inventario.sql`, drizzle schemas.

- [ ] **Step 1: Migration kardex**

```sql
-- supabase/migrations/0024_kardex_movimientos.sql
CREATE TABLE kardex_movimientos (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  producto_id uuid NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  fecha timestamptz NOT NULL DEFAULT now(),
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste_pos', 'ajuste_neg')),
  origen_tipo text NOT NULL CHECK (origen_tipo IN ('orden_compra', 'factura', 'guia', 'manual', 'anulacion')),
  origen_id uuid,                                -- id de la OC/factura/guía/ajuste
  cantidad numeric(10,2) NOT NULL CHECK (cantidad > 0),  -- siempre positivo, signo viene de tipo
  costo_unitario numeric(14,4),                  -- requerido en entradas
  saldo_post numeric(10,2),                      -- cached: saldo después del movimiento
  costo_promedio_post numeric(14,4),             -- cached: costo promedio del producto post-movimiento
  observacion text,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX kardex_producto_fecha_idx ON kardex_movimientos(producto_id, fecha DESC);
CREATE INDEX kardex_tenant_idx ON kardex_movimientos(tenant_id);
CREATE INDEX kardex_origen_idx ON kardex_movimientos(origen_tipo, origen_id);

ALTER TABLE kardex_movimientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kardex_tenant_isolation" ON kardex_movimientos FOR SELECT
USING (tenant_id = current_tenant_id());

-- INSERT/UPDATE/DELETE solo via funciones SQL (no acceso directo desde cliente)
-- (Casbin permission check ya en la función SQL)

-- supabase/migrations/0025_costos_inventario.sql
CREATE TABLE costos_inventario (
  producto_id uuid PRIMARY KEY REFERENCES productos(id) ON DELETE CASCADE,
  costo_promedio numeric(14,4) NOT NULL DEFAULT 0,
  cantidad_actual numeric(10,2) NOT NULL DEFAULT 0,
  permite_stock_negativo boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE costos_inventario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "costos_via_producto" ON costos_inventario FOR ALL
USING (producto_id IN (SELECT id FROM productos WHERE tenant_id = current_tenant_id()));
```

- [ ] **Step 2: Drizzle schema**

```typescript
// src/lib/db/schema/kardex-movimientos.ts
import { pgTable, bigserial, uuid, text, timestamptz, numeric } from 'drizzle-orm/pg-core';

export const kardexMovimientos = pgTable('kardex_movimientos', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  productoId: uuid('producto_id').notNull(),
  fecha: timestamptz('fecha').notNull().defaultNow(),
  tipo: text('tipo').notNull(),
  origenTipo: text('origen_tipo').notNull(),
  origenId: uuid('origen_id'),
  cantidad: numeric('cantidad', { precision: 10, scale: 2 }).notNull(),
  costoUnitario: numeric('costo_unitario', { precision: 14, scale: 4 }),
  saldoPost: numeric('saldo_post', { precision: 10, scale: 2 }),
  costoPromedioPost: numeric('costo_promedio_post', { precision: 14, scale: 4 }),
  observacion: text('observacion'),
  userId: uuid('user_id'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
});

export type KardexMovimiento = typeof kardexMovimientos.$inferSelect;
```

- [ ] **Step 3: Commit**

```bash
pnpm db:migrate
git add supabase/migrations/0024_kardex_movimientos.sql supabase/migrations/0025_costos_inventario.sql src/lib/db/schema/kardex-movimientos.ts src/lib/db/schema/costos-inventario.ts
git commit -m "feat(kardex): add kardex_movimientos and costos_inventario schemas"
```

---

## Task 2: Vista materializada `stock_actual` + refresh

**Estimado**: 3h
**Agente**: `schema-builder`
**Files:** `0026_stock_views.sql`

- [ ] **Step 1: Vistas**

```sql
-- supabase/migrations/0026_stock_views.sql

-- Vista simple: stock actual = suma de movimientos
-- (NO materializada porque costos_inventario ya es la materialización; la vista es para queries directas)
CREATE OR REPLACE VIEW stock_actual AS
SELECT
  ci.producto_id,
  p.tenant_id,
  p.sku,
  p.descripcion,
  ci.cantidad_actual AS stock,
  ci.costo_promedio,
  (ci.cantidad_actual * ci.costo_promedio) AS valor_inventario,
  p.stock_critico,
  CASE
    WHEN ci.cantidad_actual = 0 THEN 'sin_stock'
    WHEN ci.cantidad_actual <= COALESCE(p.stock_critico, 0) THEN 'critico'
    ELSE 'normal'
  END AS estado_stock,
  ci.updated_at AS ultimo_movimiento_at
FROM costos_inventario ci
INNER JOIN productos p ON p.id = ci.producto_id;

ALTER VIEW stock_actual SET (security_invoker = true);
GRANT SELECT ON stock_actual TO authenticated;

-- Vista de stock crítico
CREATE OR REPLACE VIEW stock_critico AS
SELECT * FROM stock_actual WHERE estado_stock IN ('sin_stock', 'critico');

ALTER VIEW stock_critico SET (security_invoker = true);
GRANT SELECT ON stock_critico TO authenticated;
```

- [ ] **Step 2: Commit**

```bash
pnpm db:migrate
git add supabase/migrations/0026_stock_views.sql
git commit -m "feat(kardex): add stock_actual and stock_critico views"
```

---

## Task 3: Función `registrar_movimiento_stock()` con `SELECT FOR UPDATE`

**Estimado**: 4h
**Agente**: `schema-builder` + `database-administrator`
**Files:** Append a `0024_kardex_movimientos.sql` o nueva `0027_kardex_functions.sql`

🔴 **Esta función es el corazón del módulo.** Mal implementada = race condition = stock corrupto.

- [ ] **Step 1: Función**

```sql
CREATE OR REPLACE FUNCTION registrar_movimiento_stock(
  p_tenant_id uuid,
  p_producto_id uuid,
  p_tipo text,                                   -- 'entrada' | 'salida' | 'ajuste_pos' | 'ajuste_neg'
  p_cantidad numeric,
  p_origen_tipo text,
  p_origen_id uuid,
  p_costo_unitario numeric DEFAULT NULL,         -- requerido para entradas
  p_observacion text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
) RETURNS kardex_movimientos LANGUAGE plpgsql AS $$
DECLARE
  v_actual costos_inventario%ROWTYPE;
  v_nueva_cantidad numeric;
  v_nuevo_costo_promedio numeric;
  v_movimiento kardex_movimientos%ROWTYPE;
  v_signo int := CASE WHEN p_tipo IN ('entrada', 'ajuste_pos') THEN 1 ELSE -1 END;
BEGIN
  -- Validar que el producto pertenece al tenant
  IF NOT EXISTS (SELECT 1 FROM productos WHERE id = p_producto_id AND tenant_id = p_tenant_id) THEN
    RAISE EXCEPTION 'producto_not_in_tenant';
  END IF;

  -- LOCK: SELECT FOR UPDATE bloquea la fila de costos_inventario para este producto
  SELECT * INTO v_actual
  FROM costos_inventario
  WHERE producto_id = p_producto_id
  FOR UPDATE;

  -- Si no existe la fila aún, crearla
  IF NOT FOUND THEN
    INSERT INTO costos_inventario (producto_id, costo_promedio, cantidad_actual)
    VALUES (p_producto_id, 0, 0)
    RETURNING * INTO v_actual;
  END IF;

  v_nueva_cantidad := v_actual.cantidad_actual + (v_signo * p_cantidad);

  -- Validar stock no negativo (a menos que el producto lo permita)
  IF v_nueva_cantidad < 0 AND NOT v_actual.permite_stock_negativo THEN
    RAISE EXCEPTION 'stock_negativo: producto % quedaría con %', p_producto_id, v_nueva_cantidad;
  END IF;

  -- Recalcular costo promedio si es entrada
  IF p_tipo = 'entrada' THEN
    IF p_costo_unitario IS NULL THEN
      RAISE EXCEPTION 'costo_unitario_required_for_entrada';
    END IF;
    -- Promedio ponderado: ((stock_old * costo_old) + (cantidad_in * costo_in)) / stock_new
    v_nuevo_costo_promedio :=
      ((v_actual.cantidad_actual * v_actual.costo_promedio) + (p_cantidad * p_costo_unitario))
      / NULLIF(v_nueva_cantidad, 0);
  ELSE
    -- Salidas, ajustes: mantener costo promedio
    v_nuevo_costo_promedio := v_actual.costo_promedio;
  END IF;

  -- Insertar movimiento
  INSERT INTO kardex_movimientos (
    tenant_id, producto_id, tipo, origen_tipo, origen_id,
    cantidad, costo_unitario, saldo_post, costo_promedio_post,
    observacion, user_id
  ) VALUES (
    p_tenant_id, p_producto_id, p_tipo, p_origen_tipo, p_origen_id,
    p_cantidad, COALESCE(p_costo_unitario, v_actual.costo_promedio),
    v_nueva_cantidad, v_nuevo_costo_promedio,
    p_observacion, p_user_id
  ) RETURNING * INTO v_movimiento;

  -- Actualizar costos_inventario
  UPDATE costos_inventario
  SET cantidad_actual = v_nueva_cantidad,
      costo_promedio = v_nuevo_costo_promedio,
      updated_at = now()
  WHERE producto_id = p_producto_id;

  RETURN v_movimiento;
END;
$$;

GRANT EXECUTE ON FUNCTION registrar_movimiento_stock(uuid, uuid, text, numeric, text, uuid, numeric, text, uuid) TO authenticated;
```

- [ ] **Step 2: Test concurrencia**

```typescript
// tests/integration/kardex/concurrencia.test.ts
import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db/client';
import { sql } from 'drizzle-orm';

describe('kardex concurrencia', () => {
  it('100 entradas concurrentes producen el saldo correcto', async () => {
    const productoId = await crearProductoTest();
    const tenantId = await getTenantTestId();

    // 100 entradas de 10 unidades cada una @ costo 5 = +1000 stock, costo promedio 5
    await Promise.all(
      Array.from({ length: 100 }, () =>
        db.execute(sql`
          SELECT registrar_movimiento_stock(
            ${tenantId}, ${productoId}, 'entrada', 10, 'manual', NULL, 5, 'test', NULL
          )
        `)
      )
    );

    const result = await db.execute(sql`
      SELECT cantidad_actual, costo_promedio FROM costos_inventario WHERE producto_id = ${productoId}
    `);
    expect(Number(result.rows[0].cantidad_actual)).toBe(1000);
    expect(Number(result.rows[0].costo_promedio)).toBe(5);
  });

  it('100 salidas concurrentes con stock 50 falla 50 veces y ejecuta 50', async () => {
    const productoId = await crearProductoTest();
    // Setear stock inicial 50
    await db.execute(sql`
      SELECT registrar_movimiento_stock(
        ${tenantId}, ${productoId}, 'entrada', 50, 'manual', NULL, 10, 'init', NULL
      )
    `);

    const results = await Promise.allSettled(
      Array.from({ length: 100 }, () =>
        db.execute(sql`
          SELECT registrar_movimiento_stock(
            ${tenantId}, ${productoId}, 'salida', 1, 'manual', NULL, NULL, 'concurrent', NULL
          )
        `)
      )
    );

    const exitos = results.filter((r) => r.status === 'fulfilled').length;
    const fallos = results.filter((r) => r.status === 'rejected').length;
    expect(exitos).toBe(50);
    expect(fallos).toBe(50);

    const stock = await db.execute(
      sql`SELECT cantidad_actual FROM costos_inventario WHERE producto_id = ${productoId}`
    );
    expect(Number(stock.rows[0].cantidad_actual)).toBe(0);
  });
});
```

- [ ] **Step 3: Commit**

```bash
pnpm db:migrate
pnpm test:integration tests/integration/kardex/concurrencia.test.ts
git add supabase/migrations/0024_kardex_movimientos.sql tests/integration/kardex/
git commit -m "feat(kardex): add atomic registrar_movimiento_stock with SELECT FOR UPDATE"
```

---

## Task 4: Server Actions ajuste manual + consulta kardex

**Estimado**: 3h
**Agente**: `backend-developer`
**Files:** `src/server/actions/kardex.ts`

- [ ] **Step 1: Ajuste manual**

```typescript
// src/server/actions/kardex.ts
'use server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { kardexMovimientos } from '@/lib/db/schema';
import { sql, eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

const AjusteManualSchema = z.object({
  productoId: z.string().uuid(),
  tipo: z.enum(['ajuste_pos', 'ajuste_neg']),
  cantidad: z.coerce.number().positive(),
  motivo: z.string().min(5),
});

export async function ajusteManualStock(input: z.infer<typeof AjusteManualSchema>) {
  const data = AjusteManualSchema.parse(input);
  const { user, tenant } = await requirePermission('inventario.ajuste_manual');

  try {
    const result = await db.execute(sql`
      SELECT registrar_movimiento_stock(
        ${tenant.id}, ${data.productoId}, ${data.tipo}, ${data.cantidad},
        'manual', NULL, NULL, ${data.motivo}, ${user.id}
      ) AS movimiento
    `);
    revalidatePath(`/${tenant.slug}/inventario`);
    return { success: true as const, data: result.rows[0].movimiento };
  } catch (e: any) {
    if (e.message?.includes('stock_negativo')) {
      return {
        success: false as const,
        error: 'business',
        message: 'Stock no puede quedar negativo',
      };
    }
    throw e;
  }
}

export async function consultarKardex(productoId: string, params?: { desde?: Date; hasta?: Date }) {
  await requirePermission('inventario.ver');
  const conditions = [eq(kardexMovimientos.productoId, productoId)];
  if (params?.desde) conditions.push(sql`${kardexMovimientos.fecha} >= ${params.desde}`);
  if (params?.hasta) conditions.push(sql`${kardexMovimientos.fecha} <= ${params.hasta}`);
  return db
    .select()
    .from(kardexMovimientos)
    .where(sql.join(conditions, sql` AND `))
    .orderBy(desc(kardexMovimientos.fecha));
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/actions/kardex.ts
git commit -m "feat(kardex): add manual adjustment and consultation server actions"
```

---

## Task 5: Trigger SQL al confirmar venta/factura

**Estimado**: 3h
**Agente**: `schema-builder`
**Files:** `0027_kardex_triggers.sql`

⚠️ Estos triggers se activan cuando B.9 (facturación) y B.6 (OC) estén implementados. Por ahora se crea la lógica pero los triggers reales se conectan en esos módulos.

- [ ] **Step 1: Helper para llamar desde Server Actions de B.6/B.9**

```typescript
// src/server/actions/kardex-internal.ts (no exportar a frontend)
import 'server-only';
import { db } from '@/lib/db/client';
import { sql } from 'drizzle-orm';

export async function registrarEntradaPorOC(
  tenantId: string,
  productoId: string,
  cantidad: number,
  costoUnitario: number,
  ordenCompraId: string,
  userId: string
) {
  return db.execute(sql`
    SELECT registrar_movimiento_stock(
      ${tenantId}, ${productoId}, 'entrada', ${cantidad},
      'orden_compra', ${ordenCompraId}, ${costoUnitario}, NULL, ${userId}
    )
  `);
}

export async function registrarSalidaPorFactura(
  tenantId: string,
  productoId: string,
  cantidad: number,
  facturaId: string,
  userId: string
) {
  return db.execute(sql`
    SELECT registrar_movimiento_stock(
      ${tenantId}, ${productoId}, 'salida', ${cantidad},
      'factura', ${facturaId}, NULL, NULL, ${userId}
    )
  `);
}

export async function reversarMovimiento(
  tenantId: string,
  movimientoOriginalId: number,
  userId: string
) {
  // Lee el movimiento original e inserta el inverso
  const [orig] = await db.execute(sql`
    SELECT producto_id, tipo, cantidad, costo_unitario FROM kardex_movimientos WHERE id = ${movimientoOriginalId}
  `).rows;
  const tipoInverso = orig.tipo === 'salida' ? 'entrada' : 'salida';
  return db.execute(sql`
    SELECT registrar_movimiento_stock(
      ${tenantId}, ${orig.producto_id}, ${tipoInverso}, ${orig.cantidad},
      'anulacion', NULL, ${orig.costo_unitario}, 'reversión movimiento ' || ${movimientoOriginalId}, ${userId}
    )
  `);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/actions/kardex-internal.ts
git commit -m "feat(kardex): add internal helpers for OC reception and invoice issuance"
```

---

## Task 6: UI kardex por producto + timeline

**Estimado**: 3h
**Agente**: `frontend-developer`
**Files:** `src/app/(app)/[companySlug]/inventario/`, `src/components/modules/inventario/`

- [ ] **Step 1: Resumen de inventario**

```typescript
// src/app/(app)/[companySlug]/inventario/page.tsx
import { db } from '@/lib/db/client';
import { sql } from 'drizzle-orm';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { requirePermission } from '@/lib/auth/require-permission';
import { StockResumen } from '@/components/modules/inventario/StockResumen';

export default async function InventarioPage() {
  await requirePermission('inventario.ver');
  const tenant = await getCurrentTenant();

  const stock = await db.execute(sql`
    SELECT * FROM stock_actual WHERE tenant_id = ${tenant.id} ORDER BY descripcion
  `);

  return <StockResumen items={stock.rows} />;
}
```

- [ ] **Step 2: KardexTimeline**

```typescript
// src/components/modules/inventario/KardexTimeline.tsx
'use client';
import { Badge } from '@/components/ui/badge';

export function KardexTimeline({ movimientos }: { movimientos: any[] }) {
  return (
    <div className="space-y-2">
      {movimientos.map((m) => (
        <div key={m.id} className="flex items-center gap-4 border rounded p-3">
          <div className="text-xs text-muted-foreground w-32">
            {new Date(m.fecha).toISOString().slice(0, 16).replace('T', ' ')}
          </div>
          <Badge variant={m.tipo.includes('entrada') || m.tipo.includes('pos') ? 'default' : 'destructive'}>
            {m.tipo}
          </Badge>
          <div className="flex-1">
            <div className="font-mono">
              {m.tipo.startsWith('ajuste_neg') || m.tipo === 'salida' ? '−' : '+'}
              {Number(m.cantidad)}
            </div>
            <div className="text-xs text-muted-foreground">{m.observacion}</div>
          </div>
          <div className="text-sm">Saldo: {Number(m.saldo_post)}</div>
          <div className="text-xs text-muted-foreground">
            {m.origen_tipo}{m.origen_id ? ` #${m.origen_id.slice(0, 8)}` : ''}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Página detalle producto**

```typescript
// src/app/(app)/[companySlug]/inventario/[productoId]/page.tsx
import { consultarKardex } from '@/server/actions/kardex';
import { KardexTimeline } from '@/components/modules/inventario/KardexTimeline';

export default async function KardexProductoPage({ params }: { params: Promise<{ productoId: string }> }) {
  const { productoId } = await params;
  const movs = await consultarKardex(productoId);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Kardex</h1>
      <KardexTimeline movimientos={movs} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/\[companySlug\]/inventario/ src/components/modules/inventario/
git commit -m "feat(kardex): add inventory summary and product timeline UI"
```

---

## Task 7: UI ajustes manuales

**Estimado**: 3h
**Agente**: `frontend-developer`

- [ ] **Step 1: AjusteManualForm con motivo obligatorio**

```typescript
// src/components/modules/inventario/AjusteManualForm.tsx
'use client';
// Form react-hook-form con: producto (combobox cmdk), tipo (positivo/negativo), cantidad, motivo (textarea min 5 chars).
// Submit: ajusteManualStock action.
// Confirmación dialog antes de submit (es operación sensible).
```

- [ ] **Step 2: Página `/inventario/ajustes`**

Listado de ajustes recientes (filtrar `kardex_movimientos` con `origen_tipo = 'manual'`) + botón "Nuevo ajuste".

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/\[companySlug\]/inventario/ajustes/ src/components/modules/inventario/AjusteManualForm.tsx
git commit -m "feat(kardex): add manual adjustment UI with audit trail"
```

---

## Task 8: Tests de concurrencia

**Estimado**: 2h
**Agente**: `test-automator`
**Files:** `tests/integration/kardex/concurrencia.test.ts` (ya creado en Task 3)

- [ ] **Step 1: Expandir tests**

Casos adicionales:

- Salida que excede stock: rechaza con `stock_negativo`.
- Ajuste positivo sin permiso: rechaza con `forbidden`.
- 1000 movimientos secuenciales: saldo final correcto (test de integridad).
- Anulación de factura: genera movimiento inverso.

- [ ] **Step 2: Commit**

```bash
git commit -m "test(kardex): expand concurrency and integrity tests"
```

---

## Task 9: Stock crítico + alertas

**Estimado**: 2h
**Agente**: `frontend-developer`

- [ ] **Step 1: Página `/inventario/critico`**

```typescript
// src/app/(app)/[companySlug]/inventario/critico/page.tsx
// Lee VIEW stock_critico, renderiza tabla con productos bajo umbral
// Botón "Generar OC sugerida" (out of scope MVP, dejar TODO)
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/\[companySlug\]/inventario/critico/
git commit -m "feat(kardex): add critical stock alerts page"
```

---

## Done criteria

- [ ] Test de concurrencia: 100 entradas paralelas → saldo final correcto, costo promedio correcto.
- [ ] Test de stock negativo: 100 salidas paralelas con stock 50 → 50 éxito + 50 fallo, saldo final 0.
- [ ] Ajuste manual deja entrada en `kardex_movimientos` con `user_id`, `motivo`, IP (vía Server Action).
- [ ] Anular factura (cuando B.9 esté): genera movimiento inverso (entrada por la salida original).
- [ ] Vista `stock_actual` consultable en <100ms con 10k movimientos en DB.

## Notas

- **Costing alternativo**: si en el futuro se necesita FIFO, los datos en `kardex_movimientos` permiten reconstruir. Hay que crear un nuevo módulo de "Cierre contable mensual" que congele los costos por período.
- **Multi-warehouse**: agregar columna `warehouse_id` nullable + tabla `warehouses`. Funciona on demand sin tocar este código.
- **Performance**: con >100k movimientos por producto, considerar partitioning por año.
- **Anulación de factura**: NO borra el movimiento original. Inserta uno inverso. La trazabilidad legal lo exige.
