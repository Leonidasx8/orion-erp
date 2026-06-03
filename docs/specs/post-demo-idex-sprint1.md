# Spec Sprint 1 Post-Demo — Grupo Idex

**Fecha:** 2026-05-16  
**Branch destino:** `feat/post-demo-idex-sprint1`  
**Estimado:** 2–3 días hábiles  
**Fuente:** respuestas del Formulario Kickoff (29-abr) + respuestas post-demo de Lucas

---

## Resumen de cambios

| ID  | Feature                                    | Complejidad | Prioridad |
| --- | ------------------------------------------ | ----------- | --------- |
| F1  | Datos reales Idex en DB (migration + seed) | S           | Alta      |
| F2  | Design B como template PDF default         | XS          | Alta      |
| F3  | Condiciones comerciales editables en form  | M           | Alta      |
| F4  | Columna "Creado por" en listas             | S           | Media     |
| F5  | Actualización masiva de precios            | L           | Media     |

---

## F1 — Datos reales Idex en DB

### Problema

El tenant `idex` en la DB de desarrollo tiene datos placeholder del seed. Hay además 5 campos que aún no existen en el schema de `tenants`.

### Campos faltantes en schema (nueva migration)

```sql
-- 0033_tenant_campos_extendidos.sql
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS banco_cuenta_usd      text,
  ADD COLUMN IF NOT EXISTS banco_cci_usd         text,
  ADD COLUMN IF NOT EXISTS comercial_nombre      text,
  ADD COLUMN IF NOT EXISTS comercial_cargo       text,
  ADD COLUMN IF NOT EXISTS comercial_telefono    text;
```

### Drizzle schema (`src/lib/db/schema/tenants.ts`)

Agregar los 5 campos al final del objeto `tenants`:

```ts
bancoCuentaUsd: text('banco_cuenta_usd'),
bancoCciUsd:    text('banco_cci_usd'),
comercialNombre:   text('comercial_nombre'),
comercialCargo:    text('comercial_cargo'),
comercialTelefono: text('comercial_telefono'),
```

### Datos reales Idex (actualizar en seed + SQL directo en dev)

```sql
UPDATE tenants SET
  razon_social            = 'GRUPO IDEX SAC',
  ruc                     = '20614847370',
  direccion_fiscal        = 'Cal. Robert Fulton 141, Urb. Santa Rosa, ATE, Lima',
  telefono                = '+51 915 298 294',
  contacto_email          = 'lescriva@grupoidex.com.pe',
  color_primario          = '#1F5B3A',
  color_secundario        = '#2E7A4F',
  banco_nombre            = 'BBVA',
  banco_cuenta            = '0011-0354-0100051694',
  banco_cci               = '011-354-000100051694-86',
  banco_detraccion_cuenta = '00-021-157236',
  comercial_nombre        = 'Lucas Escrivá De Romaní',
  comercial_cargo         = 'Gerente General',
  comercial_telefono      = '+51 915 298 294'
WHERE slug = 'idex';
```

### Impacto PDF

El `CotizacionPDFData.comercial` actualmente se resuelve buscando en Supabase auth por `creadoPor` del documento. Cuando `comercialNombre` esté disponible en el tenant, el route PDF debe usarlo como fallback si no hay datos de auth:

```ts
// En pdf/route.ts — reemplazar bloque de comercial
const meta = userData.user.user_metadata as Record<string, unknown> | undefined;
comercial = {
  nombre:
    (meta?.full_name as string) ?? tenantRow?.comercialNombre ?? userData.user.email ?? 'Comercial',
  email: userData.user.email ?? null,
  telefono: (meta?.telefono as string) ?? tenantRow?.comercialTelefono ?? null,
};
```

---

## F2 — Design B como template PDF default

### Problema

El PDF route tiene Design B disponible con `?design=b`, pero el botón en `CotizacionDetalle` usa el link base (Design genérico). Lucas eligió Design B.

