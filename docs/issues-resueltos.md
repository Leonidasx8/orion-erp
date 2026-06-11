# Issues resueltos durante la entrega formal

### FIX-01 — Páginas con permiso denegado mostraban "Application error" en vez de redirigir

- **Issue original:** descubierto durante la grabación del video del perfil Comercial (Fase 2B de la entrega): al hacer click en "Facturas" del menú (visible para todos los roles), el usuario Comercial veía `Application error: a server-side exception has occurred` — un error 500 crudo.
- **Causa:** 9 páginas usaban `requirePermission()` (lanza `PermissionError` → error boundary de Next) en lugar de `requirePermissionPage()` (redirige al dashboard del tenant), que era el patrón ya usado por `credito/page.tsx`.
- **Archivos modificados:**
  - `src/app/(app)/[companySlug]/facturas/page.tsx` (+ firma: ahora recibe `params`)
  - `src/app/(app)/[companySlug]/facturas/[id]/page.tsx`
  - `src/app/(app)/[companySlug]/guias/page.tsx`
  - `src/app/(app)/[companySlug]/guias/[id]/page.tsx`
  - `src/app/(app)/[companySlug]/guias/nueva/page.tsx`
  - `src/app/(app)/[companySlug]/inventario/[productoId]/page.tsx` (+ destructure `companySlug`)
  - `src/app/(app)/[companySlug]/inventario/[productoId]/ajuste/page.tsx`
  - `src/app/(app)/[companySlug]/credito/pagos/nuevo/page.tsx`
  - `src/app/(app)/[companySlug]/credito/clientes/[id]/page.tsx`
- **Cambio realizado:** `await requirePermission('x.y')` → `await requirePermissionPage('x.y', companySlug)` en las 9 páginas, con ajuste de imports y de firmas donde faltaba `companySlug`.
- **Comportamiento antes:** Comercial → click "Facturas" → error 500 en pantalla.
- **Comportamiento después:** Comercial → click "Facturas" → redirección limpia al dashboard del tenant.
- **No tocado (consciente):** `src/app/(app)/[companySlug]/page.tsx` (dashboard) usa `requirePermission('reportes.ver')`; cambiarlo a la variante con redirect crearía un bucle (redirige a sí mismo). Los 3 roles actuales tienen `reportes.ver`. Mejora elegante (estado vacío) → roadmap v2.
- **Pendiente relacionado (BAJO):** el sidebar muestra todos los módulos a todos los roles; con este fix el click redirige limpio, pero ocultar/atenuar ítems sin permiso queda como mejora de UX → roadmap v2.
- **Verificación:** `npx tsc --noEmit` limpio; flujo re-grabado con Playwright tras el deploy (video del perfil Comercial muestra la redirección en vivo).
- **Commit:** fix: páginas con permiso denegado redirigen al dashboard en vez de error 500
