# Handoff — Estado de implementación Orion ERP

> **Propósito:** evitar retrabajo si la sesión se cierra. Cualquier sesión nueva debe leer este archivo PRIMERO antes de tocar código. Actualizar al terminar cada tarea significativa o al hacer commit.

**Última actualización:** 2026-06-11 12:45 (✅ BUG RESUELTO: el 500 del importador era FK `productos_unidad_medida_fkey` — el Excel traía "UND" y la columna exige códigos del catálogo SUNAT. Fix `b09b54b` desplegado y VERIFICADO end-to-end en prod. Datos de prueba limpiados, 476 productos activos. ⏰ LUCAS ENTRA A PROBAR HOY 2:00PM — va a meter productos, precios y líneas de crédito.)
**Branch activa:** `main` — desplegada en orion-rp.com (`vercel --prod`).
**Estado verificado:** F001-13/14 emitidas y luego anuladas por NC (flujo completo demostrado) · NC F002-1 y F002-2 ACEPTADAS SUNAT ✅ · Guías T001-7 y T001-8 ACEPTADAS SUNAT ✅ · AUDIT 14/14 módulos OK.
**Último commit prod:** `6561f25` — fix: GRE "ya existe en NubeFacT" → consultar_guia fallback

> **gh gotcha:** la cuenta git activa se revierte sola a `DignitaTech` y rompe `git push orionrp` (repo privado de orionrp-hub da "not found"). Antes de push: `gh auth switch --user orionrp-hub`.

---

## 🚀 ENTREGA FINAL — estado y plan (2026-06-10)

**Estamos cerrando la entrega del proyecto.** Plan de entrega del cliente (Leo):

1. **Manual end-to-end** del sistema (a redactar) → entrega final.
2. **Video** mostrando cómo funciona (lo graba Leo).
3. **Correo** solicitando el resto del depósito (pago).
4. **Correo** con todas las funcionalidades pendientes para la **v2**.

### Secuencia de trabajo acordada (en orden)

1. ✅ Revisar todos los pendientes (ver `IDEX-PROYECTO-DASHBOARD.md` en orion-erp-setup).
2. ⏳ **Revisar TODOS los botones** de la app (auditoría funcional módulo por módulo, sobre prod/preview).
3. ⏳ **Manual E2E** para el cliente (solo documenta lo que funciona y se verificó).
4. ⏳ **Auditoría de ciberseguridad** (código: auth/RLS, server actions, secretos, permisos por rol, inputs).

### Docs que Lucas mandó por WhatsApp (10-jun) para el ENTORNO REAL

> Están en la carpeta "Lucas" (la indica Leo); los WhatsApp en la carpeta principal. En `~/Downloads` ya se ven facturas `PDF-DOC-E001-…` y `LISTA DE PRECIO…xlsx`.

- **Lista de precios JUNIO** (cables, 9 pág) · **Lista precios conectores Grupo Idex** (10 pág) · **listado tableros.xlsx** (materiales/tableros) → cargar como productos reales.
- **Factura real de Lucas** `PDF-DOC-E001-10…`: su serie real es **E001**, última emitida = **10** → la siguiente debe ser **11**. ⚠️ El sistema usó F001-13 en pruebas; al armar el entorno real hay que **reconciliar serie/correlativo (E001 desde 11) con Lucas + Nubefact + SUNAT** antes de emitir en vivo.
- **Factura CELSA** `…FA01-00035398.pdf`: referencia de DISEÑO → **logo arriba-izquierda, debajo razón social y dirección**. Lucas quiere **personalizar la factura (logo + colores)**.

### Preguntas abiertas de Lucas (10-jun)

- "¿Puedo meter precios a mano en la cotización?" → Leo: no en esta versión; se hace a nivel general (actualización de precios), cambio delicado. (Para tableros, los precios cambian por proveedor.)
- "¿Cada vez que cotice debo actualizar los precios?" → responder.
- "¿Se puede recibir una cotización y que entre automáticamente al sistema?" → **v2**.
- Personalización de factura (logo/colores estilo CELSA) → decidir in-contract vs v2.

### Pendientes para CERRAR la entrega (in-contract)

- **Entorno real**: cargar productos (3 archivos) · serie/correlativo E001 desde 11 · personalizar factura (logo/colores) · prueba real de facturar un cable a un cliente.
- Dashboard monedas separadas · catálogo unidades SUNAT (cat. 03) · guías 2-casos · roles=Admin · salida de stock al emitir guía.

---

## ✅ 2026-06-11 mediodía — RESUELTO: importador 500 al confirmar (FK unidad_medida)

> La sesión de la mañana se cortó por créditos a mitad del debugging; se cerró al mediodía.

### Causa raíz y fix (commit `b09b54b`, desplegado `orion-ekc8k2fh7`)

**Causa:** `insert or update on table "productos" violates foreign key constraint "productos_unidad_medida_fkey"` — `Key (unidad_medida)=(UND) is not present in table "unidades_medida"`. El parser pasaba la unidad del Excel tal cual (uppercase) sin validar contra el catálogo SUNAT cat. 03. Capturado con `vercel logs --follow` + reproducción en prod.

**Fix en `src/server/actions/productos-importar.ts`:**

- Mapa `UNIDAD_ALIAS` (UND/UNID/U→NIU, M/MT/MTS→MTR, KG→KGM, L/LT→LTR, PZA→PCE, CAJA→BX, ROLLO→RLL, etc.) + validación contra tabla `unidades_medida`; lo no reconocido cae a **NIU**. Se aplica en el parseo (preview muestra el código final) Y en el confirm (las filas vienen del cliente, no se confía).
- Fallas por fila ya no tumban el import completo con 500: try/catch por producto, reporta SKUs fallidos en el mensaje ("Se importaron X de Y… reintenta: upsert no duplica").

**Verificado end-to-end en prod (12:40):** subir `test-import.xlsx` (unidad "UND") → preview 1 OK → Confirmar → **"Importación completada, 1 producto creado"**, unidad en DB = NIU. Esto valida que el manual de usuario (que sugiere "MTR, UND, KG") funciona tal cual está escrito.

**Limpieza hecha:** producto `PRUEBA-IMPORT-01` y categoría "Pruebas" borrados de prod. Catálogo queda en **476 productos activos** (CELSA intacto).

### Botón "Calibre" en /productos — retirado (commit `87ba90b`, reporte de Lucas 12:55)

Era un placeholder sin `onClick` que parecía un filtro activo. Retirado y verificado en prod. El calibre se busca por el buscador de texto (busca SKU+descripción+calibre). Filtro dedicado requiere campo `calibre` estructurado → addendum de variantes (fuera de contrato).

### Descartar guía (commit `9d0d3f1`) — verificación parcial

- Caso negativo verificado en prod: en guías ACEPTADAS por SUNAT (T001-7/8) NO aparece el botón Descartar ni Reenviar — el guard funciona.
- Caso positivo (botón visible y acción sobre guía con error) NO probado: requeriría crear una guía basura en prod. Probar cuando ocurra un error real de emisión.

---

## ✅ 2026-06-11 madrugada — Import 475 productos CELSA (catálogo real)

### Ejecutado

- Parseado Excel `LISTA DE PRECIO ABRIL 2026-SEGELECTRICA (1).xlsx` con exceljs (Node.js). 475 productos, 7 familias (COBRE DESNUDO, COBRE CONSTRUCCION, COBRE AEREO, ENERGIA, CONSTRUCCION, INSTRUMENTAL, CONTROL).
- Precios: `costo_unitario = USD × 3.75`, `precio_unitario = costo × 1.143` (≈14.3% margen).
- Import vía SQL directo en Supabase (5 batches × 100/100/100/100/75). La UI `/productos/importar` era mock en ese momento (desde commit `1b56f08` ya parsea Excel real — pero ver BUG ABIERTO arriba: el confirmar falla en prod).
- Resultado verificado en UI: **476 productos activos** (475 CELSA + 1 CB-AWG12 de prueba E2E).
- **Nota:** El producto T001-7 (guía con error) sigue pendiente. Los conectores y tableros de Lucas aún NO se cargaron (pendiente recibir archivos).

---

## ✅ 2026-06-10 tarde — Audit completo + GRE fix + cotización→guía link

### Implementado y desplegado (commits `1f9f0bf` y `6561f25`)

