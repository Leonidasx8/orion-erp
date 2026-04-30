-- Fix de RLS de series_documentos (quedó usando tm.activo en 0005, ya no existe)
DROP POLICY IF EXISTS "series_documentos: miembros del tenant" ON series_documentos;

CREATE POLICY "series_documentos: miembros del tenant"
  ON series_documentos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = series_documentos.tenant_id
        AND tm.user_id   = auth.uid()
        AND tm.estado    = 'activo'
    )
  );

-- ============================================================================
-- COTIZACIONES
-- ============================================================================

-- Permisos nuevos para cotizaciones
INSERT INTO permisos_definidos (codigo, modulo, accion, descripcion, es_sensible) VALUES
  ('cotizaciones.ver',       'cotizaciones', 'ver',       'Ver cotizaciones',                false),
  ('cotizaciones.crear',     'cotizaciones', 'crear',     'Crear cotizaciones',              false),
  ('cotizaciones.editar',    'cotizaciones', 'editar',    'Editar cotizaciones en borrador', false),
  ('cotizaciones.enviar',    'cotizaciones', 'enviar',    'Enviar cotizaciones',             false),
  ('cotizaciones.aceptar',   'cotizaciones', 'aceptar',   'Marcar cotización como aceptada', false),
  ('cotizaciones.rechazar',  'cotizaciones', 'rechazar',  'Marcar cotización como rechazada',false),
  ('cotizaciones.duplicar',  'cotizaciones', 'duplicar',  'Duplicar cotización existente',   false),
  ('cotizaciones.eliminar',  'cotizaciones', 'eliminar',  'Eliminar cotización en borrador', true)
ON CONFLICT (codigo) DO NOTHING;

CREATE TABLE cotizaciones (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  numero_correlativo  bigint NOT NULL,
  numero_completo     text   GENERATED ALWAYS AS (
    'COT-' || EXTRACT(YEAR FROM fecha_emision)::text
           || '-'
           || LPAD(numero_correlativo::text, 6, '0')
  ) STORED,

  cliente_id          uuid NOT NULL,    -- FK lazy (validamos por tenant en app + RLS)

  moneda              text NOT NULL DEFAULT 'PEN' CHECK (moneda IN ('PEN', 'USD')),
  tipo_cambio         numeric(10,4),    -- requerido solo si moneda='USD'

  fecha_emision       date NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento   date NOT NULL,

  estado              text NOT NULL DEFAULT 'borrador'
                      CHECK (estado IN ('borrador','enviada','aceptada','rechazada','vencida')),

  -- Totales (en moneda original; calculados por la app y guardados denormalizados)
  subtotal            numeric(14,2) NOT NULL DEFAULT 0,
  total_descuentos    numeric(14,2) NOT NULL DEFAULT 0,
  descuento_global    numeric(14,2) NOT NULL DEFAULT 0,
  base_imponible      numeric(14,2) NOT NULL DEFAULT 0,
  igv                 numeric(14,2) NOT NULL DEFAULT 0,
  total               numeric(14,2) NOT NULL DEFAULT 0,

  -- Texto libre
  notas               text,
  terminos_condiciones text,

  -- Workflow
  enviada_at          timestamptz,
  aceptada_at         timestamptz,
  rechazada_at        timestamptz,
  motivo_rechazo      text,

  -- Conversiones (a llenar en B.6/B.9)
  orden_compra_id     uuid,
  factura_id          uuid,

  -- Auditoría
  creado_por          uuid NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, numero_correlativo)
);

CREATE INDEX idx_cotizaciones_tenant         ON cotizaciones(tenant_id);
CREATE INDEX idx_cotizaciones_cliente        ON cotizaciones(tenant_id, cliente_id);
CREATE INDEX idx_cotizaciones_estado         ON cotizaciones(tenant_id, estado);
CREATE INDEX idx_cotizaciones_fecha_emision  ON cotizaciones(tenant_id, fecha_emision DESC);
CREATE INDEX idx_cotizaciones_numero         ON cotizaciones(tenant_id, numero_completo);

CREATE TRIGGER trg_cotizaciones_updated_at
  BEFORE UPDATE ON cotizaciones
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY cotizaciones_tenant_isolation ON cotizaciones
  USING (tenant_id = current_tenant_id());


-- Items de cotización
CREATE TABLE cotizacion_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id         uuid NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  orden                 integer NOT NULL,

  -- Snapshot del producto al momento de crear el item (puede ser NULL = ad-hoc)
  producto_id           uuid,
  codigo                text,
  descripcion           text NOT NULL,
  unidad_medida         text NOT NULL DEFAULT 'NIU',

  -- Cantidades y precios
  cantidad              numeric(14,4) NOT NULL CHECK (cantidad > 0),
  precio_unitario       numeric(14,4) NOT NULL CHECK (precio_unitario >= 0),  -- sin IGV
  descuento_porcentaje  numeric(5,2)  NOT NULL DEFAULT 0
                        CHECK (descuento_porcentaje >= 0 AND descuento_porcentaje <= 100),
  descuento_monto       numeric(14,2) NOT NULL DEFAULT 0,
  afecta_igv            boolean       NOT NULL DEFAULT true,

  -- Totales calculados de la línea (denormalizados)
  subtotal              numeric(14,2) NOT NULL,   -- (cantidad * precio_unitario) - descuento_monto
  igv                   numeric(14,2) NOT NULL DEFAULT 0,
  total                 numeric(14,2) NOT NULL,

  created_at            timestamptz NOT NULL DEFAULT now(),

  UNIQUE (cotizacion_id, orden)
);

CREATE INDEX idx_cotizacion_items_cotizacion ON cotizacion_items(cotizacion_id);
CREATE INDEX idx_cotizacion_items_tenant     ON cotizacion_items(tenant_id);
CREATE INDEX idx_cotizacion_items_producto   ON cotizacion_items(producto_id) WHERE producto_id IS NOT NULL;

ALTER TABLE cotizacion_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY cotizacion_items_tenant_isolation ON cotizacion_items
  USING (tenant_id = current_tenant_id());


-- ============================================================================
-- Función para obtener el siguiente correlativo de cotización por tenant
-- Usa advisory lock transaccional (no table lock) para evitar race conditions
-- entre llamadas concurrentes al crear cotizaciones.
-- ============================================================================

CREATE OR REPLACE FUNCTION siguiente_numero_cotizacion(p_tenant_id uuid)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  v_siguiente bigint;
BEGIN
  -- Lock transaccional por (tenant + tabla cotizacion); se libera al COMMIT/ROLLBACK
  PERFORM pg_advisory_xact_lock(
    hashtext('cotizacion:' || p_tenant_id::text)
  );

  SELECT COALESCE(MAX(numero_correlativo), 0) + 1
    INTO v_siguiente
    FROM cotizaciones
   WHERE tenant_id = p_tenant_id;

  RETURN v_siguiente;
END;
$$;

GRANT EXECUTE ON FUNCTION siguiente_numero_cotizacion(uuid) TO authenticated, service_role;
