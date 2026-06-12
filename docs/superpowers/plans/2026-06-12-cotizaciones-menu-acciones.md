# Cotizaciones — Menú de Acciones (3-puntos) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wired el botón ⋯ de la lista de cotizaciones con un dropdown que ofrece Editar y Eliminar, amplía el permiso de edición a todos los estados excepto `convertida`, y muestra un contador "✏ N" junto a la fecha de emisión para las cotizaciones que han sido editadas.

**Architecture:**

- Migración DB `0050` agrega `veces_editado int NOT NULL DEFAULT 0` a `cotizaciones`.
- `actualizarCotizacion` captura un snapshot previo (`pre_edicion`) y luego incrementa `veces_editado`; ya no requiere `borrador`.
- `CotizacionesList` reemplaza el `<button>` muerto con un componente `MenuCotizacion` inline que usa un dropdown posicionado con `useRef` + click-outside, `AlertDialog` para confirmar eliminación, y muestra el badge de ediciones en la celda de emisión.

**Tech Stack:** Next.js 14 App Router, Drizzle ORM, Supabase (PostgreSQL), React (useRef/useState/useTransition), shadcn `AlertDialog` (ya instalado en `src/components/ui/alert-dialog.tsx`), `sonner` toast (ya importado en el layout), Lucide icons.

---

## Archivos afectados

| Acción    | Archivo                                                               |
| --------- | --------------------------------------------------------------------- |
| Crear     | `supabase/migrations/0050_cotizaciones_veces_editado.sql`             |
| Modificar | `src/lib/db/schema/cotizaciones.ts`                                   |
| Modificar | `src/server/actions/cotizaciones.ts` (función `actualizarCotizacion`) |
| Modificar | `src/app/(app)/[companySlug]/cotizaciones/[id]/editar/page.tsx`       |
| Modificar | `src/app/(app)/[companySlug]/cotizaciones/page.tsx`                   |
| Modificar | `src/components/modules/cotizaciones/CotizacionesList.tsx`            |

---

## Task 1 — Migración DB: columna `veces_editado`

**Files:**

- Create: `supabase/migrations/0050_cotizaciones_veces_editado.sql`

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- supabase/migrations/0050_cotizaciones_veces_editado.sql
ALTER TABLE cotizaciones
  ADD COLUMN IF NOT EXISTS veces_editado integer NOT NULL DEFAULT 0;
```

- [ ] **Step 2: Aplicar en Supabase remoto (producción)**

```bash
# Desde /Users/leonidasyauri/dev/orion-erp
npx supabase db push --linked
```

Esperado: `Applied 1 migration` (o similar). Si dice "already applied", verificar en el dashboard de Supabase que la columna existe.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0050_cotizaciones_veces_editado.sql
git commit -m "db: add veces_editado column to cotizaciones"
```

---

## Task 2 — Drizzle schema: campo `vecesEditado`

**Files:**

- Modify: `src/lib/db/schema/cotizaciones.ts`

- [ ] **Step 1: Añadir la columna al schema Drizzle**

En `src/lib/db/schema/cotizaciones.ts`, dentro de `pgTable('cotizaciones', {...})`, agregar `vecesEditado` justo antes de `creadoPor`:

```typescript
  // Antes de:  creadoPor: uuid('creado_por').notNull(),
  vecesEditado: integer('veces_editado').notNull().default(0),
```

Bloque completo de contexto para localizar la posición (líneas ~66-72 del archivo original):

```typescript
  ordenCompraId: uuid('orden_compra_id'),
  facturaId: uuid('factura_id'),

  vecesEditado: integer('veces_editado').notNull().default(0),  // ← AGREGAR

  creadoPor: uuid('creado_por').notNull(),
  creadoPorNombre: text('creado_por_nombre'),
```

- [ ] **Step 2: Verificar que TypeScript compila sin errores**

```bash
cd /Users/leonidasyauri/dev/orion-erp && npx tsc --noEmit 2>&1 | head -30
```

