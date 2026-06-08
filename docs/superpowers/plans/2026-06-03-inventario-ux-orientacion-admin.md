# Inventario UX — Orientación al Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 3 coordinated UX changes that guide administrators through the OC→Recepción→Stock flow without any DB migrations.

**Architecture:** (1) New `PendientesPanel` RSC on the dashboard shows pending OC and critical stock counts. (2) `OrdenDetalle` gains an inline stepper + contextual banner that explains what the admin needs to do next. (3) `InventarioList` replaces its minimal warning banner with an actionable one linking to OC creation/reception. A new `?estado=pendiente_recepcion` URL filter is wired to both `aprobada` and `recibida_parcial` states in the ordenes list page.

**Tech Stack:** Next.js 15 App Router (RSC + Client Components), Drizzle ORM (`sql` tag, `inArray`), Tailwind, Lucide icons, existing design tokens (`bg-warn-soft`, `bg-danger-soft`, etc.)

---

## File Map

| File                                                   | Action                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| `src/components/modules/reportes/PendientesPanel.tsx`  | **Create** — new RSC panel                                   |
| `src/app/(app)/[companySlug]/page.tsx`                 | **Modify** — +1 query in Promise.all, render PendientesPanel |
| `src/app/(app)/[companySlug]/ordenes/page.tsx`         | **Modify** — handle `pendiente_recepcion` filter             |
| `src/components/modules/ordenes/OrdenesList.tsx`       | **Modify** — widen `filtroActivo` type                       |
| `src/components/modules/ordenes/OrdenDetalle.tsx`      | **Modify** — add stepper + banner + cerrarOrden              |
| `src/app/(app)/[companySlug]/ordenes/[id]/page.tsx`    | **Modify** — add `cerrar` to permissions                     |
| `src/components/modules/inventario/InventarioList.tsx` | **Modify** — replace simple banner with actionable one       |

---

## Task 1: PendientesPanel component

**Files:**

