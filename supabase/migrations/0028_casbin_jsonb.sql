-- Tabla `casbin` con schema jsonb que usa casbin-pg-adapter v1.4.0.
-- Reemplaza la tabla `casbin_rule` (v0-v5) que no usa el adapter real.
-- enableMigrations: false en el adapter evita que intente recrearla.

CREATE TABLE IF NOT EXISTS casbin (
  id    serial  PRIMARY KEY,
  ptype text    NOT NULL,
  rule  jsonb   NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_casbin_ptype    ON casbin USING btree (ptype);
CREATE INDEX IF NOT EXISTS idx_casbin_rule_v0  ON casbin USING btree ((rule->>0));
CREATE INDEX IF NOT EXISTS idx_casbin_rule_v1  ON casbin USING btree ((rule->>1));
CREATE INDEX IF NOT EXISTS idx_casbin_rule_v2  ON casbin USING btree ((rule->>2));
CREATE INDEX IF NOT EXISTS idx_casbin_rule_v3  ON casbin USING btree ((rule->>3));
CREATE INDEX IF NOT EXISTS idx_casbin_rule_v4  ON casbin USING btree ((rule->>4));
CREATE INDEX IF NOT EXISTS idx_casbin_rule_v5  ON casbin USING btree ((rule->>5));

-- Solo service_role puede acceder (el enforcer corre en servidor, nunca en cliente)
ALTER TABLE casbin ENABLE ROW LEVEL SECURITY;
