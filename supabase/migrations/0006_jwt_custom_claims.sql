-- Vista para chequeo rápido de acceso por slug (usada por el middleware)
CREATE OR REPLACE VIEW vw_user_tenant_access AS
SELECT
  tm.user_id,
  tm.tenant_id,
  t.slug
FROM tenant_members tm
INNER JOIN tenants t ON t.id = tm.tenant_id
WHERE tm.activo = true AND t.estado = 'activo';

GRANT SELECT ON vw_user_tenant_access TO authenticated;

-- Función helper para extraer tenant del JWT (reutilizada por RLS en módulos siguientes)
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() ->> 'current_tenant_id')::uuid;
$$;

GRANT EXECUTE ON FUNCTION current_tenant_id() TO authenticated;

-- Hook que inyecta current_tenant_id en el JWT al hacer login/refresh
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_current_tenant uuid;
  v_user_id uuid;
BEGIN
  v_user_id := (event ->> 'user_id')::uuid;

  -- Leer el tenant que el usuario seleccionó (guardado en user_metadata)
  v_current_tenant := (event -> 'user_metadata' ->> 'current_tenant_id')::uuid;

  -- Validar que el user efectivamente es miembro activo de ese tenant
  IF v_current_tenant IS NOT NULL THEN
    PERFORM 1
    FROM tenant_members
    WHERE user_id = v_user_id
      AND tenant_id = v_current_tenant
      AND activo = true;
    IF NOT FOUND THEN
      v_current_tenant := NULL;
    END IF;
  END IF;

  IF v_current_tenant IS NOT NULL THEN
    event := jsonb_set(event, '{claims,current_tenant_id}', to_jsonb(v_current_tenant::text));
  END IF;

  RETURN event;
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;
