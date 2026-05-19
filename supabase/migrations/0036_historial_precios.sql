-- Historial de cambios de precio por producto
CREATE TABLE IF NOT EXISTS historial_precios (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  producto_id    uuid        NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  precio_anterior numeric(14,4) NOT NULL,
  precio_nuevo   numeric(14,4) NOT NULL,
  costo_anterior numeric(14,4),
  costo_nuevo    numeric(14,4),
  razon          text,
  creado_por     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  creado_por_nombre text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS historial_precios_producto_idx ON historial_precios(producto_id, created_at DESC);

-- RLS
ALTER TABLE historial_precios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_historial_precios" ON historial_precios
  FOR ALL USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);
