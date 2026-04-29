# B.10 — Crédito y Cuentas por Cobrar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` o `superpowers:executing-plans`.

**Goal:** Gestión de líneas de crédito por cliente, registro de pagos parciales, vista materializada de cuentas por cobrar (CxC) con aging, cron diario que marca facturas vencidas, validación automática al emitir factura a crédito.

**Architecture:** Tabla `creditos_cliente` (línea + plazo + bloqueo) + tabla `pagos` (historial). Vista materializada `cuentas_por_cobrar` con refresh cada 5 min vía `pg_cron`. Vista `aging_cxc` con buckets 0-30/31-60/61-90/90+. Bloqueo en B.9 al emitir factura a crédito si cliente está bloqueado.

**Tech Stack:** Drizzle, pg_cron, vistas materializadas, recharts.

**Estimación**: 22h — 6 tareas.

**Dependencias upstream**: B.9 (facturas existen).
**Dependencias downstream**: B.11 (reportes de aging).

---

## File structure

```
supabase/migrations/
├── 0036_creditos_cliente.sql
├── 0037_pagos.sql
├── 0038_cuentas_por_cobrar_matview.sql
└── 0039_aging_view.sql

src/lib/db/schema/
├── creditos-cliente.ts
└── pagos.ts

src/server/actions/
├── creditos.ts
└── pagos.ts

src/app/(app)/[companySlug]/credito/
├── page.tsx                               # dashboard CxC
├── clientes/page.tsx
├── clientes/[id]/page.tsx
├── pagos/nuevo/page.tsx
└── configuracion/page.tsx

src/components/modules/credito/
├── DashboardCxC.tsx
├── AgingChart.tsx
├── ClientesSaldos.tsx
├── PagoForm.tsx
└── DetalleCliente.tsx
```

---

## Task 1: Schema creditos_cliente + pagos + RLS

**Estimado**: 3h
**Agente**: `schema-builder`

- [ ] **Step 1: Migrations**

```sql
-- 0036_creditos_cliente.sql
CREATE TABLE creditos_cliente (
  cliente_id uuid PRIMARY KEY REFERENCES clientes(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  linea_credito numeric(14,4) NOT NULL DEFAULT 0,  -- 0 = sin crédito (contado)
  moneda text NOT NULL DEFAULT 'USD',
  plazo_dias int NOT NULL DEFAULT 0,
  bloqueado boolean NOT NULL DEFAULT false,
  motivo_bloqueo text,
  bloqueado_por uuid REFERENCES auth.users(id),
  bloqueado_at timestamptz,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE creditos_cliente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credito_tenant" ON creditos_cliente FOR ALL USING (tenant_id = current_tenant_id());

-- 0037_pagos.sql
CREATE TABLE pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  factura_id uuid NOT NULL REFERENCES facturas(id) ON DELETE RESTRICT,
  monto numeric(14,4) NOT NULL CHECK (monto > 0),
  moneda text NOT NULL,
  tipo_cambio_aplicado numeric(10,4),              -- si moneda != factura.moneda
  fecha_pago date NOT NULL DEFAULT current_date,
  metodo text NOT NULL,                            -- 'transferencia' | 'efectivo' | 'cheque' | 'tarjeta' | 'otros'
  referencia text,                                 -- nro operación
  observaciones text,
  registrado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pagos_tenant_idx ON pagos(tenant_id);
CREATE INDEX pagos_factura_idx ON pagos(factura_id);
CREATE INDEX pagos_fecha_idx ON pagos(fecha_pago DESC);

ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pagos_tenant" ON pagos FOR ALL USING (tenant_id = current_tenant_id());
```

- [ ] **Step 2: Drizzle**

```typescript
// src/lib/db/schema/creditos-cliente.ts y pagos.ts (estándar)
```

- [ ] **Step 3: Commit**

```bash
pnpm db:migrate
git add supabase/migrations/0036_creditos_cliente.sql supabase/migrations/0037_pagos.sql src/lib/db/schema/creditos-cliente.ts src/lib/db/schema/pagos.ts
git commit -m "feat(credito): add creditos_cliente and pagos schemas"
```

---

## Task 2: Vista materializada `cuentas_por_cobrar` + refresh

**Estimado**: 3h
**Agente**: `schema-builder` + `postgres-pro`

- [ ] **Step 1: Matview**

