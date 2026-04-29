-- Direcciones de cliente
CREATE TABLE direcciones_cliente (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo        text NOT NULL DEFAULT 'fiscal' CHECK (tipo IN ('fiscal', 'entrega', 'cobranza', 'otro')),
  es_principal boolean NOT NULL DEFAULT false,
  alias       text,
  direccion   text NOT NULL,
  distrito    text,
  provincia   text,
  departamento text,
  ubigeo      text,
  referencia  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_direcciones_cliente ON direcciones_cliente(cliente_id);
CREATE INDEX idx_direcciones_tenant  ON direcciones_cliente(tenant_id);

ALTER TABLE direcciones_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY dir_cliente_tenant_isolation ON direcciones_cliente
  USING (tenant_id = current_tenant_id());

-- Contactos de cliente
CREATE TABLE contactos_cliente (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  cargo       text,
  email       text,
  telefono    text,
  es_principal boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contactos_cliente ON contactos_cliente(cliente_id);
CREATE INDEX idx_contactos_tenant  ON contactos_cliente(tenant_id);

ALTER TABLE contactos_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY contacto_cliente_tenant_isolation ON contactos_cliente
  USING (tenant_id = current_tenant_id());