- Create: `src/components/modules/reportes/PendientesPanel.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/modules/reportes/PendientesPanel.tsx
import Link from 'next/link';
import { AlertTriangle, PackageCheck } from 'lucide-react';

export type PendientesPanelProps = {
  ocPendientes: { count: number; numeros: string[] };
  stockCritico: number;
  companySlug: string;
};

export function PendientesPanel({ ocPendientes, stockCritico, companySlug }: PendientesPanelProps) {
  if (ocPendientes.count === 0 && stockCritico === 0) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-orion-border bg-orion-bg shadow-orion-1">
      <div className="border-b border-orion-border px-4 py-3">
        <h2 className="text-[13px] font-semibold text-orion-fg">Pendientes de operación</h2>
      </div>
      <div className="divide-y divide-orion-border">
        {ocPendientes.count > 0 && (
          <Link
            href={`/${companySlug}/ordenes?estado=pendiente_recepcion`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-orion-bg-muted"
          >
            <PackageCheck size={15} className="shrink-0 text-warn-fg" />
            <span className="flex-1 text-[13px] text-orion-fg">
              <span className="font-medium">
                {ocPendientes.count} OC {ocPendientes.count === 1 ? 'lista' : 'listas'} para recibir
              </span>
              {ocPendientes.numeros.length > 0 && (
                <span className="ml-1.5 font-mono text-[11.5px] text-orion-fg-muted">
                  {ocPendientes.numeros.slice(0, 3).join(', ')}
                  {ocPendientes.numeros.length > 3 ? ` +${ocPendientes.numeros.length - 3}` : ''}
                </span>
              )}
            </span>
            <span className="text-[12px] text-orion-fg-muted">→</span>
          </Link>
        )}
        {stockCritico > 0 && (
          <Link
            href={`/${companySlug}/inventario?filtro=critico`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-orion-bg-muted"
          >
            <AlertTriangle size={15} className="shrink-0 text-danger-fg" />
            <span className="flex-1 text-[13px] text-orion-fg">
              <span className="font-medium">
                {stockCritico} producto{stockCritico !== 1 ? 's' : ''} con stock crítico o sin stock
              </span>
            </span>
            <span className="text-[12px] text-orion-fg-muted">→</span>
          </Link>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/leonidasyauri/dev/orion-erp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors in PendientesPanel.tsx

- [ ] **Step 3: Commit**

```bash
git add src/components/modules/reportes/PendientesPanel.tsx
git commit -m "feat(dashboard): new PendientesPanel component"
```

---

## Task 2: Add OC query + render PendientesPanel in dashboard

**Files:**

- Modify: `src/app/(app)/[companySlug]/page.tsx`

Context: The `Promise.all` currently destructures 6 results into `[metricasRaw, pipelineRaw, topClientesRaw, topProductosRaw, cxcRaw, stockRaw]`. We add a 7th query for pending OC. The existing `stockRaw` query gives us the count for the PendientesPanel's `stockCritico` item.

- [ ] **Step 1: Add the OC query and update destructuring**

Replace the `Promise.all` declaration block (lines 23–79 in the original file). The full updated block:

```tsx
const [
  metricasRaw,
  pipelineRaw,
  topClientesRaw,
  topProductosRaw,
  cxcRaw,
  stockRaw,
  ocPendientesRaw,
] = await Promise.all([
  // Ventas por mes — últimos 12 meses desde dashboard_metricas
  db.execute<MetricasRow>(sql`
        SELECT
          mes::text,
          ventas_total::text,
          facturas_emitidas::text,
          clientes_unicos::text,
          ticket_promedio::text
        FROM dashboard_metricas
        WHERE tenant_id = ${tenant.id}
          AND mes >= date_trunc('month', current_date) - INTERVAL '11 months'
        ORDER BY mes
      `),

  // Pipeline de cotizaciones por estado
  db.execute<{ estado: string; cantidad: string; valor_total: string }>(sql`
        SELECT estado, cantidad::text, valor_total::text
        FROM pipeline_cotizaciones
        WHERE tenant_id = ${tenant.id}
      `),

  // Top 10 clientes por monto facturado
  db.execute<{ cliente_id: string; razon_social: string; monto_total: string }>(sql`
        SELECT cliente_id::text, razon_social, monto_total::text
        FROM top_clientes
        WHERE tenant_id = ${tenant.id}
        ORDER BY monto_total DESC
        LIMIT 10
      `),

  // Top 20 productos por monto facturado
  db.execute<{ producto_id: string; nombre: string; monto_total: string }>(sql`
        SELECT producto_id::text, nombre, monto_total::text
        FROM top_productos
        WHERE tenant_id = ${tenant.id}
        ORDER BY monto_total DESC
        LIMIT 20
      `),

  // CxC totales agregados
  db.execute<CxCRow>(sql`
        SELECT
          COALESCE(SUM(saldo_total), 0)::text   AS total,
          COALESCE(SUM(saldo_vencido), 0)::text AS vencido
        FROM cuentas_por_cobrar
        WHERE tenant_id = ${tenant.id}
      `),

  // Stock crítico — view hereda tenant_id desde productos
  db.execute<{ critico: string }>(sql`
        SELECT COUNT(*)::text AS critico
        FROM stock_critico
        WHERE tenant_id = ${tenant.id}
      `),

  // OC listas para recibir (aprobada + recibida_parcial)
  db.execute<{ count: string; numeros: string | null }>(sql`
        SELECT
          COUNT(*)::text AS count,
          array_to_string(array_agg(numero ORDER BY created_at DESC), ',') AS numeros
        FROM ordenes_compra
        WHERE tenant_id = ${tenant.id}
          AND estado IN ('aprobada', 'recibida_parcial')
      `),
]);
```

- [ ] **Step 2: Parse the new query result and add the import**

After the existing data extraction block, add:

```tsx
const ocPendientesCount = Number(ocPendientesRaw[0]?.count ?? 0);
const ocPendientesNumeros = ocPendientesRaw[0]?.numeros
  ? ocPendientesRaw[0].numeros.split(',').filter(Boolean)
  : [];