```sql
-- 0038_cuentas_por_cobrar_matview.sql
CREATE MATERIALIZED VIEW cuentas_por_cobrar AS
SELECT
  f.tenant_id,
  f.cliente_id,
  c.razon_social,
  c.numero_documento,
  COUNT(*) FILTER (WHERE f.estado_sunat = 'aceptada' AND COALESCE(p.total_pagado, 0) < f.total) AS facturas_pendientes,
  SUM(f.total - COALESCE(p.total_pagado, 0)) FILTER (WHERE f.estado_sunat = 'aceptada' AND COALESCE(p.total_pagado, 0) < f.total) AS saldo_total,
  MIN(f.fecha_vencimiento) FILTER (
    WHERE f.estado_sunat = 'aceptada'
      AND COALESCE(p.total_pagado, 0) < f.total
      AND f.fecha_vencimiento < CURRENT_DATE
  ) AS dia_mas_vencido,
  SUM((f.total - COALESCE(p.total_pagado, 0))) FILTER (
    WHERE f.estado_sunat = 'aceptada'
      AND COALESCE(p.total_pagado, 0) < f.total
      AND f.fecha_vencimiento < CURRENT_DATE
  ) AS saldo_vencido,
  cc.linea_credito,
  cc.bloqueado
FROM facturas f
INNER JOIN clientes c ON c.id = f.cliente_id
LEFT JOIN creditos_cliente cc ON cc.cliente_id = f.cliente_id
LEFT JOIN (
  SELECT factura_id, SUM(monto) AS total_pagado FROM pagos GROUP BY factura_id
) p ON p.factura_id = f.id
WHERE f.estado_sunat IN ('aceptada')
  AND f.forma_pago = 'credito'
GROUP BY f.tenant_id, f.cliente_id, c.razon_social, c.numero_documento, cc.linea_credito, cc.bloqueado;

CREATE UNIQUE INDEX cxc_cliente_idx ON cuentas_por_cobrar(tenant_id, cliente_id);

-- Refresh
SELECT cron.schedule(
  'refresh-cxc',
  '*/5 * * * *',  -- cada 5 min
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY cuentas_por_cobrar;$$
);

-- Permisos
GRANT SELECT ON cuentas_por_cobrar TO authenticated;
ALTER MATERIALIZED VIEW cuentas_por_cobrar OWNER TO postgres;
```

- [ ] **Step 2: Test refresh**

```typescript
it('matview se refresca y refleja un nuevo pago', async () => {
  await registrarPago({
    /* ... */
  });
  await db.execute(sql`REFRESH MATERIALIZED VIEW cuentas_por_cobrar`); // forzar
  const cxc = await db.execute(
    sql`SELECT saldo_total FROM cuentas_por_cobrar WHERE cliente_id = ${clienteId}`
  );
  expect(Number(cxc.rows[0].saldo_total)).toBeLessThan(originalSaldo);
});
```

- [ ] **Step 3: Commit**

```bash
pnpm db:migrate
git add supabase/migrations/0038_cuentas_por_cobrar_matview.sql tests/integration/credito/matview.test.ts
git commit -m "feat(credito): add cuentas_por_cobrar matview with cron refresh"
```

---

## Task 3: Vista `aging_cxc` (buckets de antigüedad)

**Estimado**: 2h
**Agente**: `schema-builder`

- [ ] **Step 1: Vista**

```sql
-- 0039_aging_view.sql
CREATE OR REPLACE VIEW aging_cxc AS
SELECT
  f.tenant_id,
  f.cliente_id,
  c.razon_social,
  SUM(f.total - COALESCE(p.total_pagado, 0)) FILTER (WHERE COALESCE(p.total_pagado, 0) < f.total AND CURRENT_DATE - f.fecha_vencimiento BETWEEN 0 AND 30) AS bucket_0_30,
  SUM(f.total - COALESCE(p.total_pagado, 0)) FILTER (WHERE COALESCE(p.total_pagado, 0) < f.total AND CURRENT_DATE - f.fecha_vencimiento BETWEEN 31 AND 60) AS bucket_31_60,
  SUM(f.total - COALESCE(p.total_pagado, 0)) FILTER (WHERE COALESCE(p.total_pagado, 0) < f.total AND CURRENT_DATE - f.fecha_vencimiento BETWEEN 61 AND 90) AS bucket_61_90,
  SUM(f.total - COALESCE(p.total_pagado, 0)) FILTER (WHERE COALESCE(p.total_pagado, 0) < f.total AND CURRENT_DATE - f.fecha_vencimiento > 90) AS bucket_90_plus
FROM facturas f
INNER JOIN clientes c ON c.id = f.cliente_id
LEFT JOIN (SELECT factura_id, SUM(monto) AS total_pagado FROM pagos GROUP BY factura_id) p ON p.factura_id = f.id
WHERE f.estado_sunat = 'aceptada' AND f.forma_pago = 'credito'
GROUP BY f.tenant_id, f.cliente_id, c.razon_social;

ALTER VIEW aging_cxc SET (security_invoker = true);
GRANT SELECT ON aging_cxc TO authenticated;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0039_aging_view.sql
git commit -m "feat(credito): add aging_cxc view with 30/60/90/90+ buckets"
```

