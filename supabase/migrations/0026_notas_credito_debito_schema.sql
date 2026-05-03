-- ============================================================================
-- B.9 — NOTAS DE CRÉDITO Y DÉBITO
-- NC ('07') anula o modifica una factura/boleta. ND ('08') incrementa.
-- Catálogos SUNAT: tipo_motivo NC = catálogo 09; ND = catálogo 10.
-- ============================================================================

CREATE TABLE notas_credito_debito (
  id                            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                     uuid          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  tipo_documento                text          NOT NULL CHECK (tipo_documento IN ('07','08')),  -- '07' NC | '08' ND
  serie                         text          NOT NULL,
  numero                        bigint        NOT NULL,
  numero_completo               text          GENERATED ALWAYS AS (
                                  serie || '-' || LPAD(numero::text, 8, '0')
                                ) STORED,

  fecha_emision                 date          NOT NULL DEFAULT CURRENT_DATE,

  -- Documento que se afecta (FK lazy + snapshot por trazabilidad)
  documento_origen_tipo         text          NOT NULL CHECK (documento_origen_tipo IN ('01','03')),
  documento_origen_serie        text          NOT NULL,
  documento_origen_numero       bigint        NOT NULL,
  documento_origen_id           uuid          REFERENCES facturas(id),

  -- Motivo
  tipo_motivo                   text          NOT NULL,    -- catálogo 09 (NC) o 10 (ND)
  descripcion_motivo            text          NOT NULL,

  -- Cliente snapshot
  cliente_id                    uuid          NOT NULL REFERENCES clientes(id),
  cliente_tipo_doc_snapshot     text          NOT NULL,
  cliente_numero_doc_snapshot   text          NOT NULL,
  cliente_razon_social_snapshot text          NOT NULL,

  moneda                        text          NOT NULL CHECK (moneda IN ('PEN','USD')),
  tipo_cambio                   numeric(10,4),

  total_gravadas                numeric(14,4) NOT NULL DEFAULT 0,
  total_exoneradas              numeric(14,4) NOT NULL DEFAULT 0,
  total_inafectas               numeric(14,4) NOT NULL DEFAULT 0,
  igv                           numeric(14,4) NOT NULL DEFAULT 0,
  total                         numeric(14,4) NOT NULL DEFAULT 0,

  estado                        text          NOT NULL DEFAULT 'borrador'
                                CHECK (estado IN ('borrador','lista_para_emitir','emitida','anulada')),
  estado_sunat                  text          NOT NULL DEFAULT 'sin_enviar'
                                CHECK (estado_sunat IN ('sin_enviar','pendiente','aceptada','rechazada','error_red','anulada')),
  cdr_url                       text,
  xml_url                       text,
  pdf_url                       text,
  nubefact_response             jsonb,
  sunat_codigo                  int,
  sunat_mensaje                 text,

  emitida_por                   uuid          NOT NULL,
  fecha_emision_sunat           timestamptz,

  created_at                    timestamptz   NOT NULL DEFAULT now(),
  updated_at                    timestamptz   NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, tipo_documento, serie, numero)
);

CREATE INDEX idx_ncnd_tenant         ON notas_credito_debito(tenant_id);
CREATE INDEX idx_ncnd_origen         ON notas_credito_debito(documento_origen_id) WHERE documento_origen_id IS NOT NULL;
CREATE INDEX idx_ncnd_estado_sunat   ON notas_credito_debito(tenant_id, estado_sunat);

CREATE TRIGGER trg_ncnd_updated_at
  BEFORE UPDATE ON notas_credito_debito
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE notas_credito_debito ENABLE ROW LEVEL SECURITY;
CREATE POLICY ncnd_tenant_isolation ON notas_credito_debito
  USING (tenant_id = current_tenant_id());


-- ----------------------------------------------------------------------------
-- Líneas NC/ND (estructura paralela a lineas_factura)
-- ----------------------------------------------------------------------------
CREATE TABLE lineas_nc_nd (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  nc_nd_id            uuid          NOT NULL REFERENCES notas_credito_debito(id) ON DELETE CASCADE,
  tenant_id           uuid          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  producto_id         uuid          REFERENCES productos(id),
  sku_snapshot        text          NOT NULL,
  descripcion         text          NOT NULL,

  cantidad            numeric(14,4) NOT NULL CHECK (cantidad > 0),
  unidad_medida       text          NOT NULL DEFAULT 'NIU',

  valor_unitario      numeric(14,4) NOT NULL,
  precio_unitario     numeric(14,4) NOT NULL,
  tipo_afectacion_igv text          NOT NULL DEFAULT '10',
  porcentaje_igv      numeric(5,2)  NOT NULL DEFAULT 18.00,

  total_base_igv      numeric(14,4) NOT NULL,
  total_igv           numeric(14,4) NOT NULL DEFAULT 0,
  total               numeric(14,4) NOT NULL,

  orden               int           NOT NULL DEFAULT 0,

  UNIQUE (nc_nd_id, orden)
);

CREATE INDEX idx_lineas_ncnd_doc     ON lineas_nc_nd(nc_nd_id);
CREATE INDEX idx_lineas_ncnd_tenant  ON lineas_nc_nd(tenant_id);

ALTER TABLE lineas_nc_nd ENABLE ROW LEVEL SECURITY;
CREATE POLICY lineas_ncnd_tenant_isolation ON lineas_nc_nd
  USING (tenant_id = current_tenant_id());