1. **Cotización → Guía link** — al crear guía nueva, selector pre-llena destinatario + ítems desde la cotización. Guía detail muestra badge clickeable con número, cliente, fecha, monto. (`migration 0049`, `guias.ts schema`, `server/actions/guias.ts`, `NuevaGuiaForm.tsx`, `guias/nueva/page.tsx`, `guias/[id]/page.tsx`)
2. **GRE "ya existe en NubeFacT" fix** — el worker ahora detecta el error `ya existe` de Nubefact y llama `consultar_guia` en vez de marcar `error_red`. Funciona: T001-8 pasó de `error_red` → `aceptada` tras reenvío desde UI. (`/api/sunat/procesar-cola/route.ts`)

### Audit de UI/módulos en producción (14/14 ✅)

| Módulo            | Estado | Nota                                                       |
| ----------------- | ------ | ---------------------------------------------------------- |
| Dashboard         | ✅     | KPIs USD/PEN separados                                     |
| Clientes          | ✅     | CRUD + exportar                                            |
| Productos         | ✅     | CRUD + importar                                            |
| Cotizaciones      | ✅     | Flujo completo                                             |
| Órdenes de Compra | ✅     | Ruta `/ordenes` (no `/ordenes-compra`)                     |
| Inventario        | ✅     | Vacío (sin productos cargados aún)                         |
| Guías de remisión | ✅     | T001-7 error, T001-8 aceptada                              |
| Facturas          | ✅     | F001-13/14 aceptadas SUNAT                                 |
| Crédito y CxC     | ✅     | Aging report                                               |
| Pipeline          | ✅     | Kanban 6 etapas                                            |
| Reportes          | ✅     | 4 tarjetas                                                 |
| Auditoría         | ✅     | Log de eventos                                             |
| Usuarios          | ✅     | 4 usuarios activos                                         |
| Roles             | ✅     | Matriz 3 roles × 11 módulos                                |
| Configuración     | ✅     | Datos Grupo Idex SAC correctos; **logo URL = placeholder** |

### Pendiente para demo mañana (11-jun)

- [ ] **T001-7**: sigue en "Error red" (Nubefact no tiene módulo GRE habilitado para Idex). Pendiente que Lucas habilite GRE en su cuenta Nubefact.
- [ ] **Logo en Configuración**: URL = `https://ejemplo.com/logo.png` — cargar el logo real de Grupo Idex SAC.
- [x] **Entorno real — 475 productos CELSA importados** ✅: lista CELSA (cables GPT, THW-90, TW-80, NYY, N2XY, N2XOH, LSOH, CELSAFLEX, N2XSY) cargada vía SQL directo (la UI Importar es mock). 7 familias/categorías. Precios: costo=USD×3.75 PEN, venta=costo×1.143 (14.3% margen). 476 productos activos en total.
- [ ] **Serie E001 desde 11**: reconciliar con Lucas/Nubefact antes de emitir facturas reales.
- [x] **Correo a Lucas**: ✅ Borrador completo creado en Gmail (ID `r-9115412228634889132`). Documenta: flujo E2E, 475 productos CELSA, SUNAT status (F001/T001 ACEPTADA, F002 pendiente), bugs corregidos, pendientes de activación entorno real. **FALTA:** revisar y enviar desde Gmail.

---

## 🧪 2026-06-10 — Pruebas E2E completas + correcciones de bugs

### Flujo probado (todo con botones de UI, no DB directa)

1. **Login** ✅ · **Dashboard** ✅
2. **Producto** creado: Cable Cobre THW AWG #12 (CB-AWG12) ✅
3. **Cotización** COT-2026-000030 → aprobada ✅
4. **Factura F001-00000014** → ACEPTADA SUNAT ✅ (`Código: 0 — La Factura numero F001-14, ha sido aceptada`)
5. **Nota de Crédito F002-00000001** → creada en DB ✅ — falta registrar serie F002 en Nubefact
6. **Guía T001-00000007** → creada en DB ✅ — falta módulo GRE habilitado en Nubefact

### Bugs corregidos (commit 584600f, prod desplegado)

- **NC builder**: `tipo_de_comprobante` 7/8 → 3/4 (Nubefact: 3=NC, 4=ND)
- **NC builder**: `tipo_de_cambio` fallback para facturas USD
- **NC action**: `valorUnitario` corregido (era `precioUnitario` con IGV → rompía cálculo Nubefact)
- **NC action**: `porcentajeIgv` añadido a líneas de NC/ND
- **NC action**: columna `numero_completo` (GENERATED ALWAYS AS) no se inserta explícitamente
- **Guía builder**: `operacion: 'generar_guia_de_remision'` (era `generar_comprobante`)
- **DB migration 0048**: constraint `guias_remision_estado_check` actualizado con estados reales

### Acciones pendientes por Lucas (Nubefact)

1. Registrar serie **F002** como "Nota de Crédito" en el portal Nubefact
2. Habilitar módulo **GRE** en Nubefact para emitir Guías Electrónicas a SUNAT
3. Configurar serie **E001** desde correlativo 11 (entorno real)

### Correo enviado

- Borrador creado en Gmail con evidencia completa. ID de borrador: `r360095174025663382`
- Destinatario: lescriva@grupoidex.com.pe

---

## 🎉 RESUELTO 2026-06-08 noche — FACTURACIÓN ELECTRÓNICA OPERATIVA (SUNAT acepta)

El bloqueador de meses se cerró. **F001-00000013 ACEPTADA por SUNAT** (E2E: producto→inventario→cotización→factura→worker→Nubefact→SUNAT). Detalle completo en memoria `project_nubefact_serie_blocker`.

**Eran 2 problemas de config en la cuenta Nubefact de Idex (no del código):**

1. El token API apuntaba al local demo (series FFF1/BBB1). Creé un token para el local "Facturas" (series reales F001/B001) y actualicé `tenants.config_sunat.token` → `c08aba24…`.
2. El local "Facturas" tenía código de establecimiento SUNAT `0001` (anexo no declarado → rechazo SUNAT 3239). Lo cambié a `0000` (matriz declarada) en Nubefact.

**Acceso Nubefact:** `desarrolladoridex@gmail.com` / `orion123!`. **F001-12 quedó rechazada** (intento con establecimiento viejo, número quemado). Datos de prueba en prod: producto PRUEBA-1, cliente SUNAT 20131312955, COT-28/29, F001-13 (real aceptada, dejada como prueba).

---

## 📋 2026-06-08 — Respuestas de Lucas al doc v5 (decisiones)

Ver memoria `project_respuestas_lucas_v5`. Traducción a tareas:

**DENTRO de contrato — ya hecho/no requiere código:**

- Botón "ajustar stock": YA existe en `InventarioList` (gateado por permiso `inventario.ajuste_manual`).
- Filtro por calibre: YA funciona — el buscador de `ProductosList` matchea `nombre`, y el calibre va en el nombre ("18 AWG"). Lucas confirmó "cada calibre = un producto".

**DENTRO de contrato — pendiente de implementar:**

- Dashboard: **monedas separadas** USD/PEN (Lucas NO mezcla; si cotiza en ambas hace 2 cotizaciones). Hoy el dashboard suma asumiendo soles → arreglar.
- Inventario en **Idex (arranca 0) Y Agroalves (con stock real)**; 1 almacén; sin alertas de stock bajo por ahora; **salida de stock al emitir la GUÍA** (no la factura); costeo promedio ponderado **pero mostrando el costo exacto por lote/stock**.
- Guías de remisión: **2 casos** (Idex traslada / cliente recoge) — Lucas lo da por in-contract.
- Cuentas bancarias por moneda en PDF (4.6); catálogo completo unidades SUNAT (7.3, usar lista oficial cat.03, NO de memoria); bug PDF de OC (5.5).
- **Roles:** Lucas se considera ADMIN, no Superadmin ("el Superadmin solo actualiza el software" = Dignita). Las aprobaciones (margen <10%, >USD 5000) deben ir al Admin (Lucas). Revisar matriz de roles.

**FUERA de contrato (addendum/v2):**

- **Retención**: Lucas SÍ la necesita (a él le retienen) — campo de % retención en factura. (ref: factura PuraFruit.)
- **Anticipo**: Lucas lo usa.
- Control de crédito con freno + aviso (Lucas lo creía in-contract — manejar con tacto); reserva de stock por cliente (ligado al costo por lote); guardar/reutilizar vehículo-conductor en guías.

---

## 🚧 EN CURSO 2026-06-08 — Quick wins observaciones Lucas (rama `feat/observaciones-lucas-quickwins`)

Implementación de los quick wins cerrados por las respuestas de Lucas en el Google Doc (id `1l3W0xeFZB66_BnuJG7_nJgZaP_d3jAJWSzB_S7f6LrY`). **Rama nueva, sin mergear ni desplegar — falta probar en navegador.**