---

## Task 4: Server Actions: otorgar crédito, registrar pago, bloquear

**Estimado**: 3h
**Agente**: `backend-developer`

- [ ] **Step 1: otorgarCredito**

```typescript
// src/server/actions/creditos.ts
'use server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { creditosCliente, auditPermisos } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const OtorgarCreditoSchema = z.object({
  clienteId: z.string().uuid(),
  lineaCredito: z.coerce.number().nonnegative(),
  moneda: z.enum(['PEN', 'USD']),
  plazoDias: z.coerce.number().int().min(0).max(180),
});

export async function otorgarCredito(input: z.infer<typeof OtorgarCreditoSchema>) {
  const data = OtorgarCreditoSchema.parse(input);
  const { user, tenant } = await requirePermission('credito.otorgar');

  await db
    .insert(creditosCliente)
    .values({
      clienteId: data.clienteId,
      tenantId: tenant.id,
      lineaCredito: data.lineaCredito.toString(),
      moneda: data.moneda,
      plazoDias: data.plazoDias,
      updatedBy: user.id,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: creditosCliente.clienteId,
      set: {
        lineaCredito: data.lineaCredito.toString(),
        moneda: data.moneda,
        plazoDias: data.plazoDias,
        updatedBy: user.id,
        updatedAt: new Date(),
      },
    });

  // Audit log
  // ...

  revalidatePath(`/${tenant.slug}/credito/clientes/${data.clienteId}`);
  return { success: true as const, data: null };
}

export async function bloquearCredito(clienteId: string, motivo: string) {
  const { user, tenant } = await requirePermission('credito.otorgar');
  await db
    .update(creditosCliente)
    .set({
      bloqueado: true,
      motivoBloqueo: motivo,
      bloqueadoPor: user.id,
      bloqueadoAt: new Date(),
    })
    .where(and(eq(creditosCliente.clienteId, clienteId), eq(creditosCliente.tenantId, tenant.id)));
  return { success: true as const, data: null };
}

export async function desbloquearCredito(clienteId: string) {
  const { tenant } = await requirePermission('credito.otorgar');
  await db
    .update(creditosCliente)
    .set({ bloqueado: false, motivoBloqueo: null, bloqueadoPor: null, bloqueadoAt: null })
    .where(and(eq(creditosCliente.clienteId, clienteId), eq(creditosCliente.tenantId, tenant.id)));
  return { success: true as const, data: null };
}
```

- [ ] **Step 2: registrarPago**

