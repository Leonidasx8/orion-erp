# Handoff — Estado de implementación Orion ERP

> **Propósito:** evitar retrabajo si la sesión se cierra. Cualquier sesión nueva debe leer este archivo PRIMERO antes de tocar código. Actualizar al terminar cada tarea significativa o al hacer commit.

**Última actualización:** 2026-05-18 GMT-5 (noche)
**Branch activa:** `feat/B-09-sunat-nubefact`
**Estado verificado:** TypeCheck limpio. Commits `275f589` + `764a3cc` — seed CELSA + M1 bulk price update.

---

### Sesión 2026-05-18 — 6 mejoras post-demo Lucas (commit `b1bb28d`)

Formulario de Lucas recibido y analizado. Respuestas clave:

- **P1 (precios):** margen sobre P.AAA (precio de compra), no sobre el sugerido de CELSA. Variable por cliente.
- **P2 (variantes):** selector al cotizar (opción b/c — scope addendum).
- **P3 (multi-proveedor OC):** generar 1 OC por proveedor automáticamente.
- **P4 (aprobación):** Opción A — Comercial crea → pendiente → Lucas aprueba → se envía.
- **P5 (guías):** IDEX siempre emite.
- **P6 (facturación):** IDEX siempre factura al cliente final.
- **P7 (crédito):** Idex financia, no da más días que los que recibe de CELSA (60d → 30-45d cliente).
- **Demo miércoles:** recorrido completo del sistema.

**Implementado (commit `b1bb28d`, 21 archivos, typecheck ✅):**

| Mejora                   | Archivos clave                                                                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| M3 (solicitante)         | Ya conectado desde sesión anterior — `creadoPorNombre` → columna "Comercial"                                                            |
| M7 (renombrar OC)        | `TenantSidebar`, `OrdenesList`, páginas ordenes, previews, `KardexDetalle`                                                              |
| M5 (ajuste desde lista)  | `InventarioList.tsx` — icono `SlidersHorizontal` por fila → `/inventario/:id/ajuste`                                                    |
| M6 (proveedor principal) | `0035_productos_proveedor_principal.sql`, `productos.ts` schema, `ProductoForm`, páginas nuevo/editar                                   |
| M4 (pipeline cot→OC)     | `generarOCsDesdeCotizacion()` en `cotizaciones.ts`, botón en `CotizacionActions` (visible en estado `aceptada`)                         |
| M2 (historial precios)   | `0036_historial_precios.sql`, `historialPrecios` Drizzle, tracking en `actualizarProducto`, tabla en tab "Precios" de `ProductoDetalle` |

**⚠️ Migrations pendientes de aplicar en DB local/remota:**

- `0035_productos_proveedor_principal.sql`
- `0036_historial_precios.sql`
- Docker no estaba corriendo en esta sesión → no se aplicaron aún.

### Sesión 2026-05-18 noche — Seed CELSA + M1 bulk price update

**Seed script (`scripts/seed-demo.ts`):**

- CELSA SAC es proveedor principal de todos los productos CB-\* (cables)
- `seedClientes` corre antes que `seedProductos`; `celsaId` se extrae y pasa como tercer arg
- `seedProductos(tenantId, cats, celsaId)` — firma actualizada, insert incluye `proveedorPrincipalId`

**M1 — Actualización masiva de precios (Bucket B addendum):** ✅ IMPLEMENTADO

- Nuevo server action `actualizarPreciosMasivo` en `src/server/actions/productos.ts`
  - Valida con Zod; loop por producto; guarda historial en `historial_precios`; revalida path
- Componente cliente `src/components/modules/productos/ActualizarPreciosForm.tsx`
  - Filtros: familia + proveedor principal
  - Modo: % incremento o precio fijo; campo: precio venta o costo
  - Preview en vivo (viejo → nuevo, % diferencia coloreado)
  - Razón obligatoria (mín. 3 chars); toast de resultado; redirect a /productos
- Página server `src/app/(app)/[companySlug]/productos/actualizar-precios/page.tsx`
  - Requiere permiso `productos.editar`; pasa productos + categorías + proveedores al form
- Botón "Actualizar precios" (TrendingUp) en header de `ProductosList`

**Addendum Bucket B pendiente de cotizar (US$ 380-420):**

- M1: ✅ entregado
- Variantes en catálogo (Lucas eligió selector al cotizar — requiere diseño + schema nuevo)

**Reunión miércoles 20-may con Lucas:** recorrido completo del sistema. Agenda sugerida pendiente.

---

### Sesión 2026-05-15 — Módulo Facturas UI + cron (B.9 completado)

**Commit `3c61d66`** — módulo UI facturación completo:

