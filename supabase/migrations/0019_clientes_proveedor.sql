-- Extiende clientes para que sirvan también como proveedores.
-- Un registro puede ser cliente, proveedor, o ambos.
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS es_proveedor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS es_cliente   boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_clientes_es_proveedor
  ON clientes(tenant_id, es_proveedor)
  WHERE es_proveedor = true;

-- Permisos para órdenes de compra
INSERT INTO permisos_definidos (codigo, modulo, accion, descripcion, es_sensible) VALUES
  ('ordenes.ver',      'ordenes', 'ver',      'Ver órdenes de compra',              false),
  ('ordenes.crear',    'ordenes', 'crear',     'Crear órdenes de compra',            false),
  ('ordenes.editar',   'ordenes', 'editar',    'Editar OC en borrador',              false),
  ('ordenes.enviar',   'ordenes', 'enviar',    'Enviar OC a proveedor',              false),
  ('ordenes.aprobar',  'ordenes', 'aprobar',   'Aprobar OC',                         false),
  ('ordenes.recibir',  'ordenes', 'recibir',   'Registrar recepción (parcial/total)',false),
  ('ordenes.eliminar', 'ordenes', 'eliminar',  'Eliminar OC en borrador',            true)
ON CONFLICT (codigo) DO NOTHING;
