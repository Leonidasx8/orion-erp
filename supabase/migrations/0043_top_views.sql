-- Top clientes (últimos 12 meses)
CREATE MATERIALIZED VIEW top_clientes AS
SELECT
  f.tenant_id,
  f.cliente_id,
  c.razon_social,
  COUNT(*) AS facturas_total,
  COALESCE(SUM(f.total), 0) AS monto_total
FROM facturas f
INNER JOIN clientes c ON c.id = f.cliente_id
WHERE f.estado_sunat = 'aceptada'
  AND f.fecha_emision > CURRENT_DATE - INTERVAL '12 months'
GROUP BY f.tenant_id, f.cliente_id, c.razon_social;

CREATE INDEX top_clientes_tenant_monto ON top_clientes(tenant_id, monto_total DESC);

-- Top productos (últimos 12 meses)
-- lineas_factura: producto_id, cantidad, total (verificado en facturas.ts)
-- productos: codigo, nombre (verificado en productos.ts — no hay columna sku)
CREATE MATERIALIZED VIEW top_productos AS
SELECT
  f.tenant_id,
  lf.producto_id,
  p.codigo,
  p.nombre,
  COALESCE(SUM(lf.cantidad), 0) AS cantidad_vendida,
  COALESCE(SUM(lf.total), 0) AS monto_total
FROM lineas_factura lf
INNER JOIN facturas f ON f.id = lf.factura_id
INNER JOIN productos p ON p.id = lf.producto_id
WHERE f.estado_sunat = 'aceptada'
  AND f.fecha_emision > CURRENT_DATE - INTERVAL '12 months'
GROUP BY f.tenant_id, lf.producto_id, p.codigo, p.nombre;

CREATE INDEX top_productos_tenant_monto ON top_productos(tenant_id, monto_total DESC);

-- Refresh cada 15 min
SELECT cron.schedule(
  'refresh-tops',
  '*/15 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY top_clientes; REFRESH MATERIALIZED VIEW CONCURRENTLY top_productos;'
);

GRANT SELECT ON top_clientes, top_productos TO authenticated;