- `src/lib/schemas/factura.ts` — zod schema `crearFacturaSchema` + `calcularLinea` + `calcularTotalesFactura`
- `src/lib/sunat/reservar-correlativo.ts` — wrapper TS sobre función SQL atómica `reservar_correlativo()`
- `src/server/actions/facturas.ts` — `crearFactura`, `anularFactura`, `convertirCotizacionAFactura`
- `src/components/modules/facturas/FacturasList.tsx` — tabla + filtros por estadoSunat + paginación
- `src/components/modules/facturas/FacturaDetalle.tsx` — ítems, box SUNAT (CDR/XML/PDF), sidebar pago
- `src/app/(app)/[companySlug]/facturas/page.tsx` — list page con query Drizzle
- `src/app/(app)/[companySlug]/facturas/[id]/page.tsx` — detail page
- `src/components/shared/TenantSidebar.tsx` — link Facturas habilitado (era `disabled: true`)
- `supabase/migrations/0032_sunat_cron.sql` — pg_cron job para worker SUNAT (cada 60s)

**Credenciales reales** de Lucas (del `nubefact.docx`) — ya en `.env.local`:

- `NUBEFACT_RUTA_IDEX=faf60424-16c9-4080-85fc-70602001e43a`
- `NUBEFACT_TOKEN_IDEX=b363c3bb...870`
- Agroalves: pendiente (Lucas aún no tiene cuenta)

**Implementado en sesión anterior (commit c55350f):**

- `src/lib/sunat/client.ts` — `NubefactHttpClient` real. Timeout 30s, idempotency 2105.
- `src/lib/sunat/builders/factura.ts` — factura (01) y boleta (03)
- `src/lib/sunat/builders/nota-credito-debito.ts` — NC (07) y ND (08)
- `src/lib/sunat/builders/guia.ts` — guías de remisión (09/31)
- `src/lib/sunat/helpers/numero-a-letras.ts` — monto a texto español
- `src/app/api/sunat/procesar-cola/route.ts` — worker POST que consume pgmq

**Pendiente para completar B.9:**

1. Probar emisión de factura contra la API real de Nubefact (verificar si es sandbox o producción)
2. Aplicar migration 0032 en Supabase y configurar `app.settings.sunat_worker_url` + `app.settings.sunat_worker_secret`
3. Manejar destinatario en guías (actualmente se pone vacío)

---

### Sesión 2026-05-14 — Demo #1 con Lucas + cuestionario de mejoras

**Contexto:** primera demo en vivo con Lucas Escrivá Di Romaní (Idex). De la conversación salieron mejoras que no estaban detalladas en el contrato. Estrategia decidida: Camino C híbrido (ver `~/.claude/projects/.../memory/project_addendum_precios_idex.md`).

**Mejoras levantadas (7 en total):**

1. Actualización masiva de precios con filtros (categoría/proveedor) → 🟡 addendum
2. Historial de precios por producto (autor, fecha, valor anterior/nuevo, razón) → 🟡 addendum
3. Campo "Solicitante" en cotizaciones y compras a proveedor → ✅ sin costo (cambio mínimo)
4. Pipeline cotización aprobada → Comercial genera Compra al Proveedor → Lucas aprueba → factura de compra archivada → 🟢 consecuencia lógica del contrato
5. Acciones funcionales en módulo Inventario (botón Ajuste manual visible desde lista) → 🟢 consecuencia lógica
6. Producto con `proveedor_principal_id` → 🟢 consecuencia lógica
7. Renombrar "Órdenes de Compra" → "Compras a Proveedores" (UI label) → ✅ sin costo

**Acción tomada:** se envió a Lucas un Google Doc con 7 preguntas para terminar el análisis técnico antes de la reunión del miércoles 20-may. Deadline: lunes 18-may al mediodía.

- Cuestionario: https://docs.google.com/document/d/1NZXEEiDNYm7afTsqSmugl1t6Y4LjB-nwc0m8C3Nc8PU/edit
- Correo (en Drive listo para copiar): https://docs.google.com/document/d/1BAOl78sjYD3Rb6z8zh2Ob48oqNN-hevAQ8AVMVQvXPY/edit
- Estrategia/pricing del addendum en memoria: `project_addendum_precios_idex.md`

**Insights operativos clave descubiertos:**

- Idex es greenfield (empresa nueva, 100% manual). Orion DEFINE su SOP, no lo digitaliza.
- Idex opera físicamente desde almacén de CELSA (Alexander Fleming 454 = dirección del proveedor). Modelo de facto: dropshipping / cuasi-distribuidor.
- CELSA da precio sugerido con ~14% margen ya incluido (475 productos). Lucas confirmó margen mínimo 5% por producto en Kickoff.
- Contacto secundario Andrea Alvarez está en SegElectrica — sugiere que SegEléctrica es el proveedor real (no CELSA directo).
- Solo Lucas como usuario operativo. Sin base de clientes. Multiusuario va después.
- Lucas no sabe qué es NUBEFACT (textualmente "ME LO PODÉIS HACER, NO SE QUE ES ESO"). Acción: crearle la cuenta o tutorial.
- Catálogo terminales tiene variantes (calibre × diámetro) — decisión pendiente Lucas (opción c sería addendum, B.4 dice "SKU único por producto").