```typescript
// src/server/actions/pagos.ts
'use server';
const PagoSchema = z.object({
  facturaId: z.string().uuid(),
  monto: z.coerce.number().positive(),
  moneda: z.enum(['PEN', 'USD']),
  tipoCambioAplicado: z.coerce.number().positive().optional(),
  fechaPago: z.string().date(),
  metodo: z.enum(['transferencia', 'efectivo', 'cheque', 'tarjeta', 'otros']),
  referencia: z.string().max(100).optional(),
  observaciones: z.string().max(500).optional(),
});

export async function registrarPago(input: z.infer<typeof PagoSchema>) {
  const data = PagoSchema.parse(input);
  const { user, tenant } = await requirePermission('credito.registrar_pago');

  // Cargar factura para validar
  const [f] = await db.select().from(facturas).where(eq(facturas.id, data.facturaId));
  if (!f || f.tenantId !== tenant.id) return { success: false as const, error: 'not_found' };
  if (f.estadoSunat !== 'aceptada')
    return { success: false as const, error: 'invalid_factura_state' };

  // Validar moneda: si pago en moneda distinta, requerir tipoCambio
  if (data.moneda !== f.moneda && !data.tipoCambioAplicado) {
    return { success: false as const, error: 'tipo_cambio_required' };
  }

  // Calcular saldo restante (incluyendo este pago)
  const pagosPrevios = await db
    .select({ total: sql<string>`COALESCE(SUM(monto), 0)` })
    .from(pagos)
    .where(eq(pagos.facturaId, f.id));
  const totalPagadoPrevio = Number(pagosPrevios[0].total);
  // Convertir el pago a moneda de la factura si difieren
  const montoEnMonedaFactura =
    data.moneda === f.moneda ? data.monto : data.monto * (data.tipoCambioAplicado ?? 1);
  const totalPagadoNuevo = totalPagadoPrevio + montoEnMonedaFactura;
  const totalFactura = Number(f.total);

  if (totalPagadoNuevo > totalFactura) {
    return {
      success: false as const,
      error: 'monto_excede_saldo',
      message: `Pago supera saldo pendiente (${totalFactura - totalPagadoPrevio})`,
    };
  }

  await db.insert(pagos).values({
    tenantId: tenant.id,
    facturaId: data.facturaId,
    monto: data.monto.toString(),
    moneda: data.moneda,
    tipoCambioAplicado: data.tipoCambioAplicado?.toString(),
    fechaPago: data.fechaPago,
    metodo: data.metodo,
    referencia: data.referencia,
    observaciones: data.observaciones,
    registradoPor: user.id,
  });

  // Refresh matview asíncrono (sin esperar)
  db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY cuentas_por_cobrar`).catch(console.error);

  revalidatePath(`/${tenant.slug}/credito`);
  return {
    success: true as const,
    data: { totalPagado: totalPagadoNuevo, saldoRestante: totalFactura - totalPagadoNuevo },
  };
}
```

- [ ] **Step 3: Validación al emitir factura crédito**

Modificar `emitirFactura` (B.9 task 4) para que si `formaPago === 'credito'`, valide:

- Cliente tiene `creditos_cliente` registrado
- `bloqueado === false`
- Suma de pendientes + nueva factura ≤ `linea_credito`

```typescript
// dentro de emitirFactura, antes del INSERT:
if (data.formaPago === 'credito') {
  const [credito] = await db
    .select()
    .from(creditosCliente)
    .where(eq(creditosCliente.clienteId, data.clienteId));
  if (!credito)
    return {
      success: false as const,
      error: 'business',
      message: 'Cliente no tiene crédito otorgado',
    };
  if (credito.bloqueado)
    return {
      success: false as const,
      error: 'business',
      message: `Cliente bloqueado: ${credito.motivoBloqueo}`,
    };
  // Calcular pendiente actual
  const [{ saldo }] = await db.execute(
    sql`SELECT COALESCE(saldo_total, 0) AS saldo FROM cuentas_por_cobrar WHERE cliente_id = ${data.clienteId}`
  ).rows;
  if (Number(saldo) + total > Number(credito.lineaCredito)) {
    return {
      success: false as const,
      error: 'business',
      message: `Excede línea de crédito (${credito.lineaCredito})`,
    };
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/server/actions/creditos.ts src/server/actions/pagos.ts src/server/actions/facturas.ts
git commit -m "feat(credito): add credit grant, payment registration, and credit limit validation"
```

---

## Task 5: Cron `pg_cron` diario: marcar facturas vencidas

**Estimado**: 2h
**Agente**: `schema-builder`

- [ ] **Step 1: Función + cron**

```sql
-- en 0038_... o nueva migration
CREATE OR REPLACE FUNCTION marcar_facturas_vencidas() RETURNS int LANGUAGE plpgsql AS $$
DECLARE v_count int;
BEGIN
  UPDATE facturas
  SET estado_sunat = CASE WHEN estado_sunat = 'aceptada' THEN 'aceptada' ELSE estado_sunat END
  -- (No cambiamos estado_sunat porque es flag de SUNAT; agregamos columna estado_pago)
  WHERE forma_pago = 'credito'
    AND fecha_vencimiento < CURRENT_DATE
    AND estado_sunat = 'aceptada'
    AND id NOT IN (SELECT factura_id FROM pagos GROUP BY factura_id HAVING SUM(monto) >= (SELECT total FROM facturas WHERE id = factura_id));
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

-- Cron diario 1 AM
SELECT cron.schedule(
  'marcar-vencidas-diario',
  '0 1 * * *',
  $$SELECT marcar_facturas_vencidas();$$
);
```

Nota: Si decidimos agregar columna `estado_pago` a facturas (al_dia / vencida / pagada), hacerlo en una nueva migration. Por ahora derivar de la matview.

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(credito): add daily cron to mark overdue invoices"
```

---

## Task 6: UI dashboard CxC + listado por cliente + form pago

**Estimado**: 9h
**Agente**: `frontend-developer`

- [ ] **Step 1: Dashboard `/credito`**

```typescript
// src/app/(app)/[companySlug]/credito/page.tsx
import { db } from '@/lib/db/client';
import { sql } from 'drizzle-orm';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { requirePermission } from '@/lib/auth/require-permission';
import { DashboardCxC } from '@/components/modules/credito/DashboardCxC';
import { AgingChart } from '@/components/modules/credito/AgingChart';

export default async function CreditoPage() {
  await requirePermission('credito.ver');
  const tenant = await getCurrentTenant();

  const totales = await db.execute(sql`
    SELECT
      COUNT(*) AS clientes_con_deuda,
      SUM(saldo_total) AS total_cxc,
      SUM(saldo_vencido) AS total_vencido
    FROM cuentas_por_cobrar
    WHERE tenant_id = ${tenant.id}
  `);

  const aging = await db.execute(sql`
    SELECT
      SUM(bucket_0_30) AS b1,
      SUM(bucket_31_60) AS b2,
      SUM(bucket_61_90) AS b3,
      SUM(bucket_90_plus) AS b4
    FROM aging_cxc WHERE tenant_id = ${tenant.id}
  `);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cuentas por cobrar</h1>
      <DashboardCxC totales={totales.rows[0]} />
      <AgingChart aging={aging.rows[0]} />
    </div>
  );
}
```

- [ ] **Step 2: AgingChart con recharts**

```typescript
// src/components/modules/credito/AgingChart.tsx
'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#7f1d1d'];

export function AgingChart({ aging }: { aging: any }) {
  const data = [
    { name: '0-30 días', valor: Number(aging.b1 ?? 0) },
    { name: '31-60', valor: Number(aging.b2 ?? 0) },
    { name: '61-90', valor: Number(aging.b3 ?? 0) },
    { name: '90+', valor: Number(aging.b4 ?? 0) },
  ];
  return (
    <BarChart width={600} height={300} data={data}>
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="valor">{data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Bar>
    </BarChart>
  );
}
```

- [ ] **Step 3: Listado clientes con saldo**

```typescript
// src/app/(app)/[companySlug]/credito/clientes/page.tsx
// Tabla con: cliente, línea crédito, saldo, vencido, días más viejo, estado bloqueo
// Filtros: solo vencidos, bloqueados
```

- [ ] **Step 4: Detalle cliente + form pago**

```typescript
// src/app/(app)/[companySlug]/credito/clientes/[id]/page.tsx
// Muestra: línea crédito + facturas pendientes (tabla) + pagos historial + alertas
// Botones: "Otorgar/modificar crédito", "Registrar pago", "Bloquear"

// PagoForm con factura selectable + monto + método + referencia
```

- [ ] **Step 5: Configuración de políticas globales**

```typescript
// src/app/(app)/[companySlug]/credito/configuracion/page.tsx
// Form: plazo default, alertas (email cuando saldo > X)
// Storage en tenants.config_credito jsonb
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/\[companySlug\]/credito/ src/components/modules/credito/
git commit -m "feat(credito): add CxC dashboard, aging chart, and customer detail UI"
```

---

## Done criteria

- [ ] Aging report muestra correctamente las edades en buckets 0-30/31-60/61-90/90+.
- [ ] Pago parcial actualiza saldo en <5 min (refresh matview).
- [ ] Cliente bloqueado por crédito (B.10) NO permite emitir factura a crédito (validación en B.9).
- [ ] Pago en moneda distinta a la factura sin tipo_cambio falla con error claro.
- [ ] Pago mayor al saldo pendiente falla con error.

## Notas

- **Pago a cuenta** (sin factura específica): out of scope MVP. Cada pago va a una factura.
- **Refresh matview puede saturar**: con 10k facturas + 50k pagos, REFRESH MATERIALIZED VIEW CONCURRENTLY toma ~2s. Con 1M, considerar refresh incremental por tenant.
- **Tipo de cambio**: usar el del día del pago, no el de la factura. Documentar en `tipoCambioAplicado` para audit.
- **Bloqueo automático**: out of scope MVP. Por ahora bloqueo manual desde UI.
