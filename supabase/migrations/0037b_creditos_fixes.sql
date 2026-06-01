ALTER TABLE creditos_cliente ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE TRIGGER trg_creditos_cliente_updated_at
  BEFORE UPDATE ON creditos_cliente
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER POLICY "credito_tenant" ON creditos_cliente RENAME TO "creditos_cliente_tenant_isolation";