**Decisiones del Kickoff (29-abr-2026) ya tomadas — NO volver a consultar:**

- Costo: promedio ponderado
- Vender sin stock: SÍ con warning (no bloquear)
- Almacenes: uno solo
- Crédito default: 0 días contado
- TC USD→PEN: fecha de emisión + mostrar AMBOS montos (USD + PEN equivalente con TC un poco más alto que BCR)
- Validez cotización: 7 días
- Sin descuentos comerciales
- Comercial ve solo sus propias ventas
- Capacitación: remota Google Meet con grabaciones
- Productos exonerados IGV: fertilizantes Agroalves

**Pendiente del addendum cotizable (Bucket B, ~US$ 380-420):**

- Módulo actualización masiva de precios con filtros + preview + razón obligatoria
- Tabla `historial_precios` dedicada con razón/tag/batch_id
- Variantes formales en catálogo (si Lucas elige opción c en Q2 del cuestionario)

**Próximos pasos cuando vuelva la sesión:**

1. Recibir respuestas de Lucas al cuestionario (deadline lunes 18-may)
2. Hacer análisis técnico de cada decisión vs scope contratado
3. Clasificar las 7 mejoras en categorías (✅ contrato / 🟢 lógica asumida / 🟡 addendum / 🔵 v2)
4. Cotizar el Bucket B con números concretos
5. Presentar todo en reunión miércoles 20-may
6. Tras aprobación: escribir spec en `docs/superpowers/specs/` y plan de implementación
7. Rama propuesta: `feat/precios-masivos-addendum` (post-demo, si Lucas aprueba addendum)

⚠️ Inconsistencia pendiente de aclarar: apellido de Lucas — el contrato y el formulario firmado dicen "de Romaní" (con "de"); el usuario indicó verbalmente "Di Romaní" (italiano). Usar "Di Romaní" en comunicaciones nuevas según indicación del usuario, confirmar en reunión.

---

### Fixes sesión madrugada 2026-05-13

1. **Importar productos: botón "Confirmar import" no respondía + sin forma de editar filas con errores**: `ProductosImportar.tsx` era mockup estático con `MOCK_ROWS` hardcodeados y `disabled={hasErrors}` siempre activo por los 3 errores fijos. La promesa del alert ("edita las filas inline antes de continuar") nunca se implementó. Fix:
   - `PreviewRow.precioCompra`/`precioVenta` ahora son `number` (no string), con helper `formatSoles()`.
   - Nueva función `validateRows()` que recomputa `status`/`message` con reglas reales (SKU vacío/duplicado, precio compra ≤ 0, familia vacía, margen < 20%).
   - `rows` se levanta a `useState` en el padre y se pasa a `Step2`.
   - Columna acciones con icono pencil → modo edición con inputs por celda + botones guardar/cancelar; al guardar se revalida toda la tabla y los contadores del header se actualizan.
   - Botón `Confirmar import` se habilita cuando `errorCount === 0` y nadie está editando.
   - Sigue siendo mock (no parsea el .xlsx real). El parseo de Excel + persistencia Supabase queda pendiente para una iteración futura.
   - Archivo: `src/components/modules/productos/ProductosImportar.tsx`.

### Fixes sesión tarde 2026-05-12 (verificación botones pre-demo)

1. **PDF cotización fallaba (500 font error)**: `CotizacionPDF.tsx` usaba `fontFamily: 'Inter'` sin registrar la fuente. Fix: cambiar a `fontFamily: 'Helvetica'` (built-in `@react-pdf/renderer`). Archivos: `src/lib/pdf/CotizacionPDF.tsx` (creado), `src/app/api/[companySlug]/cotizaciones/[id]/pdf/route.ts` (creado).

2. **Acciones cotización (Enviar/Aprobar/Rechazar/Duplicar) sin handler**: Los botones eran `<DetalleBtn>` sin onClick. Fix: nuevo `CotizacionActions.tsx` (client component) con todos los handlers. El layout de CotizacionDetalle se refactorizó para rendericiarlos. Archivos: `src/components/modules/cotizaciones/CotizacionActions.tsx` (creado), `CotizacionDetalle.tsx` (modificado).

3. **Middleware no inyectaba x-tenant-id en rutas API**: El slug extraction usaba `segments[0]` para `/api/[companySlug]/...`, obteniendo `'api'` en lugar del slug real. Fix: `segments[0] === 'api' ? segments[1] : segments[0]`. Archivo: `src/middleware.ts`.