```

- [ ] **Step 3: Import PendientesPanel and add it to the JSX**

Add the import at the top of the file:

```tsx
import { PendientesPanel } from '@/components/modules/reportes/PendientesPanel';
```

In the return JSX, after `<DashboardKpis .../>` and before `{/* Fila 2 */}`, add:

```tsx
<PendientesPanel
  ocPendientes={{ count: ocPendientesCount, numeros: ocPendientesNumeros }}
  stockCritico={stockCritico}
  companySlug={companySlug}
/>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/leonidasyauri/dev/orion-erp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/\[companySlug\]/page.tsx
git commit -m "feat(dashboard): add OC pendientes query and PendientesPanel"
```

---

## Task 3: Handle `pendiente_recepcion` filter in ordenes list

**Files:**

- Modify: `src/app/(app)/[companySlug]/ordenes/page.tsx`
- Modify: `src/components/modules/ordenes/OrdenesList.tsx`

`pendiente_recepcion` is not an `Estado` value — it's a compound pseudo-filter that maps to `aprobada + recibida_parcial`. The page handles it server-side with `inArray`; the client component just passes it through its prop type.

- [ ] **Step 1: Update `ordenes/page.tsx` — add `inArray` import and handle the new filter**

At the top, update the import from `drizzle-orm`:

```tsx
import { and, eq, inArray, sql } from 'drizzle-orm';
```

Replace the `filtroActivo` parsing:

```tsx
const rawEstado = sp.estado ?? '';
const filtroActivo: 'todas' | Estado | 'pendiente_recepcion' =
  rawEstado === 'pendiente_recepcion'
    ? 'pendiente_recepcion'
    : rawEstado && ESTADO_FILTROS.has(rawEstado as Estado)
      ? (rawEstado as Estado)
      : 'todas';
```

Replace the `where` clause:

```tsx
const where =
  filtroActivo === 'pendiente_recepcion'
    ? and(
        eq(ordenesCompra.tenantId, tenant.id),
        inArray(ordenesCompra.estado, ['aprobada', 'recibida_parcial'])
      )
    : filtroActivo === 'todas'
      ? eq(ordenesCompra.tenantId, tenant.id)
      : and(eq(ordenesCompra.tenantId, tenant.id), eq(ordenesCompra.estado, filtroActivo));
```

- [ ] **Step 2: Update `OrdenesList.tsx` — widen the `filtroActivo` prop type**

In `OrdenesList.tsx`, locate the `OrdenesListProps` type:

```tsx
export type OrdenesListProps = {
  // ...
  filtroActivo: 'todas' | Estado;
  // ...
};
```

Change `filtroActivo` to:

```tsx
filtroActivo: 'todas' | Estado | 'pendiente_recepcion';
```

The chip loop uses `filtroActivo === f.key` — when `pendiente_recepcion` is active, no chip highlights, which is the intended behavior.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/leonidasyauri/dev/orion-erp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/\[companySlug\]/ordenes/page.tsx src/components/modules/ordenes/OrdenesList.tsx
git commit -m "feat(ordenes): add pendiente_recepcion compound filter"
```

---

## Task 4: Stepper + banner in OrdenDetalle

**Files:**

- Modify: `src/components/modules/ordenes/OrdenDetalle.tsx`
- Modify: `src/app/(app)/[companySlug]/ordenes/[id]/page.tsx`

The stepper is a 5-step horizontal bar: `Borrador → Enviada → Aprobada → Recibir → Cerrada`.
The banner is a contextual message + CTA that changes per state. Both live inside `OrdenDetalle.tsx` as local function components — they share no external interface.

- [ ] **Step 1: Update `OrdenDetalleData` — add `cerrar` permission**

