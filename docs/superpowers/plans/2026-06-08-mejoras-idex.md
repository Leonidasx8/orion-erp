# Mejoras Idex (observaciones Lucas + respuestas doc v5) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development o superpowers:executing-plans para ejecutar task por task. Steps usan checkbox (`- [ ]`).
> **Modelo:** ejecutar con **Sonnet** salvo donde se indique Opus. Avisar antes de usar Opus (ver memoria feedback_model_switching).
> **Branch base:** `feat/observaciones-lucas-quickwins` (sale de `main`). Hacer commits frecuentes, typecheck verde (`pnpm typecheck`) antes de cada commit.
> **Regla:** nada de mutaciones directas a la DB de prod salvo catálogos sin UI (excepción documentada). Verificar en navegador lo no trivial (modo "ii").

**Goal:** Implementar las mejoras pedidas por Lucas, separando lo que está DENTRO del contrato (Anexo I) de lo que es addendum/v2 (requiere aprobación de alcance antes de codear).

**Architecture:** Next.js 14 App Router + Server Actions, Drizzle + Supabase (Postgres), react-pdf para PDFs, RBAC con casbin. Multiempresa (Idex / Agroalves) con RLS.

**Contexto previo (ya resuelto, NO rehacer):**

- Facturación SUNAT operativa (F001-13 aceptada). Ver `project_nubefact_serie_blocker`.
- Quick wins ya en el branch: renombres OC/ítem, quitar lista de precios, USD default + TC oculto, "Precio de venta", estado "Aceptada cliente".
- Botón "ajustar stock": YA existe (`InventarioList.tsx:261`, gateado por `canAjustar`).
- Filtro por calibre: YA funciona (buscador de `ProductosList` matchea nombre; el calibre va en el nombre).

---

## FASE 1 — Quick wins in-contract restantes (Sonnet)

### Task 1: Catálogo completo de unidades de medida SUNAT (obs 7.3)

**Contexto:** `unidades_medida` (tabla en `src/lib/db/schema/productos.ts`) hoy tiene 12 códigos (CMT, DAY, GRM, HUR, KGM, LTR, MLT, MON, MTQ, MTR, NIU, ZZ). Lucas quiere el catálogo SUNAT completo (catálogo 03): toneladas TNE, kilómetros KTM, millares MLL, cajas, etc.

**Files:**

- Create: `src/lib/db/migrations/00XX_unidades_sunat_completo.sql` (siguiente número correlativo; revisar `src/lib/db/migrations/` para el último).
- Reference: catálogo oficial SUNAT 03 — NO inventar códigos de memoria. Obtener la lista oficial (WebSearch "SUNAT catálogo 03 unidades de medida" o el manual Nubefact) y usar exactamente esos códigos.

- [ ] **Step 1:** Obtener la lista oficial del catálogo 03 SUNAT (código + descripción). Códigos clave para Idex: TNE (tonelada), KTM (kilómetro), MLL (millar), BX (caja), PK (paquete), SET (juego), BG (bolsa), GLL/GLI (galón), DZN (docena), etc.
- [ ] **Step 2:** Escribir la migration con `INSERT ... ON CONFLICT (codigo) DO NOTHING` para no duplicar los 12 existentes.
- [ ] **Step 3:** Aplicar en local (`supabase db reset` o push) y verificar el count.
- [ ] **Step 4:** Aplicar en prod vía Supabase MCP `apply_migration` (catálogo sin UI = excepción permitida) y verificar.
- [ ] **Step 5:** Commit `feat(db): catálogo completo unidades de medida SUNAT (cat 03)`.

**Acceptance:** El select de unidad en `ProductoForm` y en guías muestra el catálogo completo; emisión a Nubefact no falla por unidad.

---

### Task 2: Cuentas bancarias por moneda en el PDF de cotización (obs 4.6)

**Contexto:** El tenant guarda cuentas PEN (`bancoCuenta`, `bancoCci`, `bancoDetraccionCuenta`) y USD (`bancoCuentaUsd`, `bancoCciUsd`). Hoy el PDF NO recibe las cuentas USD ni filtra por moneda. Lucas quiere que salgan las cuentas de la moneda de la cotización.

