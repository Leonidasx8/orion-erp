# 05 — RBAC dinámico con Casbin

## Decisión

**Casbin para policies dinámicas** + **Supabase RLS para aislamiento por tenant**.

Las dos capas son complementarias:

- **RLS** filtra qué FILAS puede ver un usuario (separación entre tenants)
- **Casbin** filtra qué ACCIONES puede ejecutar (crear cotización, anular factura, ver costo)

Decidido en ADR 0004.

## Niveles de admin

| Nivel                     | Vive en           | Tabla                             | Puede                                           |
| ------------------------- | ----------------- | --------------------------------- | ----------------------------------------------- |
| Platform Admin (Dignita)  | `/admin`          | `platform_admins`                 | Crear/suspender tenants, ver métricas globales  |
| Tenant Superadmin (Lucas) | `/[slug]/admin`   | `tenant_members` (rol Superadmin) | Gestionar usuarios, roles y permisos del tenant |
| Roles base del tenant     | dentro del tenant | `tenant_members` (rol X)          | Lo que el Superadmin del tenant les asigne      |
| Roles custom              | dentro del tenant | `tenant_members` (rol X)          | Creados por el Superadmin del tenant            |

## Esquema

```sql
-- Roles (predefinidos + custom por tenant)
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),  -- NULL = rol global de plataforma
  nombre text NOT NULL,
  es_predefinido boolean DEFAULT false,    -- Superadmin/Comercial/Facturación = true
  descripcion text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, nombre)
);

-- Catálogo de permisos (semilla, NO editable desde UI)
CREATE TABLE permisos_definidos (
  codigo text PRIMARY KEY,             -- 'cotizaciones.crear'
  modulo text NOT NULL,                -- 'cotizaciones'
  accion text NOT NULL,                -- 'crear'
  descripcion text NOT NULL,
  es_sensible boolean DEFAULT false    -- 'productos.ver_costo' = true
);

-- Asignación de permisos a roles (editable por Superadmin del tenant)
CREATE TABLE rol_permisos (
  rol_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  permiso_codigo text REFERENCES permisos_definidos(codigo),
  PRIMARY KEY (rol_id, permiso_codigo)
);

-- Casbin guarda sus policies acá (esquema estándar Casbin)
CREATE TABLE casbin_rule (
  id bigserial PRIMARY KEY,
  ptype varchar(100),
  v0 varchar(100),
  v1 varchar(100),
  v2 varchar(100),
  v3 varchar(100),
  v4 varchar(100),
  v5 varchar(100)
);

-- Audit log de cambios de permisos
CREATE TABLE audit_permisos (
  id bigserial PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id),
  user_id uuid REFERENCES auth.users(id),
  accion text NOT NULL,                 -- 'permiso_agregado', 'permiso_removido'
  rol_id uuid,
  permiso_codigo text,
  detalles jsonb,
  ip_address inet,
  created_at timestamptz DEFAULT now()
);
```

## Catálogo de permisos (seed)

Por módulo, definimos las acciones disponibles:

```sql
INSERT INTO permisos_definidos (codigo, modulo, accion, descripcion, es_sensible) VALUES
-- Tenants (solo platform admins)
('tenants.crear', 'tenants', 'crear', 'Crear nuevos tenants', true),
('tenants.suspender', 'tenants', 'suspender', 'Suspender un tenant', true),

-- Clientes (módulo B.3)
('clientes.ver', 'clientes', 'ver', 'Ver lista de clientes', false),
('clientes.crear', 'clientes', 'crear', 'Crear cliente', false),
('clientes.editar', 'clientes', 'editar', 'Editar cliente existente', false),
('clientes.eliminar', 'clientes', 'eliminar', 'Eliminar cliente', true),
('clientes.exportar', 'clientes', 'exportar', 'Exportar lista a Excel', false),

-- Productos (módulo B.4)
('productos.ver', 'productos', 'ver', 'Ver catálogo', false),
('productos.crear', 'productos', 'crear', 'Crear producto', false),
('productos.editar', 'productos', 'editar', 'Editar producto', false),
('productos.eliminar', 'productos', 'eliminar', 'Eliminar producto', true),
('productos.ver_costo', 'productos', 'ver_costo', 'Ver precio de compra (costo)', true),
('productos.editar_margen', 'productos', 'editar_margen', 'Cambiar margen mínimo', true),
('productos.importar', 'productos', 'importar', 'Importar masivamente desde Excel', false),

-- Cotizaciones (módulo B.5)
('cotizaciones.ver', 'cotizaciones', 'ver', 'Ver cotizaciones', false),
('cotizaciones.crear', 'cotizaciones', 'crear', 'Crear cotización', false),
('cotizaciones.editar', 'cotizaciones', 'editar', 'Editar cotización borrador', false),
('cotizaciones.aprobar', 'cotizaciones', 'aprobar', 'Aprobar cotización', false),
('cotizaciones.eliminar', 'cotizaciones', 'eliminar', 'Eliminar cotización', true),
('cotizaciones.cambiar_margen', 'cotizaciones', 'cambiar_margen', 'Modificar margen en línea', false),
('cotizaciones.descuento_excepcional', 'cotizaciones', 'descuento_excepcional', 'Aplicar descuento mayor al estándar', true),

-- Órdenes de compra (B.6)
('ordenes.ver', 'ordenes', 'ver', 'Ver órdenes de compra', false),
('ordenes.crear', 'ordenes', 'crear', 'Crear orden de compra', false),
('ordenes.aprobar', 'ordenes', 'aprobar', 'Aprobar orden', false),

-- Inventario / Kardex (B.7)
('inventario.ver', 'inventario', 'ver', 'Ver kardex', false),
('inventario.ajuste_manual', 'inventario', 'ajuste_manual', 'Ajustar stock manualmente', true),

-- Guías de remisión (B.8)
('guias.ver', 'guias', 'ver', 'Ver guías', false),
('guias.crear', 'guias', 'crear', 'Crear guía de remisión', false),
('guias.anular', 'guias', 'anular', 'Anular guía', true),

-- Facturación (B.9)
('facturas.ver', 'facturas', 'ver', 'Ver facturas', false),
('facturas.emitir', 'facturas', 'emitir', 'Emitir factura/boleta', false),
('facturas.anular', 'facturas', 'anular', 'Anular factura (NC)', true),
('facturas.reenviar_sunat', 'facturas', 'reenviar_sunat', 'Forzar reenvío a SUNAT', true),

-- Crédito y CxC (B.10)
('credito.ver', 'credito', 'ver', 'Ver cuentas por cobrar', false),
('credito.otorgar', 'credito', 'otorgar', 'Otorgar/modificar línea de crédito', true),
('credito.registrar_pago', 'credito', 'registrar_pago', 'Registrar pago de cliente', false),

-- Reportes (B.11)
('reportes.ver', 'reportes', 'ver', 'Ver dashboard y reportes', false),
('reportes.exportar', 'reportes', 'exportar', 'Exportar reportes a Excel', false),

-- Admin del tenant
('admin.usuarios.ver', 'admin', 'usuarios.ver', 'Ver usuarios del tenant', false),
('admin.usuarios.invitar', 'admin', 'usuarios.invitar', 'Invitar nuevos usuarios', true),
('admin.usuarios.suspender', 'admin', 'usuarios.suspender', 'Suspender usuarios', true),
('admin.roles.ver', 'admin', 'roles.ver', 'Ver roles y permisos', false),
('admin.roles.editar', 'admin', 'roles.editar', 'Crear/editar roles y permisos', true),
('admin.config.editar', 'admin', 'config.editar', 'Editar configuración del tenant', true);
```

