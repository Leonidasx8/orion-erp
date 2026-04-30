-- Categorías de producto (árbol simple por tenant)
CREATE TABLE categorias_producto (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  padre_id    uuid REFERENCES categorias_producto(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nombre, padre_id)
);

CREATE INDEX idx_categorias_tenant ON categorias_producto(tenant_id);

ALTER TABLE categorias_producto ENABLE ROW LEVEL SECURITY;
CREATE POLICY categorias_tenant_isolation ON categorias_producto
  USING (tenant_id = current_tenant_id());

-- Unidades de medida (tabla global — sin RLS)
CREATE TABLE unidades_medida (
  codigo      text PRIMARY KEY,   -- UND, KG, M, L, etc.
  descripcion text NOT NULL,
  simbolo     text
);

INSERT INTO unidades_medida (codigo, descripcion, simbolo) VALUES
  ('NIU', 'Unidad (SUNAT: NIU)',   'und'),
  ('ZZ',  'Servicio (SUNAT: ZZ)',  'svc'),
  ('KGM', 'Kilogramo',             'kg'),
  ('GRM', 'Gramo',                 'g'),
  ('MTR', 'Metro',                 'm'),
  ('CMT', 'Centímetro',            'cm'),
  ('MTQ', 'Metro cúbico',          'm³'),
  ('LTR', 'Litro',                 'L'),
  ('MLT', 'Mililitro',             'mL'),
  ('HUR', 'Hora',                  'h'),
  ('DAY', 'Día',                   'día'),
  ('MON', 'Mes',                   'mes');

-- Productos / servicios
CREATE TABLE productos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Identificación
  codigo              text NOT NULL,         -- código interno
  nombre              text NOT NULL,
  descripcion         text,
  tipo                text NOT NULL DEFAULT 'bien' CHECK (tipo IN ('bien', 'servicio')),
  categoria_id        uuid REFERENCES categorias_producto(id) ON DELETE SET NULL,
  unidad_medida       text NOT NULL DEFAULT 'NIU' REFERENCES unidades_medida(codigo),

  -- Precios (en soles, sin IGV)
  precio_unitario     numeric(14,4) NOT NULL DEFAULT 0,
  tiene_igv           boolean NOT NULL DEFAULT true,   -- si el precio incluye IGV en cotizaciones

  -- Costos (para kardex, opcional en B.4)
  costo_unitario      numeric(14,4),

  -- Inventario
  controla_stock      boolean NOT NULL DEFAULT false,
  stock_minimo        numeric(14,4),
  stock_actual        numeric(14,4) NOT NULL DEFAULT 0,

  -- SUNAT
  codigo_sunat        text,    -- código de producto SUNAT/GS1

  -- Estado
  activo              boolean NOT NULL DEFAULT true,

  -- Full-text
  search_vector       tsvector GENERATED ALWAYS AS (
    to_tsvector('spanish', COALESCE(nombre,'') || ' ' || COALESCE(codigo,'') || ' ' || COALESCE(descripcion,''))
  ) STORED,

  -- Timestamps
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid,

  UNIQUE (tenant_id, codigo)
);

CREATE INDEX idx_productos_tenant   ON productos(tenant_id);
CREATE INDEX idx_productos_search   ON productos USING GIN(search_vector);
CREATE INDEX idx_productos_categoria ON productos(tenant_id, categoria_id);
CREATE INDEX idx_productos_activo   ON productos(tenant_id, activo);

CREATE TRIGGER trg_productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY productos_tenant_isolation ON productos
  USING (tenant_id = current_tenant_id());
