# 03 — Multi-tenancy: patrón path-based

## Decisión

URLs con path: `orion.../idex/cotizaciones`, `orion.../agroalves/clientes`, `orion.../admin`.

**No subdominios.** Decidido en ADR 0002.

## Estructura de URLs

```
/login                          Pantalla de login
/seleccionar-empresa            Si user tiene acceso a múltiples
/[companySlug]/                 Dashboard del tenant
/[companySlug]/clientes
/[companySlug]/productos
/[companySlug]/cotizaciones
/[companySlug]/cotizaciones/nueva
/[companySlug]/cotizaciones/[id]
/[companySlug]/admin            Superadmin del tenant (Lucas)
/[companySlug]/admin/usuarios
/[companySlug]/admin/roles
/admin                          Superadmin global Dignita
/admin/tenants                  CRUD de tenants
/admin/tenants/nuevo            Wizard onboarding
/admin/usuarios-globales        Otros admins de Dignita
/admin/auditoria                Audit log de plataforma
```

## Slugs definidos

| Empresa        | Slug        | RUC           |
| -------------- | ----------- | ------------- |
| Grupo Idex SAC | `idex`      | 20614847370   |
| Agroalves      | `agroalves` | (a completar) |

Reglas:

- `lowercase`, alfanumérico + guiones
- 2-30 caracteres
- Único en toda la plataforma
- Inmutable una vez creado (cambio requiere migración manual)

## Niveles de Superadmin

### Superadmin Global (Dignita)

- Vive en `/admin/*`
- Pertenece a tabla `platform_admins`
- Puede: crear/editar/suspender tenants, ver métricas globales, gestionar otros platform admins, ver audit log de plataforma
- NO puede: ver datos transaccionales de los tenants (cotizaciones, facturas, etc.) — separación de responsabilidades

### Superadmin del Tenant (Lucas)

- Vive en `/[companySlug]/admin/*`
- Pertenece a tabla `tenant_members` con rol `Superadmin`
- Puede: gestionar usuarios y permisos dentro de su tenant, configurar series SUNAT, márgenes, ver todo lo transaccional de su empresa
- NO puede: crear nuevos tenants, ver datos de otros tenants

## Middleware

```typescript
// src/middleware.ts (simplificado)
export async function middleware(req: NextRequest) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;

  // Rutas públicas
  if (path.startsWith('/login') || path === '/') return NextResponse.next();

  // Sin user → login
  if (!user) return redirect('/login');

  // /admin → solo platform admins
  if (path.startsWith('/admin')) {
    const isPlatformAdmin = await checkPlatformAdmin(user.id);
    return isPlatformAdmin ? NextResponse.next() : redirect('/seleccionar-empresa');
  }

  // /[companySlug] → validar acceso
  const slug = path.split('/')[1];
  if (slug) {
    const hasAccess = await userBelongsToTenant(user.id, slug);
    if (!hasAccess) return redirect('/seleccionar-empresa');

    // Inyectar tenant_id en header para que las queries lo lean
    const tenantId = await getTenantIdBySlug(slug);
    const res = NextResponse.next();
    res.headers.set('x-tenant-id', tenantId);
    return res;
  }

  return NextResponse.next();
}
```

## RLS — la única defensa real

El path solo es UX. Que la URL diga `/idex` no impide nada por sí mismo.
**RLS de Postgres es lo que de verdad evita que un usuario vea datos ajenos.**

Patrón básico:

```sql
-- Cada tabla de negocio tiene tenant_id
CREATE TABLE clientes (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  -- ...
);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- El user solo ve filas de tenants donde es member
CREATE POLICY "tenant_isolation_select" ON clientes FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  )
);

-- Insert: tenant_id forzado del JWT custom claim, no del input
CREATE POLICY "tenant_isolation_insert" ON clientes FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  )
);
```

## JWT custom claims

Para no joinear contra `tenant_members` en cada query, inyectamos el `current_tenant_id` en el JWT vía Supabase hook:

```sql
-- supabase/migrations/00X_jwt_custom_claims.sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  current_tenant uuid;
BEGIN
  -- Tenant guardado en user_metadata o calculado del último login
  SELECT (event->'user_metadata'->>'current_tenant_id')::uuid INTO current_tenant;

  IF current_tenant IS NOT NULL THEN
    event := jsonb_set(event, '{claims,current_tenant_id}', to_jsonb(current_tenant));
  END IF;

  RETURN event;
END;
$$;
```

Y en RLS usamos `auth.jwt() ->> 'current_tenant_id'` directo.

## Recordar la última empresa visitada

Decisión confirmada: al hacer login, redirigir a `/[ultimaEmpresa]/dashboard`. Si es primer login o no tiene preferencia, ir a `/seleccionar-empresa`.

```typescript
// Al cambiar de empresa o al login exitoso
await supabase.auth.updateUser({
  data: { current_tenant_id: newTenantId },
});
```

## Onboarding de un nuevo tenant (wizard)

Vive en `/admin/tenants/nuevo`. 5 pasos:

1. **Datos básicos**: razón social, RUC, slug (validación de unicidad en tiempo real con debounce 300ms), dirección fiscal, ubigeo.
2. **Branding**: logo (upload a Supabase Storage), colores HEX, favicon.
3. **Superadmin del tenant**: email del primer usuario. Sistema envía magic link de invitación.
4. **Configuración fiscal**: series autorizadas (F001, B001, T001), correlativos iniciales, modo SUNAT (NUBEFACT con RUTA y TOKEN del tenant).
5. **Plan y cuotas**: Starter / Pro / Enterprise. Para Idex: Pro con cuotas ampliadas.

Al completar:

1. INSERT en `tenants`
2. Seed de roles base (Superadmin, Comercial, Facturación) en `roles` con `tenant_id`
3. Seed de permisos en `rol_permisos` según matriz default
4. INSERT en `series_documentos` con correlativo en cero
5. Crear el primer usuario en `auth.users` + `tenant_members` + asignación de rol Superadmin
6. Enviar email magic link
7. Audit log entry: `tenant.created` con `created_by = platform_admin.id`

## Costos por tenant

Tracking en `tenant_usage_metrics`:

- Cotizaciones emitidas/mes
- Facturas emitidas/mes
- Guías emitidas/mes
- Storage MB usado

Sirve para: cobranza Dignita al cliente, vista al cliente de su consumo, alertas si se acerca al límite del plan.
