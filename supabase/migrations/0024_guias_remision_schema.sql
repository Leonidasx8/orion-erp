-- ============================================================================
-- B.8 — GUÍAS DE REMISIÓN
-- Remitente (tipo SUNAT '09') y Transportista (tipo '31') vía NUBEFACT.
-- Estado SUNAT separado del estado interno.
-- ============================================================================

CREATE TABLE transportistas (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ruc             text        NOT NULL,
  razon_social    text        NOT NULL,
  nombre_comercial text,
  numero_mtc      text,        -- registro Ministerio de Transporte y Comunicaciones
  estado          text        NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, ruc)
);

CREATE INDEX idx_transportistas_tenant ON transportistas(tenant_id);

CREATE TRIGGER trg_transportistas_updated_at
  BEFORE UPDATE ON transportistas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE transportistas ENABLE ROW LEVEL SECURITY;
CREATE POLICY transportistas_tenant_isolation ON transportistas
  USING (tenant_id = current_tenant_id());


CREATE TABLE vehiculos_transporte (
  id                       uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transportista_id         uuid          REFERENCES transportistas(id) ON DELETE SET NULL,
  placa                    text          NOT NULL,
  marca                    text,
  modelo                   text,
  capacidad_kg             numeric(14,2),
  configuracion_vehicular  text,         -- T1S2, T2S3, etc. (catálogo MTC)
  estado                   text          NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  created_at               timestamptz   NOT NULL DEFAULT now(),
  updated_at               timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, placa)
);

CREATE INDEX idx_vehiculos_tenant         ON vehiculos_transporte(tenant_id);
CREATE INDEX idx_vehiculos_transportista  ON vehiculos_transporte(transportista_id) WHERE transportista_id IS NOT NULL;

CREATE TRIGGER trg_vehiculos_updated_at
  BEFORE UPDATE ON vehiculos_transporte
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE vehiculos_transporte ENABLE ROW LEVEL SECURITY;
CREATE POLICY vehiculos_tenant_isolation ON vehiculos_transporte
  USING (tenant_id = current_tenant_id());


-- ----------------------------------------------------------------------------
-- Guías de remisión — header
-- ----------------------------------------------------------------------------
CREATE TABLE guias_remision (
  id                       uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  tipo_documento           text          NOT NULL CHECK (tipo_documento IN ('09','31')),  -- '09' remitente | '31' transportista
  serie                    text          NOT NULL,                                        -- 'T001' o 'V001'
  numero                   bigint        NOT NULL,
  numero_completo          text          GENERATED ALWAYS AS (
                              serie || '-' || LPAD(numero::text, 8, '0')
                            ) STORED,

  fecha_emision            date          NOT NULL DEFAULT CURRENT_DATE,
  fecha_inicio_traslado    date          NOT NULL,

  remitente_id             uuid          REFERENCES clientes(id),     -- emisor (tenant o cliente)
  destinatario_id          uuid          REFERENCES clientes(id),     -- a quien se envía
  transportista_id         uuid          REFERENCES transportistas(id),
  vehiculo_id              uuid          REFERENCES vehiculos_transporte(id),

  motivo_traslado          text          NOT NULL,                    -- catálogo SUNAT 09 (01/02/04/13/...)
  descripcion_motivo       text,
  modalidad_traslado       text          NOT NULL CHECK (modalidad_traslado IN ('01','02')),

  peso_bruto_total         numeric(14,2),
  unidad_peso              text          DEFAULT 'KGM',
  numero_bultos            int,

  direccion_partida        text          NOT NULL,
  ubigeo_partida           text          NOT NULL,
  direccion_llegada        text          NOT NULL,
  ubigeo_llegada           text          NOT NULL,

  -- Estado del documento (interno) y de SUNAT (workflow async)
  estado                   text          NOT NULL DEFAULT 'borrador'
                           CHECK (estado IN ('borrador','lista_para_emitir','emitida','anulada')),
  estado_sunat             text          NOT NULL DEFAULT 'sin_enviar'
                           CHECK (estado_sunat IN ('sin_enviar','pendiente','aceptada','rechazada','error_red','anulada')),

  cdr_url                  text,
  xml_url                  text,
  pdf_url                  text,
  nubefact_response        jsonb,
  sunat_codigo             int,
  sunat_mensaje            text,

  factura_relacionada_id   uuid,                                       -- FK lazy a facturas (B.9)
  observaciones            text,
  creado_por               uuid          NOT NULL,
  fecha_emision_sunat      timestamptz,
  fecha_anulacion          timestamptz,

  created_at               timestamptz   NOT NULL DEFAULT now(),
  updated_at               timestamptz   NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, tipo_documento, serie, numero)
);

CREATE INDEX idx_guias_tenant         ON guias_remision(tenant_id);
CREATE INDEX idx_guias_estado_sunat   ON guias_remision(tenant_id, estado_sunat);
CREATE INDEX idx_guias_destinatario   ON guias_remision(tenant_id, destinatario_id);
CREATE INDEX idx_guias_fecha          ON guias_remision(tenant_id, fecha_emision DESC);

CREATE TRIGGER trg_guias_updated_at
  BEFORE UPDATE ON guias_remision
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE guias_remision ENABLE ROW LEVEL SECURITY;
CREATE POLICY guias_remision_tenant_isolation ON guias_remision
  USING (tenant_id = current_tenant_id());


-- ----------------------------------------------------------------------------
-- Líneas de guía
-- ----------------------------------------------------------------------------
CREATE TABLE lineas_guia (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  guia_id         uuid          NOT NULL REFERENCES guias_remision(id) ON DELETE CASCADE,
  tenant_id       uuid          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  producto_id     uuid          REFERENCES productos(id),
  sku_snapshot    text          NOT NULL,
  descripcion     text          NOT NULL,
  cantidad        numeric(14,4) NOT NULL CHECK (cantidad > 0),
  unidad_medida   text          NOT NULL DEFAULT 'NIU',
  orden           int           NOT NULL DEFAULT 0,

  UNIQUE (guia_id, orden)
);

CREATE INDEX idx_lineas_guia_guia    ON lineas_guia(guia_id);
CREATE INDEX idx_lineas_guia_tenant  ON lineas_guia(tenant_id);

ALTER TABLE lineas_guia ENABLE ROW LEVEL SECURITY;
CREATE POLICY lineas_guia_tenant_isolation ON lineas_guia
  USING (tenant_id = current_tenant_id());
