-- Agrega margen_minimo a productos para validación de precio mínimo aceptable en cotizaciones.
-- NULL = sin restricción. Porcentaje entero o decimal (ej. 15.00 = 15%).
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS margen_minimo numeric(5,2)
    CHECK (margen_minimo IS NULL OR (margen_minimo >= 0 AND margen_minimo <= 100));