Esperado: sin errores relacionados a `cotizaciones.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/schema/cotizaciones.ts
git commit -m "schema: add vecesEditado to cotizaciones Drizzle schema"
```

---

## Task 3 — Server action: ampliar edición + snapshot + contador

**Files:**

- Modify: `src/server/actions/cotizaciones.ts` (función `actualizarCotizacion`, líneas ~151-240)

- [ ] **Step 1: Cambiar `{ tenant }` → `{ tenant, user }` en `requirePermission`**

Localizar la línea 158:

```typescript
const { tenant } = await requirePermission('cotizaciones.editar');
```

Reemplazar por:

```typescript
const { tenant, user } = await requirePermission('cotizaciones.editar');
```

- [ ] **Step 2: Cambiar la restricción de estado**

Localizar las líneas ~167-172:

```typescript
if (!actual) return { success: false, error: 'Cotización no encontrada' };
if (actual.estado !== 'borrador')
  return {
    success: false,
    error: `Solo se puede editar en estado borrador (actual: ${actual.estado})`,
  };
```

Reemplazar por:

```typescript
if (!actual) return { success: false, error: 'Cotización no encontrada' };
if (actual.estado === 'convertida')
  return {
    success: false,
    error: 'Una cotización convertida en OC o factura no puede editarse.',
  };
```

- [ ] **Step 3: Añadir snapshot pre-edición + incremento de contador dentro de la transacción**

La transacción (línea ~182) comienza así:

```typescript
    await db.transaction(async (tx) => {
      await tx
        .update(cotizaciones)
        .set({
```

Insertar `capturarVersion` ANTES del `tx.update` y añadir `vecesEditado` al `.set({...})`:

```typescript
    await db.transaction(async (tx) => {
      // Snapshot antes de sobreescribir
      await capturarVersion(tx, cotizacionId, tenant.id, user.id, 'pre_edicion');

      await tx
        .update(cotizaciones)
        .set({
          clienteId: data.clienteId,
          moneda: data.moneda,
          tipoCambio: data.tipoCambio != null ? String(data.tipoCambio) : null,
          fechaEmision: data.fechaEmision,
          fechaVencimiento: data.fechaVencimiento,
          subtotal: String(totales.subtotal),
          totalDescuentos: String(totales.totalDescuentos),
          descuentoGlobal: String(totales.descuentoGlobal),
          baseImponible: String(totales.baseImponible),
          igv: String(totales.igv),
          total: String(totales.total),
          notas: data.notas,
          terminosCondiciones: data.terminosCondiciones,
          formaPago: data.formaPago ?? null,
          tiempoEntrega: data.tiempoEntrega ?? null,
          lugarEntrega: data.lugarEntrega ?? null,
          incluyeIgv: data.incluyeIgv ?? false,
          contactoClienteNombre: data.contactoClienteNombre ?? null,
          contactoClienteCargo: data.contactoClienteCargo ?? null,
          contactoClienteEmail: data.contactoClienteEmail || null,
          vecesEditado: sql`${cotizaciones.vecesEditado} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(cotizaciones.id, cotizacionId));
```

- [ ] **Step 4: TypeCheck**

```bash
cd /Users/leonidasyauri/dev/orion-erp && npx tsc --noEmit 2>&1 | head -30
```

Esperado: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/server/actions/cotizaciones.ts
git commit -m "feat(cotizaciones): permitir editar todos los estados excepto convertida + snapshot pre_edicion + contador"
```

---

## Task 4 — Página de edición: quitar restricción de borrador

**Files:**

- Modify: `src/app/(app)/[companySlug]/cotizaciones/[id]/editar/page.tsx` (línea ~33)

- [ ] **Step 1: Cambiar la condición de redirect**

Localizar la línea ~33:

```typescript
if (row.estado !== 'borrador') redirect(`/${companySlug}/cotizaciones/${id}`);
```

Reemplazar por:

```typescript
if (row.estado === 'convertida') redirect(`/${companySlug}/cotizaciones/${id}`);
```

