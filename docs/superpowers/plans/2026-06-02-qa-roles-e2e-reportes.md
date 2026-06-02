# QA E2E por Roles + Reportes de Seguimiento + Data de Prueba Compleja — Plan

> **Para el worker (Sonnet en otra terminal):** Ejecuta este plan tarea por tarea. Los pasos usan checkbox (`- [ ]`). **Reglas del proyecto (OBLIGATORIAS):** todo por la UI con Playwright (botones reales), NO mutaciones SQL directas (excepción ya hecha: `series_documentos`); español peruano (tú/neutro, nunca voseo); git remote de producción es `orionrp` (`git push orionrp main`), deploy `vercel --prod`; actualizar y commitear `docs/HANDOFF.md` tras cada fase. Lee `docs/HANDOFF.md` ANTES de empezar.

**Goal:** Verificar end-to-end que cada rol (Comercial, Facturación, Superadmin) puede realizar todo su trabajo —agregar clientes y productos, actualizar precios, cotizar, comprar a crédito, recepcionar, facturar, cobrar— bajo casos complejos que exijan el sistema; y construir los 3 reportes de seguimiento para que el Superadmin controle la operación.

**Architecture:** App Next.js App Router + Drizzle + Supabase, multi-tenant, RBAC con Casbin (roles base: Superadmin/Comercial/Facturación sembrados por `seed_roles_base_para_tenant`). Producción en orion-rp.com, tenant `idex`. La data de prueba se crea POR LA UI con el rol correcto (eso mismo verifica el flujo). Los reportes nuevos se construyen sobre datos ya existentes (`cotizaciones.creadoPorNombre`, `historial_precios.creadoPorNombre`).

**Tech Stack:** Next.js 14/15, Drizzle ORM, Supabase (Postgres + RLS + pgmq), Casbin, Playwright (MCP) para pruebas de UI, Tailwind + componentes en `src/components/ui/`, Zod, react-hook-form, sonner (toasts).

---

## Contexto crítico (leer antes de ejecutar)

### Credenciales (producción orion-rp.com, tenant `idex`)

| Rol                    | Email                       | Password    | Permiso clave                      |
| ---------------------- | --------------------------- | ----------- | ---------------------------------- |
| Superadmin             | `lescriva@grupoidex.com.pe` | `Idex2026!` | todo el tenant                     |
| Comercial (vendedor)   | `vendedor@idex.demo`        | `Idex2026!` | cotizaciones.crear, clientes.crear |
| Facturación (contador) | `contador@idex.demo`        | `Idex2026!` | facturas.emitir, credito.\*        |

> ⚠️ `vendedor@` y `contador@` NUNCA han iniciado sesión en algunos entornos. Si el login falla, verificar en `tenant_members` (solo lectura) que existan con `rol='comercial'` / `rol='facturación'` y `estado='activo'`, y que la grouping policy de Casbin esté sincronizada (`syncTenantToCasbin`). Si no, invitarlos desde Admin → Usuarios como Superadmin (UI), NO por SQL.

### Matriz de permisos por rol (estado actual del seed `0010_seed_roles_base.sql`)

| Acción                                             | Comercial |     Facturación     | Superadmin |
| -------------------------------------------------- | :-------: | :-----------------: | :--------: |
| clientes ver / crear / editar / exportar           |    ✅     |      solo ver       |     ✅     |
| productos ver                                      |    ✅     |   ✅ (+ver_costo)   |     ✅     |
| **productos crear / editar / actualizar precios**  |    ❌     |         ❌          |     ✅     |
| productos importar (Excel)                         |    ✅     |         ❌          |     ✅     |
| cotizaciones ver / crear / editar / cambiar_margen |    ✅     |      solo ver       |     ✅     |
| cotizaciones aprobar                               |    ❌     |         ✅          |     ✅     |
| ordenes ver                                        |    ✅     |         ❌          |     ✅     |
| ordenes crear / aprobar                            |    ❌     |         ❌          |     ✅     |
| inventario ver                                     |    ✅     | ✅ (+ajuste_manual) |     ✅     |
| facturas ver / emitir / anular / reenviar_sunat    |    ❌     |         ✅          |     ✅     |
| credito ver / otorgar / registrar_pago             |    ❌     |         ✅          |     ✅     |
| guias ver / crear / anular                         |    ❌     |         ✅          |     ✅     |
| reportes ver                                       |    ✅     |   ✅ (+exportar)    |     ✅     |
| admin (usuarios/roles/config)                      |    ❌     |         ❌          |     ✅     |

