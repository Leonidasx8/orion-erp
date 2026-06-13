-- Agrega columna para el brevete (N° licencia de conducir) del transportista
ALTER TABLE guias_remision
  ADD COLUMN IF NOT EXISTS conductor_brevete_snapshot TEXT;