**Files:**

- Modify: `src/app/api/[companySlug]/cotizaciones/[id]/pdf/route.ts` (pasar `bancoCuentaUsd`/`bancoCciUsd` y la `moneda` al `CotizacionPDFData`).
- Modify: `src/lib/pdf/CotizacionPDF.tsx` (interface `CotizacionPDFData`: añadir campos USD).
- Modify: `src/lib/pdf/CotizacionPDF-A.tsx` (sección "Datos para pago", ~líneas 359-386) y `CotizacionPDF-B.tsx` (~412-436): mostrar cuentas según `data.moneda` (si USD → cuentas USD; si PEN → cuentas PEN). Etiquetar cada cuenta con su moneda.

- [ ] **Step 1:** Añadir `bancoCuentaUsd?`, `bancoCciUsd?` y confirmar `moneda` en la interface de `CotizacionPDF.tsx`.
- [ ] **Step 2:** En la route del PDF, seleccionar y pasar esos campos del tenant.
- [ ] **Step 3:** En PDF-A y PDF-B, renderizar condicionalmente las cuentas por `data.moneda`.
- [ ] **Step 4:** Generar un PDF de prueba en cada moneda (modo "ii", screenshot) y verificar.
- [ ] **Step 5:** `pnpm typecheck` + commit `feat(pdf): cuentas bancarias según moneda en cotización`.

**Acceptance:** PDF en USD muestra solo cuentas USD; PDF en PEN muestra cuentas PEN (+ detracción).

---

### Task 3: Bug — no descarga el PDF de la Orden de Compra (obs 5.5)

**Contexto:** Existe la ruta `src/app/api/[companySlug]/ordenes/[id]/pdf/route.ts` pero descargar el PDF de la OC falla o no hay botón. Hay que REPRODUCIR primero.

**Files:** (a confirmar tras reproducir)

- `src/app/api/[companySlug]/ordenes/[id]/pdf/route.ts`
- `src/components/modules/ordenes/OrdenDetalle.tsx` (botón "PDF" — verificar que tenga onClick/href real; en el detalle el botón "PDF" existe pero puede ser stub).

- [ ] **Step 1:** Reproducir: abrir una OC en prod/local, click en "PDF", capturar el error (consola/red/render).
- [ ] **Step 2:** Diagnosticar (botón sin handler, error react-pdf, o permiso).
- [ ] **Step 3:** Arreglar (TDD si es lógica; si es UI, screenshot antes/después).
- [ ] **Step 4:** Verificar descarga `application/pdf`.
- [ ] **Step 5:** commit `fix(ordenes): descarga de PDF de la orden de compra`.

**Acceptance:** Descargar el PDF de una OC funciona y muestra los datos correctos.

---

## FASE 2 — In-contract medianos (Sonnet, con cuidado; verificar en navegador)

### Task 4: Dashboard con monedas separadas (respuesta B4 de Lucas)

**Contexto:** Lucas NO mezcla monedas; si cotiza en ambas hace 2 cotizaciones. Hoy el dashboard suma montos asumiendo soles (mezcla USD+PEN incorrectamente). Hay que mostrar totales SEPARADOS por moneda.

**Files:**

- `src/app/(app)/[companySlug]/page.tsx` (queries del dashboard — 5 queries paralelas con `Promise.all`).
- `src/components/modules/dashboard/DashboardContent.tsx` (presentación de KPIs).
- Posibles vistas SQL agregadas (`dashboard_metricas`, `top_clientes`, `cuentas_por_cobrar`) en migrations — revisar si agregan sin moneda.

- [ ] **Step 1:** Auditar dónde se suman montos sin distinguir moneda (page.tsx + vistas).
- [ ] **Step 2:** Cambiar agregaciones a `GROUP BY moneda` (o dos sumas: una `WHERE moneda='USD'`, otra `'PEN'`).
- [ ] **Step 3:** Actualizar `DashboardContent` para mostrar KPIs por moneda (ej. "Ventas: USD X / PEN Y").
- [ ] **Step 4:** Verificar en navegador con data mixta.
- [ ] **Step 5:** typecheck + commit `feat(dashboard): totales separados por moneda (USD/PEN)`.