---

## FASE 0 — Decisiones a resolver con el usuario ANTES de ejecutar

> Estas decisiones cambian qué se prueba y qué se construye. El worker debe confirmarlas con el usuario (Leonidas) en un solo mensaje al inicio y NO asumir.

- [x] **D1 — ¿Quién actualiza precios? → RESUELTO (opción B): solo Lucas/Superadmin.** El comercial NO crea/edita productos ni actualiza precios; eso queda con el Superadmin. Esto YA es el comportamiento actual del sistema, así que **NO se cambian permisos** y **se OMITE la Tarea 0.1**. Consecuencias para el plan:
  - Tarea 1.2 (productos + actualización de precios masiva) se ejecuta como **Superadmin** (`lescriva@grupoidex.com.pe`), no como comercial.
  - En Fase 2.1, verificar que el Comercial está **bloqueado** de crear/editar productos y de "Actualizar precios" (comportamiento correcto, no bug).
  - El Reporte R2 (historial de precios) mostrará como autor a Lucas/admin — sigue siendo útil: el Superadmin audita qué precios cambiaron, cuándo y por qué.

- [ ] **D2 — ¿CxC automático?** Hoy emitir factura con `forma_pago='credito'` NO crea la línea de crédito; hay que ejecutar `otorgarCredito` aparte. ¿Se quiere que al emitir a crédito se cree/actualice automáticamente la CxC del cliente? (Recomendado: sí, crear la cuenta por cobrar al aceptarse la factura por SUNAT). Si sí → ver Tarea 4.5 (opcional, fuera del MVP de este plan; por defecto se prueba el flujo manual actual).

- [ ] **D3 — Limpieza de data previa.** Producción tiene ~20 clientes, ~25 productos, ~23 cotizaciones, ~16 órdenes, varias facturas de QA previo. ¿Limpiar antes de generar la data nueva, o convivir? Recomendado para el demo: NO borrar a ciegas; usar un **prefijo identificable** en toda la data de este plan (clientes y productos con sufijo `[QA2]`, p. ej. "Minera Andina del Sur [QA2]") para poder filtrarla/borrarla después por UI. Confirmar con el usuario.

- [ ] **D0.4 — Modo facturación.** La cuenta Nubefact de Idex está en modo pruebas; la serie real `F001` solo emite tras "Activar con SUNAT". Para este QA, las facturas quedarán `lista_para_emitir` y el worker las marcará según la respuesta de Nubefact. Si el usuario ya activó SUNAT, las pruebas de emisión real usan montos mínimos (1 sol). Ver [[project_nubefact_serie_blocker]] en memoria. Confirmar estado antes de la Fase 4.

### Tarea 0.1: ~~Permiso de edición de precios para Comercial~~ — OMITIDA (D1=B, precios solo Lucas/admin)

> Esta tarea queda anulada por la decisión D1 (opción B). NO crear la migration ni cambiar permisos. Sección conservada solo como referencia histórica.

**Files:**

- Create: `supabase/migrations/0044_comercial_productos_editar.sql`

- [ ] **Step 1: Escribir la migration**

```sql
-- Da al rol Comercial permiso para editar productos y margen (actualizar precios).
-- Idempotente: ON CONFLICT DO NOTHING. Aplica a TODOS los tenants existentes.
INSERT INTO rol_permisos (rol_id, permiso_codigo)
SELECT r.id, p.codigo
FROM roles r
CROSS JOIN (VALUES ('productos.editar'), ('productos.editar_margen')) AS p(codigo)
WHERE r.nombre = 'Comercial'
ON CONFLICT (rol_id, permiso_codigo) DO NOTHING;
```

- [ ] **Step 2: Aplicar en prod por MCP Supabase** (esto es DDL de permisos, equivalente a la excepción `series_documentos`; confirmar con el usuario). Usar `apply_migration` con el contenido anterior.

