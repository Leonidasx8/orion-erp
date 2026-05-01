# Handoff — Estado de implementación Orion ERP

> **Propósito:** evitar retrabajo si la sesión se cierra. Cualquier sesión nueva debe leer este archivo PRIMERO antes de tocar código. Actualizar al terminar cada tarea significativa o al hacer commit.

**Última actualización:** 2026-05-01 14:48 GMT-5
**Branch activa:** `feat/B-07-kardex` (sale de `feat/B-06-ordenes-compra`)
**Último commit:** pendiente (B.7 backend — kardex schema, función registrar_movimiento_stock, 4 server actions, wire B.6→kardex)

---

## Reglas de oro de este proyecto

1. **Mockups Claude Design son un GATE.** Cuando Claude Design no haya aprobado el módulo en `docs/design/`, está prohibido escribir UI (components React, pages con JSX). Backend (schema, server actions, migrations, tests, integraciones) sí se puede avanzar.
2. **Español peruano.** Nunca voseo argentino ("empezá", "hacé"). Usar tú/neutro.
3. **Sonnet por default.** Avisar al usuario antes de cambiar a Opus. Opus solo para módulos complejos: B.5/B.7/B.9 (cotizaciones, kardex, SUNAT) y debugging cross-sistema.
4. **Revisar y probar antes de continuar.** Al terminar cada tarea: typecheck + tests + lint, en ese orden. No pasar a la siguiente sin verde.
5. **Una branch por módulo.** `feat/B-XX-<modulo>`. No mezclar trabajo de B.5 dentro de `feat/B-04-productos`.

---

## Roadmap general

| Módulo                                     | Estado                                      | Branch / commit            |
| ------------------------------------------ | ------------------------------------------- | -------------------------- |
| B.0 Tenants                                | ✅ Mergeado                                 | `feat/B-00-tenants` → main |
| B.1 Multi-empresa                          | ✅ Mergeado                                 | `feat/B-01-multiempresa`   |
| B.2 Auth + RBAC + MFA                      | ✅ Mergeado                                 | `feat/B-02-auth-roles`     |
| B.3 Clientes (B2B/B2C, SUNAT autocomplete) | ✅ Mergeado                                 | `feat/B-03-clientes`       |
| B.4 Productos catálogo                     | ✅ Mergeado                                 | `feat/B-04-productos`      |
| B.5 Cotizaciones                           | 🟡 Backend completo — UI gate               | `feat/B-05-cotizaciones`   |
| B.6 Órdenes de compra                      | 🟡 Backend completo — UI gate               | `feat/B-06-ordenes-compra` |
| **B.7 Kardex**                             | 🟡 **EN CURSO** — backend completo, UI gate | `feat/B-07-kardex`         |
| B.8 Guías de remisión                      | ⏸️ Pendiente (depende NUBEFACT)             | —                          |
| B.9 Facturación SUNAT/NUBEFACT             | ⏸️ Pendiente                                | —                          |
| B.10 Crédito + CxC                         | ⏸️ Pendiente                                | —                          |
| B.11 Reportes                              | ⏸️ Pendiente                                | —                          |

**Gates externos pendientes:**

- ⏸️ Mockups Claude Design (bloquea UI de B.5+; backend libre)
- ⏸️ Credenciales NUBEFACT sandbox (bloquea B.8/B.9)
- ✅ Credenciales apis.net.pe (B.3 ya las consume)
- ⏸️ `CRON_SECRET` en Vercel env (requerido para cron de vencimiento B.5)
- ⏸️ `pnpm db:migrate` (reset DB local con migraciones 0016–0022) — necesario antes de correr `tests/integration/kardex/`

---

## B.7 — Kardex (Inventario): estado detallado

Plan: `docs/plans/B-07-kardex.md`. ADR: `docs/DECISIONS/0010-kardex-costing-policy.md`.

### Tareas (10 total)

