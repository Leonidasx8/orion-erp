ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS nombre_comercial text,
  ADD COLUMN IF NOT EXISTS linea_credito numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plazo_credito text NOT NULL DEFAULT 'contado',
  ADD COLUMN IF NOT EXISTS lista_precio text NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS comercial_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
