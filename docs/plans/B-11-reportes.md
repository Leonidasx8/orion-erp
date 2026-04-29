# B.11 — Panel y Reportes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` o `superpowers:executing-plans`.

**Goal:** Dashboard del tenant (homepage) con KPIs en vivo, drill-down a detalle, exportación a Excel. Métricas: ventas mes vs mes anterior, top 10 clientes, top 20 productos, CxC vencidas, stock crítico, pipeline cotizaciones.

**Architecture:** Vistas materializadas (`dashboard_metricas`, `top_clientes`, `top_productos`, `pipeline_cotizaciones`) con refresh cada 5 min vía `pg_cron`. Components Tremor copiados a `src/components/charts/` (no como dep npm). Drill-down con TanStack Query mantiene cache cliente. Export Excel con ExcelJS server-side.

**Tech Stack:** Drizzle, pg_cron, recharts, ExcelJS, TanStack Query.

**Estimación**: 20h — 6 tareas.

**Dependencias upstream**: TODOS los módulos anteriores (datos para mostrar).
**Dependencias downstream**: ninguna (último módulo funcional).

---

## File structure

```
supabase/migrations/
├── 0040_dashboard_views.sql
└── 0041_top_views.sql

src/components/charts/                     # copy de tremor
├── BarChart/
├── BarList/
├── Card/
├── ComboChart/
├── DateRangePicker/
└── KpiCard/

src/lib/excel/
├── export-ventas.ts
├── export-cxc.ts
├── export-stock.ts
└── export-comerciales.ts

src/server/actions/
├── reportes-ventas.ts
├── reportes-cxc.ts
├── reportes-stock.ts
└── reportes-export.ts

src/app/(app)/[companySlug]/
├── page.tsx                               # dashboard homepage
└── reportes/
    ├── page.tsx                           # selector de reportes
    ├── ventas/page.tsx
    ├── cxc/page.tsx
    ├── stock/page.tsx
    └── comerciales/page.tsx

src/components/modules/reportes/
├── DashboardKpis.tsx
├── VentasMesChart.tsx
├── TopClientesList.tsx
├── TopProductosList.tsx
├── PipelineChart.tsx
├── DateRangeFilter.tsx
└── ExportButton.tsx
```

---

## Task 1: Vistas materializadas + refresh `pg_cron`

**Estimado**: 3h
**Agente**: `schema-builder` + `postgres-pro`

- [ ] **Step 1: Vistas dashboard**

```sql
-- 0040_dashboard_views.sql

-- KPIs por tenant + periodo
CREATE MATERIALIZED VIEW dashboard_metricas AS
SELECT
  f.tenant_id,
  date_trunc('month', f.fecha_emision)::date AS mes,
  COUNT(*) FILTER (WHERE f.estado_sunat = 'aceptada') AS facturas_emitidas,
  SUM(f.total) FILTER (WHERE f.estado_sunat = 'aceptada') AS ventas_total,
  COUNT(DISTINCT f.cliente_id) FILTER (WHERE f.estado_sunat = 'aceptada') AS clientes_unicos,
  AVG(f.total) FILTER (WHERE f.estado_sunat = 'aceptada') AS ticket_promedio
FROM facturas f
GROUP BY f.tenant_id, date_trunc('month', f.fecha_emision);

CREATE UNIQUE INDEX dashboard_metricas_idx ON dashboard_metricas(tenant_id, mes);

-- Pipeline de cotizaciones
CREATE MATERIALIZED VIEW pipeline_cotizaciones AS
SELECT
  c.tenant_id,
  c.estado,
  COUNT(*) AS cantidad,
  SUM(c.total) AS valor_total
FROM cotizaciones c
WHERE c.fecha_emision > CURRENT_DATE - INTERVAL '90 days'
GROUP BY c.tenant_id, c.estado;

CREATE UNIQUE INDEX pipeline_cotizaciones_idx ON pipeline_cotizaciones(tenant_id, estado);

SELECT cron.schedule('refresh-dashboard', '*/5 * * * *', $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metricas;
  REFRESH MATERIALIZED VIEW CONCURRENTLY pipeline_cotizaciones;
$$);
```

- [ ] **Step 2: Top clientes y top productos**

