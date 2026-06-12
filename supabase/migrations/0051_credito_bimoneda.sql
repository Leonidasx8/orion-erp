-- Migración: Crédito bimoneda (columnas PEN + vista CxC reconstruida)
-- 2026-06-12

-- 1. Columnas nuevas en clientes
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS linea_credito_pen numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plazo_credito_pen text NOT NULL DEFAULT 'contado';

-- 2. Columnas nuevas en creditos_cliente
ALTER TABLE creditos_cliente
  ADD COLUMN IF NOT EXISTS linea_credito_pen numeric(14,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plazo_dias_pen integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bloqueado_pen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_bloqueo_pen text,
  ADD COLUMN IF NOT EXISTS bloqueado_pen_por uuid,
  ADD COLUMN IF NOT EXISTS bloqueado_pen_at timestamptz;

-- 3. Cancelar cron (ignorar error si no existe)
SELECT cron.unschedule('refresh-cxc');

-- 4. DROP vista materializada (CASCADE por si hay vistas dependientes)
DROP MATERIALIZED VIEW IF EXISTS cuentas_por_cobrar CASCADE;

-- 5. Recrear vista materializada con soporte bimoneda (USD + PEN)
CREATE MATERIALIZED VIEW cuentas_por_cobrar AS
SELECT
  f.tenant_id,
  f.cliente_id,
  c.razon_social,
  c.numero_documento,
  COUNT(*) FILTER (
    WHERE f.estado_sunat = 'aceptada'
      AND f.moneda = 'USD'
      AND COALESCE(p.total_pagado, 0) < f.total
  ) AS facturas_pendientes_usd,
  COALESCE(SUM(f.total - COALESCE(p.total_pagado, 0)) FILTER (
    WHERE f.estado_sunat = 'aceptada'
      AND f.moneda = 'USD'
      AND COALESCE(p.total_pagado, 0) < f.total
  ), 0) AS saldo_total_usd,
  COALESCE(SUM(f.total - COALESCE(p.total_pagado, 0)) FILTER (
    WHERE f.estado_sunat = 'aceptada'
      AND f.moneda = 'USD'
      AND COALESCE(p.total_pagado, 0) < f.total
      AND f.fecha_vencimiento < CURRENT_DATE
  ), 0) AS saldo_vencido_usd,
  COUNT(*) FILTER (
    WHERE f.estado_sunat = 'aceptada'
      AND f.moneda = 'PEN'
      AND COALESCE(p.total_pagado, 0) < f.total
  ) AS facturas_pendientes_pen,
  COALESCE(SUM(f.total - COALESCE(p.total_pagado, 0)) FILTER (
    WHERE f.estado_sunat = 'aceptada'
      AND f.moneda = 'PEN'
      AND COALESCE(p.total_pagado, 0) < f.total
  ), 0) AS saldo_total_pen,
  COALESCE(SUM(f.total - COALESCE(p.total_pagado, 0)) FILTER (
    WHERE f.estado_sunat = 'aceptada'
      AND f.moneda = 'PEN'
      AND COALESCE(p.total_pagado, 0) < f.total
      AND f.fecha_vencimiento < CURRENT_DATE
  ), 0) AS saldo_vencido_pen,
  COUNT(*) FILTER (
    WHERE f.estado_sunat = 'aceptada'
      AND COALESCE(p.total_pagado, 0) < f.total
  ) AS facturas_pendientes,
  MIN(f.fecha_vencimiento) FILTER (
    WHERE f.estado_sunat = 'aceptada'
      AND COALESCE(p.total_pagado, 0) < f.total
      AND f.fecha_vencimiento < CURRENT_DATE
  ) AS dia_mas_vencido,
  COALESCE(cc.linea_credito, 0)     AS linea_credito_usd,
  COALESCE(cc.linea_credito_pen, 0) AS linea_credito_pen,
  COALESCE(cc.bloqueado, false)     AS bloqueado,
  COALESCE(cc.bloqueado_pen, false) AS bloqueado_pen
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
  cc.linea_credito_pen,
  cc.bloqueado,
  cc.bloqueado_pen;

-- 6. Índice único para REFRESH CONCURRENTLY
CREATE UNIQUE INDEX cxc_tenant_cliente_idx ON cuentas_por_cobrar(tenant_id, cliente_id);

-- 7. Permisos
GRANT SELECT ON cuentas_por_cobrar TO authenticated;

-- 8. Restaurar cron job (cada 5 minutos)
SELECT cron.schedule(
  'refresh-cxc',
  '*/5 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY cuentas_por_cobrar'
);
