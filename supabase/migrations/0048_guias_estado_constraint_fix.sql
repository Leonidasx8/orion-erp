-- Fix: guias_remision.estado CHECK constraint usa valores de facturas, no de guías
-- El código usa: pendiente_despacho, en_camino, entregado, anulada
ALTER TABLE guias_remision DROP CONSTRAINT IF EXISTS guias_remision_estado_check;
ALTER TABLE guias_remision ADD CONSTRAINT guias_remision_estado_check
  CHECK (estado = ANY (ARRAY[
    'pendiente_despacho'::text,
    'en_camino'::text,
    'entregado'::text,
    'anulada'::text
  ]));