```sql
-- 0041_top_views.sql

CREATE MATERIALIZED VIEW top_clientes AS
SELECT
  f.tenant_id,
  f.cliente_id,
  c.razon_social,
  COUNT(*) AS facturas_total,
  SUM(f.total) AS monto_total
FROM facturas f
INNER JOIN clientes c ON c.id = f.cliente_id
WHERE f.estado_sunat = 'aceptada'
  AND f.fecha_emision > CURRENT_DATE - INTERVAL '12 months'
GROUP BY f.tenant_id, f.cliente_id, c.razon_social;

CREATE INDEX top_clientes_tenant_monto ON top_clientes(tenant_id, monto_total DESC);

CREATE MATERIALIZED VIEW top_productos AS
SELECT
  f.tenant_id,
  lf.producto_id,
  p.sku,
  p.descripcion,
  SUM(lf.cantidad) AS cantidad_vendida,
  SUM(lf.total) AS monto_total
FROM lineas_factura lf
INNER JOIN facturas f ON f.id = lf.factura_id
INNER JOIN productos p ON p.id = lf.producto_id
WHERE f.estado_sunat = 'aceptada'
  AND f.fecha_emision > CURRENT_DATE - INTERVAL '12 months'
GROUP BY f.tenant_id, lf.producto_id, p.sku, p.descripcion;

CREATE INDEX top_productos_tenant_monto ON top_productos(tenant_id, monto_total DESC);

SELECT cron.schedule('refresh-tops', '*/15 * * * *', $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY top_clientes;
  REFRESH MATERIALIZED VIEW CONCURRENTLY top_productos;
$$);

GRANT SELECT ON top_clientes, top_productos, dashboard_metricas, pipeline_cotizaciones TO authenticated;
```

- [ ] **Step 3: Commit**

```bash
pnpm db:migrate
git add supabase/migrations/0040_dashboard_views.sql supabase/migrations/0041_top_views.sql
git commit -m "feat(reportes): add dashboard and top materialized views with pg_cron refresh"
```

---

## Task 2: Copiar componentes Tremor a `src/components/charts/`

**Estimado**: 3h
**Agente**: `frontend-developer`

- [ ] **Step 1: Copiar 6 componentes desde el repo `tremorlabs/tremor`**

Componentes a copiar (con sus dependencias):

- `BarChart` — para "ventas por mes"
- `BarList` — top clientes/productos como lista horizontal
- `KpiCard` (Card adaptado) — KPI cards
- `ComboChart` — bar + line para "ventas vs cotizaciones"
- `CategoryBar` — distribución de stock por familia
- `DateRangePicker` — picker de rango fechas

Para cada uno:

1. Copiar `.tsx` desde `/tmp/orion-research/tremor/src/components/<Component>/<Component>.tsx`
2. Eliminar archivos `.stories.tsx` y `.test.tsx`
3. Adaptar imports (`@/components/ui/...` paths del proyecto)
4. Adaptar paleta de colores (Tailwind `colors` del proyecto)

- [ ] **Step 2: Wrapper KpiCard simple**

