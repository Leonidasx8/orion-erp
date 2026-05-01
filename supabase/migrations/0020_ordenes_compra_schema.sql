-- ============================================================================
-- ÓRDENES DE COMPRA (B.6)
-- ============================================================================

-- Tabla de correlativos por tenant+año (upsert atómico, sin advisory lock)
CREATE TABLE correlativos_orden_compra (
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ano                 int  NOT NULL,
  ultimo_correlativo  int  NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, ano)
);

-- Función que incrementa y retorna el número OC (ej. 'OC-2026-00045')
CREATE OR REPLACE FUNCTION generar_numero_orden_compra(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_ano int := EXTRACT(YEAR FROM CURRENT_DATE);
  v_n   int;
BEGIN
  INSERT INTO correlativos_orden_compra (tenant_id, ano, ultimo_correlativo)
  VALUES (p_tenant_id, v_ano, 1)
  ON CONFLICT (tenant_id, ano)
  DO UPDATE SET ultimo_correlativo = correlativos_orden_compra.ultimo_correlativo + 1
  RETURNING ultimo_correlativo INTO v_n;

  RETURN 'OC-' || v_ano || '-' || LPAD(v_n::text, 5, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION generar_numero_orden_compra(uuid) TO authenticated, service_role;


CREATE TABLE ordenes_compra (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  numero                    text        NOT NULL,   -- 'OC-2026-00045'
  proveedor_id              uuid        NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  cotizacion_origen_id      uuid        REFERENCES cotizaciones(id),

  estado                    text        NOT NULL DEFAULT 'borrador'
                            CHECK (estado IN ('borrador','enviada','aprobada','recibida_parcial','recibida_total','cerrada')),

  fecha_emision             date        NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega_esperada    date,

  moneda                    text        NOT NULL DEFAULT 'USD' CHECK (moneda IN ('PEN','USD')),
  tipo_cambio               numeric(10,4),

  subtotal                  numeric(14,4) NOT NULL DEFAULT 0,
  igv                       numeric(14,4) NOT NULL DEFAULT 0,
  total                     numeric(14,4) NOT NULL DEFAULT 0,

  terminos_pago             text,
  direccion_entrega         text,
  observaciones             text,
  pdf_url                   text,

  comprador_id              uuid        REFERENCES auth.users(id),

  fecha_envio               timestamptz,
  fecha_aprobacion          timestamptz,
  fecha_recepcion_completa  timestamptz,

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, numero)
);

CREATE INDEX idx_ordenes_compra_tenant   ON ordenes_compra(tenant_id);
CREATE INDEX idx_ordenes_compra_proveedor ON ordenes_compra(tenant_id, proveedor_id);
CREATE INDEX idx_ordenes_compra_estado   ON ordenes_compra(tenant_id, estado);

CREATE TRIGGER trg_ordenes_compra_updated_at
  BEFORE UPDATE ON ordenes_compra
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE ordenes_compra ENABLE ROW LEVEL SECURITY;
CREATE POLICY ordenes_compra_tenant_isolation ON ordenes_compra
  USING (tenant_id = current_tenant_id());


CREATE TABLE lineas_orden_compra (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id            uuid          NOT NULL REFERENCES ordenes_compra(id) ON DELETE CASCADE,
  tenant_id           uuid          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  producto_id         uuid,         -- null = ítem ad-hoc
  sku_snapshot        text          NOT NULL,
  descripcion         text          NOT NULL,

  cantidad            numeric(14,4) NOT NULL CHECK (cantidad > 0),
  cantidad_recibida   numeric(14,4) NOT NULL DEFAULT 0,
  precio_unitario     numeric(14,4) NOT NULL CHECK (precio_unitario >= 0),
  afecta_igv          boolean       NOT NULL DEFAULT true,

  subtotal            numeric(14,4) NOT NULL,
  igv                 numeric(14,4) NOT NULL DEFAULT 0,
  total               numeric(14,4) NOT NULL,

  orden               int           NOT NULL DEFAULT 0,

  UNIQUE (orden_id, orden)
);

CREATE INDEX idx_lineas_oc_orden   ON lineas_orden_compra(orden_id);
CREATE INDEX idx_lineas_oc_tenant  ON lineas_orden_compra(tenant_id);
CREATE INDEX idx_lineas_oc_producto ON lineas_orden_compra(producto_id) WHERE producto_id IS NOT NULL;

ALTER TABLE lineas_orden_compra ENABLE ROW LEVEL SECURITY;
CREATE POLICY lineas_orden_compra_tenant_isolation ON lineas_orden_compra
  USING (tenant_id = current_tenant_id());