| #   | Tarea                                                    | Estado | Comentario                                                                                                                                     |
| --- | -------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | ADR política de costing                                  | ✅     | Costo promedio ponderado, stock negativo bloqueado por default, sin multi-warehouse en MVP, sin reservas.                                      |
| 1   | Schema kardex_movimientos + costos_inventario + RLS      | ✅     | Migration `0021`. Append-only. RLS solo SELECT en kardex; INSERTs van por la función SQL.                                                      |
| 2   | Vistas stock_actual + stock_critico                      | ✅     | Migration `0022`. `security_invoker = true` para respetar RLS. Adaptado al schema real (`codigo`, `nombre`, `stock_minimo`).                   |
| 3   | Función registrar_movimiento_stock con SELECT FOR UPDATE | ✅     | En migration `0021` (incluida con la tabla). Lock por producto; productos diferentes corren en paralelo.                                       |
| 4   | Server actions: ajusteManualStock, consultarKardex       | ✅     | `src/server/actions/kardex.ts`. Errores PG mapeados a mensajes de negocio.                                                                     |
| 5   | Helpers internos kardex (B.6/B.9 wire-up)                | ✅     | `src/server/actions/kardex-internal.ts`: `registrarEntradaPorOC`, `registrarSalidaPorFactura`, `registrarSalidaPorGuia`, `reversarMovimiento`. |
| 5b  | Wire B.6 `recibirParcial` → kardex                       | ✅     | `recibirParcial` ahora invoca `registrarEntradaPorOC` por cada línea con producto. Usa `precioUnitario` como costo.                            |
| 6   | UI inventario + KardexTimeline                           | ⛔     | **Bloqueado por Claude Design.**                                                                                                               |
| 7   | UI ajustes manuales                                      | ⛔     | **Bloqueado por Claude Design.**                                                                                                               |
| 8   | Tests de concurrencia (vitest integration)               | 🟡     | Escritos en `tests/integration/kardex/concurrencia.test.ts` (9 casos). Requieren `pnpm db:migrate` para correr — pendiente.                    |
| 9   | UI stock crítico                                         | ⛔     | **Bloqueado por Claude Design.**                                                                                                               |

### Decisiones técnicas no obvias

- **`tipoCambio` y `costoUnitario` se cachean en kardex_movimientos** (`saldo_post`, `costo_promedio_post`) para no recalcular acumulados al renderizar el timeline.
- **RLS de `kardex_movimientos` es SELECT-only**. INSERTs SIEMPRE deben pasar por `registrar_movimiento_stock()` (con permisos de Casbin en server action). Drizzle no se usa para INSERT directo.
- **`reversarMovimiento` no muta el original** — inserta un movimiento `'anulacion'` con tipo inverso. Mantiene auditoría inmutable.
- **`recibirParcial` salta kardex si la línea no tiene `productoId`** (líneas ad-hoc sin producto en catálogo).

### Pendientes

- Correr `pnpm db:migrate` (⚠️ borra data dev local) y luego `pnpm test:integration tests/integration/kardex/concurrencia.test.ts` para validar.
- Cuando llegue B.9 facturación: invocar `registrarSalidaPorFactura` desde el action de emisión.
- Cuando llegue B.8 guías: invocar `registrarSalidaPorGuia`.

---

## B.6 — Órdenes de compra: estado detallado

Plan: `docs/plans/B-06-ordenes-compra.md`.

### Tareas (4 total)

| #   | Tarea                                     | Estado | Comentario                                                                                                             |
| --- | ----------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | Schema OC + flag es_proveedor en clientes | ✅     | Migrations 0019/0020, Drizzle schema, Zod schema. Correlativo via `generar_numero_orden_compra()` (upsert atómico).    |
| 2   | Reuso form de B.5                         | ⛔     | **Bloqueado por Claude Design** — requiere componentes B.5 aprobados primero.                                          |
| 3   | State machine OC + Server Actions         | ✅     | 7 actions: crear, crearDesdeCotizacion, enviar, aprobar, recibirParcial, cerrar, eliminar. TODO B.7 en recibirParcial. |
| 4   | PDF template OC + listado/detalle UI      | ⛔     | **Bloqueado por Claude Design.**                                                                                       |

### Próximas tareas disponibles en B.6

- Todo lo no-UI de B.6 está hecho. Esperar Claude Design para Tasks 2 y 4.
- Cuando llegue B.7 (Kardex): completar `// TODO B.7` en `recibirParcial` (`src/server/actions/ordenes-compra.ts`).

### **Decisión:** `generar_numero_orden_compra` usa upsert en tabla `correlativos_orden_compra`

Plan original de B.5 usó `pg_advisory_xact_lock`. Para B.6 el plan ya define su propio patrón con tabla de correlativos + upsert `ON CONFLICT DO UPDATE`. Ambos son válidos; no hay razón para uniformar.

