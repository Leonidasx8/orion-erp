-- Columnas snapshot para guías de remisión
-- El worker de SUNAT necesita estos datos al momento de procesar la cola;
-- joinear clientes es frágil si el registro cambia entre emisión y envío.

ALTER TABLE guias_remision
  ADD COLUMN IF NOT EXISTS destinatario_razon_social_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS destinatario_num_doc_snapshot       TEXT,
  ADD COLUMN IF NOT EXISTS destinatario_tipo_doc_snapshot      TEXT DEFAULT '6',
  ADD COLUMN IF NOT EXISTS transportista_ruc_snapshot          TEXT,
  ADD COLUMN IF NOT EXISTS transportista_nombre_snapshot       TEXT,
  ADD COLUMN IF NOT EXISTS vehiculo_placa_snapshot             TEXT;