### Cambio en `src/app/api/[companySlug]/cotizaciones/[id]/pdf/route.ts`

```ts
// Antes:
const Component =
  design === 'a' ? CotizacionPDFDesignA : design === 'b' ? CotizacionPDFDesignB : CotizacionPDF;
const elementProps =
  design === 'a' || design === 'b' ? { data: pdfData, logoUrl } : { data: pdfData };

// Después:
const Component =
  design === 'a'
    ? CotizacionPDFDesignA
    : design === 'legacy'
      ? CotizacionPDF
      : CotizacionPDFDesignB;
const elementProps = { data: pdfData, logoUrl };
```

`CotizacionPDF-B.tsx` ya recibe `logoUrl` correctamente.

### Impacto en `CotizacionDetalle.tsx`

El botón de PDF no necesita cambios si actualmente ya apunta a `?design=b`. Si no, remover el query param y el default será B.

---

## F3 — Condiciones comerciales editables en form de cotización

### Problema

Los campos `formaPago`, `tiempoEntrega`, `lugarEntrega`, `incluyeIgv` **ya existen en la tabla `cotizaciones`** pero:

1. No están en el Zod schema (`cotizacionSchema`)
2. No se guardan en `crearCotizacion` / `actualizarCotizacion`
3. No aparecen en `CotizacionForm`
4. El default de `fechaVencimiento` es 7 días (Lucas pide 3)

Lucas también quiere campo "Atención de" (contacto cliente) editable en el form, pero ese ya existe en el schema como `contactoClienteNombre/Cargo/Email`.

### 3a — Zod schema (`src/lib/schemas/cotizacion.ts`)

Agregar al `cotizacionSchema`:

```ts
formaPago:      z.string().max(300).optional(),
tiempoEntrega:  z.string().max(300).optional(),
lugarEntrega:   z.string().max(300).optional(),
incluyeIgv:     z.boolean().default(false),
contactoClienteNombre: z.string().max(200).optional(),
contactoClienteCargo:  z.string().max(200).optional(),
contactoClienteEmail:  z.string().max(200).optional(),
```

**Nota:** `incluyeIgv: false` como default porque Lucas pidió "cotización sin IGV incluido" (Subtotal → IGV → Total se muestran separados, lo que significa que el precio unitario es sin IGV). El PDF B ya maneja este flag.

### 3b — Server actions (`src/server/actions/cotizaciones.ts`)

En `crearCotizacion` y `actualizarCotizacion`, agregar al bloque de inserción/actualización:

```ts
formaPago:              data.formaPago ?? null,
tiempoEntrega:          data.tiempoEntrega ?? null,
lugarEntrega:           data.lugarEntrega ?? null,
incluyeIgv:             data.incluyeIgv ?? false,
contactoClienteNombre:  data.contactoClienteNombre ?? null,
contactoClienteCargo:   data.contactoClienteCargo ?? null,
contactoClienteEmail:   data.contactoClienteEmail ?? null,
```

### 3c — `CotizacionFormInitial` (en `CotizacionForm.tsx`)

Agregar los 7 campos nuevos al tipo `CotizacionFormInitial` y al bloque `defaultValues` de initial.

### 3d — UI `CotizacionForm.tsx`

Agregar una sección **"Condiciones comerciales"** entre las notas y el botón de submit:

```
┌─────────────────────────────────────────────────┐
│ CONDICIONES COMERCIALES                         │
├────────────────────────┬────────────────────────┤
│ Forma de pago          │ Tiempo de entrega       │
│ [input text]           │ [input text]            │
├────────────────────────┴────────────────────────┤
│ Lugar de entrega                                │
│ [input text]                                    │
├─────────────────────────────────────────────────┤
│ ☐ Incluye IGV en precio unitario                │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ ATENCIÓN DE (opcional)                          │
├────────────────────────┬────────────────────────┤
│ Nombre contacto        │ Cargo                  │
│ [input text]           │ [input text]            │
├────────────────────────┴────────────────────────┤
│ Email contacto                                  │
│ [input email]                                   │
└─────────────────────────────────────────────────┘
```

