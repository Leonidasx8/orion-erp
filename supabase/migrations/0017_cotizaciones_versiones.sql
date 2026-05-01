-- ============================================================================
-- COTIZACIONES_VERSIONES
-- Snapshot inmutable de una cotización + sus ítems, creado antes de cualquier
-- modificación post-envío o regeneración de PDF.
-- Propósito: trazabilidad / auditoría de qué se envió al cliente en cada momento.
-- ============================================================================

CREATE TABLE cotizaciones_versiones (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cotizacion_id   uuid        NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,

  -- Número de versión por cotización (1 = primera captura, 2 = segunda, ...)
  version         integer     NOT NULL,

  -- Qué evento disparó la captura
  tipo_evento     text        NOT NULL
                  CHECK (tipo_evento IN (
                    'pre_edicion',   -- antes de editar una cotización ya enviada
                    'pdf_generado',  -- al generar/regenerar PDF
                    'envio'          -- al enviar (captura del estado exacto enviado)
                  )),

  -- Snapshot completo: { cotizacion: {...}, items: [...] }
  datos           jsonb       NOT NULL,

  creado_por      uuid        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (cotizacion_id, version)
);

CREATE INDEX idx_cotizaciones_versiones_cotizacion
  ON cotizaciones_versiones(cotizacion_id);

CREATE INDEX idx_cotizaciones_versiones_tenant
  ON cotizaciones_versiones(tenant_id);

ALTER TABLE cotizaciones_versiones ENABLE ROW LEVEL SECURITY;

CREATE POLICY cotizaciones_versiones_tenant_isolation ON cotizaciones_versiones
  USING (tenant_id = current_tenant_id());
