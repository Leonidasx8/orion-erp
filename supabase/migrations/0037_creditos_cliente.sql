CREATE TABLE creditos_cliente (
  cliente_id uuid PRIMARY KEY REFERENCES clientes(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  linea_credito numeric(14,4) NOT NULL DEFAULT 0,
  moneda text NOT NULL DEFAULT 'PEN',
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
