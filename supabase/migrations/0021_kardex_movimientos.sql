-- ============================================================================
-- KARDEX (B.7)
-- Movimientos de stock append-only + costos cacheados por producto.
-- Política: costo promedio ponderado, stock negativo bloqueado por default
-- (configurable por producto). Ver docs/DECISIONS/0010-kardex-costing-policy.md
-- ============================================================================

-- Permisos del módulo
INSERT INTO permisos_definidos (codigo, modulo, accion, descripcion, es_sensible) VALUES
  ('inventario.ver',           'inventario', 'ver',            'Ver kardex y stock',                       false),
  ('inventario.ajuste_manual', 'inventario', 'ajuste_manual',  'Realizar ajustes manuales de inventario',  true)
ON CONFLICT (codigo) DO NOTHING;


-- ----------------------------------------------------------------------------
-- Tabla principal: movimientos inmutables.
-- Cada fila = una entrada/salida/ajuste. Append-only (no UPDATE/DELETE desde
-- aplicación). El "saldo después de" y el "costo promedio después de" se
-- cachean para hacer queries de timeline sin recalcular acumulados.
-- ----------------------------------------------------------------------------
CREATE TABLE kardex_movimientos (
  id                   bigserial    PRIMARY KEY,
  tenant_id            uuid         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  producto_id          uuid         NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,

  fecha                timestamptz  NOT NULL DEFAULT now(),

  tipo                 text         NOT NULL
                       CHECK (tipo IN ('entrada','salida','ajuste_pos','ajuste_neg')),

  origen_tipo          text         NOT NULL
                       CHECK (origen_tipo IN ('orden_compra','factura','guia','manual','anulacion')),
  origen_id            uuid,         -- id del documento de origen (OC, factura, etc.)

  cantidad             numeric(14,4) NOT NULL CHECK (cantidad > 0),  -- siempre positivo; el signo viene de tipo
  costo_unitario       numeric(14,4),                                -- requerido en entradas; en salidas se cachea el costo promedio vigente

  saldo_post           numeric(14,4) NOT NULL,    -- cached: stock después de aplicar este movimiento
  costo_promedio_post  numeric(14,4) NOT NULL,    -- cached: costo promedio del producto post-movimiento

  observacion          text,
  user_id              uuid,
  created_at           timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_kardex_producto_fecha  ON kardex_movimientos(producto_id, fecha DESC);
CREATE INDEX idx_kardex_tenant          ON kardex_movimientos(tenant_id);
CREATE INDEX idx_kardex_origen          ON kardex_movimientos(origen_tipo, origen_id) WHERE origen_id IS NOT NULL;

-- RLS: solo SELECT vía RLS. INSERTs deben ir SIEMPRE por la función
-- registrar_movimiento_stock() que valida y mantiene atomicidad.
ALTER TABLE kardex_movimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY kardex_movimientos_tenant_select ON kardex_movimientos
  FOR SELECT
  USING (tenant_id = current_tenant_id());


-- ----------------------------------------------------------------------------
-- Snapshot por producto: cantidad actual + costo promedio + flag de stock
-- negativo. Es la "materialización" de los movimientos. Se mantiene
-- consistente con kardex_movimientos vía la función registrar_movimiento_stock.
-- ----------------------------------------------------------------------------
CREATE TABLE costos_inventario (
  producto_id            uuid          PRIMARY KEY REFERENCES productos(id) ON DELETE CASCADE,
  cantidad_actual        numeric(14,4) NOT NULL DEFAULT 0,
  costo_promedio         numeric(14,4) NOT NULL DEFAULT 0,
  permite_stock_negativo boolean       NOT NULL DEFAULT false,
  updated_at             timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE costos_inventario ENABLE ROW LEVEL SECURITY;

CREATE POLICY costos_inventario_tenant_isolation ON costos_inventario
  USING (
    producto_id IN (SELECT id FROM productos WHERE tenant_id = current_tenant_id())
  );


-- ============================================================================
-- Función núcleo: registra un movimiento de stock con concurrencia segura.
-- Usa SELECT ... FOR UPDATE sobre la fila de costos_inventario del producto
-- para serializar movimientos del mismo producto. Movimientos de productos
-- diferentes corren en paralelo sin contención.
-- ============================================================================
CREATE OR REPLACE FUNCTION registrar_movimiento_stock(
  p_tenant_id      uuid,
  p_producto_id    uuid,
  p_tipo           text,
  p_cantidad       numeric,
  p_origen_tipo    text,
  p_origen_id      uuid     DEFAULT NULL,
  p_costo_unitario numeric  DEFAULT NULL,
  p_observacion    text     DEFAULT NULL,
  p_user_id        uuid     DEFAULT NULL
)
RETURNS kardex_movimientos
LANGUAGE plpgsql
AS $$
DECLARE
  v_actual          costos_inventario%ROWTYPE;
  v_signo           int := CASE WHEN p_tipo IN ('entrada','ajuste_pos') THEN 1 ELSE -1 END;
  v_nueva_cantidad  numeric;
  v_nuevo_costo     numeric;
  v_costo_aplicado  numeric;
  v_movimiento      kardex_movimientos%ROWTYPE;
BEGIN
  -- Validar que el producto pertenece al tenant
  IF NOT EXISTS (SELECT 1 FROM productos WHERE id = p_producto_id AND tenant_id = p_tenant_id) THEN
    RAISE EXCEPTION 'producto_not_in_tenant: producto % no pertenece al tenant %', p_producto_id, p_tenant_id;
  END IF;

  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'cantidad_invalida: % (debe ser > 0)', p_cantidad;
  END IF;

  -- LOCK exclusivo de la fila de costos del producto (serializa movimientos del mismo producto)
  SELECT * INTO v_actual
    FROM costos_inventario
   WHERE producto_id = p_producto_id
   FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO costos_inventario (producto_id, cantidad_actual, costo_promedio)
    VALUES (p_producto_id, 0, 0)
    RETURNING * INTO v_actual;
  END IF;

  v_nueva_cantidad := v_actual.cantidad_actual + (v_signo * p_cantidad);

  -- Bloqueo de stock negativo (a menos que el producto lo permita)
  IF v_nueva_cantidad < 0 AND NOT v_actual.permite_stock_negativo THEN
    RAISE EXCEPTION 'stock_negativo: producto % quedaría con %', p_producto_id, v_nueva_cantidad;
  END IF;

  -- Recalcular costo promedio si es entrada
  IF p_tipo = 'entrada' THEN
    IF p_costo_unitario IS NULL THEN
      RAISE EXCEPTION 'costo_unitario_required_for_entrada';
    END IF;
    -- Promedio ponderado: ((stock_old * costo_old) + (cantidad_in * costo_in)) / stock_new
    -- Si stock_new=0 (raro: entrada de cantidad 0 no debería pasar), mantener costo viejo.
    v_nuevo_costo := CASE
      WHEN v_nueva_cantidad = 0 THEN v_actual.costo_promedio
      ELSE ((v_actual.cantidad_actual * v_actual.costo_promedio) + (p_cantidad * p_costo_unitario))
           / v_nueva_cantidad
    END;
    v_costo_aplicado := p_costo_unitario;
  ELSE
    -- Salidas y ajustes: costo promedio se preserva. El movimiento se registra al costo vigente.
    v_nuevo_costo := v_actual.costo_promedio;
    v_costo_aplicado := COALESCE(p_costo_unitario, v_actual.costo_promedio);
  END IF;

  -- INSERT del movimiento (append-only)
  INSERT INTO kardex_movimientos (
    tenant_id, producto_id, tipo, origen_tipo, origen_id,
    cantidad, costo_unitario, saldo_post, costo_promedio_post,
    observacion, user_id
  ) VALUES (
    p_tenant_id, p_producto_id, p_tipo, p_origen_tipo, p_origen_id,
    p_cantidad, v_costo_aplicado, v_nueva_cantidad, v_nuevo_costo,
    p_observacion, p_user_id
  )
  RETURNING * INTO v_movimiento;

  -- UPDATE del snapshot
  UPDATE costos_inventario
     SET cantidad_actual = v_nueva_cantidad,
         costo_promedio  = v_nuevo_costo,
         updated_at      = now()
   WHERE producto_id = p_producto_id;

  RETURN v_movimiento;
END;
$$;

GRANT EXECUTE ON FUNCTION registrar_movimiento_stock(uuid, uuid, text, numeric, text, uuid, numeric, text, uuid)
  TO authenticated, service_role;
