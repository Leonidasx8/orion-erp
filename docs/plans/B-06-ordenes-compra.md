# B.6 — Órdenes de Compra Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` o `superpowers:executing-plans`.

**Goal:** OC desde cotización aprobada con un click (caso típico), o desde cero. Reusa 80% de B.5 (state machine, líneas, totales, PDF) con template propio y entidad "proveedor" en lugar de "cliente".

**Architecture:** Tabla `ordenes_compra` análoga a `cotizaciones` pero con `proveedor_id` (que apunta a `clientes` con flag `es_proveedor` o a tabla `proveedores` separada — decisión: extender `clientes` con flag para no duplicar). State machine: borrador → enviada → aprobada → recibida (parcial/total) → cerrada.

**Tech Stack:** mismo que B.5.

**Estimación**: 12h — 4 tareas.

**Dependencias upstream**: B.5 cerrado y refactorizado para reuso.
**Dependencias downstream**: B.7 (kardex registra entradas desde recepción de OC).

---

## File structure

```
supabase/migrations/
├── 0022_clientes_es_proveedor.sql         # ALTER clientes ADD COLUMN es_proveedor
└── 0023_ordenes_compra_schema.sql

src/lib/db/schema/
├── ordenes-compra.ts
└── lineas-orden-compra.ts

src/lib/state-machines/
└── orden-compra-machine.ts

src/lib/pdf/
└── orden-compra-template.tsx

src/server/actions/
└── ordenes-compra.ts

src/app/(app)/[companySlug]/ordenes/
├── page.tsx
├── nueva/page.tsx
└── [id]/page.tsx

src/components/modules/ordenes/
├── OrdenesList.tsx
├── OrdenCompraForm.tsx                    # reusa LineasTable de cotizaciones
└── RecepcionParcialModal.tsx
```

---

## Task 1: Schema OC + extensión clientes con flag es_proveedor

**Estimado**: 2h
**Agente**: `schema-builder`

- [ ] **Step 1: Migrations**

```sql
-- 0022_clientes_es_proveedor.sql
ALTER TABLE clientes ADD COLUMN es_proveedor boolean DEFAULT false;
ALTER TABLE clientes ADD COLUMN es_cliente boolean DEFAULT true;
CREATE INDEX clientes_es_proveedor_idx ON clientes(es_proveedor) WHERE es_proveedor = true;

-- 0023_ordenes_compra_schema.sql
CREATE TABLE ordenes_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  numero text NOT NULL,                          -- 'OC-2026-00045'
  proveedor_id uuid NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  cotizacion_origen_id uuid REFERENCES cotizaciones(id),
  estado text NOT NULL DEFAULT 'borrador',
  fecha_emision date NOT NULL DEFAULT current_date,
  fecha_entrega_esperada date,
  moneda text NOT NULL DEFAULT 'USD',
  tipo_cambio numeric(10,4),
  subtotal numeric(14,4) NOT NULL DEFAULT 0,
  igv numeric(14,4) NOT NULL DEFAULT 0,
  total numeric(14,4) NOT NULL DEFAULT 0,
  terminos_pago text,
  direccion_entrega text,
  observaciones text,
  pdf_url text,
  comprador_id uuid REFERENCES auth.users(id),
  fecha_envio timestamptz,
  fecha_aprobacion timestamptz,
  fecha_recepcion_completa timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  UNIQUE (tenant_id, numero)
);
CREATE INDEX ordenes_compra_tenant_idx ON ordenes_compra(tenant_id);
CREATE INDEX ordenes_compra_proveedor_idx ON ordenes_compra(proveedor_id);
CREATE INDEX ordenes_compra_estado_idx ON ordenes_compra(estado);

CREATE TABLE lineas_orden_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id uuid NOT NULL REFERENCES ordenes_compra(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES productos(id),
  sku_snapshot text NOT NULL,
  descripcion text NOT NULL,
  cantidad numeric(10,2) NOT NULL CHECK (cantidad > 0),
  cantidad_recibida numeric(10,2) NOT NULL DEFAULT 0,
  precio_unitario numeric(14,4) NOT NULL CHECK (precio_unitario >= 0),
  subtotal numeric(14,4) NOT NULL,
  orden int NOT NULL DEFAULT 0
);
CREATE INDEX lineas_oc_idx ON lineas_orden_compra(orden_id, orden);

ALTER TABLE ordenes_compra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ordenes_tenant_isolation" ON ordenes_compra FOR ALL
USING (tenant_id = current_tenant_id());

ALTER TABLE lineas_orden_compra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lineas_oc_via_orden" ON lineas_orden_compra FOR ALL
USING (orden_id IN (SELECT id FROM ordenes_compra WHERE tenant_id = current_tenant_id()));

-- Correlativo
CREATE TABLE correlativos_orden_compra (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ano int NOT NULL,
  ultimo_correlativo int NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, ano)
);

CREATE OR REPLACE FUNCTION generar_numero_orden_compra(p_tenant_id uuid) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v_ano int := extract(year from current_date); v_n int;
BEGIN
  INSERT INTO correlativos_orden_compra (tenant_id, ano, ultimo_correlativo) VALUES (p_tenant_id, v_ano, 1)
  ON CONFLICT (tenant_id, ano) DO UPDATE SET ultimo_correlativo = correlativos_orden_compra.ultimo_correlativo + 1
  RETURNING ultimo_correlativo INTO v_n;
  RETURN 'OC-' || v_ano || '-' || lpad(v_n::text, 5, '0');
END $$;
GRANT EXECUTE ON FUNCTION generar_numero_orden_compra(uuid) TO authenticated;
```