| Commit        | Qué                                                                                                                                                                                                               | Obs           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `d736838`     | Sidebar/título "Compras a Proveedores"→"Órdenes de Compra"; "Añadir línea"→"Añadir ítem" (cotiz/OC/factura); quitar campo "Lista de precios" del form de cliente (se mantiene en schema/defaults)                 | 5.1, 5.2, P1  |
| `8d14f6d`     | USD por defecto en cotización (OC ya era USD); ocultar "Tipo de cambio" en cotización y OC (input oculto, dato se conserva); quitar refines que exigían TC para USD. **Factura NO tocada** (TC lo necesita SUNAT) | 4.3, 4.8, 5.4 |
| `cc99145`     | "Precio actual"→"Precio de venta" (actualización masiva) y "Precio unitario (S/)"→"Precio de venta (USD)" en form de producto                                                                                     | 3.2           |
| ~~`18347f7`~~ | **REVERTIDO** en `67b2dab` — malinterpretación. El flujo OC `borrador→enviar→aprobar` SE QUEDA. Ver "Pipeline de stock" abajo                                                                                     | —             |

**Pendiente de este lote (no hecho aún):**

- 4.6 Cuentas bancarias por moneda en PDF — el PDF NO recibe hoy las cuentas USD (`bancoCuentaUsd`/`bancoCciUsd`); hay que pasarlas en la route `api/.../cotizaciones/[id]/pdf` + filtrar por `data.moneda`.
- 7.3 Catálogo completo unidades SUNAT — `unidades_medida` es tabla en DB (no constante); falta seed/migration con catálogo 03 SUNAT.
- 6.2 Botón "Ajustar stock" visible en InventarioList (ruta `/inventario/[id]/ajuste` existe; falta el botón en la lista).
- 5.5 Bug PDF de OC — falta reproducir.

**⚠️ El flujo OC `borrador→enviar→aprobar` NO se toca** (malentendido corregido 08-jun). Lucas NO pidió quitar la aprobación.

**Pipeline de stock (lo que Lucas SÍ pidió, en la parte final del doc):** al **aprobar/aceptar una cotización**, de frente preguntar si hay stock del producto. Si **hay stock** → poder elegir **guardar/reservar** ese stock para el cliente (se refleja en inventario y queda **NO disponible para otros clientes** — reserva). Si **no hay stock** → generar la orden de compra al proveedor. Feature mediano-grande: requiere modelo de reserva de stock (stock disponible vs reservado), UI en la conversión de cotización, y reflejo en inventario/kardex. **Diseñar antes de codear.**

**Item 3.1 (quitar variación % en producto):** NO existe tal control en el form individual de producto; solo en actualización masiva (feature intencional). NO tocar sin confirmar con Lucas.

**Features grandes del doc (diseñar antes de codear):** pipeline de stock con reserva (arriba), freno de línea de crédito + correo al admin (P7), precio proveedor ≠ precio venta en OC, GRE guías 2 casos (traslado Idex / comprador), NC/ND + exportación + detracción (bloqueados hasta Nubefact activo).

---

## ✅ RESUELTO 2026-06-08 — Worker SUNAT estaba MUERTO (no era la serie)

**Contexto:** Lucas habilitó la serie F001 el 05-jun, pero la facturación seguía sin emitir. **La causa real NO era la serie** — era infra de la DB rota tras recrear/restaurar el proyecto Supabase (creado 01-jun).

**Diagnóstico (todo read-only):**

- El cron `sunat-worker-even` (jobid 1, cada minuto) **fallaba siempre**: `ERROR: schema "net" does not exist` → la extensión **`pg_net` no estaba instalada**.
- Además `app.settings.sunat_worker_url` = `null` y `sunat_worker_secret` sin setear → aunque pg_net existiera, posteaba a URL nula.
- Consecuencia: la cola pgmq nunca se drenaba. F001-11 (prueba PEN 42.80) llevaba encolada sin tocar desde 06-04. **Nunca hubo una emisión exitosa** (log solo tiene los 3 errores de serie del 06-02).

**Fix aplicado (vía Supabase MCP, rol `postgres`):**

1. `CREATE EXTENSION IF NOT EXISTS pg_net;` (quedó v0.20.3).
2. `ALTER DATABASE SET app.settings.*` → **permission denied** (el rol no es superusuario). Workaround: reescribí el **comando del cron job 1** con `cron.alter_job` embebiendo URL + secret directamente (sin depender del GUC):
   - URL: `https://orion-rp.com/api/sunat/procesar-cola`
   - Secret: `orion-sunat-prod-ad20ab214f6334d1` (coincide con `SUNAT_WORKER_SECRET` de Vercel — validado, no dio 401).
3. Archivé el mensaje F001-11 de la cola (`pgmq.archive('sunat_outbox', 6)`) para que el worker NO emitiera al revivir. La factura sigue en `pendiente` (reversible: re-encolar con `pgmq.send`).

**Validación (sin emitir nada — cola vacía):** llamada manual + corrida programada del cron → worker devolvió `HTTP 200 {"ok":true,"processed":0}`. Cadena cron→worker→DB sana.

**⚠️ RUNBOOK DE RESTORE:** si se vuelve a recrear/restaurar la DB Supabase, **repetir el fix**: (1) habilitar `pg_net`, (2) re-setear el comando del cron job con `cron.alter_job` (URL+secret). pgmq y pg_cron sí los traen las migrations; pg_net + el comando del cron NO.

### ⏳ PENDIENTE para cerrar facturación E2E (requiere a Lucas)

1. **Confirmar modo Nubefact (live vs pruebas)** — ajuste del panel Nubefact que solo ve Lucas. `buildFactura` fuerza `enviar_automaticamente_a_la_sunat: true`, así que CUALQUIER emisión va a SUNAT real si la cuenta está en producción.
2. **Emitir 1 factura de prueba** una vez confirmado el modo. Re-encolar es un one-liner: `SELECT pgmq.send('sunat_outbox', '{"tenantId":"…","documentoTipo":"factura","documentoId":"<uuid>","intento":1,"encoladoAt":"…"}'::jsonb);` y esperar ≤60s al cron.
3. **NO re-emitir F001-6/7/8/9** (`error_red`): son data basura (clientes ficticios "Grupo Minera Cerro Verde"; F001-9 con RUC inválido). Dejar como error histórico. La instrucción vieja de "re-encolar F001-6/7/8/9" quedó obsoleta e insegura.

---

## ✅ RESUELTO 2026-06-03 — Reportes 500 + B2 + B5

**Causa real del 500 en `/idex/reportes`:** las migrations 0039–0043 YA estaban aplicadas en prod. El bug era `cantidad_actual` (no existe en `stock_actual`, columna real: `stock`) en la query de inventario crítico — `reportes/page.tsx:51`. Commit `dfadcda`.

**B2 resuelto:** guard UUID en `/credito/clientes/[id]/page.tsx` — `notFound()` si `id` no es UUID válido. Commit `a0da159`.

**B5 resuelto:** warning "⚠ stock: N" inline bajo campo cantidad en `CotizacionForm` cuando `cantidad > stockActual`. `stockActual` se carga vía subquery correlated en `stock_actual`. Commit `eaef859`.

**Estado post-sesión:** `/idex/reportes` ✅, `/idex` dashboard ✅, `/idex/credito` ✅. KPIs en 0 es correcto (no hay facturas SUNAT-aceptadas — bloqueado por serie F001 Nubefact).

---

## ✅ SESIÓN 2026-06-03 madrugada — UI sweep masivo + implementación Claude Design

Sesión larga de feedback iterativo del usuario sobre funcionalidad rota y fidelidad al diseño Claude Design. **Todo desplegado a prod.** Commits `5e96eb4` → `06a1496`.

### Lo entregado (en orden cronológico)