## Roles base predefinidos

Cuando se crea un tenant, se siembran estos 3 roles automáticamente:

### Superadmin

TODOS los permisos del tenant. NO puede ser editado ni borrado.

### Comercial

- `clientes.*` (excepto eliminar)
- `productos.ver`, `productos.importar` NO `productos.ver_costo` (sensible)
- `cotizaciones.crear`, `cotizaciones.editar`, `cotizaciones.ver`
- `ordenes.ver`
- `inventario.ver`
- `reportes.ver` (solo del comercial)

### Facturación

- `clientes.ver`
- `productos.ver` (con costo)
- `cotizaciones.ver`, `cotizaciones.aprobar`
- `facturas.*`
- `guias.*`
- `credito.*`
- `inventario.ver`, `inventario.ajuste_manual`
- `reportes.*`

## Helper de verificación

```typescript
// src/lib/auth/casbin.ts
import { Enforcer, newEnforcer } from 'casbin';

let enforcer: Enforcer | null = null;

export async function getEnforcer() {
  if (!enforcer) {
    enforcer = await newEnforcer('model.conf', adapter);
  }
  return enforcer;
}

export async function userCan(userId: string, tenantId: string, permiso: string): Promise<boolean> {
  const e = await getEnforcer();
  return e.enforce(userId, tenantId, permiso);
}

// Uso en Server Actions
export async function requirePermission(permiso: string) {
  const user = await getUser();
  const tenant = await getCurrentTenant();
  const allowed = await userCan(user.id, tenant.id, permiso);
  if (!allowed) throw new ForbiddenError(`Sin permiso: ${permiso}`);
}
```

## Helper de UI (mostrar/ocultar)

```typescript
// src/lib/auth/use-permission.ts (Client)
import { create } from 'zustand';

const usePermissionsStore = create<{
  permisos: Set<string>;
}>(() => ({ permisos: new Set() }));

export function usePermission(permiso: string): boolean {
  return usePermissionsStore((s) => s.permisos.has(permiso));
}

// En componente
function Toolbar() {
  const canCrear = usePermission('cotizaciones.crear');
  return (
    <div>
      {canCrear && <Button>Nueva cotización</Button>}
    </div>
  );
}
```

⚠️ **Esto es solo UX.** La validación REAL ocurre en el server con `requirePermission()`. Nunca confiar en el frontend.

## Auditoría

Todo cambio de permisos queda registrado:

```typescript
await db.insert(auditPermisos).values({
  tenantId,
  userId: actor.id,
  accion: 'permiso_agregado',
  rolId: targetRol.id,
  permisoCodigo: 'productos.ver_costo',
  detalles: { rolNombre: targetRol.nombre },
  ipAddress: req.ip,
});
```

## UI del Superadmin

Vive en `/[companySlug]/admin/roles`. Lista de roles a la izquierda, matriz de permisos al medio, sección de "Roles personalizados" con botón "Crear nuevo rol".

Para crear rol custom:

1. Click "Nuevo rol" → modal con nombre + descripción
2. Después abre la matriz de permisos: checkboxes agrupados por módulo
3. Permisos sensibles tienen un ícono ⚠️ y color naranja
4. Guardar = INSERT en `roles` + `rol_permisos` + `audit_permisos`

## Repos de referencia

- **`apache/casbin`** + **`casbin/node-casbin`**: enforcer, model.conf, adapters
- **`casbin/casbin.js`**: versión frontend para mostrar/ocultar UI
- **`point-source/supabase-tenant-rbac`**: patrón JWT custom claims
- **`permit.io`** blog post sobre RLS + Casbin: cómo combinarlos correctamente
