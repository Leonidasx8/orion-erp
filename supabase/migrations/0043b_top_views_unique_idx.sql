-- CONCURRENTLY requiere al menos un UNIQUE index
CREATE UNIQUE INDEX top_clientes_tenant_cliente_idx ON top_clientes(tenant_id, cliente_id);
CREATE UNIQUE INDEX top_productos_tenant_producto_idx ON top_productos(tenant_id, producto_id);
