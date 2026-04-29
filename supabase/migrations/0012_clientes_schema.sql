-- Clientes (B2B: persona jurídica con RUC; B2C: persona natural con DNI u otro)
CREATE TABLE clientes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Identificación
  tipo_documento  text NOT NULL CHECK (tipo_documento IN ('RUC', 'DNI', 'CE', 'PASAPORTE', 'OTRO')),
  numero_documento text NOT NULL,
  tipo_persona    text NOT NULL DEFAULT 'natural' CHECK (tipo_persona IN ('natural', 'juridica')),

  -- Nombres
  razon_social    text,           -- persona jurídica
  nombres         text,           -- persona natural
  apellido_paterno text,
  apellido_materno text,

  -- Nombre para mostrar (calculado o manual)
  nombre_display  text GENERATED ALWAYS AS (
    COALESCE(razon_social, TRIM(CONCAT_WS(' ', nombres, apellido_paterno, apellido_materno)))
  ) STORED,

  -- Datos de contacto principales
  email           text,
  telefono        text,

  -- SUNAT / condición
  condicion_sunat text,           -- HABIDO, NO HABIDO, etc.
  estado_sunat    text,           -- ACTIVO, BAJA, etc.
  ubigeo_sunat    text,
  direccion_sunat text,

  -- CRM
  canal_captacion text,           -- referido, web, visita, etc.
  notas           text,
  tags            text[] NOT NULL DEFAULT '{}',

  -- Estado interno
  estado          text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'bloqueado')),

  -- Timestamps
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid,

  -- Full-text search
  search_vector   tsvector GENERATED ALWAYS AS (
    to_tsvector('spanish',
      COALESCE(razon_social, '') || ' ' ||
      COALESCE(nombres, '') || ' ' ||
      COALESCE(apellido_paterno, '') || ' ' ||
      COALESCE(apellido_materno, '') || ' ' ||
      COALESCE(numero_documento, '') || ' ' ||
      COALESCE(email, '')
    )
  ) STORED,

  UNIQUE (tenant_id, tipo_documento, numero_documento)
);

CREATE INDEX idx_clientes_tenant      ON clientes(tenant_id);
CREATE INDEX idx_clientes_search      ON clientes USING GIN(search_vector);
CREATE INDEX idx_clientes_documento   ON clientes(tenant_id, numero_documento);
CREATE INDEX idx_clientes_estado      ON clientes(tenant_id, estado);

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY clientes_tenant_isolation ON clientes
  USING (tenant_id = current_tenant_id());
