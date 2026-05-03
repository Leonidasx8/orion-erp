-- ============================================================================
-- B.9 — FACTURAS / BOLETAS
-- Facturas (tipo '01') y Boletas ('03'). Notas de Crédito/Débito en 0026.
-- Snapshot del cliente al emitir (datos no mutan si el cliente cambia razón social).
-- ============================================================================

CREATE TABLE facturas (
  id                            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                     uuid          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  tipo_documento                text          NOT NULL CHECK (tipo_documento IN ('01','03')),  -- '01' factura | '03' boleta
  serie                         text          NOT NULL,
  numero                        bigint        NOT NULL,
  numero_completo               text          GENERATED ALWAYS AS (
                                  serie || '-' || LPAD(numero::text, 8, '0')
                                ) STORED,

  fecha_emision                 date          NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento             date,

  cliente_id                    uuid          NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  -- Snapshot inmutable del cliente al momento de emisión
  cliente_tipo_doc_snapshot     text          NOT NULL,
  cliente_numero_doc_snapshot   text          NOT NULL,
  cliente_razon_social_snapshot text          NOT NULL,
  cliente_direccion_snapshot    text,

  moneda                        text          NOT NULL DEFAULT 'PEN' CHECK (moneda IN ('PEN','USD')),
  tipo_cambio                   numeric(10,4),

  -- Totales por tipo de afectación IGV (catálogo SUNAT 07)
  total_gravadas                numeric(14,4) NOT NULL DEFAULT 0,
  total_exoneradas              numeric(14,4) NOT NULL DEFAULT 0,
  total_inafectas               numeric(14,4) NOT NULL DEFAULT 0,
  total_gratuitas               numeric(14,4) NOT NULL DEFAULT 0,
  descuento_global              numeric(14,4) NOT NULL DEFAULT 0,
  igv                           numeric(14,4) NOT NULL DEFAULT 0,
  total                         numeric(14,4) NOT NULL DEFAULT 0,
  total_en_letras               text,

  forma_pago                    text          NOT NULL DEFAULT 'contado'
                                CHECK (forma_pago IN ('contado','credito')),
  cuotas_credito                jsonb,        -- [{numero, fecha, monto}, ...]

  cotizacion_origen_id          uuid          REFERENCES cotizaciones(id),
  guia_relacionada_id           uuid          REFERENCES guias_remision(id),

  observaciones                 text,

  -- Workflow SUNAT
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

  anulada_por_id                uuid          REFERENCES facturas(id),  -- self-ref futura: NC vinculada (en realidad va a notas_credito_debito)
  emitida_por                   uuid          NOT NULL,
  fecha_emision_sunat           timestamptz,
  fecha_anulacion               timestamptz,

  created_at                    timestamptz   NOT NULL DEFAULT now(),
  updated_at                    timestamptz   NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, tipo_documento, serie, numero)
);

CREATE INDEX idx_facturas_tenant         ON facturas(tenant_id);
CREATE INDEX idx_facturas_estado_sunat   ON facturas(tenant_id, estado_sunat);
CREATE INDEX idx_facturas_cliente        ON facturas(tenant_id, cliente_id);
CREATE INDEX idx_facturas_fecha          ON facturas(tenant_id, fecha_emision DESC);
CREATE INDEX idx_facturas_forma_pago     ON facturas(tenant_id, forma_pago) WHERE forma_pago = 'credito';

CREATE TRIGGER trg_facturas_updated_at
  BEFORE UPDATE ON facturas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY facturas_tenant_isolation ON facturas
  USING (tenant_id = current_tenant_id());


-- ----------------------------------------------------------------------------
-- Líneas de factura/boleta
-- ----------------------------------------------------------------------------
CREATE TABLE lineas_factura (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id          uuid          NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  tenant_id           uuid          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  producto_id         uuid          REFERENCES productos(id),
  sku_snapshot        text          NOT NULL,
  descripcion         text          NOT NULL,

  cantidad            numeric(14,4) NOT NULL CHECK (cantidad > 0),
  unidad_medida       text          NOT NULL DEFAULT 'NIU',

  valor_unitario      numeric(14,4) NOT NULL,         -- sin IGV
  precio_unitario     numeric(14,4) NOT NULL,         -- con IGV
  tipo_afectacion_igv text          NOT NULL DEFAULT '10',  -- catálogo 07: '10' gravado, '20' exonerado, '30' inafecto, etc.
  porcentaje_igv      numeric(5,2)  NOT NULL DEFAULT 18.00,

  total_base_igv      numeric(14,4) NOT NULL,
  total_igv           numeric(14,4) NOT NULL DEFAULT 0,
  total               numeric(14,4) NOT NULL,
  descuento           numeric(14,4) NOT NULL DEFAULT 0,

  orden               int           NOT NULL DEFAULT 0,

  UNIQUE (factura_id, orden)
);

CREATE INDEX idx_lineas_factura_factura  ON lineas_factura(factura_id);
CREATE INDEX idx_lineas_factura_tenant   ON lineas_factura(tenant_id);

ALTER TABLE lineas_factura ENABLE ROW LEVEL SECURITY;
CREATE POLICY lineas_factura_tenant_isolation ON lineas_factura
  USING (tenant_id = current_tenant_id());
