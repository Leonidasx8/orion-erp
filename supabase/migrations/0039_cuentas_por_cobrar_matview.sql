-- Vista materializada de saldos pendientes por cliente (cuentas por cobrar)
-- Agregada en B.10 — crédito y cobranza
-- Refresh automático cada 5 min via pg_cron (ya habilitado en 0032_sunat_cron.sql)

CREATE MATERIALIZED VIEW cuentas_por_cobrar AS
SELECT
  f.tenant_id,
  f.cliente_id,
  c.razon_social,
  c.numero_documento,
  COUNT(*) FILTER (
    WHERE f.estado_sunat = 'aceptada'
      AND COALESCE(p.total_pagado, 0) < f.total
  ) AS facturas_pendientes,
  SUM(f.total - COALESCE(p.total_pagado, 0)) FILTER (
    WHERE f.estado_sunat = 'aceptada'
      AND COALESCE(p.total_pagado, 0) < f.total
  ) AS saldo_total,
  MIN(f.fecha_vencimiento) FILTER (
    WHERE f.estado_sunat = 'aceptada'
      AND COALESCE(p.total_pagado, 0) < f.total
      AND f.fecha_vencimiento < CURRENT_DATE
  ) AS dia_mas_vencido,
  SUM(f.total - COALESCE(p.total_pagado, 0)) FILTER (
    WHERE f.estado_sunat = 'aceptada'
      AND COALESCE(p.total_pagado, 0) < f.total
      AND f.fecha_vencimiento < CURRENT_DATE
  ) AS saldo_vencido,
  cc.linea_credito,
  cc.bloqueado
FROM facturas f
INNER JOIN clientes c ON c.id = f.cliente_id
LEFT JOIN creditos_cliente cc ON cc.cliente_id = f.cliente_id
LEFT JOIN (
  SELECT factura_id, SUM(monto) AS total_pagado
  FROM pagos
  GROUP BY factura_id
) p ON p.factura_id = f.id
WHERE f.estado_sunat IN ('aceptada')
  AND f.forma_pago = 'credito'
GROUP BY
  f.tenant_id,
  f.cliente_id,
  c.razon_social,
  c.numero_documento,
  cc.linea_credito,
  cc.bloqueado;

-- Índice único requerido para REFRESH CONCURRENTLY
CREATE UNIQUE INDEX cxc_tenant_cliente_idx ON cuentas_por_cobrar(tenant_id, cliente_id);

-- Permisos de lectura para usuarios autenticados
GRANT SELECT ON cuentas_por_cobrar TO authenticated;

-- Refresh automático cada 5 minutos via pg_cron
-- Usa CONCURRENTLY para no bloquear lecturas durante el refresh
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    RAISE NOTICE 'pg_cron no está habilitado — el job refresh-cxc no fue creado. Habilitarlo en Supabase Dashboard → Database → Extensions.';
    RETURN;
  END IF;

  -- Eliminar job anterior si existía (idempotencia)
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-cxc') THEN
    PERFORM cron.unschedule('refresh-cxc');
  END IF;

  PERFORM cron.schedule(
    'refresh-cxc',
    '*/5 * * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY cuentas_por_cobrar'
  );

  RAISE NOTICE 'Job refresh-cxc creado: REFRESH MATERIALIZED VIEW CONCURRENTLY cuentas_por_cobrar cada 5 min.';
END;
$$;