**Acceptance:** Ningún KPI mezcla USD con PEN; se ven dos cifras por moneda.

---

### Task 5: Roles — Lucas es ADMIN, no Superadmin (confirmación A de Lucas)

**Contexto:** Lucas considera "Superadmin" como cosa de Dignita (actualizar software). Él es el ADMIN/dueño. Las aprobaciones (margen < mínimo, cotización > USD 5,000) deben ir a Lucas. Hoy puede que el rol esté nombrado/mapeado distinto.

**Files:**

- `src/lib/db/migrations/0010_seed_roles_base.sql` (roles y permisos base).
- Tabla `casbin` / seed de permisos (revisar `src/server/...` y `admin/roles`).
- Pantalla de aprobación de cotizaciones (donde se enruta la aprobación).

- [ ] **Step 1:** Mapear los roles actuales (Superadmin / Comercial / Facturación) y a quién va la aprobación de margen/monto.
- [ ] **Step 2:** Decidir con producto: ¿renombrar "Superadmin" del tenant a "Admin", y dejar un "platform_admin" separado para Dignita? (probablemente ya existe `platform_admin`). Confirmar antes de tocar seeds.
- [ ] **Step 3:** Ajustar que las aprobaciones notifiquen/requieran al Admin (Lucas).
- [ ] **Step 4:** Verificar con los 3 roles.
- [ ] **Step 5:** commit. **NOTA: este toca RBAC — si hay dudas, escalar a Opus o confirmar con el usuario antes.**

**Acceptance:** Lucas (Admin) recibe/autoriza las aprobaciones; el "Superadmin de plataforma" queda claramente separado (Dignita).

---

### Task 6: Inventario — salida de stock en GUÍA + costo por lote (respuestas 2/6/7 de Lucas)

**Contexto:** Lucas: inventario en Idex (arranca 0) y Agroalves (stock real); **el stock debe SALIR del kardex al emitir la GUÍA de salida** (no al facturar); costeo promedio ponderado PERO mostrando el costo exacto de cada lote/stock (porque guarda stock por cliente). El último punto se liga a la reserva (Fase 3/addendum).

**Files:**

- `src/server/actions/kardex-internal.ts` (lógica de movimientos).
- `src/server/actions/guias.ts` / `crearGuia` (disparar la salida de stock).
- `src/server/actions/facturas.ts` (quitar la salida de stock al facturar, si existe).
- `KardexDetalle.tsx` (mostrar costo por lote).

- [ ] **Step 1:** Auditar dónde se descuenta stock hoy (¿al facturar? ¿al recibir?).
- [ ] **Step 2:** Mover la SALIDA de stock al evento de emisión de GUÍA.
- [ ] **Step 3:** Asegurar que el kardex registre el costo del lote en cada movimiento (ya hay promedio ponderado; exponer el costo por movimiento).
- [ ] **Step 4:** Verificar E2E (recepción → guía descuenta → kardex).
- [ ] **Step 5:** commit. **Posible Opus** (lógica kardex cross-módulo).

**Acceptance:** El stock sale al emitir la guía; el kardex muestra el costo por lote.

> ⚠️ El "costo exacto por stock reservado para un cliente" depende de la **reserva de stock (addendum, Fase 3)**. Implementar aquí solo el costo por lote/movimiento, no la reserva.

---

### Task 7: Guías de remisión — 2 casos (respuesta 8 de Lucas)

**Contexto:** Lucas: (1) contrata transporte para enviar; (2) cliente recoge en almacén (guía de salida). Quiere "todas las opciones SUNAT" pero inicia con esos 2. La guía está en el contrato (B.8). Implica las 2 modalidades SUNAT: transporte público (transportista, tipo 31/remitente con transportista) y traslado privado.

