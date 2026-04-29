# 06 — Especificación de módulos

> Detalle por módulo del Anexo I: alcance, riesgos, repos de referencia, horas estimadas.
> Total estimado: 262 horas. Buffer: 88h sobre las 350h disponibles (7 sem × 50h).

## B.0 — Tenants y Plataforma (NUEVO, no estaba en Anexo I) — 18h

**Alcance**: módulo Superadmin Global Dignita para crear/gestionar tenants. Onboarding wizard 5 pasos.

**Por qué se agregó**: vendiendo Orión a un solo cliente es bi-empresa. Si vendemos a un segundo cliente (probable), necesitamos crear nuevos tenants sin tocar SQL.

**Tablas**: `tenants`, `platform_admins`, `tenant_members`, `platform_audit_log`, `tenant_usage_metrics`.

**Repos**: `usebasejump/basejump` (multi-tenant accounts en Supabase, 931 stars). Aplicar la migration encima del template.

## B.1 — Multiempresa — 8h (parte ya cubierta por B.0)

Selector de empresa (path-based), persistencia de última empresa, RLS por tenant en todas las tablas.

## B.2 — Autenticación y Roles — 20h

3 roles base (Superadmin/Comercial/Facturación) + roles custom dinámicos editables por Superadmin del tenant. Casbin + RLS. Login con magic link, MFA para Superadmin.

**Riesgo crítico**: ocultar costos a no-Superadmin no se hace solo en frontend. Necesitamos vista `productos_publicos` que NUNCA devuelve `precio_compra` salvo si el rol incluye `productos.ver_costo`.

**Repos**: `apache/casbin`, `casbin/casbin.js`, `Razikus/supabase-nextjs-template` (MFA).

## B.3 — Gestión de Clientes — 22h

CRUD B2B/B2C, validación SUNAT/RENIEC en tiempo real con caché de 30 días.

**Riesgo**: APIs pagas se queman si no hay caché. Tabla `validaciones_documento` con `(tipo_doc, numero, datos_jsonb, validado_at)` y trigger que solo consulta API si `validado_at < now() - 30 days`.

**Repos**: `giansalex/consulta-ruc`, ERPNext doctype Customer.

**APIs**: apis.net.pe (RUC/DNI gratis hasta 100/día).

## B.4 — Catálogo de productos — 32h

**El módulo más complejo después de SUNAT.** Por qué:

- 475+ productos por empresa
- Atributos estructurados (calibre mm²/AWG/MCM, diámetro agujero, voltaje, color)
- Importación Excel con headers basura (9 filas iniciales)
- Búsqueda fuzzy instantánea (`pg_trgm`)
- Doble lista de precios desde día 1 (compra + venta)
- Margen mínimo bloqueante en cotizaciones

**Esquema clave**:

```sql
CREATE TABLE productos (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id),
  sku text NOT NULL,
  descripcion text NOT NULL,
  familia text,                        -- 'Terminales 1 hueco 35Kv'
  calibre text,                        -- '50mm2', '4 AWG'
  unidad_calibre text,                 -- 'mm2', 'AWG', 'MCM', 'A'
  diametro_agujero text,               -- '3/16', '1/4'... null si no aplica
  voltaje text,
  color text,
  unidad_medida text DEFAULT 'NIU',
  imagen_url text,
  estado text DEFAULT 'activo',        -- 'activo', 'descatalogado'
  margen_minimo numeric(5,2),          -- 10.00 = 10%
  search_vector tsvector,
  created_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, sku)
);

CREATE INDEX productos_search_idx ON productos USING gin(search_vector);
CREATE INDEX productos_descripcion_trgm ON productos USING gin(descripcion gin_trgm_ops);
CREATE INDEX productos_tenant_idx ON productos (tenant_id);

-- Trigger para mantener search_vector actualizado
CREATE OR REPLACE FUNCTION productos_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('spanish', coalesce(NEW.sku, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(NEW.descripcion, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(NEW.familia, '')), 'C');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER productos_search_update
BEFORE INSERT OR UPDATE ON productos
FOR EACH ROW EXECUTE FUNCTION productos_search_trigger();

CREATE TABLE precios_producto (
  id uuid PRIMARY KEY,
  producto_id uuid REFERENCES productos(id),
  tipo text NOT NULL,                  -- 'compra' | 'venta_sugerido' | 'mayorista'
  moneda text NOT NULL,                -- 'USD' | 'PEN'
  precio numeric(14,4) NOT NULL,
  vigente_desde date NOT NULL,
  vigente_hasta date,
  UNIQUE (producto_id, tipo, vigente_desde)
);
```

