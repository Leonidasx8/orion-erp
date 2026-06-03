ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS margen_minimo_global    numeric(5,2)  DEFAULT 10,
  ADD COLUMN IF NOT EXISTS aprobacion_monto_maximo numeric(14,2) DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS igv_automatico           boolean       DEFAULT true,
  ADD COLUMN IF NOT EXISTS descuentos_por_linea     boolean       DEFAULT true;
