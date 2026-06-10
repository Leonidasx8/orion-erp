-- Vincula guías de remisión a la cotización de origen
ALTER TABLE guias_remision
  ADD COLUMN IF NOT EXISTS cotizacion_id uuid REFERENCES cotizaciones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_guias_remision_cotizacion_id
  ON guias_remision(cotizacion_id);
