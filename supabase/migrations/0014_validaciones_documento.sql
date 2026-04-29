-- Cache de consultas a apis.net.pe (RUC / DNI)
CREATE TABLE validaciones_documento (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_documento  text NOT NULL CHECK (tipo_documento IN ('RUC', 'DNI')),
  numero          text NOT NULL,
  resultado       jsonb NOT NULL,
  consultado_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo_documento, numero)
);

CREATE INDEX idx_validaciones_numero ON validaciones_documento(tipo_documento, numero);

-- Sin RLS: acceso sólo por service_role (búsquedas desde server actions)
