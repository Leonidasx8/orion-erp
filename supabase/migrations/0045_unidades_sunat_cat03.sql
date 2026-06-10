-- Catálogo 03 SUNAT — Unidades de medida (CPE, basado en UN/ECE Rec. 20)
-- Usa ON CONFLICT DO NOTHING para no duplicar los 12 existentes (NIU, ZZ, KGM, MTR, LTR, GRM, MLT, MON, MTQ, CMT, HUR, DAY)

INSERT INTO unidades_medida (codigo, descripcion) VALUES
  -- Ya existentes (no rompen por ON CONFLICT)
  ('NIU', 'Unidad'),
  ('ZZ',  'Unidad mútua acordada'),
  ('KGM', 'Kilogramo'),
  ('MTR', 'Metro'),
  ('LTR', 'Litro'),
  ('GRM', 'Gramo'),
  ('MLT', 'Mililitro'),
  ('MON', 'Mes'),
  ('MTQ', 'Metro cúbico'),
  ('CMT', 'Centímetro'),
  ('HUR', 'Hora'),
  ('DAY', 'Día'),
  -- Masa
  ('TNE', 'Tonelada métrica'),
  ('MGM', 'Miligramo'),
  ('ONZ', 'Onza'),
  ('LBR', 'Libra'),
  -- Longitud
  ('MMT', 'Milímetro'),
  ('KTM', 'Kilómetro'),
  ('FOT', 'Pie'),
  ('INH', 'Pulgada'),
  ('YRD', 'Yarda'),
  -- Área
  ('MTK', 'Metro cuadrado'),
  ('CMK', 'Centímetro cuadrado'),
  ('MMK', 'Milímetro cuadrado'),
  -- Volumen
  ('HLT', 'Hectolitro'),
  ('GLI', 'Galón (Imperial)'),
  ('GLL', 'Galón (US)'),
  ('QT',  'Cuarto de galón'),
  -- Empaque / presentación
  ('BX',  'Caja'),
  ('PK',  'Paquete / Fardo'),
  ('BG',  'Bolsa'),
  ('RLL', 'Rollo'),
  ('SET', 'Juego / Conjunto'),
  ('DZN', 'Docena'),
  ('PR',  'Par'),
  ('NMP', 'Número de piezas'),
  ('PCE', 'Pieza'),
  ('MLL', 'Millar'),
  -- Tiempo
  ('ANN', 'Año'),
  ('MIN', 'Minuto'),
  ('SEC', 'Segundo'),
  -- Energía / electricidad
  ('KWH', 'Kilovatio hora'),
  ('JOU', 'Joule'),
  ('AMP', 'Amperio'),
  -- Servicios / otros
  ('E48', 'Servicio'),
  ('ACT', 'Actividad'),
  ('LS',  'Global / Suma alzada')
ON CONFLICT (codigo) DO NOTHING;
