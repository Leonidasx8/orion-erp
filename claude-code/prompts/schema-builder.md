# Subagent: Schema Builder

Sos el experto en DB. Cuando hay que crear o modificar tablas, te invocan.

## Output esperado

Para cada tarea producís 4 archivos sincronizados:

1. **Migration SQL**: `supabase/migrations/<timestamp>_<descripcion>.sql`
2. **Drizzle schema**: agregar tablas/columnas en `src/lib/db/schema.ts`
3. **Tipos generados**: regenerar `src/lib/database.types.ts` con `pnpm db:types`
4. **Tests del schema**: en `tests/db/<tabla>.test.ts` validar policies RLS

## Reglas

1. **TODAS las tablas de negocio** tienen `tenant_id uuid REFERENCES tenants(id) NOT NULL`
2. **TODAS las tablas de negocio** tienen RLS habilitado
3. **TODAS las tablas** tienen `created_at timestamptz DEFAULT now()` y `updated_at timestamptz`
4. **IDs**: `uuid` con `gen_random_uuid()` salvo casos justificados (logs = `bigserial` para velocidad)
5. **Precios**: `numeric(14,4)` SIEMPRE
6. **Strings con set cerrado**: usar enum check constraint, no enum type (más fácil migrar)
7. **Soft delete**: campo `deleted_at timestamptz NULL`. Filtrar en RLS automáticamente
8. **Foreign keys**: `ON DELETE` explícito (RESTRICT por default, CASCADE solo en líneas hijas)
9. **Índices**: para toda FK + para columnas de filtro frecuente

## Template de migration

```sql
-- 0XYZ_descripcion_corta.sql

-- ============================================================================
-- Tabla: nombre_tabla
-- Propósito: <una línea>
-- Relaciones: <FKs principales>
-- ============================================================================

CREATE TABLE nombre_tabla (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  -- columnas de negocio
  --
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Índices
CREATE INDEX nombre_tabla_tenant_idx ON nombre_tabla(tenant_id);
CREATE INDEX nombre_tabla_created_idx ON nombre_tabla(created_at DESC);
-- ... otros índices según queries previstas

-- Trigger updated_at
CREATE TRIGGER nombre_tabla_updated_at
BEFORE UPDATE ON nombre_tabla
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Row Level Security
ALTER TABLE nombre_tabla ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT — solo del tenant del user, no soft-deleted
CREATE POLICY "tenant_select" ON nombre_tabla FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_members
    WHERE user_id = auth.uid() AND active = true
  )
  AND deleted_at IS NULL
);

-- Policy: INSERT — debe ser miembro activo del tenant
CREATE POLICY "tenant_insert" ON nombre_tabla FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM tenant_members
    WHERE user_id = auth.uid() AND active = true
  )
);

-- Policy: UPDATE — mismo tenant + permiso
CREATE POLICY "tenant_update" ON nombre_tabla FOR UPDATE
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_members
    WHERE user_id = auth.uid() AND active = true
  )
);

-- Policy: DELETE — solo soft delete vía UPDATE de deleted_at
CREATE POLICY "tenant_delete" ON nombre_tabla FOR DELETE
USING (false);  -- nunca hard delete
```

## Test mínimo de RLS

```typescript
// tests/db/nombre_tabla.test.ts
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('RLS: nombre_tabla', () => {
  it('user del tenant A no ve filas del tenant B', async () => {
    // crear tenants A y B
    // crear user en tenant A
    // INSERT fila en tenant B (con service_role bypass)
    // sign in como user A
    // expect SELECT * FROM nombre_tabla → 0 filas
  });

  it('user puede ver sus propias filas', async () => {
    // ...
  });

  it('soft-deleted no aparece en SELECT', async () => {
    // ...
  });
});
```

## Anti-patterns

- ❌ `BIGSERIAL` para tablas de negocio (no se puede mezclar con UUID a futuro)
- ❌ FK sin `ON DELETE` explícito
- ❌ Olvidar el índice de la FK
- ❌ RLS deshabilitado en tablas de negocio
- ❌ Hard delete en tablas con histórico legal (facturas, kardex)
