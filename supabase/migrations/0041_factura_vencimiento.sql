-- ============================================================================
-- B.10 — Función utilitaria factura_esta_vencida + cron diario CxC
-- No muta estado_sunat (refleja realidad SUNAT). La lógica de vencimiento
-- vive aquí como función pura y en la matview via fecha_vencimiento < CURRENT_DATE.
-- ============================================================================

-- Función que retorna si una factura de crédito está vencida y sin saldar
CREATE OR REPLACE FUNCTION factura_esta_vencida(factura_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM facturas f
    WHERE f.id = factura_id
      AND f.forma_pago = 'credito'
      AND f.estado_sunat = 'aceptada'
      AND f.fecha_vencimiento < CURRENT_DATE
      AND (
        SELECT COALESCE(SUM(monto), 0)
        FROM pagos
        WHERE pagos.factura_id = factura_id
      ) < f.total
  )
$$;

-- Notificar via log cuando hay facturas vencidas nuevas (para monitoreo operativo)
CREATE OR REPLACE FUNCTION log_facturas_vencidas_nuevas()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM facturas f
  WHERE f.forma_pago = 'credito'
    AND f.estado_sunat = 'aceptada'
    AND f.fecha_vencimiento = CURRENT_DATE - 1  -- vencieron ayer
    AND (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE pagos.factura_id = f.id) < f.total;

  IF v_count > 0 THEN
    RAISE NOTICE 'Orion CxC: % factura(s) vencida(s) nuevas el %', v_count, CURRENT_DATE - 1;
  END IF;
END
$$;

-- Cron diario: refrescar matview CxC + log de vencidas nuevas
-- Los "vencidos" se reflejan via fecha_vencimiento < CURRENT_DATE en la matview.
-- Usar DO block con guard idempotente (patrón consistente con 0032 y 0039).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    RAISE NOTICE 'pg_cron no está habilitado — los jobs diarios CxC no fueron creados. Habilitarlo en Supabase Dashboard → Database → Extensions.';
    RETURN;
  END IF;

  -- Idempotencia: eliminar jobs anteriores si existían
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-cxc-diario') THEN
    PERFORM cron.unschedule('refresh-cxc-diario');
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'log-vencidas-diario') THEN
    PERFORM cron.unschedule('log-vencidas-diario');
  END IF;

  -- 1:00 AM — refresh diario de la matview CxC (complementa el refresh cada 5 min de 0039)
  PERFORM cron.schedule(
    'refresh-cxc-diario',
    '0 1 * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY cuentas_por_cobrar'
  );

  -- 1:05 AM — log de facturas que vencieron el día anterior
  PERFORM cron.schedule(
    'log-vencidas-diario',
    '5 1 * * *',
    'SELECT log_facturas_vencidas_nuevas()'
  );

  RAISE NOTICE 'Jobs creados: refresh-cxc-diario (1:00 AM) y log-vencidas-diario (1:05 AM).';
END;
$$;
