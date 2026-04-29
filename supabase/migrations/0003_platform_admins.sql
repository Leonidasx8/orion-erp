-- Platform admins de Dignita (sin RLS)
CREATE TABLE platform_admins (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text        NOT NULL,
  nombre     text        NOT NULL,
  activo     boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Audit log de plataforma (sin RLS — append-only)
CREATE TABLE platform_audit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid        REFERENCES auth.users(id),
  actor_email text,
  accion      text        NOT NULL,
  entidad     text        NOT NULL,
  entidad_id  text,
  payload     jsonb,
  ip          text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX platform_audit_log_actor_idx    ON platform_audit_log(actor_id);
CREATE INDEX platform_audit_log_entidad_idx  ON platform_audit_log(entidad, entidad_id);
CREATE INDEX platform_audit_log_created_idx  ON platform_audit_log(created_at DESC);
