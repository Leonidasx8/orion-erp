-- Series de documentos SUNAT por tenant
CREATE TABLE series_documentos (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo_documento  text        NOT NULL,  -- '01' factura, '03' boleta, '07' NC, '09' guía, etc.
  serie           text        NOT NULL,  -- 'F001', 'B001', 'T001'
  correlativo_actual bigint   NOT NULL DEFAULT 0,
  activa          boolean     NOT NULL DEFAULT true,
  CONSTRAINT tipo_doc_values CHECK (tipo_documento IN ('01','03','07','08','09','31')),
  CONSTRAINT serie_format CHECK (serie ~ '^[FBTNR][0-9]{3}$'),
  UNIQUE (tenant_id, tipo_documento, serie)
);

CREATE INDEX series_documentos_tenant_idx ON series_documentos(tenant_id);

ALTER TABLE series_documentos ENABLE ROW LEVEL SECURITY;

-- Solo miembros del tenant pueden ver sus series
CREATE POLICY "series_documentos: miembros del tenant"
  ON series_documentos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = series_documentos.tenant_id
        AND tm.user_id   = auth.uid()
        AND tm.activo    = true
    )
  );
