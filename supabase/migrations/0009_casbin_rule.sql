CREATE TABLE casbin_rule (
  id    bigserial    PRIMARY KEY,
  ptype varchar(100) NOT NULL,
  v0    varchar(255),
  v1    varchar(255),
  v2    varchar(255),
  v3    varchar(255),
  v4    varchar(255),
  v5    varchar(255)
);

CREATE INDEX casbin_rule_idx ON casbin_rule(ptype, v0, v1);

-- Solo service_role puede acceder (el enforcer corre en el servidor, no en el cliente)
ALTER TABLE casbin_rule ENABLE ROW LEVEL SECURITY;
-- Sin policies: ningún usuario autenticado puede leer o escribir directamente