**Files:**

- `src/lib/sunat/builders/guia.ts` (builder Nubefact — soportar modalidad 01 público / 02 privado).
- Form de guía (`src/components/modules/guias/...` o `src/app/(app)/[companySlug]/guias/nueva`).
- `src/lib/db/schema/guias.ts` (campos de modalidad/transportista/conductor según haga falta).

- [ ] **Step 1:** Revisar el builder y el modelo actual de guías (ya emite GRE).
- [ ] **Step 2:** Agregar selector de modalidad en el form (Idex traslada / cliente recoge).
- [ ] **Step 3:** Ajustar el builder para cada modalidad (datos de transportista vs traslado propio).
- [ ] **Step 4:** Emitir una guía de prueba de cada tipo (Nubefact en producción — usar enviar=false o anular después).
- [ ] **Step 5:** commit. **Posible Opus** (toca builder SUNAT).

**Acceptance:** Se emite GRE en ambas modalidades sin rechazo SUNAT. (El "guardar/reutilizar vehículo y conductor" es addendum — Fase 3.)

---

## FASE 3 — ADDENDUM / v2 (NO ejecutar sin aprobar alcance y diseño con el usuario)

> Estos exceden el Anexo I (ver `reference_contrato_idex`). Antes de codear: brainstorming/diseño + acuerdo comercial (addendum). NO arrancarlos como quick win.

### Addendum A1: Retención en factura (Lucas: a él le retienen)

- Campo de % retención + monto en factura; reflejar en neto a pagar; payload Nubefact (Nubefact tiene comprobante de retención tipo 20, pero aquí es retención que sufre Idex como proveedor → ver cómo lo maneja Nubefact). Ref: factura PuraFruit. **Requiere Opus + diseño.**

### Addendum A2: Factura por anticipo/adelanto (Lucas lo usa)

- Tipo de operación anticipo + regularización en factura final + payload Nubefact. **Opus.**

### Addendum A3: Control de línea de crédito con freno + aviso

- Al superar la línea: NO generar la cotización, mostrar "pedir aprobación al admin", enviar correo (Resend) al admin; el admin amplía la línea y se destraba. **Diseño: dónde se valida, modelo de "solicitud de aprobación", correo. Opus para el flujo.**
- ⚠️ Lucas creía que estaba en contrato — manejar con tacto (ya hay módulo de crédito/CxC construido como valor agregado; el freno+correo es lo nuevo).

### Addendum A4: Reserva de stock por cliente

- Al aprobar cotización: si hay stock, reservar (no disponible para otros); si no, generar OC. Stock = disponible vs reservado; costo exacto del stock reservado. Reserva por cotización, expira (días a definir con Lucas), parcial en un paso. **Feature grande — brainstorming obligatorio.** Ver `project_oc_stock_pipeline`.

### Addendum A5: Guardar y reutilizar vehículo + conductor en guías

- Persistir y reutilizar ("usar el de siempre"). Lucas: en Idex cambian seguido, en Tizona son fijos. Tabla `conductores` (falta) + reúso. **Sonnet, pero es addendum.**

---

## Self-review / cobertura

- Observaciones in-contract: renombres ✅(hecho), USD/TC ✅, precio de venta ✅, aceptada cliente ✅, ajuste stock ✅(existe), calibre ✅(funciona), unidades SUNAT (T1), cuentas por moneda (T2), PDF OC (T3), dashboard moneda (T4), roles (T5), inventario/guía (T6, T7).
- Addendum: retención (A1), anticipo (A2), crédito freno+aviso (A3), reserva stock (A4), vehículo/conductor (A5).
- Sin placeholders de código completo en Fase 1-2 porque varios archivos requieren lectura en ejecución; el executor debe abrir cada archivo, seguir TDD donde haya lógica, y screenshot donde sea UI.

## Orden sugerido de ejecución (Sonnet)

T1 → T2 → T3 (quick wins limpios) → T4 → T7 → T6 → T5 (medianos). Fase 3 solo tras aprobar addendum.