- [ ] **Step 2: TypeCheck**

```bash
cd /Users/leonidasyauri/dev/orion-erp && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/\[companySlug\]/cotizaciones/\[id\]/editar/page.tsx
git commit -m "feat(cotizaciones): permitir editar cotizaciones no convertidas desde la pagina"
```

---

## Task 5 — Page query: incluir `vecesEditado`

**Files:**

- Modify: `src/app/(app)/[companySlug]/cotizaciones/page.tsx`

- [ ] **Step 1: Añadir `vecesEditado` al `select` de la query principal**

En el `db.select({...})` (líneas ~60-73), agregar al final del objeto:

```typescript
        vecesEditado: cotizaciones.vecesEditado,
```

- [ ] **Step 2: Pasar `vecesEditado` al mapeo de `rows`**

En el mapeo `const rows: CotizacionRow[] = rowsRaw.map((r) => ({...}))` (líneas ~111-123), agregar:

```typescript
    vecesEditado: r.vecesEditado ?? 0,
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/\[companySlug\]/cotizaciones/page.tsx
git commit -m "feat(cotizaciones): incluir vecesEditado en query de lista"
```

---

## Task 6 — CotizacionesList: tipo + dropdown + badge

**Files:**

- Modify: `src/components/modules/cotizaciones/CotizacionesList.tsx`

### 6a — Actualizar el tipo `CotizacionRow`

- [ ] **Step 1: Añadir `vecesEditado` al tipo**

Localizar el tipo `CotizacionRow` (línea ~27-39). Agregar al final del tipo, antes del `}`:

```typescript
vecesEditado: number;
```

### 6b — Añadir imports necesarios

- [ ] **Step 2: Añadir imports de AlertDialog, toast y useTransition**

El archivo ya importa desde `lucide-react` y `next/navigation`. Añadir los siguientes imports al inicio:

```typescript
import { useTransition } from 'react';
// (ya existe: import { useEffect, useRef, useState } from 'react'; — solo agregar useTransition)
```

```typescript
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { eliminarCotizacion } from '@/server/actions/cotizaciones';
```

Verificar que `useTransition` no está ya importado — si ya está en el `import { useEffect, useRef, useState }`, agregarlo ahí.

### 6c — Añadir componente `MenuCotizacion`

- [ ] **Step 3: Añadir el componente inline `MenuCotizacion` justo antes de la función `CotizacionesList`**

Este componente reemplaza el botón muerto. Implementa el dropdown con click-outside y el AlertDialog de confirmación de eliminar.

