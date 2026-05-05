-- ============================================================================
-- SUNAT outbox — cola pgmq + log de envíos
-- Patrón outbox: el server action escribe el documento en estado 'lista_para_emitir'
-- y encola un mensaje. Un worker (edge function) drena la cola, llama a NUBEFACT,
-- y actualiza estado_sunat. Reintentos con backoff exponencial.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgmq CASCADE;

-- pgmq.create() crea tablas internas y requiere search_path explícito;
-- algunas versiones lo dejan vacío al instalar la extensión.
SET LOCAL search_path TO public, pgmq;

-- Crea la cola; idempotente (no lanza error si ya existe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pgmq.list_queues() WHERE queue_name = 'sunat_outbox') THEN
    PERFORM pgmq.create('sunat_outbox');
  END IF;
END $$;


-- Log de cada intento de envío (auditoría e investigación de errores)
CREATE TABLE sunat_envios_log (
  id                bigserial    PRIMARY KEY,
  tenant_id         uuid         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  documento_tipo    text         NOT NULL,    -- 'guia_remision' | 'factura' | 'nota_credito_debito'
  documento_id      uuid         NOT NULL,

  intento           int          NOT NULL CHECK (intento >= 1),
  resultado         text         NOT NULL CHECK (resultado IN (
                      'ok','error_red','error_sunat','error_validacion','idempotency_skip'
                    )),

  sunat_codigo      int,
  sunat_mensaje     text,
  request_payload   jsonb,
  response_payload  jsonb,

  ejecutado_at      timestamptz  NOT NULL DEFAULT now(),
  duracion_ms       int
);

CREATE INDEX idx_sunat_envios_log_doc      ON sunat_envios_log(documento_tipo, documento_id, intento);
CREATE INDEX idx_sunat_envios_log_tenant   ON sunat_envios_log(tenant_id, ejecutado_at DESC);
CREATE INDEX idx_sunat_envios_log_errores  ON sunat_envios_log(tenant_id, resultado, ejecutado_at DESC)
  WHERE resultado <> 'ok';

ALTER TABLE sunat_envios_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY sunat_envios_log_tenant_select ON sunat_envios_log
  FOR SELECT
  USING (tenant_id = current_tenant_id());