**Importación Excel**: parser tolerante a headers basura. Ver `scripts/import-catalog.ts`.

**Repos**: `pjborowiecki/QUANTUM-STASH` (stack idéntico), `tableflow/tableflow` (importación con preview), `inventree/InvenTree` (variantes).

## B.5 — Cotizaciones — 30h

**Corazón del sistema.** 6 estados con xstate, generación PDF profesional, conversión a OC/factura/guía sin perder trazabilidad.

**Estados**: `borrador → enviada → aprobada → convertida` o `rechazada` o `vencida`.

**Tabla**:

```sql
CREATE TABLE cotizaciones (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id),
  numero text NOT NULL,                -- COT-2026-00123
  cliente_id uuid REFERENCES clientes(id),
  estado text NOT NULL DEFAULT 'borrador',
  fecha_emision date NOT NULL,
  fecha_vencimiento date NOT NULL,
  moneda text NOT NULL,
  tipo_cambio numeric(10,4),           -- congelado al momento de emitir
  subtotal numeric(14,4) NOT NULL,
  descuento numeric(14,4) DEFAULT 0,
  igv numeric(14,4) NOT NULL,
  total numeric(14,4) NOT NULL,
  margen_aplicado numeric(5,2),        -- 5, 10, 15 o custom
  terminos_pago text,
  tiempo_entrega text,
  observaciones text,
  pdf_url text,                        -- Supabase Storage URL
  comercial_id uuid REFERENCES auth.users(id),
  created_at timestamptz,
  UNIQUE (tenant_id, numero)
);

CREATE TABLE lineas_cotizacion (
  id uuid PRIMARY KEY,
  cotizacion_id uuid REFERENCES cotizaciones(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES productos(id),
  descripcion text NOT NULL,           -- copiada al momento (no FK)
  cantidad numeric(10,2) NOT NULL,
  precio_unitario numeric(14,4) NOT NULL,
  margen_linea numeric(5,2),           -- override del margen general
  subtotal numeric(14,4) NOT NULL,
  orden int NOT NULL                   -- para ordenamiento en PDF
);
```

**PDF**: react-pdf en serverless. Generar al "Enviar" la cotización y guardar en Storage. Cada cambio post-envío crea versión nueva (no se pisa).

**Repos**: `al1abb/invoify` (Next.js + react-pdf), `xstate`, ERPNext doctype Quotation.

## B.6 — Órdenes de Compra — 12h

Cotización aprobada → OC con un click. Misma máquina de estados, otro template PDF.

**Repos**: `bigcapitalhq/bigcapital`.

## B.7 — Inventario y Kardex — 24h

**Riesgo**: race conditions al confirmar venta. Solución: triggers SQL (no lógica de aplicación) + `SELECT FOR UPDATE`.

```sql
CREATE TABLE kardex_movimientos (
  id bigserial PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id),
  producto_id uuid REFERENCES productos(id),
  fecha timestamptz NOT NULL,
  tipo text NOT NULL,                  -- 'entrada' | 'salida' | 'ajuste'
  origen_tipo text NOT NULL,           -- 'orden_compra' | 'factura' | 'guia' | 'manual'
  origen_id uuid,
  cantidad numeric(10,2) NOT NULL,
  costo_unitario numeric(14,4),
  saldo_post int,                      -- cached para velocidad
  observacion text,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX kardex_producto_idx ON kardex_movimientos(producto_id, fecha DESC);

-- Vista: stock actual por producto
CREATE VIEW stock_actual AS
SELECT
  producto_id,
  SUM(CASE WHEN tipo='entrada' THEN cantidad ELSE -cantidad END) AS stock
FROM kardex_movimientos
GROUP BY producto_id;
```