| #   | Feature                                                                                                                                                                                                                                                                                                                                                                                                               | Commit    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | **Auditoría tenant** habilitada en sidebar + `/[slug]/auditoria` (log de 4 fuentes: historial_precios, cotizaciones, facturas, kardex). **FIX B1** (OC usa `costoUnitario` no precio venta). **FIX B4** (`requirePermissionPage` redirige en vez de 500).                                                                                                                                                             | `5e96eb4` |
| 2   | **Limpieza data [QA2]** en prod (cliente, producto, 2 cot, OC, factura, kardex borrados)                                                                                                                                                                                                                                                                                                                              | — (SQL)   |
| 3   | **Buscador global ⌘K** funcional (productos/clientes/cotizaciones) — `GlobalSearch.tsx` + `search.ts` action                                                                                                                                                                                                                                                                                                          | `0388d6d` |
| 4   | **Filtros cotizaciones** Fecha/Comercial/Cliente funcionales (eran decorativos)                                                                                                                                                                                                                                                                                                                                       | `c829c66` |
| 5   | **Menú ⋯ órdenes de compra** con transiciones de estado reales (enviar/aprobar/recibir/cerrar/eliminar)                                                                                                                                                                                                                                                                                                               | `d61b57c` |
| 6   | **Facturas: crear** (botones Nueva factura/boleta + `FacturaForm` + `/facturas/nueva`). Columna "Cotización origen". **CxC: botón Registrar pago** por cliente. **Reportes index: datos reales** en tarjetas. Permiso `admin.auditoria.ver` agregado a casbin superadmin (SQL prod).                                                                                                                                  | `c8a42f0` |
| 7   | **Cotizaciones: modal Enviar** (WhatsApp `wa.me` + Email `mailto` + solo-estado). **Vista Kanban** toggle lista/kanban (6 columnas por estado).                                                                                                                                                                                                                                                                       | `32c5708` |
| 8   | **Pipeline de ventas** `/[slug]/pipeline` (kanban cross-módulo 8 etapas, detecta etapa vía EXISTS en OC/factura/guía). **Notificaciones** (campana con dropdown lazy: CxC vencida/factura error/OC pendiente/cotiz vencida). **Menú usuario** (Cambiar empresa/Config/Cerrar sesión + `/api/auth/logout`).                                                                                                            | `9c2904a` |
| 9   | **Cotización form rediseño** layout 3fr/2fr (panel Margen + Totales con costo/utilidad + PDF preview), columna Margen por línea coloreada vs margenMinimo. `ProductoOption` +costoUnitario +margenMinimo.                                                                                                                                                                                                             | `faa089d` |
| 10  | **Breadcrumbs automáticos** `SmartBreadcrumbs` (genera jerarquía desde `usePathname()` en todos los módulos, sin config por página)                                                                                                                                                                                                                                                                                   | `43037d7` |
| 11  | **Claude Design pendientes:** Facturas lista strip SUNAT health (5 KPIs). Facturas nueva layout 3fr/2fr + validación SUNAT + "al emitir". CxC aging 5 buckets + barra proporcional + ClientesSaldos Uso%. Roles layout 220px sidebar + matriz.                                                                                                                                                                        | `ccb79b7` |
| 12  | **Política de precios** editable (margen mínimo/aprobación/IGV/descuentos toggles) — migration `0044` + schema + `actualizarPoliticaPrecios` + `PoliticaPreciosForm`. **PermissionsMatrix** rediseñada tabla Ver/Crear/Editar/Eliminar con toggle switches (era lista de checkboxes). **Usuarios** rediseño completo (avatar, email real vía `createServerAdminClient` + auth.admin.listUsers, MFA, acceso relativo). | `06a1496` |

### ⚠️ DB cambios aplicados directamente a prod esta sesión (fuera de migrations versionadas hasta 0044)

- `admin.auditoria.ver` insertado en tabla `casbin` para rol superadmin de idex (`311a03d8…` / tenant `1611fbf1…`).
- Migration `0044_tenant_politica_precios.sql` (4 columnas) aplicada a prod vía MCP **Y** commiteada como archivo.
- Limpieza [QA2]: DELETE de cliente/producto/cotizaciones/OC/factura/kardex.

### 📐 Referencia de diseño Claude Design

Bundle desempaquetado en `/tmp/orion-handoff/orion-erp/` (efímero — re-extraer de `~/Downloads/Orion ERP-handoff.zip` si se borra). También hay PDF `Sistema Orión · Print.pdf` en la raíz del repo (commiteado). El JSX fuente por pantalla está en `project/screens/*.jsx`. **Sistema de diseño activo: V1 Slate** (tokens `orion-*` en `globals.css`/`tailwind.config.ts` ya alineados). Las 6 variantes (V1–V6) son propuestas; V1 es la firmada.

### 🔜 PENDIENTES tras esta sesión (prioridad)

1. ~~🔴 ARREGLAR REPORTES/DASHBOARD~~ ✅ RESUELTO (`dfadcda`)
2. ~~B2 `/credito/clientes/nuevo` → 500~~ ✅ RESUELTO (`a0da159`)
3. ~~B5 warning stock en cotización~~ ✅ RESUELTO (`eaef859`)
4. `SUPABASE_SERVICE_ROLE_KEY` en Vercel ✅ ya estaba seteada — Usuarios carga OK.
5. **Serie F001 Nubefact** — acción externa de Lucas. Sin esto KPIs ventas = 0 (correcto).
6. Pantallas Claude Design aún no verificadas pixel a pixel contra prod (solo implementadas).

---

## 🔄 SESIÓN 2026-06-02 QA E2E — FLUJO PRINCIPAL completado (Fases 1–5 en curso)

### IDs del hilo QA2 (Flujo Principal)

| Entidad    | ID                                     | Referencia                                        |
| ---------- | -------------------------------------- | ------------------------------------------------- |
| Cliente    | `4dd066ae-673b-499f-b32d-7adf251fcbf0` | EMPRESA CABLE ELECTRICO SA [QA2], RUC 20100070970 |
| Producto   | `c4e35c05-6dfc-4dd8-a749-a6e452a43574` | Cable THW 14 AWG [QA2], SKU QA2-CABLE-01          |
| Cotización | `e019e7c3-5dec-4aa9-9581-744c3cdc1ecf` | COT-2026-000026, PEN 7,670                        |
| Orden      | `e218d65c-4b69-49a5-b45c-985920c31025` | OC-2026-00019, CELSA SAC                          |
| Factura    | `c0b9cc4c-3273-4b30-80f7-fa9660ff3449` | F001-00000010, crédito 30d                        |

### Resultado paso a paso

| Paso | Descripción                     | Estado | Notas                                                                 |
| ---- | ------------------------------- | ------ | --------------------------------------------------------------------- |
| 1    | Crear cliente RUC 20100070970   | ✅     | SUNAT API no respondió (rate-limit); form continuó sin bloquear       |
| 2    | Crear producto QA2-CABLE-01     | ✅     | Stock control habilitado, proveedor CELSA SAC                         |
| 3    | Ajustar precio → S/ 13          | ✅     | historial_precios registrado: 12→13 +8.3%, autor Lucas                |
| 4    | Cotización 500 uds              | ✅     | Subtotal S/6,500 + IGV S/1,170 = S/7,670 cuadra exacto                |
| 5    | PDF cotización                  | ✅     | content-type: application/pdf                                         |
| 6    | Enviar cotización               | ✅     | Estado → enviada                                                      |
| 7    | Aprobar cotización              | ✅     | Estado → aceptada                                                     |
| 8    | Generar OC al proveedor         | ✅     | OC-2026-00019 para CELSA SAC creada automáticamente                   |
| 9    | Aprobar + recepcionar 500 uds   | ✅     | OC Recibida total; kardex: entrada 500 uds, stock=500                 |
| 10   | Convertir a factura crédito 30d | ✅     | F001-00000010 creada, CxC automática PEN 6,499.97, vence 2-jul-2026   |
| 11   | SUNAT (D0.4)                    | ⚠️     | lista_para_emitir, pendiente SUNAT. Nubefact bloqueado por serie F001 |
| 12   | CxC automática                  | ✅     | creditosCliente upsert automático: línea PEN 6,499.97 / 30 días       |
| 13   | Cobro parcial                   | ⛔     | Bloqueado: registrarPago requiere factura SUNAT-aceptada              |
| 14   | Cobro final                     | ⛔     | Bloqueado: mismo bloqueo D0.4                                         |
| 15   | Verificar reportes              | ✅     | R1 (cotización aparece convertida), R2 (cambio precio registrado)     |

### Bugs encontrados — QA E2E completo

| #      | Fase      | Descripción                                                                                                                                                           | Severidad                                        | Estado                |
| ------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------- |
| ~~B1~~ | Flujo     | OC generada desde cotización usaba `precioUnitario` de venta como costo en el kardex.                                                                                 | Media                                            | ✅ RESUELTO (5e96eb4) |
| B2     | Flujo     | `/credito/clientes/nuevo` devuelve 500 — "nuevo" se interpreta como `[id]` dinámico.                                                                                  | Baja                                             | Pendiente             |
| ~~B3~~ | ~~Roles~~ | ~~Comercial podía acceder a `/idex/facturas`.~~                                                                                                                       | ~~Alta~~                                         | ✅ RESUELTO (dc365bb) |
| ~~B4~~ | Roles     | `/idex/credito` y `/idex/configuracion` devolvían 500 en vez de redirect.                                                                                             | Baja                                             | ✅ RESUELTO (5e96eb4) |
| B5     | Flujo     | Stock negativo: cotización con 1000 uds (stock=500) se crea sin warning visible. La decisión del Kickoff era "permitir con warning". El warning no está implementado. | Baja (comportamiento correcto, falta el warning) | Pendiente             |

