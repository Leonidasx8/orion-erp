-- Miembros de cada tenant con roles
CREATE TABLE tenant_members (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rol        text        NOT NULL DEFAULT 'comercial',
  activo     boolean     NOT NULL DEFAULT true,
  invited_at timestamptz NOT NULL DEFAULT now(),
  joined_at  timestamptz,
  UNIQUE (tenant_id, user_id),
  CONSTRAINT rol_values CHECK (rol IN ('superadmin', 'admin', 'facturacion', 'comercial', 'readonly'))
);

CREATE INDEX tenant_members_tenant_idx ON tenant_members(tenant_id);
CREATE INDEX tenant_members_user_idx   ON tenant_members(user_id);

-- RLS: cada usuario solo ve sus propias membresías
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_members: usuario ve sus membresías"
  ON tenant_members FOR SELECT
  USING (user_id = auth.uid());

-- Los admins del tenant ven a todos sus miembros
CREATE POLICY "tenant_members: admin ve miembros de su tenant"
  ON tenant_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = tenant_members.tenant_id
        AND tm.user_id   = auth.uid()
        AND tm.rol        IN ('superadmin', 'admin')
        AND tm.activo     = true
    )
  );

-- Solo platform admins o admins del tenant pueden insertar/modificar
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
        AND tm.activo     = true
    )
  );