- [ ] **Step 2: Drizzle + Zod (análogo a B.5)**

- [ ] **Step 3: Commit**

```bash
pnpm db:migrate
git add supabase/migrations/0022_clientes_es_proveedor.sql supabase/migrations/0023_ordenes_compra_schema.sql src/lib/db/schema/ordenes-compra.ts src/lib/db/schema/lineas-orden-compra.ts
git commit -m "feat(ordenes): add ordenes_compra schema with proveedor flag on clientes"
```

---

## Task 2: Reuso form de B.5 con adaptaciones

**Estimado**: 4h
**Agente**: `frontend-developer`

Estrategia: extraer de B.5 los componentes genéricos (`LineasTable`, `BuscarProductoCmdk`, `TotalesPanel`) a `src/components/shared/documento-comercial/` para que B.6 los importe sin duplicar.

- [ ] **Step 1: Refactor de B.5**

Mover:

- `src/components/modules/cotizaciones/LineasTable.tsx` → `src/components/shared/documento-comercial/LineasTable.tsx`
- `src/components/modules/cotizaciones/BuscarProductoCmdk.tsx` → `src/components/shared/documento-comercial/BuscarProducto.tsx`
- `src/components/modules/cotizaciones/TotalesPanel.tsx` → `src/components/shared/documento-comercial/TotalesPanel.tsx`

Update imports en B.5 con find+replace.

```bash
git commit -m "refactor(cotizaciones): extract shared documento-comercial components"
```

- [ ] **Step 2: ProveedorSelect (filtra clientes con es_proveedor=true)**

```typescript
// src/components/modules/ordenes/ProveedorSelect.tsx
'use client';
// Combobox cmdk con searchProveedores Server Action
import { searchProveedores } from '@/server/actions/proveedores-search';
// ... pattern idéntico a ClienteSelect pero filtrando por es_proveedor=true
```

- [ ] **Step 3: OrdenCompraForm**

```typescript
// src/components/modules/ordenes/OrdenCompraForm.tsx
'use client';
import { LineasTable } from '@/components/shared/documento-comercial/LineasTable';
import { TotalesPanel } from '@/components/shared/documento-comercial/TotalesPanel';
import { ProveedorSelect } from './ProveedorSelect';
// pattern análogo a CotizacionForm, OrdenSchema en lugar de CotizacionSchema
```

