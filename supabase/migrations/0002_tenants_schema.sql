-- Tabla principal de tenants (sin RLS — solo platform_admins acceden)
CREATE TABLE tenants (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text        NOT NULL UNIQUE,
  razon_social     text        NOT NULL,
  ruc              text        NOT NULL,
  direccion_fiscal text,
  ubigeo           text,
  logo_url         text,
  color_primario   text        NOT NULL DEFAULT '#0070f3',
  color_secundario text        NOT NULL DEFAULT '#7928ca',
  favicon_url      text,
  plan             text        NOT NULL DEFAULT 'starter',
  estado           text        NOT NULL DEFAULT 'activo',
  config_sunat     jsonb,
  fecha_alta       timestamptz NOT NULL DEFAULT now(),
  fecha_baja       timestamptz,
  created_by       uuid,
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]{2,30}$'),
  CONSTRAINT ruc_format   CHECK (ruc  ~ '^(10|20)[0-9]{9}$'),
  CONSTRAINT plan_values  CHECK (plan  IN ('starter', 'pro', 'enterprise')),
  CONSTRAINT estado_values CHECK (estado IN ('activo', 'suspendido', 'baja'))
);

CREATE INDEX tenants_slug_idx   ON tenants(slug);
CREATE INDEX tenants_estado_idx ON tenants(estado);

-- Métricas de uso por tenant y mes (sin RLS)
CREATE TABLE tenant_usage_metrics (
  tenant_id              uuid          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  periodo                date          NOT NULL,
  cotizaciones_emitidas  int           NOT NULL DEFAULT 0,
  facturas_emitidas      int           NOT NULL DEFAULT 0,
  guias_emitidas         int           NOT NULL DEFAULT 0,
  storage_mb_usado       numeric(10,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, periodo)
);