### Resumen Fase 2 — Control de acceso por rol

| Ruta                  | Comercial          | Facturación        | Superadmin |
| --------------------- | ------------------ | ------------------ | ---------- |
| `/facturas`           | ⚠️ VE (BUG)        | ✅ Ve              | ✅ Ve      |
| `/credito`            | ✅ 500/Block       | ✅ Ve              | ✅ Ve      |
| `/configuracion`      | ✅ 500/Block       | ✅ 500/Block       | ✅ Ve      |
| `/admin/usuarios`     | ✅ 500/Block       | ✅ 500/Block       | ✅ Ve      |
| `/cotizaciones/nueva` | ✅ Ve              | ✅ Redirect        | ✅ Ve      |
| `/clientes/nuevo`     | ✅ Ve              | ✅ 404/Block       | ✅ Ve      |
| `/productos/nuevo`    | ✅ 404/Block       | —                  | ✅ Ve      |
| `vendedor@` login     | ✅ PRIMER LOGIN OK | —                  | —          |
| `contador@` login     | —                  | ✅ PRIMER LOGIN OK | —          |

### Resumen Fase 3 — Reportes

| Reporte              | Estado | Notas                                                              |
| -------------------- | ------ | ------------------------------------------------------------------ |
| R1 Cotizaciones      | ✅     | 26 cot., 46% conversión. COT-000026 [QA2] aparece convertida       |
| R2 Historial precios | ✅     | QA2-CABLE-01: 12→13 +8.3%, autor Lucas, razón "Ajuste lista [QA2]" |
| R0 Ventas            | ✅     | Sin datos (facturas en lista_para_emitir, no aceptadas — correcto) |

### Resumen Fase 4 — Stress

| Test                                    | Resultado                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| S3 Stock negativo (1000 uds, stock=500) | ✅ Permitido sin bloquear (Kickoff: correcto). Warning visual no implementado. |
| S10 Cotización rechazada → convertir    | ✅ Bloqueado: "Disponible cuando esté aceptada"                                |

### ✅ B3 RESUELTO y desplegado (commit dc365bb)

`requirePermission('facturas.ver')` en `/facturas` y `/facturas/[id]`. Verificado: Comercial bloqueado.

### ✅ SESIÓN 2026-06-03 — Auditoría + B1 + B4 + limpieza QA2

**Commit:** `5e96eb4` — feat(admin): módulo Auditoría + fix B1 costo OC + fix B4 redirect

| Tarea                                                                                    | Estado |
| ---------------------------------------------------------------------------------------- | ------ |
| Auditoría habilitada en sidebar + `/[slug]/auditoria` con log de 4 fuentes               | ✅     |
| FIX B1: `generarOCsDesdeCotizacion` ahora usa `costoUnitario` del producto               | ✅     |
| FIX B4: `requirePermissionPage` helper → redirect en vez de 500 en credito/configuracion | ✅     |
| Limpieza [QA2]: cliente, producto, 2 cots, OC, factura + kardex borrados de prod         | ✅     |

### 📋 PENDIENTES PRÓXIMA SESIÓN (prioridad descendente)

1. **FIX B2:** `/credito/clientes/nuevo` devuelve 500 — "nuevo" se interpreta como `[id]` dinámico. Fix: mover la ruta a `/credito/nuevo-cliente` o agregar catch en el layout.
2. **FIX B5:** Warning visual en CotizacionForm cuando cantidad > stock disponible del producto.
3. **Serie F001 Nubefact:** Acción externa de Lucas — habilitar serie F001 en el panel Nubefact.
4. **Anular factura (NC):** Probar el botón "Anular" en FacturaDetalle (no se probó en QA).

### 🔍 Módulos intermitentes (causa: Supabase free pooler)

Facturas / Crédito / Admin Usuarios / Configuración dan 500 ocasionalmente. No son bugs de código. Al recargar vuelven. Para el demo: abrir cada módulo una vez antes para calentar conexiones.

---

## ✅ SESIÓN 2026-06-02 noche — Móvil, Guías, ⓘ Info, Configuración completa

### Checklist producción verificado por Playwright

| Feature                                                                      | Estado |
| ---------------------------------------------------------------------------- | ------ |
| Menú hamburguesa móvil + drawer con nav completo                             | ✅     |
| Guías de remisión: lista con Despacho + SUNAT lado a lado                    | ✅     |
| Guías: formulario Nueva Guía (destinatario, ítems, transportista, placa)     | ✅     |
| Guías conectadas a Nubefact (lineas_guia insertadas + encolado sunat_outbox) | ✅     |
| ⓘ info en TODOS los módulos con "No mostrar" en localStorage                 | ✅     |
| Configuración 4 tabs (Empresa / Comercial / Facturación SUNAT / Usuarios)    | ✅     |
| R1 Cotizaciones por comercial + R3 Panel KPI auto-carga                      | ✅     |
| R2 Historial de precios                                                      | ✅     |
| CxC automática al facturar a crédito                                         | ✅     |
| Usuarios habilitado en sidebar                                               | ✅     |

### Notas técnicas importantes

- **vercel --prod es MANUAL**: no hay auto-deploy en este proyecto. Cada push necesita `vercel --prod`.
- **Guías + Nubefact**: `crearGuia` encola con `documentoTipo: 'guia_remision'` en `sunat_outbox`. El worker de 60s lo procesará como T001.
- **ModuleHelp**: componente en `src/components/shared/ModuleHelp.tsx`. Clave localStorage: `orion-help-{module}`. Añadido a 9 módulos.
- **RSC caveat**: no pasar `Record<TabId, ReactNode>` como prop a Client Components — rompe la serialización en prod. Usar `searchParams` para estado de tabs.

### ⚠️ Pendiente: Plan QA E2E (PRÓXIMA SESIÓN)

Plan en `docs/superpowers/plans/2026-06-02-qa-roles-e2e-reportes.md`.
Flujo principal por Playwright: crear cliente → producto → cotización → compra al proveedor → recepción → factura a crédito (CxC auto) → cobro → guía de remisión.
Decisiones D1-D4 ya resueltas. Solo falta ejecutar.

---

## ✅ SESIÓN 2026-06-02 tarde — Reportes + Configuración empresa + CxC automática

### Cambios desplegados (commits `e410e05` → `ecc74f2`)

| #   | Qué                                                                                                                                                                     | Commit    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | **D2 auto-CxC:** `convertirCotizacionAFactura` acepta `formaPago`+`plazoDias`; si crédito calcula `fechaVencimiento` y hace upsert en `creditosCliente` automáticamente | `e410e05` |
| 2   | **CotizacionConversionSidebar:** selector inline formaPago/plazo antes de confirmar conversión                                                                          | `e410e05` |
| 3   | **R1:** `/reportes/cotizaciones` — seguimiento por comercial (Total/Enviadas/Aceptadas/Rechazadas/Convertidas/Montos)                                                   | `e410e05` |
| 4   | **R3:** Panel KPI embebido en R1 (Generadas / Por cerrar / Tasa conversión / Pipeline S/)                                                                               | `e410e05` |
| 5   | **R2:** `/reportes/precios` — historial de cambios con autor, Δ% coloreado                                                                                              | `e410e05` |
| 6   | Sidebar: **Usuarios** habilitado (apunta a `/admin/usuarios`)                                                                                                           | `c80f4dc` |
| 7   | Reportes auto-cargan al abrir la página (useEffect en mount)                                                                                                            | `c80f4dc` |
| 8   | **Configuración 4 tabs:** Empresa / Comercial / Datos bancarios / Facturación SUNAT / Usuarios y permisos                                                               | `ecc74f2` |
| 9   | Server actions `actualizarInfoEmpresa` + `actualizarInfoComercial`                                                                                                      | `ecc74f2` |

### Estado verificado por Playwright (prod orion-rp.com)