4. **Schema cotización bloqueaba PEN sin tipo de cambio**: `z.coerce.number().positive()` convertía `""` a `0` fallando `.positive()`. Fix: `z.preprocess((v) => v === '' || v == null ? undefined : v, ...)`. Archivo: `src/lib/schemas/cotizacion.ts`.

5. **DocAutocomplete bloqueaba crear cliente sin SUNAT**: El número de documento solo se propagaba a react-hook-form si el lookup SUNAT tenía éxito. Fix: nuevo prop `onNumeroChange` que actualiza el campo en cada keystroke. Archivos: `src/components/modules/clientes/DocAutocomplete.tsx`, `ClienteForm.tsx`.

6. **Nueva orden fallaba con duplicate key en OC-2026-00001**: `correlativos_orden_compra` tabla no inicializada en seed. Fix: upsert al final de `seedOrdenesCompra()` + fix directo en DB local. Archivo: `scripts/seed-demo.ts`.

### Placeholders documentados (no son bugs)

- "Exportar kardex" — botón visual sin handler (download pendiente)
- "Exportar" en lista cotizaciones y órdenes — botón visual sin handler
- Filtros Mes/Trimestre/Año en Dashboard — estáticos, sin lógica de filtrado

### Fixes críticos de sesión mañana 2026-05-12

1. **casbin-pg-adapter race condition**: El adapter v1.4.0 usa tabla `casbin` con schema `(id serial, ptype text, rule jsonb)`, distinto a la migración 0009 que creaba `casbin_rule` con columnas v0-v5. Fix: migración `0028_casbin_jsonb.sql` crea la tabla correcta; `migrate: false` en `PostgresAdapter.newAdapter()` evita que el adapter intente recrearla. Ver `supabase/migrations/0028_casbin_jsonb.sql` y `src/lib/auth/casbin/index.ts`.

2. **Inventario sin datos**: La vista `stock_actual` lee de `costos_inventario`, que solo se llena vía `registrar_movimiento_stock()`. El seed insertaba `stockActual` en `productos` pero nunca llamaba la función PG. Fix: `seedKardex()` en `scripts/seed-demo.ts` llama `registrar_movimiento_stock()` con `tipo='entrada'` por cada producto (tipo='ajuste_pos' no actualiza el costo promedio).

3. **Login magic link en Playwright**: El flujo PKCE falla en callback SSR porque el code_verifier está en localStorage (browser) pero `exchangeCodeForSession` en Route Handler busca en cookies. Para testing local: usar `supabase auth admin generate_link` (non-PKCE) + `supabase.auth.setSession()` desde el browser JS. **No afecta a usuarios reales** — el flujo de magic link desde el propio browser (sin Playwright) funciona correctamente.

### Estado del seed demo

```
URL:     http://localhost:3000/idex
Login:   lucas@orion.demo / orion-demo-2026
         (magic link → Inbucket en http://127.0.0.1:54324)

Datos:   18 productos eléctricos (USD 232,604 inventario)
         10 clientes (8 clientes + 2 proveedores)
         9 cotizaciones (todos los estados)
         7 órdenes de compra (todos los estados + recepción)
         18 movimientos kardex iniciales
```

---

## Reglas de oro de este proyecto

1. **Sistema de Diseño V1 Slate aprobado el 2026-05-05.** Bundle integrado en `docs/design/` con `APPROVED.md` global. UI nueva sigue tokens en `globals.css` + `tailwind.config.ts` y los `.jsx` de referencia por módulo en `docs/design/<modulo>/`. Submódulos faltantes (B.6 órdenes compra, equipo-actividad, B.11 reportes) se derivan del módulo más cercano siguiendo los patrones del DS. Para pantallas no triviales (KardexTimeline, builder cotizaciones, PDFs) se muestra screenshot/diff antes de commitear (modo "ii"). El gate antiguo "un APPROVED.md por módulo" queda **derogado**.
2. **Español peruano.** Nunca voseo argentino ("empezá", "hacé"). Usar tú/neutro.
3. **Sonnet por default.** Avisar al usuario antes de cambiar a Opus. Opus solo para módulos complejos: B.5/B.7/B.9 (cotizaciones, kardex, SUNAT) y debugging cross-sistema.
4. **Revisar y probar antes de continuar.** Al terminar cada tarea: typecheck + tests + lint, en ese orden. No pasar a la siguiente sin verde.
5. **Una branch por módulo.** `feat/B-XX-<modulo>` o `feat/<feature>` para cross-cutting. No mezclar trabajo de B.5 dentro de `feat/B-04-productos`.

---

## Roadmap general

