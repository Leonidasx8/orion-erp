ALTER TABLE cotizaciones
  ADD COLUMN IF NOT EXISTS veces_editado integer NOT NULL DEFAULT 0;
