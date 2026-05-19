ALTER TABLE productos
ADD COLUMN IF NOT EXISTS proveedor_principal_id uuid REFERENCES clientes(id) ON DELETE SET NULL;
