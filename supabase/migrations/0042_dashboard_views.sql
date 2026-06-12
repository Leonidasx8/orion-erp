-- KPIs por tenant y mes
CREATE MATERIALIZED VIEW dashboard_metricas AS
SELECT
  f.tenant_id,
  date_trunc('month', f.fecha_emision)::date AS mes,
  COUNT(*) FILTER (WHERE f.estado_sunat = 'aceptada') AS facturas_emitidas,
  COALESCE(SUM(f.total) FILTER (WHERE f.estado_sunat = 'aceptada'), 0) AS ventas_total,
  COUNT(DISTINCT f.cliente_id) FILTER (WHERE f.estado_sunat = 'aceptada') AS clientes_unicos,
  COALESCE(AVG(f.total) FILTER (WHERE f.estado_sunat = 'aceptada'), 0) AS ticket_promedio,
  COALESCE(AVG(f.total) FILTER (WHERE f.estado_sunat = 'aceptada' AND f.moneda = 'USD'), 0) AS ticket_promedio_usd
FROM facturas f
GROUP BY f.tenant_id, date_trunc('month', f.fecha_emision);

CREATE UNIQUE INDEX dashboard_metricas_idx ON dashboard_metricas(tenant_id, mes);

-- Pipeline cotizaciones (últimos 90 días)
-- Usa created_at (timestamptz) para filtrar por ventana de tiempo
CREATE MATERIALIZED VIEW pipeline_cotizaciones AS
SELECT
  c.tenant_id,
  c.estado,
  COUNT(*) AS cantidad,
  COALESCE(SUM(c.total), 0) AS valor_total
FROM cotizaciones c
WHERE c.created_at > CURRENT_TIMESTAMP - INTERVAL '90 days'
GROUP BY c.tenant_id, c.estado;

CREATE UNIQUE INDEX pipeline_cotizaciones_idx ON pipeline_cotizaciones(tenant_id, estado);

-- Refresh cada 5 min
SELECT cron.schedule(
  'refresh-dashboard',
  '*/5 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metricas; REFRESH MATERIALIZED VIEW CONCURRENTLY pipeline_cotizaciones;'
);

GRANT SELECT ON dashboard_metricas, pipeline_cotizaciones TO authenticated;