- [ ] **Step 4: Commit**

```bash
git add src/components/modules/ordenes/ src/components/shared/documento-comercial/
git commit -m "feat(ordenes): add OC form reusing shared components"
```

---

## Task 3: State machine OC + Server Actions

**Estimado**: 3h
**Agente**: `architect` + `backend-developer`

- [ ] **Step 1: State machine**

```typescript
// src/lib/state-machines/orden-compra-machine.ts
// Estados: borrador → enviada → aprobada → recibida_parcial / recibida_total → cerrada
// Eventos: ENVIAR, APROBAR, RECIBIR_PARCIAL (con cantidad por línea), RECIBIR_TOTAL, CERRAR
```

- [ ] **Step 2: Server actions**

```typescript
// src/server/actions/ordenes-compra.ts (esqueleto)
'use server';
// crearOrdenCompra(input)              // similar a crearCotizacion
// crearOcDesdeCotizacion(cotizacionId) // copia líneas + crea OC en borrador
// transicionarOrden(id, evento, payload)
// recibirParcial(ordenId, lineas: {lineaId, cantidad}[])  // dispara INSERT en kardex_movimientos (B.7)
// cerrarOrden(ordenId)
```

Importante: `recibirParcial` debe disparar movimientos de kardex (entrada de stock). Esto se delega a B.7 vía función SQL `registrar_entrada_stock(producto_id, cantidad, origen='orden_compra', origen_id=ordenId)`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/state-machines/orden-compra-machine.ts src/server/actions/ordenes-compra.ts
git commit -m "feat(ordenes): add OC state machine and server actions with stock integration"
```

---

## Task 4: Template react-pdf OC + listado/detalle UI

**Estimado**: 3h
**Agente**: `frontend-developer`

- [ ] **Step 1: PDF template (similar a cotización pero con título "ORDEN DE COMPRA" y datos de proveedor)**

```typescript
// src/lib/pdf/orden-compra-template.tsx
// Idéntico a cotizacion-template.tsx pero:
// - Título: "ORDEN DE COMPRA"
// - Sección "Proveedor" en lugar de "Cliente"
// - Sección "Dirección de entrega"
// - Sin "tiempo de entrega" (lo cambia "fecha entrega esperada")
```

- [ ] **Step 2: OrdenesList + page detalle**

Pattern idéntico a cotizaciones list/detalle.

- [ ] **Step 3: RecepcionParcialModal**

```typescript
// Modal con tabla de líneas:
// |Producto|Pedido|Recibido|Pendiente|Recibir ahora|
// Inputs editables en columna "Recibir ahora"
// Submit → recibirParcial(ordenId, lineas filtradas)
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/pdf/orden-compra-template.tsx src/app/\(app\)/\[companySlug\]/ordenes/ src/components/modules/ordenes/
git commit -m "feat(ordenes): add OC PDF template, list, detail, and partial reception"
```

---

## Done criteria

- [ ] OC creada desde cotización aprobada copia las líneas (snapshot, no FK).
- [ ] PDF de OC se distingue visualmente de cotización.
- [ ] Recepción parcial: marcar 50 de 100 unidades → kardex registra +50, OC queda en `recibida_parcial`.
- [ ] Recepción total: kardex registra el resto, OC pasa a `recibida_total`.

## Notas

- **OC vs cotización**: la diferencia principal es la dirección del documento (saliente al proveedor vs interna comercial). Layout PDF mantiene paridad.
- **Proveedores como subset de clientes**: simplifica el modelo (clientes y proveedores son entidades B2B con la misma estructura). Si se necesitan campos exclusivos de proveedor (cuenta bancaria, condiciones de pago), agregarlos como nullable.
- **Integración con kardex**: cuando se ejecuta `recibirParcial`, el helper SQL `registrar_entrada_stock` (que B.7 expone) inserta el movimiento. Si B.7 no está, marcar como TODO y los movimientos quedan en stub hasta que B.7 esté listo.