```typescript
function MenuCotizacion({
  id,
  estado,
  tenantSlug,
}: {
  id: string;
  estado: string;
  tenantSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const puedeEditar = estado !== 'convertida';
  const puedeEliminar = estado === 'borrador';

  function handleEliminar() {
    startTransition(async () => {
      const res = await eliminarCotizacion(id);
      if (res.success) {
        toast.success('Cotización eliminada');
        router.refresh();
      } else {
        toast.error(res.error ?? 'No se pudo eliminar');
      }
    });
  }

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="grid h-6 w-6 place-items-center rounded-md text-orion-fg-faint hover:bg-orion-bg-muted hover:text-orion-fg"
        >
          <MoreHorizontal size={14} />
        </button>

        {open && (
          <div className="absolute right-0 top-7 z-50 min-w-[140px] overflow-hidden rounded-lg border border-orion-border bg-orion-bg shadow-md">
            {puedeEditar ? (
              <Link
                href={`/${tenantSlug}/cotizaciones/${id}/editar`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-[13px] text-orion-fg hover:bg-orion-bg-subtle"
              >
                <Pencil size={13} />
                Editar
              </Link>
            ) : (
              <span className="flex cursor-not-allowed items-center gap-2 px-3 py-2 text-[13px] text-orion-fg-faint">
                <Pencil size={13} />
                Editar
              </span>
            )}

            {puedeEliminar ? (
              <button
                type="button"
                onClick={() => { setOpen(false); setAlertOpen(true); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <Trash2 size={13} />
                Eliminar
              </button>
            ) : (
              <span className="flex cursor-not-allowed items-center gap-2 px-3 py-2 text-[13px] text-orion-fg-faint">
                <Trash2 size={13} />
                Eliminar
              </span>
            )}
          </div>
        )}
      </div>

      {/* AlertDialog fuera del menú para evitar problemas de z-index y propagación */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cotización?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es permanente y no se puede deshacer. Solo se pueden eliminar
              cotizaciones en borrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminar}
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending ? 'Eliminando…' : 'Sí, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

Agregar `Pencil` y `Trash2` al import de lucide-react (si no están ya):

```typescript
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Kanban,
  LayoutList,
  MoreHorizontal,
  Pencil, // ← agregar
  Plus,
  Search,
  Trash2, // ← agregar
  User,
  Users,
  X,
} from 'lucide-react';
```

### 6d — Reemplazar el botón muerto con `MenuCotizacion`

- [ ] **Step 4: Reemplazar el `<button>` muerto en la tabla**

Localizar las líneas ~413-420:

```typescript
                    <Td>
                      <button
                        type="button"
                        className="grid h-6 w-6 place-items-center rounded-md text-orion-fg-faint hover:bg-orion-bg-muted hover:text-orion-fg"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </Td>
```

Reemplazar por:

```typescript
                    <Td>
                      <MenuCotizacion
                        id={r.id}
                        estado={r.estado}
                        tenantSlug={tenantSlug}
                      />
                    </Td>
```

### 6e — Badge "✏ N" en la celda de emisión

- [ ] **Step 5: Mostrar badge de ediciones junto a la fecha**

Localizar la celda de `fechaEmision` (línea ~399):

```typescript
                    <Td className="whitespace-nowrap text-orion-fg-muted">{r.fechaEmision}</Td>
```

Reemplazar por:

```typescript
                    <Td className="whitespace-nowrap text-orion-fg-muted">
                      {r.fechaEmision}
                      {r.vecesEditado > 0 && (
                        <span
                          className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          title={`Editada ${r.vecesEditado} ${r.vecesEditado === 1 ? 'vez' : 'veces'}`}
                        >
                          <Pencil size={9} />
                          {r.vecesEditado}
                        </span>
                      )}
                    </Td>
```

- [ ] **Step 6: TypeCheck completo**

```bash
cd /Users/leonidasyauri/dev/orion-erp && npx tsc --noEmit 2>&1 | head -40
```

Esperado: sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/components/modules/cotizaciones/CotizacionesList.tsx
git commit -m "feat(cotizaciones): menu 3-puntos con Editar/Eliminar + badge veces editado"
```

---

## Task 7 — Deploy y verificación

- [ ] **Step 1: Build local**

```bash
cd /Users/leonidasyauri/dev/orion-erp && npm run build 2>&1 | tail -20
```

Esperado: `✓ Compiled successfully`.

- [ ] **Step 2: Push a orionrp-hub y deploy a producción**

```bash
gh auth switch --user orionrp-hub
git push orionrp main
vercel --prod
```

- [ ] **Step 3: Verificar en producción**

1. Ir a `orion-rp.com/idex/cotizaciones`
2. Hacer clic en los tres puntos de una cotización — debe abrirse el dropdown con Editar y Eliminar
3. En una cotización "Convertida": Editar debe aparecer gris/deshabilitado
4. En una cotización "Borrador": Eliminar debe funcionar con AlertDialog y luego desaparecer de la lista
5. Editar una cotización "Enviada" o "Aceptada": agregar un ítem → guardar → verificar que la cotización sigue con su estado original y aparece el badge `✏ 1`

- [ ] **Step 4: Commit HANDOFF**

```bash
git add docs/HANDOFF.md
git commit -m "docs: HANDOFF — menu cotizaciones desplegado"
```