| Módulo                                     | Estado                                                | Branch / commit            |
| ------------------------------------------ | ----------------------------------------------------- | -------------------------- |
| B.0 Tenants                                | ✅ Mergeado                                           | `feat/B-00-tenants` → main |
| B.1 Multi-empresa                          | ✅ Mergeado                                           | `feat/B-01-multiempresa`   |
| B.2 Auth + RBAC + MFA                      | ✅ Mergeado                                           | `feat/B-02-auth-roles`     |
| B.3 Clientes (B2B/B2C, SUNAT autocomplete) | ✅ Mergeado                                           | `feat/B-03-clientes`       |
| B.4 Productos catálogo                     | ✅ Mergeado                                           | `feat/B-04-productos`      |
| B.5 Cotizaciones                           | 🟡 Backend completo — UI gate                         | `feat/B-05-cotizaciones`   |
| B.6 Órdenes de compra                      | 🟡 Backend completo — UI gate                         | `feat/B-06-ordenes-compra` |
| B.7 Kardex                                 | ✅ UI completa                                        | `feat/B-07-kardex-ui`      |
| **B.8 Guías de remisión**                  | 🟡 **EN CURSO** — infra lista, builders gate NUBEFACT | `feat/B-08-sunat-infra`    |
| **B.9 Facturación SUNAT**                  | 🟡 **EN CURSO** — infra compartida con B.8            | `feat/B-08-sunat-infra`    |
| B.10 Crédito + CxC                         | ⏸️ Pendiente                                          | —                          |
| B.11 Reportes                              | ⏸️ Pendiente                                          | —                          |

**Gates externos pendientes:**

- ⏸️ Mockups Claude Design (bloquea UI de B.5+; backend libre)
- ⏸️ Credenciales NUBEFACT sandbox (bloquea B.8/B.9)
- ✅ Credenciales apis.net.pe (B.3 ya las consume)
- ⏸️ `CRON_SECRET` en Vercel env (requerido para cron de vencimiento B.5)
- ⏸️ `pnpm db:migrate` (reset DB local con migraciones 0016–0027) — necesario antes de correr `tests/integration/kardex/` y validar el schema SUNAT
- ⏸️ Credenciales NUBEFACT sandbox + `NUBEFACT_BASE_URL`, `NUBEFACT_TOKEN`, `NUBEFACT_WEBHOOK_SECRET` en env — desbloquea builders SUNAT y emisión real (B.8/B.9)

---

## B.8/B.9 — SUNAT Infra (Guías + Facturación): estado detallado

Planes: `docs/plans/B-08-guias.md`, `docs/plans/B-09-facturacion-sunat.md`.

### Lo que está hecho (sin NUBEFACT credentials, opción C)

| Componente                                                                           | Estado | Comentario                                                                                                                                                |
| ------------------------------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migrations 0023–0027                                                                 | ✅     | `reservar_correlativo()`, schemas guías/facturas/NC-ND, cola pgmq, log de envíos. Permisos definidos.                                                     |
| `series_documentos` función `reservar_correlativo()`                                 | ✅     | UPDATE atómico ... RETURNING, lanza `serie_no_encontrada` si no existe.                                                                                   |
| Drizzle schemas                                                                      | ✅     | `guias`, `facturas`, `notas-credito-debito`, `sunat-envios-log`.                                                                                          |
| Catálogos SUNAT tipados                                                              | ✅     | `src/lib/sunat/catalogos.ts`: tipo doc, IGV, motivos NC/ND/traslado.                                                                                      |
| `SunatError`, `NubefactNetworkError`, `IdempotencySkipError`, `SunatValidationError` | ✅     | + función `esTransitorio()` para distinguir errores reintentables. 12 tests unit verde.                                                                   |
| Tipos de payload NUBEFACT                                                            | ✅     | `src/lib/sunat/types.ts`: factura, guía, NC/ND. Validar contra docs reales cuando llegue sandbox.                                                         |
| Cola pgmq `sunat_outbox` + helpers                                                   | ✅     | `encolarEnvioSunat`, `reencolarConBackoff` (30s, 2min, 10min, 1h, 6h). Idempotencia por `(documentoTipo, documentoId)`.                                   |
| Wrapper interface `SunatClient` (stub)                                               | ✅     | Sin credenciales lanza `SunatValidationError('credenciales_no_configuradas')`. Listo para implementación post-sandbox.                                    |
| Webhook handler `/api/webhooks/nubefact`                                             | ✅     | POST con `Authorization: Bearer NUBEFACT_WEBHOOK_SECRET`. Actualiza `estado_sunat`, URLs CDR/XML/PDF en facturas/guías/NC-ND según `tipo_de_comprobante`. |

### Lo que falta hasta tener NUBEFACT credentials

