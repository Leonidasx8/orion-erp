# ADR 0004 — RBAC dinámico con Casbin (no roles hardcoded)

**Estado**: Aceptado
**Fecha**: 2026-04-28

## Contexto

El Anexo I cláusula B.2 menciona "tres roles definidos" (Superadmin, Comercial, Facturación). Implementación literal: enum hardcoded en código, matriz de permisos fija. Pero esto es rígido — Lucas no puede crear un rol "Gerente Ventas" sin pedirle al desarrollador que toque código.

## Decisión

**Roles base predefinidos** (Superadmin, Comercial, Facturación) que vienen como semilla del sistema y NO se pueden borrar, **+ permisos editables desde UI** + **+ roles custom creables por el Superadmin del tenant**.

Implementación:

- **Casbin** (Apache, Node.js) para policies dinámicas en Postgres
- **Supabase RLS** como capa adicional de aislamiento por tenant
- Tabla `permisos_definidos` como catálogo (seed, no editable)
- Tabla `roles` editable con flag `es_predefinido`
- Tabla `rol_permisos` editable que asocia ambos
- Tabla `audit_permisos` con cada cambio

## Alternativas descartadas

### Roles enum hardcoded

- ✅ Más simple
- ❌ Cualquier cambio requiere redeploy
- ❌ Lucas depende de Dignita para tareas administrativas
- ❌ Mal diseño para un sistema vendido a múltiples clientes

### Auth0 / Clerk con roles

- ✅ Less code
- ❌ Lock-in con servicio externo
- ❌ Costo recurrente
- ❌ Supabase ya da auth, redundante

### Supabase RLS exclusivo

- ✅ Built-in
- ❌ RLS es para filtrar filas, no acciones
- ❌ Implementar "user X puede crear cotizaciones pero no aprobar" requiere policies SQL complejas y duplicadas

## Costo de la decisión

**+6 horas** sobre el estimado de B.2 (de 14h a 20h). Vale la pena.

## Consecuencias

- Lucas puede crear roles custom sin tocar a Dignita
- UI de admin de roles más rica (tomamos inspiración de Linear, Notion)
- 2 capas de defensa: RLS + Casbin (defense in depth)
- Audit log inmutable para cumplimiento

## Referencias

- `.gemini/antigravity/brain/05-rbac-casbin.md`
- <https://casbin.org/docs/>