---

## B.5 — Cotizaciones: estado detallado

Plan: `docs/plans/B-05-cotizaciones.md` (en repo de setup `Downloads/orion-erp-setup`).

### Tareas (9 total)

| #   | Tarea                                       | Estado | Comentario                                                                                                                                                                                                |
| --- | ------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Schema + RLS + Drizzle                      | ✅     | `cotizaciones_versiones` añadida en `0017_cotizaciones_versiones.sql` + Drizzle schema. Tipos: `CotizacionVersion`, `TipoEventoVersion`.                                                                  |
| 2   | Correlativo `COT-YYYY-NNNNNN`               | ✅     | Implementado con `pg_advisory_xact_lock` en función `siguiente_numero_cotizacion`. **Decisión:** no usé contador en tabla como dice el plan; el lock transaccional es equivalente funcional y más simple. |
| 3   | State machine xstate                        | ❌     | Las transiciones están inline en cada server action. **Decisión:** plan pide xstate v5 explícito; pendiente decidir si refactorizar o mantener (5 estados es marginal para xstate).                       |
| 4   | Server actions CRUD                         | ✅     | 7 actions: crear, actualizar, enviar, aceptar, rechazar, duplicar, eliminar. Todas con `requirePermission()` y validación de tenant del cliente.                                                          |
| 5   | Form líneas + DnD + cmdk                    | ⛔     | **Bloqueado por Claude Design.**                                                                                                                                                                          |
| 6   | Selector margen mínimo                      | 🟡     | UI bloqueada. Validación backend ✅: migration `0018` añade `margen_minimo` a productos; `crearCotizacion`/`actualizarCotizacion` rechazan si margen% < margenMinimo.                                     |
| 7   | Template react-pdf                          | ⛔     | **Bloqueado por Claude Design** (layout visual).                                                                                                                                                          |
| 8   | Server action PDF + Supabase Storage upload | ⛔     | Depende de Task 7.                                                                                                                                                                                        |
| 9   | Conversión a OC/factura/guía                | 🟡     | UI modal bloqueada. Lógica backend depende de B.6/B.9 (downstream, no aplica aún).                                                                                                                        |

### Archivos creados en B.5 (commit `8dc0f84`)

```
supabase/migrations/0016_cotizaciones_schema.sql      (166 líneas)
src/lib/db/schema/cotizaciones.ts                     (99)   - cotizaciones + cotizacionItems + tipos
src/lib/db/schema/index.ts                            (mod)  - re-export
src/lib/cotizaciones/calculo.ts                       (95)   - puro, IGV 18% Perú
src/lib/cotizaciones/calculo.test.ts                  (134)  - 10 tests vitest pasando
src/lib/schemas/cotizacion.ts                         (43)   - Zod multi-currency PEN/USD
src/server/actions/cotizaciones.ts                    (365)  - 7 server actions
```

### Archivos UI revertidos (commit `01e3def` → revert `a068a87`)

Se crearon `CotizacionForm`, `CotizacionesList`, `CotizacionAcciones` + 4 pages, pero se revirtieron porque **Claude Design no había aprobado**. El commit `01e3def` está en reflog si se necesita rescatar parcialmente, pero **NO usar como base** — debe rehacerse contra los mockups aprobados.

### Próximas tareas backend disponibles (sin esperar Claude Design)

1. ✅ ~~Cerrar Task 1~~ — `0017_cotizaciones_versiones.sql` + Drizzle schema creados.
2. ✅ ~~Server action de snapshot~~ — `capturarVersion()` en `src/lib/cotizaciones/versiones.ts`. Wired en `enviarCotizacion` (tipo `envio`, dentro de transacción). Pendiente: llamar con tipo `pre_edicion` cuando se permita edición post-envío, y tipo `pdf_generado` desde B.5 Task 8.
3. ✅ ~~Validación margen mínimo~~ — migration `0018`, Drizzle schema actualizado, `validarMargenMinimo()` interno en actions. Usa `costoUnitario` directo (plan referenciaba tabla `preciosProducto` que no existe en nuestra implementación).
4. **(Opcional) Refactor xstate:** evaluar si vale la pena. La implementación inline funciona; xstate solo añade ceremonia para 5 estados.
5. ✅ ~~Cron de vencimiento~~ — `GET /api/cron/cotizaciones-vencer` + `vercel.json` (cron diario 06:00 UTC). Requiere `CRON_SECRET` en env de Vercel.