- **Builders XML/JSON** (`src/lib/sunat/builders/`): convertir entidades Drizzle a `FacturaPayload`/`GuiaRemisionPayload`/etc. Crítico: SUNAT estricto con namespaces/firma/encoding. Sin sandbox no se valida.
- **Implementación HTTP** del wrapper: reemplazar `SunatClientStub` con cliente real que llama a `https://api.nubefact.com/api/v1/<token>` y mapea errores.
- **Edge function consumer** de la cola `sunat_outbox`: drena cada 30s, llama al wrapper, registra en `sunat_envios_log`, marca documento como `aceptada`/`rechazada`/`error_red`.
- **Server actions de emitir**: `crearFactura`, `emitirFactura` (encola), `anularFactura` (crea NC). Lo mismo para guías.
- **Detección automática Factura vs Boleta** según RUC/DNI del cliente.
- **Anulación vía NC** con catálogo 09 motivos.
- **B.9 prorrateo de descuento global** en líneas (SUNAT requirement).
- **Tests E2E** contra sandbox NUBEFACT.
- **UI** de emisión, listados, anulaciones (gateada también por Claude Design).

### Decisiones técnicas

- **Outbox + pgmq** en lugar de invocación síncrona: separa la transacción de "guardar documento" del "llamar a NUBEFACT" → respuesta UI rápida + reintentos sin bloquear.
- **Snapshot del cliente en factura/NC** (`cliente_*_snapshot`): si el cliente cambia razón social/dirección después, el documento histórico no muta.
- **Estado interno vs SUNAT separados**: `estado` (borrador/lista_para_emitir/emitida/anulada) refleja workflow del usuario; `estado_sunat` (sin_enviar/pendiente/aceptada/rechazada/error_red) refleja la realidad SUNAT. Permite UX clara durante el async.
- **`emitirFactura()` falla limpio sin credenciales**: `SunatValidationError('credenciales_no_configuradas')`. Cualquier código que dependa lo nota inmediatamente; no hay calls fantasma.

---

## B.7 — Kardex (Inventario): estado detallado

Plan: `docs/plans/B-07-kardex.md`. ADR: `docs/DECISIONS/0010-kardex-costing-policy.md`.

### Tareas (10 total)

| #   | Tarea                                                    | Estado | Comentario                                                                                                                                                                                                                 |
| --- | -------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | ADR política de costing                                  | ✅     | Costo promedio ponderado, stock negativo bloqueado por default, sin multi-warehouse en MVP, sin reservas.                                                                                                                  |
| 1   | Schema kardex_movimientos + costos_inventario + RLS      | ✅     | Migration `0021`. Append-only. RLS solo SELECT en kardex; INSERTs van por la función SQL.                                                                                                                                  |
| 2   | Vistas stock_actual + stock_critico                      | ✅     | Migration `0022`. `security_invoker = true` para respetar RLS. Adaptado al schema real (`codigo`, `nombre`, `stock_minimo`).                                                                                               |
| 3   | Función registrar_movimiento_stock con SELECT FOR UPDATE | ✅     | En migration `0021` (incluida con la tabla). Lock por producto; productos diferentes corren en paralelo.                                                                                                                   |
| 4   | Server actions: ajusteManualStock, consultarKardex       | ✅     | `src/server/actions/kardex.ts`. Errores PG mapeados a mensajes de negocio.                                                                                                                                                 |
| 5   | Helpers internos kardex (B.6/B.9 wire-up)                | ✅     | `src/server/actions/kardex-internal.ts`: `registrarEntradaPorOC`, `registrarSalidaPorFactura`, `registrarSalidaPorGuia`, `reversarMovimiento`.                                                                             |
| 5b  | Wire B.6 `recibirParcial` → kardex                       | ✅     | `recibirParcial` ahora invoca `registrarEntradaPorOC` por cada línea con producto. Usa `precioUnitario` como costo.                                                                                                        |
| 6   | UI inventario + KardexTimeline                           | ✅     | `InventarioList` + `KardexDetalle`. Lista con chip filters (todos/sin_stock/critico/normal), alerta stock crítico, KPI strip 5 cols, tabla movimientos con colores entrada/salida/ajuste. Commit en `feat/B-07-kardex-ui`. |
| 7   | UI ajustes manuales                                      | ✅     | `AjusteManualForm`: alerta roja acción crítica, form tipo+cantidad+motivo, preview reactivo antes/después de stock y valor, audit trail preview.                                                                           |
| 8   | Tests de concurrencia (vitest integration)               | 🟡     | Escritos en `tests/integration/kardex/concurrencia.test.ts` (9 casos). Requieren `pnpm db:migrate` para correr — pendiente.                                                                                                |
| 9   | UI stock crítico                                         | ✅     | Integrado en `InventarioList` (chip filter + alerta banner) y `KardexDetalle` (alerta + KPI en warn-fg).                                                                                                                   |

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
- 2026-05-01 14:48 — **B.7 backend:** ADR 0010, migrations 0021/0022, Drizzle kardex, 4 server actions + 4 helpers internos, wire B.6→kardex en `recibirParcial`. Commit `90471a8`. Tests integration escritos pero requieren `pnpm db:migrate`. Cambio a Opus 4.7.
- 2026-05-01 16:40 — **Refactor + tests unit:** extraída lógica pura `calcularTotalesOrden` (B.6) → `src/lib/ordenes/calculo.ts` con 7 tests; `validarMargenItem` (B.5) → `src/lib/cotizaciones/margen.ts` con 11 tests. Commit `b225ab0`.
- 2026-05-02 20:10 — **B.8/B.9 infra (opción C):** 5 migrations (0023–0027), Drizzle de guías/facturas/NC-ND, lib SUNAT (catálogos/errors/types/queue/client stub), webhook handler `/api/webhooks/nubefact`. 12 tests SUNAT verde, total 40 tests. Branch `feat/B-08-sunat-infra` desde B.7. Commit `914db79`.

