-- ============================================================================
-- VISTAS de stock (B.7)
-- Proyectan costos_inventario + productos para queries de UI/reportes.
-- security_invoker = true → respetan RLS del usuario que consulta.
-- ============================================================================

-- Stock actual por producto + estado (sin_stock | critico | normal)
CREATE OR REPLACE VIEW stock_actual AS
SELECT
  ci.producto_id,
  p.tenant_id,
  p.codigo,
  p.nombre,
  p.descripcion,
  p.unidad_medida,
  ci.cantidad_actual                           AS stock,
  ci.costo_promedio,
  (ci.cantidad_actual * ci.costo_promedio)     AS valor_inventario,
  p.stock_minimo,
  ci.permite_stock_negativo,
  CASE
    WHEN ci.cantidad_actual <= 0                              THEN 'sin_stock'
    WHEN p.stock_minimo IS NULL                                THEN 'normal'
    WHEN ci.cantidad_actual <= p.stock_minimo                  THEN 'critico'
    ELSE 'normal'
  END                                          AS estado_stock,
  ci.updated_at                                AS ultimo_movimiento_at
FROM costos_inventario ci
INNER JOIN productos p ON p.id = ci.producto_id;

ALTER VIEW stock_actual SET (security_invoker = true);
GRANT SELECT ON stock_actual TO authenticated;


-- Sólo productos en estado crítico o sin stock
CREATE OR REPLACE VIEW stock_critico AS
SELECT * FROM stock_actual
 WHERE estado_stock IN ('sin_stock','critico');

ALTER VIEW stock_critico SET (security_invoker = true);
GRANT SELECT ON stock_critico TO authenticated;