**Constraint opcional**: `CHECK (stock >= 0)` o flag de "permite stock negativo" según política decidida en kickoff.

**Repos**: `arnobt78/Stock-Inventory-Management-System--NextJS-FullStack` (Stockly), ERPNext Stock module.

## B.8 — Guías de remisión — 22h

Ver `04-sunat-nubefact-spec.md`. Cola de reintentos con `pgmq`.

## B.9 — Facturación SUNAT — 28h

Ver `04-sunat-nubefact-spec.md`. **El módulo más sensible.**

## B.10 — Crédito y Cuentas por Cobrar — 22h

```sql
CREATE TABLE creditos_cliente (
  cliente_id uuid PRIMARY KEY REFERENCES clientes(id),
  tenant_id uuid REFERENCES tenants(id),
  linea_credito numeric(14,4),         -- 0 = sin crédito (contado)
  plazo_dias int DEFAULT 0,
  bloqueado boolean DEFAULT false,
  motivo_bloqueo text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz
);

CREATE TABLE pagos (
  id uuid PRIMARY KEY,
  factura_id uuid REFERENCES facturas(id),
  monto numeric(14,4) NOT NULL,
  moneda text NOT NULL,
  fecha_pago date NOT NULL,
  metodo text,                         -- 'transferencia', 'efectivo', 'cheque'
  referencia text,                     -- nro operación bancaria
  registrado_por uuid REFERENCES auth.users(id),
  created_at timestamptz
);

-- Vista de saldo por cliente
CREATE MATERIALIZED VIEW cuentas_por_cobrar AS
SELECT
  f.cliente_id,
  SUM(f.total - COALESCE(p.total_pagado, 0)) AS saldo,
  MIN(f.fecha_vencimiento) FILTER (
    WHERE f.estado != 'pagada' AND f.fecha_vencimiento < CURRENT_DATE
  ) AS dia_mas_vencido
FROM facturas f
LEFT JOIN (
  SELECT factura_id, SUM(monto) AS total_pagado FROM pagos GROUP BY factura_id
) p ON p.factura_id = f.id
WHERE f.estado != 'anulada'
GROUP BY f.cliente_id;

CREATE INDEX cuentas_por_cobrar_idx ON cuentas_por_cobrar(cliente_id);

-- Refresh por trigger o cron cada 5 min
```

**`pg_cron` job diario**: marcar facturas como `vencida` cuando `fecha_vencimiento < CURRENT_DATE`.

**Repos**: ERPNext Accounts Receivable, `bigcapitalhq/bigcapital`, `flash-oss/medici` o `radzserg/lefra` (double-entry ledger).

## B.11 — Panel y Reportes — 20h

Vistas materializadas con refresh cada 5 min para el dashboard. Drill-down en vivo.

**Métricas**:

- Ventas mes vs mes anterior
- Top 10 clientes
- Top 20 productos
- CxC vencidas (aging report)
- Stock crítico (productos bajo umbral)
- Pipeline de cotizaciones (estado)

**Repos**: `tremorlabs/tremor`, `tremorlabs/tremor-blocks`, `recharts`.

---

## Resumen de horas

| Módulo                 | Horas   |
| ---------------------- | ------- |
| B.0 Tenants/Plataforma | 18      |
| B.1 Multiempresa       | 8       |
| B.2 Auth/Roles         | 20      |
| B.3 Clientes           | 22      |
| B.4 Catálogo           | 32      |
| B.5 Cotizaciones       | 30      |
| B.6 OC                 | 12      |
| B.7 Kardex             | 24      |
| B.8 Guías              | 22      |
| B.9 Facturación SUNAT  | 28      |
| B.10 Crédito           | 22      |
| B.11 Reportes          | 20      |
| Setup + DevOps         | 12      |
| Testing + Hardening    | 22      |
| **Total**              | **312** |

Buffer = 350h - 312h = **38 horas** para imprevistos del cliente, demoras en assets, y un par de iteraciones extras post-demo.