### 2026-05-04

- 15:42 — Verificación de estado: typecheck verde, 40/40 unit tests verde en `feat/B-08-sunat-infra`. Pending: integration tests kardex/SUNAT (requieren `pnpm db:migrate`, destructivo). Diseños Claude Design recibidos pero pendiente integrar bundle a `docs/design/` antes de UI.

### 2026-05-06

- 11:00 — **Fase 0 Sistema de Diseño V1.** Bundle Claude Design (V1 Slate) integrado en `docs/design/` con `APPROVED.md` global firmado por Lucas. Branch `feat/design-system-v1` desde `feat/B-08-sunat-infra`. Cambios:
  - `src/app/globals.css`: tokens V1 (neutrals slate-cool, tenant accents idex/agro/dignita, semantic), shadcn HSL realineado al V1, themes legacy del bootstrap eliminados (`theme-sass*`, `theme-blue`, `theme-purple`, `theme-green`).
  - `tailwind.config.ts`: utilities `bg-orion-*`, `bg-tenant-accent*`, `bg-{idex,agro,dignita}-*`, `text-{success,warn,danger,info}-fg`, `font-mono`, `shadow-orion-*`.
  - `src/app/layout.tsx`: Inter + JetBrains Mono via `next/font/google` con CSS variables.
  - `src/lib/design/tenant-theme.ts`: helper `tenantThemeClass(slug)` mapea a `tenant-idex|agro|dignita`.
  - `TenantSidebar` rebuild: 240px, brand mark + 4 secciones nav (Operación / Facturación / Análisis / Administración) + footer user. Active state usa `bg-tenant-accent-soft text-tenant-accent-fg`.
  - `TenantHeader` rebuild: 56px, breadcrumbs, search ⌘K, help/bell icons, user pill.
  - `(app)/[companySlug]/layout.tsx`: grid `240px / 1fr` × `56px / 1fr`, wraps con `tenantThemeClass(slug)`.
  - `DashboardContent` (`src/components/modules/dashboard/`): pivote del DS — KPIs de 6, sales chart, pipeline cotizaciones, listas. Mock data inline (TODO: queries reales en B.11).
  - `src/app/preview/dashboard/page.tsx`: ruta dev-only sin auth para QA visual del DS. Middleware whitelist en NODE_ENV=development.
  - Primitivos compartidos nuevos: `Money`, `PageHead`, `Kpi`/`KpiRow`.
  - Screenshot pivote validado: tokens, fuentes, tenant theming, sidebar/header, KPIs, charts, tables — todo coincide con mockup V1.

- 23:00 — **B.5 UI cotizaciones (lista + detalle).** Branch `feat/B-05-cotizaciones-ui` desde `feat/design-system-v1`. Componentes y rutas:
  - `src/components/shared/EstadoBadge.tsx`: badge por estado (borrador/enviada/aprobada/etc.) con tokens semánticos. Compartido con OC y otros módulos.
  - `src/components/modules/cotizaciones/CotizacionesList.tsx`: tabla + filtros chip por estado + KPIs (total/pipeline) + paginación.
  - `src/components/modules/cotizaciones/CotizacionDetalle.tsx`: header con número mono + acciones permission-aware (PDF/Reenviar/Duplicar/Rechazar/Aprobar), grid 3:2 con tabla de líneas + términos a la izquierda y totales + timeline + conversiones a la derecha.
  - `src/app/(app)/[companySlug]/cotizaciones/page.tsx`: server component, fetch en paralelo (rows + counts agregados + canCreate), `clienteDisplay` razon-vs-personas, formato de fecha corto.
  - `src/app/(app)/[companySlug]/cotizaciones/[id]/page.tsx`: tenant-scoped fetch del header + items + 4 permisos en `Promise.all`, timeline derivado de `createdAt/enviadaAt/aceptadaAt/rechazadaAt`, `vencimientoTag` calculado vs hoy. TODO: campo dedicado para términos de pago/entrega y join con tenant_members para "comercial".
  - `src/app/preview/cotizaciones/page.tsx` y `[id]/page.tsx`: rutas dev-only con mock data + sidebar/header completos para QA visual.
  - Screenshot pivote validado: `b5-cotizaciones-detalle-pivote.png` en repo de setup. Tipografía, badge, tag de vencimiento, tabla, totales, timeline y conversiones coinciden con DS V1.