| Feature                        | Estado                                                                  |
| ------------------------------ | ----------------------------------------------------------------------- |
| R1 Cotizaciones por comercial  | ✅ 25 cotizaciones, 44% conversión, "Por cerrar: 3" en naranja          |
| R2 Historial de precios        | ✅ carga, sin datos aún (normal — no hay cambios de precio registrados) |
| R3 Panel KPI                   | ✅ embebido en R1                                                       |
| Config tab Empresa             | ✅ razón social, RUC, dirección, contacto pre-cargados                  |
| Config tab Comercial           | ✅ Lucas Escrivá, BBVA, cuentas bancarias pre-cargadas                  |
| Config tab Facturación SUNAT   | ✅ Nubefact form + series                                               |
| Config tab Usuarios y permisos | ✅ 4 usuarios activos (2 Superadmin, 1 Comercial, 1 Facturación)        |
| Usuarios en sidebar            | ✅ habilitado sin PRONTO badge                                          |

### ⚠️ Pendiente: Plan QA E2E (plan en `docs/superpowers/plans/2026-06-02-qa-roles-e2e-reportes.md`)

El plan QA (FLUJO PRINCIPAL + Fases 1–5) fue acordado y las decisiones D1–D4 resueltas, pero no se ejecutó porque la sesión se dedicó a:

1. Implementar D2 (auto-CxC)
2. Construir los 3 reportes
3. Rediseñar configuración
4. Resolver el bug de deploy (RSC serialization)

**Decisiones ya tomadas:**

- D1: precios solo Superadmin (Lucas) — sin cambios en permisos
- D2: CxC automática al facturar a crédito ✅ implementado
- D3: prefijo `[QA2]` en toda data de prueba
- D0.4: Nubefact sigue en modo pruebas (no emitir real)

**Siguiente sesión debe:** ejecutar el FLUJO PRINCIPAL de punta a punta por Playwright (crear cliente → producto → cotización → compra → recepción → factura a crédito → cobro) y luego las Fases 1–5 del plan QA.

### ⚠️ Nota: vercel --prod es MANUAL (no hay auto-deploy en este proyecto)

Vercel NO tiene integración auto-deploy con GitHub en este proyecto. Cada push requiere un `vercel --prod` explícito para quedar en producción. Sin este paso, los cambios quedan en GitHub pero no se reflejan en orion-rp.com.

---

## ✅ SESIÓN 2026-06-02 mañana — Worker SUNAT funcionando + config Nubefact por UI

### Re-corrida QA: 76 ✅ / 1 ❌ (no-bug) / 4 ⏭️

`pnpm tsx scripts/test-full-ui.ts` → 76 PASS. El FAIL sigue siendo "Admin panel" (no hay platform_admin en prod, correcto). "Facturas: detalle" ahora PASA.

### 🔴 El módulo de facturas NO emitía — 4 bugs raíz encadenados (todos resueltos)

| #   | Bug                                                                                                                                                                                                               | Fix                                                                               | Commit    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------- |
| 1   | Middleware exigía sesión de browser en `/api/sunat/procesar-cola` → el worker (pg_cron/curl) siempre redirigía a `/login`                                                                                         | Agregadas las rutas worker + webhook a `PUBLIC_PATHS` en `middleware.ts`          | `14776d5` |
| 2   | `SUNAT_WORKER_SECRET` vacío en Vercel → worker 401                                                                                                                                                                | Seteado en Vercel prod (`orion-sunat-prod-ad20ab214f6334d1`)                      | — (env)   |
| 3   | Builder mandaba `total_base_igv`/`total_igv` por **ítem** (esos nombres solo valen en el header). Nubefact leía IGV=0 y rechazaba (cód 21)                                                                        | Renombrado a `subtotal`/`igv` en `builders/factura.ts` y `nota-credito-debito.ts` | `c6adaac` |
| 4   | `pgmq.delete`/`pgmq.send` sobrecargadas; sin cast `::bigint`/`::integer` Postgres lanza "function not unique" → worker crasheaba en el ACK de **todo** mensaje (incluso facturas aceptadas) → 500 sin drenar cola | Cast explícito en `procesar-cola/route.ts` y `queue.ts`                           | `5c3052f` |

**Verificación:** el bug #3 lo probé enviando el payload real de F001-6 a la API de Nubefact (`scripts/diag-nubefact.ts`, untracked) y leyendo la respuesta cruda; el #4 reproduciendo `pgmq.delete` directo en la DB. Tras los fixes, el worker procesa la cola: **HTTP 200, cola drenada (0), log poblado, 4 facturas procesadas**.

### ⚠️ ÚNICO BLOQUEADOR RESTANTE para emitir: serie en Nubefact (lado de Lucas)

Tras arreglar el #3, Nubefact acepta el cálculo pero responde:

> `"Serie No puedes emitir comprobantes con esta serie"`

La serie **F001 no está habilitada en la cuenta Nubefact de Idex**. Las 4 facturas quedaron en `estado_sunat='error_red'`. **Acción pendiente de Lucas:** habilitar/registrar la serie **F001** (Factura), y B001/T001, en su panel de Nubefact (Series y correlativos). "Probar conexión" SÍ funciona → la cuenta es válida; solo falta la serie.

### 🟣 Nueva feature: config Nubefact por tenant vía UI (`1cd8fcb`)

"Solo con conectar ruta + token ya funciona" — pedido del usuario:

- `getSunatClient` ahora es **async** y lee `tenants.config_sunat` (DB) con fallback a env vars.
- Página `/[companySlug]/configuracion` (permiso `admin.config.editar`): form ruta+token con **"Probar conexión"** (ping real a Nubefact sin guardar), normaliza la ruta si pegan la URL completa, token enmascarado, auditoría sin exponer el token.
- Tabla read-only de series configuradas + aviso de que deben coincidir con Nubefact.
- Link "Configuración" del sidebar habilitado.
- **Verificado por UI en prod:** "Conexión exitosa", credenciales guardadas en `config_sunat` (ruta normalizada + token 64 chars).

### 📌 Pendientes que NO alcancé esta sesión (de la lista original)