```typescript
// src/components/charts/KpiCard.tsx
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown } from 'lucide-react';

export function KpiCard({
  label,
  value,
  delta,
  format = 'number',
}: {
  label: string;
  value: number;
  delta?: number;  // +5.2 = +5.2%
  format?: 'number' | 'currency' | 'percentage';
}) {
  const formattedValue =
    format === 'currency' ? `USD ${value.toLocaleString('es-PE', { minimumFractionDigits: 2 })}` :
    format === 'percentage' ? `${value.toFixed(1)}%` :
    value.toLocaleString('es-PE');

  return (
    <Card>
      <CardContent className="p-4">
        <CardDescription>{label}</CardDescription>
        <div className="text-2xl font-bold">{formattedValue}</div>
        {delta !== undefined && (
          <div className={`flex items-center gap-1 text-xs ${delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {delta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            <span>{Math.abs(delta).toFixed(1)}%</span>
            <span className="text-muted-foreground">vs mes anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/charts/
git commit -m "feat(reportes): add Tremor-derived chart components (BarChart, BarList, KpiCard, ComboChart)"
```

---

## Task 3: Dashboard homepage con 6 cards + 2 charts

**Estimado**: 4h
**Agente**: `frontend-developer`

- [ ] **Step 1: Page Server Component**

```typescript
// src/app/(app)/[companySlug]/page.tsx
import { db } from '@/lib/db/client';
import { sql } from 'drizzle-orm';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { requirePermission } from '@/lib/auth/require-permission';
import { DashboardKpis } from '@/components/modules/reportes/DashboardKpis';
import { VentasMesChart } from '@/components/modules/reportes/VentasMesChart';
import { PipelineChart } from '@/components/modules/reportes/PipelineChart';
import { TopClientesList } from '@/components/modules/reportes/TopClientesList';
import { TopProductosList } from '@/components/modules/reportes/TopProductosList';

export default async function DashboardPage() {
  await requirePermission('reportes.ver');
  const tenant = await getCurrentTenant();

  // Data load en paralelo
  const [metricas, pipeline, topClientes, topProductos, cxcTotales, stockCritico] = await Promise.all([
    db.execute(sql`
      SELECT * FROM dashboard_metricas
      WHERE tenant_id = ${tenant.id} AND mes >= date_trunc('month', current_date) - INTERVAL '11 months'
      ORDER BY mes
    `),
    db.execute(sql`SELECT * FROM pipeline_cotizaciones WHERE tenant_id = ${tenant.id}`),
    db.execute(sql`SELECT * FROM top_clientes WHERE tenant_id = ${tenant.id} ORDER BY monto_total DESC LIMIT 10`),
    db.execute(sql`SELECT * FROM top_productos WHERE tenant_id = ${tenant.id} ORDER BY monto_total DESC LIMIT 20`),
    db.execute(sql`SELECT COALESCE(SUM(saldo_total), 0) AS total, COALESCE(SUM(saldo_vencido), 0) AS vencido FROM cuentas_por_cobrar WHERE tenant_id = ${tenant.id}`),
    db.execute(sql`SELECT COUNT(*) AS critico FROM stock_critico WHERE tenant_id = ${tenant.id}`),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <DashboardKpis
        metricas={metricas.rows}
        cxcTotales={cxcTotales.rows[0]}
        stockCritico={Number(stockCritico.rows[0].critico)}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VentasMesChart data={metricas.rows} />
        <PipelineChart data={pipeline.rows} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopClientesList data={topClientes.rows} />
        <TopProductosList data={topProductos.rows} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: DashboardKpis component**

```typescript
// src/components/modules/reportes/DashboardKpis.tsx
import { KpiCard } from '@/components/charts/KpiCard';

export function DashboardKpis({ metricas, cxcTotales, stockCritico }: any) {
  const mesActual = metricas[metricas.length - 1] ?? { ventas_total: 0, facturas_emitidas: 0 };
  const mesAnterior = metricas[metricas.length - 2] ?? { ventas_total: 0, facturas_emitidas: 0 };
  const deltaVentas = mesAnterior.ventas_total > 0
    ? ((Number(mesActual.ventas_total) - Number(mesAnterior.ventas_total)) / Number(mesAnterior.ventas_total)) * 100
    : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <KpiCard label="Ventas del mes" value={Number(mesActual.ventas_total)} delta={deltaVentas} format="currency" />
      <KpiCard label="Facturas emitidas" value={Number(mesActual.facturas_emitidas)} />
      <KpiCard label="Clientes únicos" value={Number(mesActual.clientes_unicos ?? 0)} />
      <KpiCard label="Ticket promedio" value={Number(mesActual.ticket_promedio ?? 0)} format="currency" />
      <KpiCard label="CxC total" value={Number(cxcTotales.total)} format="currency" />
      <KpiCard label="Stock crítico" value={stockCritico} />
    </div>
  );
}
```

- [ ] **Step 3: VentasMesChart, PipelineChart, Tops (similar pattern)**

```typescript
// src/components/modules/reportes/VentasMesChart.tsx
'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function VentasMesChart({ data }: { data: any[] }) {
  const formatted = data.map((d) => ({
    mes: new Date(d.mes).toLocaleDateString('es-PE', { month: 'short' }),
    ventas: Number(d.ventas_total),
  }));
  return (
    <Card>
      <CardHeader><CardTitle>Ventas últimos 12 meses</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={formatted}>
            <XAxis dataKey="mes" /><YAxis /><Tooltip />
            <Bar dataKey="ventas" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/modules/reportes/ src/app/\(app\)/\[companySlug\]/page.tsx
git commit -m "feat(reportes): add dashboard with 6 KPIs and 4 charts"
```

---

## Task 4: Reporte de ventas con filtros

**Estimado**: 3h
**Agente**: `frontend-developer`

- [ ] **Step 1: Page con filtros**

```typescript
// src/app/(app)/[companySlug]/reportes/ventas/page.tsx
'use client';
// Filtros: date range, comercial (combobox), cliente (combobox)
// Server Action getReporteVentas(filtros) devuelve rows agrupadas según view o query directa
// Tabla con totales y chart por mes/comercial/cliente
```

- [ ] **Step 2: Server Action**

```typescript
// src/server/actions/reportes-ventas.ts
'use server';
export async function getReporteVentas(filtros: {
  desde: string;
  hasta: string;
  comercialId?: string;
  clienteId?: string;
  groupBy: 'mes' | 'comercial' | 'cliente' | 'producto';
}) {
  await requirePermission('reportes.ver');
  // ... query dinámica según groupBy
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/\[companySlug\]/reportes/ventas/ src/server/actions/reportes-ventas.ts
git commit -m "feat(reportes): add ventas report with date/comercial/cliente filters"
```

---

## Task 5: Drill-down: click KPI → tabla detalle

**Estimado**: 3h
**Agente**: `frontend-developer`

- [ ] **Step 1: Hacer KPIs clickeables**

```typescript
// En DashboardKpis: envolver cards en Link
<Link href={`/${slug}/reportes/ventas?desde=${mesActual.fecha_inicio}&hasta=${mesActual.fecha_fin}`}>
  <KpiCard ... />
</Link>
```

- [ ] **Step 2: TopClientesList clickeable**

```typescript
// Cada item del top → /[slug]/clientes/[id]
```

- [ ] **Step 3: Stock crítico → /inventario/critico**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(reportes): add drill-down navigation from KPIs and tops"
```

---

## Task 6: Exportación a Excel de cada reporte

**Estimado**: 4h
**Agente**: `backend-developer`

- [ ] **Step 1: Helper genérico ExcelJS**

```typescript
// src/lib/excel/export-helpers.ts
import * as ExcelJS from 'exceljs';

export async function exportToExcel<T>({
  filename,
  sheetName,
  columns,
  rows,
}: {
  filename: string;
  sheetName: string;
  columns: { header: string; key: keyof T; width?: number; format?: (v: any) => any }[];
  rows: T[];
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.columns = columns.map((c) => ({ header: c.header, key: String(c.key), width: c.width ?? 20 }));
  ws.getRow(1).font = { bold: true };
  for (const row of rows) {
    const formatted: Record<string, any> = {};
    for (const c of columns) {
      formatted[String(c.key)] = c.format ? c.format(row[c.key]) : row[c.key];
    }
    ws.addRow(formatted);
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}
```

- [ ] **Step 2: Server actions de export**

```typescript
// src/server/actions/reportes-export.ts
'use server';
export async function exportarVentas(filtros: any) {
  await requirePermission('reportes.exportar');
  const { tenant } = await requirePermission('reportes.exportar');
  const data = await getReporteVentas(filtros);
  const buffer = await exportToExcel({
    filename: 'ventas',
    sheetName: 'Ventas',
    columns: [
      { header: 'Fecha', key: 'fecha' },
      { header: 'Número', key: 'numero' },
      { header: 'Cliente', key: 'cliente' },
      { header: 'Total', key: 'total', format: (v) => Number(v).toFixed(2) },
    ],
    rows: data,
  });

  // Subir a Storage temp con TTL de 1h
  const supabase = createAdminClient();
  const path = `${tenant.id}/exports/ventas-${Date.now()}.xlsx`;
  await supabase.storage.from('exports').upload(path, buffer);
  const { data: urlData } = supabase.storage.from('exports').createSignedUrl(path, 3600);
  return { success: true as const, data: { url: urlData.signedUrl } };
}
```

- [ ] **Step 3: ExportButton component**

```typescript
// src/components/modules/reportes/ExportButton.tsx
'use client';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

export function ExportButton({ exportFn, label = 'Exportar Excel' }: { exportFn: () => Promise<{ success: boolean; data?: { url: string } }>; label?: string }) {
  const [loading, setLoading] = useState(false);
  const handler = async () => {
    setLoading(true);
    const res = await exportFn();
    setLoading(false);
    if (res.success && res.data?.url) {
      window.open(res.data.url);
    }
  };
  return (
    <Button onClick={handler} disabled={loading} variant="outline">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {label}
    </Button>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/excel/export-helpers.ts src/server/actions/reportes-export.ts src/components/modules/reportes/ExportButton.tsx
git commit -m "feat(reportes): add Excel export with signed URL download"
```

---

## Done criteria

- [ ] Dashboard carga en <2s con datos reales (vistas materializadas).
- [ ] Click "Top 1: Cliente X" abre la lista de facturas de ese cliente.
- [ ] Excel exportado tiene formato consistente, encabezados en negrita, columnas con anchos apropiados.
- [ ] Refresh matview cada 5min se ejecuta sin errores.
- [ ] User con rol Comercial ve solo SUS ventas (filtrar por `comercial_id = current_user_id` en views si aplica).

## Notas

- **Refresh matview puede saturar**: con 1M facturas, REFRESH MATERIALIZED VIEW CONCURRENTLY toma >10s. Considerar refresh incremental por tenant si crece.
- **Export Excel grande** (>10k filas): server timeout 60s puede limitar. Si es problema, generar background job con Edge Function que actualiza una notificación cuando termine.
- **Reporte por comercial**: requiere columna `comercial_id` en `facturas` (heredado de cotización). Verificar que se está poblando.
- **Drill-down con TanStack Query**: cuando user navega del dashboard al detalle, ya tenemos los datos en cache. Mantener cache TTL 5min para sincronizar con refresh matview.
