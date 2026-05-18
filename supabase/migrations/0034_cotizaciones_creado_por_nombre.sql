-- 0034_cotizaciones_creado_por_nombre.sql
-- Snapshot del nombre del creador para evitar joins a auth en listas

ALTER TABLE cotizaciones
  ADD COLUMN IF NOT EXISTS creado_por_nombre text;

ALTER TABLE ordenes_compra
  ADD COLUMN IF NOT EXISTS comprador_nombre text;
