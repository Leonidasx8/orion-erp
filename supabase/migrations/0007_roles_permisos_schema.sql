-- Extender tenant_members con estado texto, invitado_por y ultimo_login_at
ALTER TABLE tenant_members
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'activo'
    CONSTRAINT tenant_members_estado_values CHECK (estado IN ('pendiente', 'activo', 'suspendido')),
  ADD COLUMN IF NOT EXISTS invitado_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS ultimo_login_at timestamptz;

-- Migrar datos existentes: activo=false → pendiente, activo=true → activo
UPDATE tenant_members SET estado = CASE WHEN activo THEN 'activo' ELSE 'pendiente' END;

-- Actualizar la vista de B.1 para usar estado en vez de activo
CREATE OR REPLACE VIEW vw_user_tenant_access AS
SELECT
  tm.user_id,
  tm.tenant_id,
  t.slug
FROM tenant_members tm
INNER JOIN tenants t ON t.id = tm.tenant_id
WHERE tm.estado = 'activo' AND t.estado = 'activo';

-- Actualizar policies de tenant_members que usaban activo=true
DROP POLICY IF EXISTS "tenant_members: admin ve miembros de su tenant" ON tenant_members;
DROP POLICY IF EXISTS "tenant_members: admin gestiona miembros" ON tenant_members;

CREATE POLICY "tenant_members: admin ve miembros de su tenant"
  ON tenant_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = tenant_members.tenant_id
        AND tm.user_id   = auth.uid()
        AND tm.rol        IN ('superadmin', 'admin')
        AND tm.estado     = 'activo'
    )
  );

CREATE POLICY "tenant_members: admin gestiona miembros"
  ON tenant_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid() AND pa.activo = true
    )
    OR
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = tenant_members.tenant_id
        AND tm.user_id   = auth.uid()
        AND tm.rol        IN ('superadmin', 'admin')
        AND tm.estado     = 'activo'
    )
  );

-- Tabla roles por tenant
CREATE TABLE roles (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        REFERENCES tenants(id) ON DELETE CASCADE,
  nombre      text        NOT NULL,
  es_predefinido boolean  NOT NULL DEFAULT false,
  descripcion text,
  created_by  uuid        REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nombre)
);
CREATE INDEX roles_tenant_idx ON roles(tenant_id);

-- Catálogo de permisos disponibles (global, no por tenant)
CREATE TABLE permisos_definidos (
  codigo       text PRIMARY KEY,
  modulo       text NOT NULL,
  accion       text NOT NULL,
  descripcion  text NOT NULL,
  es_sensible  boolean NOT NULL DEFAULT false
);

-- Relación muchos-a-muchos rol ↔ permiso
CREATE TABLE rol_permisos (
  rol_id        uuid REFERENCES roles(id) ON DELETE CASCADE,
  permiso_codigo text REFERENCES permisos_definidos(codigo) ON DELETE CASCADE,
  PRIMARY KEY (rol_id, permiso_codigo)
);

-- Audit trail para cambios de roles y permisos
CREATE TABLE audit_permisos (
  id             bigserial   PRIMARY KEY,
  tenant_id      uuid        REFERENCES tenants(id),
  user_id        uuid        REFERENCES auth.users(id),
  accion         text        NOT NULL,
  rol_id         uuid,
  permiso_codigo text,
  detalles       jsonb,
  ip_address     inet,
  user_agent     text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_permisos_tenant_idx ON audit_permisos(tenant_id, created_at DESC);

-- RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_tenant_isolation" ON roles FOR ALL
  USING (tenant_id = current_tenant_id() OR tenant_id IS NULL);

ALTER TABLE rol_permisos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rol_permisos_via_rol" ON rol_permisos FOR ALL
  USING (
    rol_id IN (
      SELECT id FROM roles WHERE tenant_id = current_tenant_id() OR tenant_id IS NULL
    )
  );

ALTER TABLE permisos_definidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permisos_definidos_read_all" ON permisos_definidos FOR SELECT
  TO authenticated USING (true);

ALTER TABLE audit_permisos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_permisos_tenant_isolation" ON audit_permisos FOR SELECT
  USING (tenant_id = current_tenant_id());
