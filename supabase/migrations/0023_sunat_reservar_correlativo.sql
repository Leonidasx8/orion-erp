-- ============================================================================
-- SUNAT — función reservar_correlativo() para series F001/B001/T001/V001/etc.
-- Atómica vía UPDATE ... RETURNING (postgres serializa updates a la misma fila).
-- La tabla series_documentos ya existe desde la migration 0005.
-- ============================================================================

CREATE OR REPLACE FUNCTION reservar_correlativo(
  p_tenant_id      uuid,
  p_tipo_documento text,
  p_serie          text
)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  v_n bigint;
BEGIN
  UPDATE series_documentos
     SET correlativo_actual = correlativo_actual + 1
   WHERE tenant_id      = p_tenant_id
     AND tipo_documento = p_tipo_documento
     AND serie          = p_serie
     AND activa         = true
  RETURNING correlativo_actual INTO v_n;

  IF v_n IS NULL THEN
    RAISE EXCEPTION 'serie_no_encontrada: tenant=% tipo=% serie=%',
      p_tenant_id, p_tipo_documento, p_serie;
  END IF;

  RETURN v_n;
END;
$$;

GRANT EXECUTE ON FUNCTION reservar_correlativo(uuid, text, text)
  TO authenticated, service_role;

-- Permisos del módulo facturación + guías
INSERT INTO permisos_definidos (codigo, modulo, accion, descripcion, es_sensible) VALUES
  ('facturas.ver',          'facturas', 'ver',          'Ver facturas y boletas',                false),
  ('facturas.crear',        'facturas', 'crear',        'Crear factura/boleta en borrador',      false),
  ('facturas.emitir',       'facturas', 'emitir',       'Emitir factura/boleta a SUNAT',         true),
  ('facturas.anular',       'facturas', 'anular',       'Anular factura vía nota de crédito',    true),
  ('facturas.reenviar',     'facturas', 'reenviar',     'Reenviar a SUNAT tras error transitorio', true),
  ('guias.ver',             'guias',    'ver',          'Ver guías de remisión',                 false),
  ('guias.crear',           'guias',    'crear',        'Crear guía en borrador',                false),
  ('guias.emitir',          'guias',    'emitir',       'Emitir guía a SUNAT',                   true),
  ('guias.anular',          'guias',    'anular',       'Anular guía emitida',                   true),
  ('transportistas.ver',    'guias',    'transportistas.ver',    'Ver transportistas',         false),
  ('transportistas.editar', 'guias',    'transportistas.editar', 'Crear/editar transportistas',false),
  ('vehiculos.ver',         'guias',    'vehiculos.ver',    'Ver vehículos de transporte',  false),
  ('vehiculos.editar',      'guias',    'vehiculos.editar', 'Crear/editar vehículos',       false)
ON CONFLICT (codigo) DO NOTHING;
