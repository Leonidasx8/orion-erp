CREATE TABLE pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  factura_id uuid NOT NULL REFERENCES facturas(id) ON DELETE RESTRICT,
  monto numeric(14,4) NOT NULL CHECK (monto > 0),
  moneda text NOT NULL,
  tipo_cambio_aplicado numeric(10,4),
  fecha_pago date NOT NULL DEFAULT current_date,
  metodo text NOT NULL,
  referencia text,
  observaciones text,
  registrado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pagos_tenant_idx ON pagos(tenant_id);
CREATE INDEX pagos_factura_idx ON pagos(factura_id);
CREATE INDEX pagos_fecha_idx ON pagos(fecha_pago DESC);

ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pagos_tenant" ON pagos FOR ALL USING (tenant_id = current_tenant_id());