Usar los mismos `<Field>` e `inputCls` del form existente.

### 3e — Default validez 3 días

```ts
// CotizacionForm.tsx línea ~104
fechaVencimiento: plusDaysIso(3),  // era plusDaysIso(7)
```

### 3f — Página detalle: mostrar condiciones

`CotizacionDetalle.tsx` ya muestra `terminosCondiciones` pero NO muestra `formaPago/tiempoEntrega/lugarEntrega`. Agregar una card **"Condiciones"** en el sidebar derecho con esos 3 campos + el badge IGV.

---

## F4 — Columna "Creado por" en listas

### Problema

`CotizacionesList` tiene la columna `comercial` pero el page la resuelve como `'—'` con un TODO.
Hay que resolver `creadoPor` (UUID de auth) → nombre del usuario.

### Decisión técnica: snapshot en creación

**Opción elegida:** agregar `creado_por_nombre text` a `cotizaciones` y `ordenes_compra`, capturar el nombre al momento de crear el documento. No requiere JOIN extra en queries de lista.

**Por qué snapshot:** consistente con `cliente_*_snapshot` en `facturas`. Si el usuario cambia su nombre o sale del tenant, el histórico no muta. O(1) en queries de lista.

### Migration

```sql
-- 0033 (o 0034)
ALTER TABLE cotizaciones    ADD COLUMN IF NOT EXISTS creado_por_nombre text;
ALTER TABLE ordenes_compra  ADD COLUMN IF NOT EXISTS creado_por_nombre text;
```

### Server actions — capturar nombre al crear

En `crearCotizacion` y `crearOrdenCompra`, obtener el nombre del `user` que retorna `requirePermission()`:

```ts
const { user, tenant } = await requirePermission('cotizaciones.crear');
// user es el User de Supabase, tiene user.user_metadata.full_name
const creadoPorNombre =
  (user.user_metadata?.full_name as string | undefined) ?? user.email ?? 'Usuario';
```

Y en el INSERT:

```ts
creadoPorNombre,
```

### Schema Drizzle

```ts
// cotizaciones.ts
creadoPorNombre: text('creado_por_nombre'),

// ordenes-compra.ts (si existe el schema)
creadoPorNombre: text('creado_por_nombre'),
```

### List pages

En `cotizaciones/page.tsx` y `ordenes/page.tsx`, seleccionar `creadoPorNombre` de la query y pasarlo a la lista. Ya no hay que unir a Supabase auth.

### Backfill opcional

Los documentos existentes en dev tienen `creado_por_nombre = null`. En el seed, popular con `'Lucas Escrivá'`.

---

## F5 — Actualización masiva de precios

### Descripción

Lucas necesita poder subir/bajar precios de todo un proveedor o categoría de productos de una sola vez, en lugar de editar cada SKU individualmente.

### Reglas de negocio

- El operador selecciona el alcance: **por categoría** (único filtro disponible hoy, ya que `proveedorId` no existe en el schema)
- Elige el modo:
  - **Porcentaje:** multiplica `precio_unitario` por `(1 + pct/100)`. Ej: +5% → precio × 1.05
  - **Precio fijo:** setea `precio_unitario` a un valor dado (solo si solo hay 1 producto seleccionado, o por confirmación extra)
- Muestra preview de cambios antes de confirmar
- El campo actualizado es **solo `precio_unitario`** (precio de venta al cliente), NO `costo_unitario`
- Se registra en un `historial_precios` (feature del addendum — en esta versión solo se actualiza el campo, sin historial)

### Flujo de UI