### 2026-05-07

- 19:45 — **B.5 UI form crear/editar cotización.** Misma branch (`feat/B-05-cotizaciones-ui`).
  - `src/components/modules/cotizaciones/CotizacionForm.tsx`: client component con `useForm` + `useFieldArray` para items + `useWatch` (no `watch`) para reactivar totales en tiempo real. Selector de producto autopobla código/descripción/precio/IGV. Cálculo de subtotal por línea inline + Totales card con Subtotal / IGV / Descuento global / Total.
  - **Decisión:** `useWatch({ control, name: 'items' })` en lugar de `watch('items')`. `watch` no notificaba reactivamente cuando RHF actualizaba items vía `useFieldArray` o `setValue`. Confirmado vía Playwright: con `watch` los totales quedaban en 0; con `useWatch` se actualizan al instante. `setValue` ahora pasa `{ shouldDirty: true }` para que el cambio sea observable.
  - `src/app/(app)/[companySlug]/cotizaciones/nueva/page.tsx`: server component, valida permiso `cotizaciones.crear`, fetch de clientes y productos activos en paralelo.
  - `src/app/(app)/[companySlug]/cotizaciones/[id]/editar/page.tsx`: idem, además bloquea edición si estado != borrador (redirect a detalle).
  - `src/app/preview/cotizaciones/nueva/page.tsx`: preview dev con mock data.
  - Botón "Editar" añadido al header del detalle cuando `esEditable === true`.
  - Verificado en Playwright: 3 × 1240 → subtotal 3,720.00 + IGV 669.60 = 4,389.60. `b5-cotizaciones-form-filled.png` en repo de setup.

### 2026-05-05

- 11:55 — **Fix migrations PG 15.8 + tests integration kardex.** El reset DB (`pnpm db:migrate`) fallaba en 0012 (clientes), 0015 (productos) y 0027 (sunat_outbox). Aplicados:
  - Wrapper `public.immutable_to_tsvector_spanish(text)` en plpgsql IMMUTABLE para que las columnas `search_vector GENERATED` pasen el check de inmutabilidad estricta de PG 15.
  - Reemplazo de `CONCAT_WS` por `||` en `nombre_display` (CONCAT_WS es STABLE, no IMMUTABLE).
  - `SET LOCAL search_path TO public, pgmq;` antes de `pgmq.create()` en 0027.
  - **Decisión:** PL/pgSQL en lugar de SQL para el wrapper porque SQL inmutable se inlinea y la expresión inlineada vuelve a no ser IMMUTABLE.
  - Tests kardex (`tests/integration/kardex/concurrencia.test.ts`): nuevo helper `expectPgError()` que des-envuelve los errores que drizzle wraps con "Failed query: ..." (el RAISE EXCEPTION de PL/pgSQL queda en `err.cause.message`). `afterEach` limpia kardex_movimientos antes que productos (FK RESTRICT por diseño).
  - **9/9 integration tests verde.** 27 migrations apply clean.

### 2026-05-08

- 12:00 — **B.7 UI inventario/kardex.** Branch `feat/B-07-kardex-ui` desde `feat/B-06-ordenes-ui`. Componentes:
  - `src/components/modules/inventario/InventarioList.tsx`: tabla stock con chip filters (todos/sin_stock/critico/normal), alerta banner si hay productos críticos, badges de estado coloreados, link a kardex por producto.
  - `src/components/modules/inventario/KardexDetalle.tsx`: KPI strip 5 cols (stock/mínimo/costo/valor/rotación 30d), alerta bajo mínimo + CTA "Crear orden", tabla movimientos con tipo coloreado (entrada verde/salida rojo/ajuste azul), chip filters por tipo, origenLabel para documentos.
  - `src/components/modules/inventario/AjusteManualForm.tsx`: useForm + ajusteManualSchema, preview reactivo stock antes/después + valor antes/después, alerta roja "acción crítica", audit trail preview en monospace. Usa server action `ajusteManualStock`.
  - Routes: `/inventario`, `/inventario/[productoId]`, `/inventario/[productoId]/ajuste`. Previews en `/preview/inventario/`.
  - 3 screenshots pivote validados vía Playwright.

### 2026-04-29

- B.4 Productos commiteado en `0702865`.
- B.5 iniciado: schema, cálculo, server actions (los archivos quedaron sin commit cuando se cerró la terminal).
