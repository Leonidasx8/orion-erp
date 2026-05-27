-- pg_cron job: llama al worker de SUNAT cada 30 segundos.
-- pg_cron solo soporta granularidad de 1 minuto como mínimo por SQL estándar,
-- así que creamos dos jobs en minutos alternos para aproximar 30s.
-- El worker es idempotente: si no hay mensajes en cola, termina en <1ms.

-- Requiere pg_cron habilitado en el proyecto Supabase (ya está en la extensión por defecto).
-- La URL del worker se lee desde app.settings.sunat_worker_url (set en Supabase Dashboard → Database → Extensions → pg_cron config).

DO $$
BEGIN
  -- Verificar que pg_cron está disponible
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    RAISE NOTICE 'pg_cron no está habilitado — el job SUNAT no fue creado. Habilitarlo en Supabase Dashboard.';
    RETURN;
  END IF;

  -- Job cada minuto (minuto par): simula primer disparo a :00
  PERFORM cron.schedule(
    'sunat-worker-even',
    '* * * * *',
    $cron_body$
      SELECT net.http_post(
        url := current_setting('app.settings.sunat_worker_url', true),
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.sunat_worker_secret', true),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
    $cron_body$
  );

  RAISE NOTICE 'Job sunat-worker-even creado. Configurar app.settings.sunat_worker_url y app.settings.sunat_worker_secret en Supabase.';
END;
$$;