- [ ] **Step 3: Re-sincronizar Casbin.** Como Superadmin en la UI, ir a Admin → Usuarios o Roles y forzar una acción que dispare `syncTenantToCasbin` (p. ej. reasignar el rol del comercial), o agregar un endpoint temporal. Verificación: loguear como `vendedor@idex.demo` y confirmar que aparece el botón "Actualizar precios" en Productos.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0044_comercial_productos_editar.sql
git commit -m "feat(productos): rol Comercial puede editar productos y precios"
```

---

## FASE 1 — Data de prueba compleja (creada POR LA UI, por el rol correcto)

> Cada bloque se hace logueado con el rol indicado. Crear la data por la UI ES la prueba del flujo. Anotar en `docs/HANDOFF.md` cada ID generado. Todos los nombres llevan sufijo `[QA2]` (ver D3). Usar Playwright; tras cada submit, capturar snapshot y confirmar el toast/redirect.

### Tarea 1.1: Clientes (rol **Comercial** — `vendedor@idex.demo`)

**Objetivo:** ejercitar B2B/B2C, autocompletado SUNAT, validaciones y casos límite.

Crear estos 5 clientes desde `/idex/clientes` → "Nuevo cliente":

- [ ] **C1 — B2B con RUC (autocompletado SUNAT):** Tipo RUC, número `20100070970`. Verificar que el lookup SUNAT autocompleta razón social/dirección. Marcar `esCliente=true`. Guardar. **Esperado:** se crea, razón social poblada por SUNAT.
- [ ] **C2 — B2C con DNI:** Tipo DNI, número `45623178`, nombre "Juan Pérez Quispe [QA2]". **Esperado:** se crea sin requerir SUNAT.
- [ ] **C3 — RUC inválido / inexistente (caso límite):** Tipo RUC, número `20999999999`. Lookup SUNAT no encuentra. **Esperado:** debe poder crearlo igual escribiendo la razón social a mano ("Comercial Sin SUNAT [QA2]") — valida que el form no bloquea si SUNAT falla (regresión conocida, ver HANDOFF fix DocAutocomplete).
- [ ] **C4 — Cliente con datos mínimos (edge):** DNI `00000001`, nombre "X [QA2]". **Esperado:** validar mensaje de error si el doc es inválido, o creación si pasa validación.
- [ ] **C5 — Cliente para crédito:** B2B RUC `20131312955`, nombre por SUNAT, `esCliente=true`. Este se usará para la factura a crédito. **Esperado:** creado.
- [ ] **Caso límite C6 — duplicado:** intentar crear de nuevo C1 (mismo RUC). **Esperado:** el sistema rechaza o advierte duplicado. Documentar el comportamiento real.
- [ ] **Contacto:** a C1, agregar un contacto desde el detalle (modal "+"): nombre "María Torres", cargo "Compras", email, `esPrincipal=true`. **Esperado:** contacto agregado.

### Tarea 1.2: Productos y precios (rol **Superadmin** — Lucas; D1=B)

Desde `/idex/productos` → "Nuevo producto". Crear 4 productos que exijan distintas reglas tributarias y monedas:

- [ ] **P1 — Gravado IGV, PEN:** SKU `QA2-CABLE-01`, nombre "Cable THW 14 AWG [QA2]", familia Cables, afectación IGV gravado (10), precio compra S/ 8.50, precio venta S/ 12.00, stock inicial 1000, stock mínimo 100. **Esperado:** margen calculado, se crea.
- [ ] **P2 — Exonerado de IGV, PEN:** SKU `QA2-FERT-01`, nombre "Fertilizante NPK [QA2]", afectación IGV exonerado (20). **Esperado:** al cotizar no suma IGV (validación tributaria).
- [ ] **P3 — Gravado, USD:** SKU `QA2-TX-01`, nombre "Transformador 50kVA [QA2]", moneda costo USD, precio compra US$ 900, venta US$ 1,150, stock 5, mínimo 2.
- [ ] **P4 — Margen al límite (edge):** SKU `QA2-LOW-01`, precio compra S/ 100, venta S/ 102 (margen 2%). **Esperado:** si hay validación de margen mínimo (5%), debe advertir/bloquear; documentar.
- [ ] **Actualización de precios masiva (rol que tenga `productos.editar`):** desde Productos → "Actualizar precios". Filtrar familia "Cables", aplicar **+10% al precio de venta**, razón obligatoria "Ajuste inflación proveedor [QA2]". Preview en vivo, confirmar. **Esperado:** P1 sube a S/ 13.20; se registra en `historial_precios` con `creado_por_nombre` = usuario actual + razón. (Esto alimenta el Reporte R2.)
- [ ] **Caso límite — razón vacía:** intentar actualizar precios sin razón. **Esperado:** bloqueado (mín 3 chars).
- [ ] **Caso límite — stock crítico:** verificar que P3 (stock 5, mínimo 2) y algún producto bajo mínimo aparezcan en la alerta de stock crítico en Inventario/Dashboard.

### Tarea 1.3: Cotizaciones complejas (rol **Comercial**)

Desde `/idex/cotizaciones` → "Nueva cotización". Crear:

- [ ] **COT1 — Multi-línea mixta IGV + multimoneda PEN:** cliente C1. Líneas: P1 (cant 50), P2 (cant 20, exonerado), P4 (cant 10). Moneda PEN. **Esperado:** totales separan gravado vs exonerado; IGV solo sobre gravado. Verificar el cálculo a mano.
- [ ] **COT2 — USD con tipo de cambio:** cliente C5. Líneas: P3 (cant 3). Moneda USD, TC 3.785. **Esperado:** muestra montos en USD y equivalente PEN; valida que TC es obligatorio en USD.
- [ ] **COT3 — Con descuento por línea / cambio de margen:** cliente C1, P1 (cant 100) con margen modificado (permiso `cotizaciones.cambiar_margen`). **Esperado:** recalcula precio; documentar si descuento_excepcional pide permiso extra.
- [ ] **COT4 — Cotización grande (stress):** cliente C1, agregar **15+ líneas** combinando P1–P4 repetidos con cantidades altas (ej. 500, 1000). **Esperado:** la UI no se rompe, el PDF se genera, los totales cuadran.
- [ ] **COT5 — Para rechazar:** cliente C2 (B2C boleta). 1 línea. Se usará para probar el estado `rechazada`.
- [ ] **Pipeline sobre COT1:** Enviar (estado `enviada`) → como **Facturación/Superadmin** Aprobar/Aceptar (estado `aceptada`). **Esperado:** transiciones correctas; el botón "Aceptar/Aprobar" NO aparece para el Comercial (no tiene `cotizaciones.aprobar`).
- [ ] **PDF:** descargar el PDF de COT1 y COT4. **Esperado:** 200, PDF válido con datos del tenant.
- [ ] **Rechazo:** sobre COT5, marcar rechazada. **Esperado:** estado `rechazada`.
- [ ] **Caso límite — vencida:** documentar cómo se llega al estado `vencida` (cron de vencimiento a 7 días); si hay forma de forzarlo por UI o si requiere esperar.

### Tarea 1.4: Compra a proveedor + recepción (rol **Superadmin**; Comercial solo ve)

- [ ] Sobre COT1 (aceptada), usar "Generar compra a proveedor" (`generarOCsDesdeCotizacion`). **Esperado:** se crea 1 OC por proveedor principal de los productos (si P1 y P3 tienen distinto proveedor → 2 OCs). Verificar el caso **multi-proveedor**.
- [ ] Enviar y Aprobar la OC.
- [ ] **Recepción parcial (caso límite):** abrir modal de recepción, recibir solo PARTE de las cantidades (ej. 30 de 50). **Esperado:** la OC queda parcialmente recibida; el kardex registra una entrada por la cantidad recibida; el stock de P1 sube en 30.
- [ ] **Recepción del resto:** recibir lo pendiente. **Esperado:** OC cerrada/completa; kardex con segunda entrada.
- [ ] Verificar en Inventario/Kardex que el costo promedio ponderado se recalculó.
- [ ] **Permiso:** loguear como Comercial e intentar crear OC. **Esperado:** no puede (sin `ordenes.crear`); solo ve la lista.

### Tarea 1.5: Facturación y crédito (rol **Facturación** — `contador@idex.demo`)

- [ ] **Factura al contado:** convertir COT2 (aceptada) a factura (`convertirCotizacionAFactura`). Forma de pago contado. **Esperado:** factura `F00X` creada, estado `lista_para_emitir`, cotización pasa a `convertida`, encolada en pgmq.
- [ ] **Factura a crédito:** crear/convertir una factura para C5 con `forma_pago='credito'`, plazo 30 días. **Esperado:** factura creada. **Verificar el gap D2:** confirmar si se creó CxC automáticamente o no.
- [ ] **Otorgar crédito (manual):** desde Crédito (`/idex/credito`), otorgar línea de crédito a C5 (ej. S/ 50,000, 30 días) con `otorgarCredito`. **Esperado:** línea registrada.
- [ ] **Registrar pago parcial (caso límite):** registrar un pago de C5 por la MITAD del total de la factura. **Esperado:** saldo pendiente = mitad; aparece en aging de CxC.
- [ ] **Registrar segundo pago:** completar el saldo. **Esperado:** saldo 0, factura saldada.
- [ ] **Anular factura vía NC (caso límite):** sobre una factura emitida (F001-6/7/8 existentes o una nueva), usar "Anular" en `FacturaDetalle` → genera Nota de Crédito (07). **Esperado:** se crea la NC, la factura pasa a `anulada`. (El builder de NC ya fue corregido — `subtotal`/`igv` — commit `c6adaac`.) Si la cuenta Nubefact no tiene serie activa, quedará `error_red`; documentar.
- [ ] **Permiso:** loguear como Comercial e intentar entrar a `/idex/facturas/[id]` y emitir. **Esperado:** sin acceso (sin `facturas.*`).

---

## FASE 2 — Verificación de control de acceso por rol (matriz)

> Para cada rol, loguear por UI y verificar acceso permitido y bloqueado. Capturar screenshot de cada bloqueo (redirect a dashboard / 403). Registrar PASS/FAIL en una tabla en `docs/HANDOFF.md`.

### Tarea 2.1: Rol **Comercial** (`vendedor@idex.demo`)

- [ ] PUEDE: ver dashboard, crear cliente, crear/editar/enviar cotización, ver productos, ver inventario, ver reportes, descargar PDF cotización.
- [ ] NO PUEDE (verificar bloqueo): **crear/editar productos ni actualizar precios** (D1=B — solo admin); aprobar cotización; acceder a `/idex/facturas`; acceder a `/idex/credito`; crear orden de compra; acceder a `/idex/configuracion`; acceder a `/idex/admin/*`.

### Tarea 2.2: Rol **Facturación** (`contador@idex.demo`)

- [ ] PUEDE: ver facturas y emitir; ver/otorgar crédito y registrar pagos; aprobar cotizaciones; ver costos de productos; ajuste manual de inventario; ver/exportar reportes; crear/anular guías.
- [ ] NO PUEDE (verificar bloqueo): crear cliente (`/idex/clientes/nuevo` → bloqueado); crear cotización (`/idex/cotizaciones/nueva` → redirect); crear/editar productos; acceder a `/idex/configuracion`; acceder a `/idex/admin/*`.

### Tarea 2.3: Rol **Superadmin** (`lescriva@grupoidex.com.pe`)

- [ ] PUEDE: todo lo anterior + `/idex/configuracion` (config Nubefact) + `/idex/admin/usuarios` + roles.
- [ ] NO PUEDE: gestionar otros tenants / panel platform admin (no es platform_admin). **Esperado:** `/admin` redirige.

---

## FASE 3 — Construir los 3 reportes de seguimiento del Superadmin

> Estos reportes NO existen hoy. Datos ya disponibles: `cotizaciones.creadoPorNombre` + `estado`, `historial_precios.creadoPorNombre/razon/precioAnterior/precioNuevo/createdAt`. Permiso: `reportes.ver`. Seguir el patrón de `src/server/actions/reportes-ventas.ts` + `src/app/(app)/[companySlug]/reportes/ventas/page.tsx`.

### Tarea 3.1: R1 — Seguimiento de cotizaciones por comercial y estado

**Files:**

- Create: `src/server/actions/reportes-cotizaciones.ts`
- Create: `src/app/(app)/[companySlug]/reportes/cotizaciones/page.tsx`
- Create: `src/components/modules/reportes/ReporteCotizaciones.tsx`
- Modify: `src/app/(app)/[companySlug]/reportes/page.tsx` (agregar card/enlace al nuevo reporte)

- [ ] **Step 1: Server action de datos.** En `reportes-cotizaciones.ts`, exportar `reporteCotizaciones({ desde, hasta, comercial?, estado? })` que:
  - `await requirePermission('reportes.ver')`
  - consulta `cotizaciones` del tenant filtrando por rango de `created_at`, opcional `creado_por_nombre` y `estado`
  - agrupa por `creado_por_nombre` + `estado`, devolviendo `{ comercial, totalCotizaciones, porEstado: { borrador, enviada, aceptada, rechazada, vencida, convertida }, montoTotal, montoAceptado }`
  - tipa el retorno; usa Drizzle `sql` para los conteos por estado (FILTER WHERE) o agrega en JS.

```typescript
'use server';
import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { cotizaciones } from '@/lib/db/schema';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { requirePermission } from '@/lib/auth/require-permission';

export interface FilaReporteCot {
  comercial: string;
  total: number;
  borrador: number;
  enviada: number;
  aceptada: number;
  rechazada: number;
  vencida: number;
  convertida: number;
  montoTotal: number;
  montoAceptado: number;
}

export async function reporteCotizaciones(args: {
  desde: string;
  hasta: string;
  comercial?: string;
  estado?: string;
}): Promise<FilaReporteCot[]> {
  await requirePermission('reportes.ver');
  const tenant = await getCurrentTenant();
  const rows = await db
    .select()
    .from(cotizaciones)
    .where(
      and(
        eq(cotizaciones.tenantId, tenant.id),
        gte(cotizaciones.createdAt, new Date(args.desde)),
        lte(cotizaciones.createdAt, new Date(args.hasta + 'T23:59:59'))
      )
    );
  const map = new Map<string, FilaReporteCot>();
  for (const c of rows) {
    if (args.comercial && c.creadoPorNombre !== args.comercial) continue;
    if (args.estado && c.estado !== args.estado) continue;
    const key = c.creadoPorNombre ?? '—';
    const f = map.get(key) ?? {
      comercial: key,
      total: 0,
      borrador: 0,
      enviada: 0,
      aceptada: 0,
      rechazada: 0,
      vencida: 0,
      convertida: 0,
      montoTotal: 0,
      montoAceptado: 0,
    };
    f.total++;
    const est = c.estado as keyof FilaReporteCot;
    if (est in f && typeof f[est] === 'number') (f[est] as number)++;
    const monto = parseFloat((c.total as string) ?? '0');
    f.montoTotal += monto;
    if (c.estado === 'aceptada' || c.estado === 'convertida') f.montoAceptado += monto;
    map.set(key, f);
  }
  return [...map.values()].sort((a, b) => b.montoTotal - a.montoTotal);
}
```

- [ ] **Step 2: Página server.** En `reportes/cotizaciones/page.tsx`: `await requirePermission('reportes.ver')`, leer searchParams (`desde`,`hasta`,`comercial`,`estado` con defaults: mes actual), llamar `reporteCotizaciones`, pasar a `ReporteCotizaciones`.
- [ ] **Step 3: Componente de tabla** `ReporteCotizaciones.tsx`: tabla con columnas Comercial | Total | Enviadas | Aceptadas | Rechazadas | Convertidas | Monto total | Monto ganado; fila de totales; filtros (fecha desde/hasta, select comercial, select estado). Usar componentes de `src/components/ui/`. Resaltar "por cerrar" = enviadas (pendientes de respuesta).
- [ ] **Step 4: Enlace** en `reportes/page.tsx` (card "Cotizaciones por comercial").
- [ ] **Step 5: Verificar por UI** logueado como Superadmin: el reporte muestra las cotizaciones de la Fase 1 agrupadas por `vendedor@idex.demo`. Screenshot.
- [ ] **Step 6: Commit** `git commit -m "feat(reportes): seguimiento de cotizaciones por comercial y estado"`.

### Tarea 3.2: R2 — Historial de actualización de precios por comercial

**Files:**

- Create: `src/server/actions/reportes-precios.ts`
- Create: `src/app/(app)/[companySlug]/reportes/precios/page.tsx`
- Create: `src/components/modules/reportes/ReportePrecios.tsx`
- Modify: `src/app/(app)/[companySlug]/reportes/page.tsx`

- [ ] **Step 1: Server action** `reportePrecios({ desde, hasta, comercial?, productoId? })`:
  - `await requirePermission('reportes.ver')`
  - JOIN `historial_precios` × `productos` (para SKU/nombre) del tenant, rango por `created_at`, opcional `creado_por_nombre` y `producto_id`
  - devolver filas `{ fecha, comercial, sku, producto, precioAnterior, precioNuevo, variacionPct, razon }` ordenadas por fecha desc.

```typescript
'use server';
import { and, eq, gte, lte, desc } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { historialPrecios, productos } from '@/lib/db/schema';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { requirePermission } from '@/lib/auth/require-permission';

export interface FilaPrecio {
  fecha: string;
  comercial: string;
  sku: string;
  producto: string;
  precioAnterior: number;
  precioNuevo: number;
  variacionPct: number;
  razon: string;
}

export async function reportePrecios(args: {
  desde: string;
  hasta: string;
  comercial?: string;
}): Promise<FilaPrecio[]> {
  await requirePermission('reportes.ver');
  const tenant = await getCurrentTenant();
  const rows = await db
    .select({
      fecha: historialPrecios.createdAt,
      comercial: historialPrecios.creadoPorNombre,
      sku: productos.codigo,
      producto: productos.nombre,
      precioAnterior: historialPrecios.precioAnterior,
      precioNuevo: historialPrecios.precioNuevo,
      razon: historialPrecios.razon,
    })
    .from(historialPrecios)
    .innerJoin(productos, eq(productos.id, historialPrecios.productoId))
    .where(
      and(
        eq(historialPrecios.tenantId, tenant.id),
        gte(historialPrecios.createdAt, new Date(args.desde)),
        lte(historialPrecios.createdAt, new Date(args.hasta + 'T23:59:59'))
      )
    )
    .orderBy(desc(historialPrecios.createdAt));
  return rows
    .filter((r) => !args.comercial || r.comercial === args.comercial)
    .map((r) => {
      const ant = parseFloat((r.precioAnterior as string) ?? '0');
      const nue = parseFloat((r.precioNuevo as string) ?? '0');
      return {
        fecha: (r.fecha as Date).toISOString().slice(0, 16).replace('T', ' '),
        comercial: r.comercial ?? '—',
        sku: r.sku ?? '',
        producto: r.producto ?? '',
        precioAnterior: ant,
        precioNuevo: nue,
        variacionPct: ant ? ((nue - ant) / ant) * 100 : 0,
        razon: r.razon ?? '',
      };
    });
}
```

- [ ] **Step 2: Página** `reportes/precios/page.tsx` (igual patrón que R1).
- [ ] **Step 3: Componente** `ReportePrecios.tsx`: tabla Fecha | Comercial | SKU | Producto | Antes | Después | Δ% (coloreado verde/rojo) | Razón; filtros fecha + comercial.
- [ ] **Step 4: Enlace** en `reportes/page.tsx`.
- [ ] **Step 5: Verificar por UI**: aparece la actualización masiva "+10% cables" de la Fase 1 con autor = quien la hizo y la razón. Screenshot.
- [ ] **Step 6: Commit** `git commit -m "feat(reportes): historial de actualizacion de precios por comercial"`.

### Tarea 3.3: R3 — Control administrativo de cotizaciones (generadas / por cerrar)

**Files:**

- Create: `src/components/modules/reportes/PanelControlCotizaciones.tsx`
- Modify: `src/app/(app)/[companySlug]/reportes/cotizaciones/page.tsx` (agregar panel de KPIs arriba de la tabla R1)

- [ ] **Step 1:** Reusar `reporteCotizaciones` (R1) y derivar KPIs en la página: total generadas, **por cerrar** (estado `enviada`), aceptadas, convertidas (facturadas), tasa de conversión = convertidas/total, monto en pipeline (enviadas).
- [ ] **Step 2: Componente** `PanelControlCotizaciones.tsx`: 4–5 cards (KPI strip) con esos números; resaltar "Por cerrar" en color de advertencia y "próximas a vencer" si `vencimiento` < 3 días (leer `cotizaciones.fechaVencimiento`).

```tsx
// Props: { kpis: { generadas: number; porCerrar: number; aceptadas: number; convertidas: number; tasaConversion: number; montoPipeline: number } }
// Render: grid de cards con los KPIs. "Por cerrar" usa text-warn-fg.
```

- [ ] **Step 3:** En `reportes/cotizaciones/page.tsx`, calcular los KPIs sumando las filas de R1 y renderizar `<PanelControlCotizaciones>` arriba de la tabla.
- [ ] **Step 4: Verificar por UI**: el panel refleja la data de la Fase 1 (X generadas, Y por cerrar, etc.). Screenshot.
- [ ] **Step 5: Commit** `git commit -m "feat(reportes): panel de control administrativo de cotizaciones"`.

---

## FASE 4 — Casos límite / stress (exigir el sistema)

> Ejecutar logueado con el rol que corresponda. El objetivo es romper cosas; documentar cada hallazgo (bug → abrir fix siguiendo systematic-debugging).

- [ ] **S1 — Cotización gigante:** crear cotización con 30+ líneas y cantidades de 5–6 cifras. Verificar totales, render, PDF, y que el combobox de productos no haga clipping.
- [ ] **S2 — Multimoneda + exonerados juntos:** cotización con productos PEN gravados + exonerados + un producto USD (si el sistema permite mezclar monedas, documentar; si no, validar el bloqueo).
- [ ] **S3 — Stock negativo:** vender (cotizar→facturar) más cantidad de la que hay en stock de P3 (stock 5, vender 10). **Esperado** (decisión Kickoff): permitir con warning, no bloquear. Verificar el warning y que el kardex refleje stock negativo.
- [ ] **S4 — Recepción parcial múltiple:** OC con recepción en 3 tandas. Verificar costo promedio ponderado tras cada entrada.
- [ ] **S5 — Pagos que exceden el saldo:** intentar registrar un pago mayor al saldo pendiente. **Esperado:** rechazo o advertencia. Documentar.
- [ ] **S6 — Anulación de factura ya pagada:** anular (NC) una factura que ya tiene pagos. Documentar el comportamiento (¿revierte CxC?).
- [ ] **S7 — Concurrencia de correlativos:** convertir 2 cotizaciones a factura casi simultáneamente (dos pestañas). **Esperado:** correlativos F00X distintos, sin colisión (probar `reservar_correlativo`).
- [ ] **S8 — Permisos cruzados por URL:** como Comercial, pegar directo URLs de facturas/credito/config/admin y acciones server (si se puede) → todas deben bloquear (403/redirect), no solo ocultar el botón.
- [ ] **S9 — SUNAT rechazo por dato:** emitir factura con cliente de RUC inexistente (si Nubefact activo) → debe quedar `rechazada` con mensaje SUNAT claro, no crashear (regresión del worker ya corregida).
- [ ] **S10 — Cotización vencida → intentar convertir:** intentar facturar una cotización en estado `vencida` o `rechazada`. **Esperado:** bloqueado (solo `aceptada` convierte).

---

## FASE 5 — Verificación final + reporte

- [ ] **Re-correr el QA automatizado:** `pnpm tsx scripts/test-full-ui.ts`. **Esperado:** ≥76 PASS (FAIL "Admin panel" es no-bug). Si algo nuevo falla por la data creada, investigar con systematic-debugging.
- [ ] **Typecheck + lint:** `pnpm tsc --noEmit` y el lint del pre-commit. Verde antes de commitear los reportes.
- [ ] **Tabla de resultados por rol** en `docs/HANDOFF.md`: para cada rol, qué tareas PASARON y qué se bloqueó correctamente. Lista de bugs encontrados (con fix o ticket).
- [ ] **Resumen de los 3 reportes** construidos, con screenshots, en `docs/HANDOFF.md`.
- [ ] **Decisión de limpieza:** preguntar al usuario si borrar la data `[QA2]` (por UI) o conservarla para el demo.
- [ ] **Deploy:** `git push orionrp main` + `vercel --prod`; verificar deploy Ready y que los 3 reportes cargan en prod.
- [ ] **Commit final del HANDOFF.**

---

## Self-review / cobertura del pedido del usuario

- ✅ "cada usuario puede realizar su trabajo desde su rol" → Fases 1 y 2 (creación por UI con cada rol + matriz de bloqueos).
- ✅ "agregar productos, actualizar precios" → Tarea 1.2 (+ D1 sobre quién puede).
- ✅ "agregar clientes" → Tarea 1.1 (B2B/B2C/edge).
- ✅ "se envían cotización, se mandan a comprar a crédito" → Tareas 1.3–1.5 (pipeline cotización→OC→recepción→factura→crédito→pagos).
- ✅ "control" (acceso por rol) → Fase 2 + S8.
- ✅ "reporte para que el superadmin dé seguimiento a cotizaciones, a la actualización de precios por comercial, y control administrativo de cotizaciones generadas/por cerrar" → Fase 3 (R1, R2, R3).
- ✅ "casos bien complicados, exigir el sistema" → Fase 4 (S1–S10) + casos límite intercalados en Fase 1.

## Gaps conocidos a confirmar (no asumir)

- D1 (precios por comercial), D2 (CxC automático), D3 (limpieza/prefijo), D0.4 (modo Nubefact). Resolver con el usuario en el primer mensaje antes de ejecutar.