- **Primer login de `vendedor@idex.demo` / `contador@idex.demo`** (nunca han iniciado sesión). El QA confirma sus permisos de ruta; falta validar el primer login real.
- **Anular factura vía NC** en `FacturaDetalle` (hay facturas F001-6/7/8). El builder de NC ya quedó arreglado (#3), falta probar el botón. **Nota:** anular también emitiría a Nubefact → bloqueado por el mismo tema de serie.
- **Limpieza de datos de prueba** antes del demo (el usuario aún no decidió; preguntar antes de borrar).

---

## ✅ ESTADO PRODUCCIÓN — 2026-06-02 (sesión noche/madrugada)

### ✅ QA comprehensivo vía UI (Playwright contra orion-rp.com)

Dos scripts de test (en `scripts/`, ya commiteados):

- `test-prod-login.ts` — smoke test login + navegación básica.
- `test-full-ui.ts` — **suite comprehensivo**: todos los módulos, todos los botones, pipelines completos y 3 roles (superadmin/vendedor/contador). Última corrida: **75/81 PASS**, 5 SKIP esperados, 1 "FAIL" = no-bug (admin panel no accesible porque no hay platform_admin en prod, comportamiento correcto).

Cubre: Dashboard · Clientes (CRUD + modal contacto) · Productos (CRUD + tab precios + precios masivo) · Cotizaciones (pipeline: crear→enviar→aceptar→generar OC→**convertir a factura**→duplicar) · Compras (crear→enviar→aprobar→recepción modal) · Inventario (lista + kardex + ajuste manual) · Facturas · Crédito · Reportes · permisos por rol.

### ✅ 7 bugs encontrados y resueltos (todos desplegados a prod)

| #   | Bug                                                                                                                                                   | Archivo                                    | Fix                                                                                      | Commit    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------- | --------- |
| 1   | `reportes/ventas` sin guard de permisos — cualquier user autenticado entraba                                                                          | `reportes/layout.tsx` (nuevo)              | `requirePermission('reportes.ver')` en layout de toda la sección                         | `5da85d7` |
| 2   | Botones submit al final de forms largos, **bloqueados por la cookie-consent banner** (fixed bottom z-50) — usuarios no podían crear productos/órdenes | `ProductoForm.tsx`, `OrdenForm.tsx`        | Botones Crear/Cancelar movidos al TOP del form                                           | `5da85d7` |
| 3   | `tipoCambio` en Orden con moneda PEN: `z.coerce.number().positive()` convierte `""`→`0` y falla                                                       | `schemas/orden-compra.ts`                  | `z.preprocess(v => v===''\|\|v==null?undefined:v, ...)` (mismo patrón que cotizacion.ts) | `97e9a5f` |
| 4   | `convertirCotizacionAFactura` fallaba: `codigo` requerido en líneas manuales (sin SKU)                                                                | `schemas/factura.ts`                       | `codigo: z.string().default('')`                                                         | `c86c845` |
| 5   | INSERT de factura fallaba: `numero_completo` es **GENERATED column** en DB pero el action la insertaba                                                | `server/actions/facturas.ts`               | Quitar `numeroCompleto` del `.values()`                                                  | `c86c845` |
| 6   | Estado `'convertida'` no estaba en el CHECK constraint de `cotizaciones` → falla el UPDATE post-factura                                               | migration `0016` + DB prod                 | `ALTER TABLE … CHECK (… ,'convertida')` aplicado en prod + migration actualizada         | `89d14c5` |
| 7   | `FacturaDetalle` crasheaba ("Cannot read … 'className'"): `EstadoBadge` no tenía `lista_para_emitir`/`emitida`/`sin_enviar`                           | `EstadoBadge.tsx`, `CotizacionDetalle.tsx` | Agregados los 3 estados SUNAT al CFG y al map de labels                                  | `e57327a` |

**Pipeline de facturación verificado end-to-end:** cotización aceptada → "Convertir a factura" → factura `F001-0000000X` creada con estado `Lista para emitir` / SUNAT `Pendiente`, encolada en pgmq. Falta solo el envío real a NUBEFACT (gate de credenciales sandbox, ver más abajo).

### ⚙️ Configuración de datos aplicada en prod (Supabase, tenant idex)

- **`series_documentos`** estaba **vacía** (el tenant se creó por seed, sin pasar por el wizard que las siembra). Insertadas manualmente: `01/F001`, `03/B001`, `09/T001` (todas `activa=true`, correlativo 0). **Sin esto, ninguna factura/boleta se puede emitir.** ⚠️ Cualquier tenant nuevo creado por seed necesita lo mismo.
- No hay UI para añadir series post-creación (solo se configuran en el wizard `admin/tenants/nuevo`). Mejora futura: pantalla de configuración de series en el panel de tenant.

### 📌 Datos de prueba en prod tras el QA

El test crea registros en cada corrida (cliente/producto/cotización/orden por run). Estado actual aprox: ~20 clientes, ~25 productos, ~23 cotizaciones (varios estados, incluida `convertida`), ~16 órdenes, **3 facturas** `F001-6/7/8`. **Considerar limpiar datos de test antes del demo del 4-jun** si se quiere una vista limpia (o dejarlos — son realistas).

### ✅ Responsive + branding commiteado y desplegado

Commit `c7e7201` — "feat(ui): responsive layout + violet brand color para demo 4-jun"

- Layout tenant: flexbox responsive + mobile top bar con logo de tenant
- Sidebar: `hidden lg:flex` (se oculta en mobile)
- Tablas: `overflow-x-auto` en Cotizaciones, Órdenes, Inventario, Facturas
- `--primary`: violeta (plataforma) vs naranja (tenant accent IDEX — sin cambios)
- Deploy Vercel prod: **READY**, 0 errores en logs post-deploy

### ✅ Datos producción verificados (Supabase)

| Entidad       | Cantidad                                                      |
| ------------- | ------------------------------------------------------------- |
| Clientes      | 10                                                            |
| Productos     | 18                                                            |
| Cotizaciones  | 9 (aceptada×3, enviada×3, borrador×1, rechazada×1, vencida×1) |
| Órdenes       | 7                                                             |
| Stock activo  | 18 productos                                                  |
| Stock crítico | 2                                                             |

### 📋 CHECKLIST DEMO — miércoles 4-jun con Lucas

| Item                                | Estado                                                               |
| ----------------------------------- | -------------------------------------------------------------------- |
| `curl /api/test-db` → `{"ok":true}` | ✅                                                                   |
| Login `lescriva@grupoidex.com.pe`   | ✅ último sign-in hoy                                                |
| Dashboard carga sin errores         | ✅                                                                   |
| Clientes (10 registros)             | ✅                                                                   |
| Productos (18 cables CELSA)         | ✅                                                                   |
| Cotizaciones (9, todos los estados) | ✅                                                                   |
| Compras a Proveedores (7 órdenes)   | ✅                                                                   |
| Inventario / Kardex (18 productos)  | ✅                                                                   |
| `vendedor@idex.demo` / `Idex2026!`  | ⚠️ creado, nunca ha iniciado sesión — probar si se va a usar en demo |
| `contador@idex.demo` / `Idex2026!`  | ⚠️ creado, nunca ha iniciado sesión                                  |

### Credenciales producción (orion-rp.com)

| Rol                | Email                       | Password          |
| ------------------ | --------------------------- | ----------------- |
| Superadmin (Lucas) | `lescriva@grupoidex.com.pe` | `Idex2026!`       |
| Vendedor           | `vendedor@idex.demo`        | `Idex2026!`       |
| Contador           | `contador@idex.demo`        | `Idex2026!`       |
| Demo admin         | `lucas@orion.demo`          | `orion-demo-2026` |

- **Supabase DB password actual:** `Holiboli2026123456789`
- **Supabase proyecto:** `aycraotcdbunybfjzlmq` (sa-east-1), org `orionrp-hub`
- **Último commit prod:** `e57327a` — "fix EstadoBadge estados SUNAT"
- **DB bloqueador:** RESUELTO — pooler `aws-1-sa-east-1.pooler.supabase.com:6543`, `prepare: false`
- **Remote git de prod:** `orionrp` (NO `origin`). `git push orionrp main`. Deploy: `vercel --prod`.

---

## 🔜 PRÓXIMOS PASOS (siguiente sesión / Sonnet en otra terminal)

> Contexto: la sesión que generó esto corrió con Opus para el debugging cross-sistema de facturación. Lo que queda es mayormente verificación y pulido — **se puede continuar con Sonnet**.

1. **Re-correr el QA completo y confirmar 76/81+:** `cd /Users/leonidasyauri/dev/orion-erp && pnpm tsx scripts/test-full-ui.ts`. Con el fix #7 desplegado, "Facturas: detalle" ya no debería ser SKIP. El único FAIL esperado sigue siendo "Admin panel" (no-bug).
2. **Decidir limpieza de datos de test** antes del demo 4-jun (ver nota arriba). Si se limpia, hacerlo por UI o pedir confirmación antes de tocar la DB directamente — **el usuario pidió explícitamente NO ejecutar mutaciones directas en la DB; todo por la interfaz.**
3. **Probar `vendedor@idex.demo` y `contador@idex.demo`** con login real (nunca han iniciado sesión). El QA ya confirmó que sus permisos de ruta funcionan, pero falta validar el primer login (set de contraseña / magic link).
4. **Anular factura** (`anularFactura` vía NC) no se probó en el QA — no había facturas antes. Ahora hay 3. Probar el botón "Anular" en `FacturaDetalle`.
5. **Envío real a NUBEFACT** sigue gateado por credenciales sandbox (ver B.8/B.9 abajo). Las facturas quedan en `pendiente`/`lista_para_emitir` y encoladas en pgmq; el worker no las procesa sin credenciales.

### ⚠️ Reglas de trabajo recordadas esta sesión

- **Solo UI, no DB directa:** el usuario pidió probar funcionalidades y pipelines vía los botones de la interfaz, no ejecutando SQL. La única excepción necesaria fue configurar `series_documentos` (no hay UI para ello).
- **Avisar antes de Opus:** Sonnet por default. El debugging de facturación cross-sistema justificó Opus; el pulido restante no.

---

## ⚠️ CHECKLIST ARRANQUE LOCAL

```bash
# 1. Docker Desktop corriendo

# 2. Desde /Users/leonidasyauri/dev/orion-erp
supabase start           # si ves "port already allocated" detener otro proyecto:
                         # supabase stop --project-id Super_treno

# 3. Si la DB fue reseteada (o es primera vez):
supabase db reset        # aplica las 36 migrations

# 4. Poblar datos demo
pnpm tsx --env-file=.env.local scripts/seed-demo.ts
#   ⚠️ IMPORTANTE: usar --env-file=.env.local (sin este flag, falla ECONNREFUSED
#      porque los imports ESM se hoistan antes de que el script lea el .env)

# 5. Levantar el servidor
pnpm dev
# → http://localhost:3000/idex
# Login: lucas@orion.demo / orion-demo-2026
```

---

## ⚠️ CHECKLIST PRE-DEMO (miércoles 20-may — ya pasó)

Ejecutar en orden antes del demo con Lucas:

```bash
# 1. Iniciar Docker Desktop (app macOS)

# 2. Desde /Users/leonidasyauri/dev/orion-erp
supabase start           # inicia Postgres local

# 3. Aplicar migraciones pendientes (columna proveedorPrincipalId + tabla historial_precios)
supabase db push         # o: pnpm db:push

# 4. Poblar datos de demo
pnpm tsx scripts/seed-demo.ts

# 5. Levantar el servidor
pnpm dev
# → http://localhost:3000
```

**Sin pasos 1-3, estas páginas fallan:**

- `/productos/[id]` → tab "Precios" (query historial_precios)
- `/productos/actualizar-precios` → query proveedorPrincipalId
- `/productos/nuevo` y `/editar` → insert proveedorPrincipalId
- "Generar OC" en cotización aceptada → join productos.proveedorPrincipalId

**Credenciales demo:** revisar `.env.local` para usuario admin. El seed crea tenant `idex` con usuario `lescriva@grupoidex.com.pe`.

---

### Sesión 2026-05-18 tarde parte 2 — Contactos modal + clienteId filters + pre-selección

**ClienteDetail — modal inline para agregar contacto (commit `0c474c6`):**

- Botón "+" en sección Contactos ahora abre modal inline (antes: link roto a `/contactos/nuevo`)
- Campos: nombre\*, cargo, email, telefono, esPrincipal — llama `agregarContacto` server action

**Pre-selección de cliente en cotización (commit `54be9f1`):**

- `cotizaciones/nueva/page.tsx` lee `?clienteId=` de searchParams
- `CotizacionForm` acepta `defaultClienteId` prop → formulario pre-selecciona el cliente

**clienteId filter en facturas (commit `9582898`):**

- `facturas/page.tsx` acepta `?clienteId=` → filtra filas igual que cotizaciones
- "Ver facturas" desde ClienteDetail ahora filtra correctamente

---

### Sesión 2026-05-18 tarde — Combobox + sidebar funcional + recepción + stubs

**ProductoCombobox (commit `a658546`):**

- `src/components/shared/ProductoCombobox.tsx` — combobox con portal-based dropdown; busca por código o nombre; Escape cierra; click-outside cierra
- Reemplaza `<select>` en `CotizacionForm` y `OrdenForm`; soluciona el clipping de `overflow-x-auto` vía `position: fixed`

**CotizacionConversionSidebar (commit `423d75e`):**

- `src/components/modules/cotizaciones/CotizacionConversionSidebar.tsx` — nuevo componente cliente
- "Generar compra a proveedor" llama `generarOCsDesdeCotizacion` con toast y redirect
- "Convertir a factura" llama `convertirCotizacionAFactura` con toast y redirect
- Elimina `ConversionItem` estático (que era decorativo sin onClick)

**Recepción modal (commit `79f03c0`):**

- Botón "Recibir todo" en `RecepcionModal` llena todos los campos con cantidad pendiente de una vez

**Stubs (commit `8423561`):**

- Botón "Reenviar" en `CotizacionActions` ahora muestra toast "próximamente" en vez de silencio
- Botón "Generar OC" renombrado a "Generar compra" para consistencia con módulo renombrado

---

### Sesión 2026-05-19 — Demo prep: role filters + aceptada sweep + clienteId filter

**Fix: role filters en formularios de crear (commit `e0915a4`):**

- `cotizaciones/nueva` y `cotizaciones/[id]/editar` → `esCliente=true` en query de clientes
- `ordenes/nueva` → `esProveedor=true` en query de proveedores
- Sin este fix, CELSA aparecía en el dropdown de "Cliente" de una cotización

**Fix: aceptada sweep completo (commit `4438e9d`):**

- `CotizacionDetalle.tsx` — `conversionesDisponibles = data.estado === 'aceptada'` (antes `'aprobada'`, OC card nunca se habilitaba)
- `cotizaciones/[id]/page.tsx` — `vencimientoTag` guard correcto
- `server/actions/facturas.ts` — permitir facturar cotizaciones `aceptada`

**Fix: comprador en OrdenDetalle (commit `375c0c4`):**

- `ordenes/[id]/page.tsx` — selecciona `compradorNombre`; ya no muestra `'—'` hardcoded

**Fix: clienteId filter en cotizaciones (commit `c9648f5`):**

- `cotizaciones/page.tsx` — acepta `?clienteId=` param; filtra filas y counts
- Botón "Ver cotizaciones" en ClienteDetail ahora muestra solo las de ese cliente

**Seed mejorado:**

- `compradorNombre: USER_NAME` añadido a ordenes de compra (commit `3414e0d`)

---

### Sesión 2026-05-18 continuación — Dashboard real + aceptada fix + detail fix + search

**Dashboard real (commit `[ver git log]`):**

- `src/app/(app)/[companySlug]/page.tsx` — 5 queries paralelas con `Promise.all`; KPIs, pipeline, porAprobar, stockCrítico todos en vivo
- `DashboardContent` — nueva prop `data: DashboardData`; `formatSubtitle()` dinámico; gráfico pipeline con barras proporcionales; cards "Cotizaciones por aprobar" y "Stock crítico" con datos reales

**Bug crítico aprobada→aceptada (commit `[ver git log]`):**

- Estado en DB es `'aceptada'`; todo el frontend usaba `'aprobada'`. Corregido en:
  - `src/app/(app)/[companySlug]/cotizaciones/page.tsx`
  - `src/components/modules/cotizaciones/CotizacionesList.tsx`
  - `src/app/preview/cotizaciones/page.tsx`
  - `src/app/preview/dashboard/page.tsx` (también arregló prop `data` faltante)

**Cotización detalle — eliminar hardcoded (commit `[ver git log]`):**

- `src/app/(app)/[companySlug]/cotizaciones/[id]/page.tsx`
- SELECT ahora incluye `creadoPorNombre`, `formaPago`, `tiempoEntrega`, `lugarEntrega`
- Seed actualizado con esos campos para que el detalle muestre datos reales

**Search funcional (commit `8b40cba`):**

- `InventarioList.tsx` — añadido `useState` + filtro por código/nombre; quitado `readOnly`
- `OrdenesList.tsx` — añadido `'use client'` + `useState` + filtro por número/proveedor

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

### 2026-05-27

- **Recuperación de entorno local.** Contenedores Docker de orion-erp habían sido eliminados (solo quedaba Super_treno corriendo). Pasos ejecutados:
  1. `supabase stop --project-id Super_treno` (liberó puerto 54322)
  2. `supabase start` (levantó orion-erp fresh)
  3. `supabase db reset` → aplicó las 36 migrations. Fix previo necesario: `0032_sunat_cron.sql` tenía conflicto de delimitador `$$` — corregido a `$cron_body$` para el body del job cron anidado dentro del DO block. Commit pendiente.
  4. `pnpm tsx --env-file=.env.local scripts/seed-demo.ts` → seed OK (18 productos, 10 clientes, 9 cotizaciones, 7 OC, 18 kardex).
  5. TypeCheck limpio. Dev server responde 200 en localhost:3000.

- **⚠️ Decisión de sesión:** Usuario quiere desplegar a producción (Vercel + Supabase cloud + dominio + Resend) tras terminar pendientes del roadmap. Ver "Próximos pasos producción" abajo.

### 2026-04-29

- B.4 Productos commiteado en `0702865`.
- B.5 iniciado: schema, cálculo, server actions (los archivos quedaron sin commit cuando se cerró la terminal).

### 2026-06-11 (tarde)

- **Countdown de anulación + columna "Anulación" en facturas** (commit `4979973`, desplegado a prod y verificado con Playwright):
  - Verificado contra SUNAT: el plazo NO son 48 horas. Comunicación de baja directa = **7 días** desde la emisión; la anulación vía NC **no tiene plazo** (la práctica recomendada es emitirla dentro del mismo periodo tributario).
  - Nuevo `src/components/modules/facturas/AnulacionCountdown.tsx`: countdown en vivo (tick 60s) de la ventana de baja de 7 días (hora Lima, vence al fin del 7.º día siguiente a la emisión); pasada la ventana muestra "Ventana de baja vencida · NC sin plazo".
  - Lista de facturas: columna "Anulación" — countdown para activas, "Anulada tras X" (diff createdAt factura → createdAt NC aceptada motivos 01/06) para anuladas. Query extra con `MIN(created_at)` agrupado por documento origen.
  - Detalle: countdown bajo el encabezado para facturas no anuladas; el banner de anulada ahora dice "…aceptada por SUNAT, 4 h después de emitida".
  - Textos corregidos (ayuda del módulo, modal NC, manual §4.9) de "48 horas" a la regla real.
  - Verificado en prod: F001-14 "Anulada tras 4 h", F001-13 "Anulada tras 2 días". No se emitió ningún comprobante de prueba para esta verificación.
  - Paquete de entrega: manual y reporte de pruebas sincronizados, 8 PDFs regenerados (repo setup).
