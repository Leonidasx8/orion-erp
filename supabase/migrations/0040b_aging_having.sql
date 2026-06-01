CREATE OR REPLACE VIEW aging_cxc AS
SELECT
  f.tenant_id,
  f.cliente_id,
  c.razon_social,
  COALESCE(SUM(f.total - COALESCE(p.total_pagado, 0)) FILTER (
    WHERE COALESCE(p.total_pagado, 0) < f.total
      AND CURRENT_DATE - f.fecha_vencimiento BETWEEN 0 AND 30
  ), 0) AS bucket_0_30,
  COALESCE(SUM(f.total - COALESCE(p.total_pagado, 0)) FILTER (
    WHERE COALESCE(p.total_pagado, 0) < f.total
      AND CURRENT_DATE - f.fecha_vencimiento BETWEEN 31 AND 60
  ), 0) AS bucket_31_60,
  COALESCE(SUM(f.total - COALESCE(p.total_pagado, 0)) FILTER (
    WHERE COALESCE(p.total_pagado, 0) < f.total
      AND CURRENT_DATE - f.fecha_vencimiento BETWEEN 61 AND 90
  ), 0) AS bucket_61_90,
  COALESCE(SUM(f.total - COALESCE(p.total_pagado, 0)) FILTER (
    WHERE COALESCE(p.total_pagado, 0) < f.total
      AND CURRENT_DATE - f.fecha_vencimiento > 90
  ), 0) AS bucket_90_plus
FROM facturas f
INNER JOIN clientes c ON c.id = f.cliente_id
LEFT JOIN (
  SELECT factura_id, SUM(monto) AS total_pagado
  FROM pagos
  GROUP BY factura_id
) p ON p.factura_id = f.id
WHERE f.estado_sunat = 'aceptada'
  AND f.forma_pago = 'credito'
GROUP BY f.tenant_id, f.cliente_id, c.razon_social
HAVING COALESCE(SUM(f.total - COALESCE(p.total_pagado, 0)) FILTER (
  WHERE COALESCE(p.total_pagado, 0) < f.total
), 0) > 0;

ALTER VIEW aging_cxc SET (security_invoker = true);
GRANT SELECT ON aging_cxc TO authenticated;