In `OrdenDetalle.tsx`, update the `permissions` shape in `OrdenDetalleData`:

```tsx
permissions: {
  enviar: boolean;
  aprobar: boolean;
  recibir: boolean;
  cerrar: boolean;
  editar: boolean;
}
```

- [ ] **Step 2: Update `ordenes/[id]/page.tsx` — pass `cerrar` permission**

In `ordenes/[id]/page.tsx`, `canAprobar` is already fetched. Use it for `cerrar` (same admin-level action):

```tsx
    permissions: {
      enviar: canEnviar,
      aprobar: canAprobar,
      recibir: canRecibir,
      cerrar: canAprobar,
      editar: false,
    },
```

- [ ] **Step 3: Add `cerrarOrden` import and derive `puedeCerrar` in `OrdenDetalle.tsx`**

Update the server actions import line:

```tsx
import {
  aprobarOrden,
  cerrarOrden,
  enviarOrden,
  recibirParcial,
} from '@/server/actions/ordenes-compra';
```

Inside the `OrdenDetalle` function, after the existing `puedeRecibir` derivation:

```tsx
const puedeCerrar = data.estado === 'recibida_total' && data.permissions.cerrar;
```

- [ ] **Step 4: Add `OrdenStepper` local component at the bottom of the file**

```tsx
const STEPPER_STEPS = ['Borrador', 'Enviada', 'Aprobada', 'Recibir', 'Cerrada'];
const STEPPER_INDEX: Partial<Record<Estado, number>> = {
  borrador: 0,
  enviada: 1,
  aprobada: 2,
  recibida_parcial: 3,
  recibida_total: 3,
  cerrada: 4,
};

function OrdenStepper({ estado }: { estado: Estado }) {
  const current = STEPPER_INDEX[estado] ?? 0;
  return (
    <div className="mb-5 flex items-center gap-0">
      {STEPPER_STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold',
                  done
                    ? 'bg-success text-white'
                    : active
                      ? 'bg-tenant-accent text-white'
                      : 'bg-orion-bg-muted text-orion-fg-faint'
                )}
              >
                {done ? <Check size={11} /> : i + 1}
              </div>
              <span
                className={cn(
                  'whitespace-nowrap text-[10.5px]',
                  active ? 'font-semibold text-orion-fg' : 'text-orion-fg-muted'
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPPER_STEPS.length - 1 && (
              <div
                className={cn('mb-4 h-px flex-1', i < current ? 'bg-success' : 'bg-orion-border')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Add `BannerSiguientePaso` local component**

```tsx
function BannerSiguientePaso({
  estado,
  puedeEnviar,
  puedeRecibir,
  puedeCerrar,
  onEnviar,
  onRecibir,
  onCerrar,
  pending,
}: {
  estado: Estado;
  puedeEnviar: boolean;
  puedeRecibir: boolean;
  puedeCerrar: boolean;
  onEnviar: () => void;
  onRecibir: () => void;
  onCerrar: () => void;
  pending: boolean;
}) {
  type BannerConfig = {
    colorClass: string;
    mensaje: string;
    boton?: { label: string; onClick: () => void; show: boolean };
  };

  const cfg: BannerConfig | null = (() => {
    switch (estado) {
      case 'borrador':
        return {
          colorClass: 'border-orion-border bg-orion-bg-muted text-orion-fg-muted',
          mensaje: 'Siguiente: enviar la OC al proveedor para su aprobación.',
          boton: { label: 'Enviar', onClick: onEnviar, show: puedeEnviar },
        };
      case 'enviada':
        return {
          colorClass: 'border-info-border bg-info-soft text-info-fg',
          mensaje: 'Esperando aprobación. Una vez aprobada podrás registrar la recepción.',
        };
      case 'aprobada':
        return {
          colorClass: 'border-warn-border bg-warn-soft text-warn-fg',
          mensaje:
            'Siguiente: registrar la recepción cuando llegue la mercadería. El stock se actualizará automáticamente.',
          boton: { label: 'Registrar recepción', onClick: onRecibir, show: puedeRecibir },
        };
      case 'recibida_parcial':
        return {
          colorClass: 'border-warn-border bg-warn-soft text-warn-fg',
          mensaje: 'Recepción parcial registrada. Registra el resto cuando llegue.',
          boton: { label: 'Registrar recepción', onClick: onRecibir, show: puedeRecibir },
        };
      case 'recibida_total':
        return {
          colorClass: 'border-success-border bg-success-soft text-success-fg',
          mensaje: 'Toda la mercadería fue recibida. Puedes cerrar la OC.',
          boton: { label: 'Cerrar OC', onClick: onCerrar, show: puedeCerrar },
        };
      case 'cerrada':
        return null;
      default:
        return null;
    }
  })();

  if (!cfg) return null;

  return (
    <div
      className={cn(
        'mb-5 flex items-center gap-3 rounded-lg border px-4 py-3 text-[13px]',
        cfg.colorClass
      )}
    >
      <span className="flex-1">{cfg.mensaje}</span>
      {cfg.boton?.show && (
        <button
          type="button"
          disabled={pending}
          onClick={cfg.boton.onClick}
          className="border-current/20 inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border bg-white/20 px-3 text-[12px] font-medium hover:bg-white/30 disabled:opacity-60"
        >
          {cfg.boton.label}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Wire stepper and banner into the `OrdenDetalle` JSX**

Inside the `OrdenDetalle` function return, place the stepper and banner at the very top, before the existing `<div className="mb-4 flex items-start gap-4">` header:

```tsx
  return (
    <>
      <OrdenStepper estado={data.estado} />
      <BannerSiguientePaso
        estado={data.estado}
        puedeEnviar={puedeEnviar}
        puedeRecibir={puedeRecibir}
        puedeCerrar={puedeCerrar}
        onEnviar={() => handleAccion(() => enviarOrden(data.id), 'Orden enviada')}
        onRecibir={() => setShowRecepcion(true)}
        onCerrar={() => handleAccion(() => cerrarOrden(data.id), 'Orden cerrada')}
        pending={pending}
      />
      <div className="mb-4 flex items-start gap-4">
        {/* ... existing header ... */}
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd /Users/leonidasyauri/dev/orion-erp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add src/components/modules/ordenes/OrdenDetalle.tsx src/app/\(app\)/\[companySlug\]/ordenes/\[id\]/page.tsx
git commit -m "feat(ordenes): stepper + contextual banner in OC detail"
```

---

## Task 5: Actionable reposición banner in InventarioList

**Files:**

- Modify: `src/components/modules/inventario/InventarioList.tsx`

The existing banner (lines 93–108) is a simple yellow warning. Replace it with a richer banner that includes two action buttons and explains the OC→Recepción flow. The `tenantSlug` prop is already available in the component.

- [ ] **Step 1: Replace the existing critical alert block**

Locate and replace the block that starts at:

```tsx
      {/* Critical alert */}
      {(counts.sin_stock > 0 || counts.critico > 0) && (
        <div className="border-warn-border flex items-start gap-3 rounded-lg border bg-warn-soft px-4 py-3 text-[13px] text-warn-fg">
```

...through the closing `</div>` of that block.

Replace with:

```tsx
{
  /* Reposición banner */
}
{
  (counts.sin_stock > 0 || counts.critico > 0) && (
    <div className="border-danger-border rounded-lg border bg-danger-soft px-4 py-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-danger-fg" />
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-danger-fg">
            {counts.sin_stock + counts.critico} producto
            {counts.sin_stock + counts.critico !== 1 ? 's' : ''} necesitan reposición de stock
          </p>
          <p className="text-danger-fg/80 mt-0.5 text-[12.5px]">
            Para agregar stock, crea una Orden de Compra y registra la recepción cuando llegue la
            mercadería. El inventario se actualiza automáticamente.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Link
              href={`/${tenantSlug}/ordenes/nueva`}
              className="inline-flex h-7 items-center gap-1.5 rounded-md bg-danger-fg px-3 text-[12px] font-medium text-white hover:brightness-95"
            >
              + Nueva orden de compra
            </Link>
            <Link
              href={`/${tenantSlug}/ordenes?estado=pendiente_recepcion`}
              className="border-danger-fg/30 hover:bg-danger-fg/10 inline-flex h-7 items-center gap-1.5 rounded-md border px-3 text-[12px] font-medium text-danger-fg"
            >
              Ver OC pendientes →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/leonidasyauri/dev/orion-erp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/modules/inventario/InventarioList.tsx
git commit -m "feat(inventario): actionable reposición banner with OC links"
```

---

## Task 6: End-to-end visual verification

- [ ] **Step 1: Start dev server**

```bash
cd /Users/leonidasyauri/dev/orion-erp && npm run dev
```

- [ ] **Step 2: Verify dashboard PendientesPanel**

Navigate to dashboard. If there are OC in `aprobada`/`recibida_parcial` states, the panel should appear below the KPI row. If none, it should be invisible.

- [ ] **Step 3: Verify OC detail stepper**

Open any OC. The stepper should show 5 steps with the current state highlighted in tenant accent color. Completed steps show a green ✓.

- [ ] **Step 4: Verify OC detail banner**

- OC in `borrador`: grey banner + "Enviar" button (if permission)
- OC in `enviada`: blue info banner, no button
- OC in `aprobada`: yellow banner + "Registrar recepción" button
- OC in `recibida_total`: green banner + "Cerrar OC" button
- OC in `cerrada`: no banner

- [ ] **Step 5: Verify inventario banner**

Navigate to `/inventario`. If `counts.sin_stock + counts.critico > 0`, a red banner should appear with "Nueva orden de compra" and "Ver OC pendientes" buttons.

- [ ] **Step 6: Verify `?estado=pendiente_recepcion` filter**

Navigate to `/ordenes?estado=pendiente_recepcion`. Should show only OC in `aprobada` or `recibida_parcial` state. No filter chip should be highlighted.

---

## Self-Review Against Spec

| Spec requirement                                                             | Implemented in                                                         |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| PendientesPanel shows OC aprobada/recibida_parcial count                     | Task 1 + Task 2                                                        |
| PendientesPanel shows stock crítico count                                    | Task 1 + Task 2 (uses existing stockRaw query)                         |
| PendientesPanel only renders if there are pendientes                         | Task 1 — `if ... return null` guard                                    |
| OC detail: 5-step stepper Borrador→Cerrada                                   | Task 4 `OrdenStepper`                                                  |
| OC detail: contextual banner per estado                                      | Task 4 `BannerSiguientePaso`                                           |
| Banner button calls existing handlers, no logic duplication                  | Task 4 — `onEnviar`/`onRecibir`/`onCerrar` pass through `handleAccion` |
| Banner respects permissions (puedeEnviar, puedeRecibir, puedeCerrar)         | Task 4 — `show` field on each boton                                    |
| Inventario: red/amber banner when sin_stock + critico > 0                    | Task 5                                                                 |
| Inventario banner: explains OC→Recepción flow                                | Task 5                                                                 |
| Inventario banner: "Nueva OC" → /ordenes/nueva                               | Task 5                                                                 |
| Inventario banner: "Ver OC pendientes" → /ordenes?estado=pendiente_recepcion | Task 5                                                                 |
| Inventario banner: no close button                                           | Task 5 — no X button in markup                                         |
| `?estado=pendiente_recepcion` filter covers aprobada + recibida_parcial      | Task 3 — `inArray`                                                     |
| No new tables or migrations                                                  | Confirmed — queries hit existing tables/views                          |
| Uses existing visual tokens (bg-warn-soft, bg-danger-soft, etc.)             | All tasks — matches existing patterns                                  |