```
/[slug]/productos/actualizar-precios

1. Selección de alcance
   ┌──────────────────────────────────────────┐
   │ Actualizar precios                       │
   │                                          │
   │ Filtrar por: [Categoría ▼]               │
   │ Categoría:   [──────────────── ▼]        │
   │                                          │
   │ Ajuste:                                  │
   │ ○ Porcentaje  ● Precio fijo              │
   │                                          │
   │ Valor: [+5.00] %                         │
   │                                          │
   │ [Ver preview →]                          │
   └──────────────────────────────────────────┘

2. Preview
   ┌─ N productos afectados ──────────────────┐
   │ SKU   Nombre   Precio actual  Precio nuevo│
   │ E001  Cable    S/ 12.50       S/ 13.13   │
   │ E002  …        S/ 8.00        S/ 8.40    │
   │                                          │
   │ [← Volver]  [Confirmar actualización]    │
   └──────────────────────────────────────────┘
```

### Zod schema (`src/lib/schemas/productos.ts` o nuevo archivo)

```ts
export const actualizarPreciosMasivosSchema = z
  .object({
    categoriaId: z.string().uuid().optional(),
    modo: z.enum(['porcentaje', 'precio_fijo']),
    valor: z.coerce.number().refine((v) => v !== 0, 'El ajuste no puede ser 0'),
    // Para porcentaje: puede ser negativo (descuento)
    // Para precio_fijo: debe ser positivo
  })
  .refine(
    (d) => {
      if (d.modo === 'precio_fijo') return d.valor > 0;
      return true;
    },
    { message: 'Precio fijo debe ser mayor a 0', path: ['valor'] }
  );

export type ActualizarPreciosMasivosInput = z.infer<typeof actualizarPreciosMasivosSchema>;
```

### Server action (`src/server/actions/productos.ts`)

```ts
// Dos acciones:
// 1. previewActualizarPrecios — solo lee, no escribe
// 2. confirmarActualizarPrecios — hace el UPDATE

export async function previewActualizarPrecios(
  input: ActualizarPreciosMasivosInput
): Promise<ActionResult<{ productos: PreviewItem[] }>>;

export async function confirmarActualizarPrecios(
  input: ActualizarPreciosMasivosInput
): Promise<ActionResult<{ actualizados: number }>>;
```

La action `confirmarActualizarPrecios` hace:

```sql
UPDATE productos
SET
  precio_unitario = CASE
    WHEN $modo = 'porcentaje' THEN precio_unitario * (1 + $valor / 100)
    ELSE $valor
  END,
  updated_at = now()
WHERE tenant_id = $tenantId
  AND (categoria_id = $categoriaId OR $categoriaId IS NULL)
  AND activo = true;
```

### Rutas

```
src/app/(app)/[companySlug]/productos/actualizar-precios/page.tsx
  — Server Component: requiere permiso `productos.editar`, carga categorías
  — Renderiza el Client Component

src/components/modules/productos/ActualizarPreciosForm.tsx
  — Client Component: todo el flujo en 2 pasos (selección + preview)
```

### Navegación

Agregar botón "Actualizar precios" en `ProductosList.tsx` (header, visible solo para quien tiene permiso `productos.editar`).

### Permiso requerido

`productos.editar` (ya existe en casbin). No se necesita un permiso nuevo.

---

## Orden de implementación sugerido

1. **F1 migration** — corre migration, actualiza Drizzle schema, actualiza seed
2. **F2** — 1 cambio en route PDF
3. **F3** — schema Zod + actions + form (en ese orden)
4. **F4** — migration + actions + list pages
5. **F5** — último, es el más grande

Entre F3 y F4, hacer `pnpm typecheck` para asegurar coherencia.

---

## Tests necesarios

- F3: test unitario `cotizacionSchema` — validar que `incluyeIgv` default es `false`
- F5: test unitario del cálculo de preview (dado precio y porcentaje, el resultado es correcto)

---

## Fuera de scope de este sprint

- Historial de precios (`historial_precios` table) — addendum Bucket B
- Variantes de producto — addendum Bucket B
- Filtro por proveedor en actualización masiva — proveedor no existe en schema actual; requiere decidir si se modela como campo FK o como tag libre
- bancoCuentaUsd para Idex — Lucas dijo "dejar en blanco por ahora"