---

## Estructura del repo (referencia rápida)

- `src/app/(app)/[companySlug]/...` — rutas tenant-scoped
- `src/components/modules/<modulo>/` — componentes específicos del módulo
- `src/components/ui/` — shadcn primitives (badge, button, card, dialog, input, label, select, separator, tabs, textarea, alert, alert-dialog, checkbox, form)
- `src/lib/db/schema/` — Drizzle schemas con `index.ts` re-exportando
- `src/lib/schemas/` — Zod schemas de validación
- `src/lib/auth/` — `getCurrentTenant`, `requirePermission`, `userHasPermission`
- `src/server/actions/` — server actions agrupadas por módulo
- `supabase/migrations/0001…0016` — secuenciales (falta `0011`, no usar)

## Convenciones aprendidas leyendo B.0–B.4

- Server actions retornan `ActionResult<T> = { success: true; data: T } | { success: false; error: string }`.
- Toast: `sonner` (`toast.success`/`toast.error`).
- Form: `react-hook-form` + `@hookform/resolvers/zod` con `Resolver<T>` cast.
- Páginas server component cargan permission check + data en `Promise.all`.
- Permisos en formato `<modulo>.<accion>` registrados en `permisos_definidos`.

---

## Protocolo de actualización

Cuando termines una tarea o un commit significativo, actualiza este archivo así:

1. Cambia "Última actualización" arriba.
2. Mueve filas de la tabla de B.X según corresponda.
3. Si descubres una decisión técnica no obvia, anótala con `**Decisión:**` y la razón.
4. Si encuentras un bloqueador nuevo, añádelo a "Gates externos pendientes".
5. Comitéa el HANDOFF con el cambio funcional, no en un commit aparte (`docs(handoff): …` solo si es ajuste solo del archivo).

## Bitácora cronológica

### 2026-04-30

- 20:00 — Sesión retomada. Memoria indicaba B.5 a medio camino; código real estaba en `dev/orion-erp` (no en repo de setup). Branch `feat/B-04-productos` con archivos de B.5 sin commit.
- 20:05 — Branch `feat/B-05-cotizaciones` creada llevando archivos sin commit. Typecheck verde, 10/10 tests pasan, lint sin warnings en B.5.
- 20:08 — Commit `8dc0f84` — backend B.5 (schema, cálculo, actions).
- 20:25 — **Error:** se commiteó UI B.5 (`01e3def`) sin esperar aprobación Claude Design.
- 20:35 — Revert `a068a87`. UI eliminada del working tree.
- 20:40 — Creado este archivo HANDOFF.md.
- 20:30 — **Task 1 completada:** migration `0017_cotizaciones_versiones.sql` + Drizzle schema `cotizacionesVersiones` + tipos. Commit `a6bab0e`.
- 21:58 — **Task 2 completada:** `capturarVersion()` helper en `src/lib/cotizaciones/versiones.ts`. `enviarCotizacion` envuelto en transacción con snapshot tipo `envio`. Commit `90433c8`.
- 2026-05-01 13:35 — **Task 3 completada (margen backend):** migration `0018_productos_margen_minimo.sql`, `margenMinimo` en Drizzle schema productos, `validarMargenMinimo()` en cotizaciones actions. Commit `9a189a2`.
- 2026-05-01 14:23 — **Task 5 completada (cron vencimiento):** `src/app/api/cron/cotizaciones-vencer/route.ts` + `vercel.json`. Cron diario 06:00 UTC. Commit `35724a7`.
- 2026-05-01 14:33 — **B.6 Tasks 1+3:** migrations 0019/0020, Drizzle + Zod OC, 7 server actions. Commit `22fb83a` en `feat/B-06-ordenes-compra`.
- 2026-05-01 14:48 — **B.7 backend:** ADR 0010, migrations 0021/0022, Drizzle kardex, 4 server actions + 4 helpers internos, wire B.6→kardex en `recibirParcial`. Branch `feat/B-07-kardex` desde B.6. Tests integration escritos pero requieren `pnpm db:migrate`. Cambio a Opus 4.7.

### 2026-04-29

- B.4 Productos commiteado en `0702865`.
- B.5 iniciado: schema, cálculo, server actions (los archivos quedaron sin commit cuando se cerró la terminal).
