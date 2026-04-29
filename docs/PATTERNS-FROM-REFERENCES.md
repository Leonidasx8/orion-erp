# Patterns from reference repos — Sistema Orión

> Investigación de los repos listados en `06-modules-spec.md` y `04-sunat-nubefact-spec.md`.
> Objetivo: extraer **patrones aplicables** a nuestro stack (Next.js 15 + Drizzle + Supabase RLS + Casbin + react-pdf), y marcar lo que **NO debemos copiar** porque su stack diverge del nuestro o porque está desactualizado.
>
> Cada repo fue clonado a `/tmp/orion-research/` con `--depth 1`; este doc resume los hallazgos. Los archivos del repo de referencia se citan con su path _relativo al repo clonado_ — para abrirlos basta con re-clonar el repo y navegar.

---

## Resumen ejecutivo

| Módulo           | Repo principal                                     | Veredicto                                                                                                                                                                                                                                         | Re-estimación                                                 |
| ---------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| B.3 Clientes     | `giansalex/consulta-ruc`                           | 🚫 **Repo no existe** (404). Reemplazar por implementación directa contra `apis.net.pe`. Riesgo bajo: la API es trivial.                                                                                                                          | **22h → 18h** (sin repo guía pero la integración es simple)   |
| B.4 Catálogo     | `pjborowiecki/QUANTUM-STASH`                       | ⚠️ Stack alineado (Next + Drizzle + Postgres) pero proyecto incompleto y de hace 2+ años. Útil como punto de partida del schema, **no** del código.                                                                                               | **32h sin cambios**                                           |
| B.5 Cotizaciones | `al1abb/invoify`                                   | ✅ Útil para Zod schemas, react-hook-form patterns y multi-template PDF. ❌ Su PDF gen es Puppeteer — incompatible con Vercel serverless, descartar.                                                                                              | **30h sin cambios**                                           |
| B.7 Kardex       | `arnobt78/Stockly`                                 | ❌ Stack incompatible (Prisma + MongoDB) y **no implementa kardex de verdad** (sin movimientos inmutables, sin triggers, sin concurrency control). Valor casi nulo. **Recomiendo sustituir por ERPNext Stock module o frappe/erpnext del brain.** | **24h → 28h** (sin guía concreta, hay que diseñar desde cero) |
| B.8/B.9 SUNAT    | `giansalex/lycet` + `erickorlando/openinvoiceperu` | ✅ **Oro puro** para modelado de payload. Lycet activo (último commit 2026-04-28). OpenInvoicePeru abandonado (2022) pero sus DTOs son la mejor ref de campos SUNAT.                                                                              | **22h + 28h sin cambios**                                     |
| B.10 Crédito     | `flash-oss/medici`                                 | ⚠️ Buen concepto (double-entry) pero stack incompatible (Mongoose). El brain ya define un modelo más simple (facturas + pagos + matview) que es suficiente para el alcance contractual. **No introducir double-entry en MVP.**                    | **22h sin cambios**                                           |
| B.11 Reportes    | `tremorlabs/tremor`                                | ✅ Recomiendo **NO instalar tremor como dep**, pero copiar 3-4 componentes (BarChart, BarList, Card, ComboChart) a nuestro `components/ui/` adaptados a shadcn. Compatible con Tailwind.                                                          | **20h sin cambios**                                           |

### Hallazgos críticos para el roadmap

1. **`giansalex/consulta-ruc` no existe.** El brain lo lista como referencia para B.3. Hay que actualizar `06-modules-spec.md`. Implementación alternativa: fetch directo a `https://api.apis.net.pe/v2/sunat/ruc?numero=...` con cache de 30 días en tabla `validaciones_documento`.
2. **Stockly NO sirve para B.7.** El módulo Kardex es uno de los más sensibles del sistema (race conditions, costo promedio, FIFO). Stockly no aborda ninguno de esos problemas. Hay que diseñar el módulo desde el brain + manuales SUNAT, no desde un repo de ref.
3. **invoify usa Puppeteer.** Si en algún momento dudamos entre react-pdf y Puppeteer, el brain ya decidió react-pdf por compatibilidad serverless. Confirmado por la realidad: invoify tiene `puppeteer.config.cjs` y un `Dockerfile` específicamente porque Puppeteer no anda solo en Vercel — es exactamente lo que queremos evitar.
4. **OpenInvoicePeru DTOs son canónicos** para los campos SUNAT (UBL 2.1). Vamos a traducir esos DTOs a Zod schemas en `src/lib/sunat/schemas/`. Sin esto, vamos a hacer el payload por adivinación.
5. **Licencias OK**: todos los repos investigados son MIT o Apache 2.0. Podemos copiar/adaptar código sin restricción.

### Tabla de salud de repos

| Repo                           | Último commit    | Licencia   | Stars (estimado) | Stack match                                   |
| ------------------------------ | ---------------- | ---------- | ---------------- | --------------------------------------------- |
| `al1abb/invoify`               | 2026-04-02       | MIT        | ~1k              | Parcial (Next 15 ✅, Puppeteer ❌)            |
| `giansalex/lycet`              | 2026-04-28 (HOY) | MIT        | ~150             | None (PHP) — solo modelo                      |
| `erickorlando/openinvoiceperu` | 2022-03-20 ⚠️    | Apache 2.0 | ~200             | None (.NET) — solo modelo                     |
| `arnobt78/Stockly`             | 2026-04-06       | MIT        | bajo             | ❌ Mismatch profundo (Prisma + MongoDB)       |
| `pjborowiecki/QUANTUM-STASH`   | 2024-01-14 ⚠️    | MIT        | bajo             | ✅ (Next 14 + Drizzle + PG) — pero incompleto |
| `flash-oss/medici`             | 2025-07-11       | MIT        | ~700             | ❌ Mongoose-only                              |
| `tremorlabs/tremor`            | 2025-10-10       | Apache 2.0 | ~17k             | Parcial (componentes UI)                      |
| `giansalex/consulta-ruc`       | —                | —          | —                | 🚫 404                                        |

---

## B.3 — Gestión de clientes

### 📦 Repo de referencia

- ~~`giansalex/consulta-ruc`~~ → **404, repo no existe** (verificado al clonar 2026-04-28).
- Alternativa: integración directa contra `apis.net.pe` (RUC/DNI/CE).

### ✅ Patrones a tomar (de la propia spec del brain + apis.net.pe)

Como no hay repo guía, reaplico el patrón canónico de cache para APIs externas:

```typescript
// src/lib/sunat/consultar-ruc.ts
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { validacionesDocumento } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';

const RucResponseSchema = z.object({
  numeroDocumento: z.string(),
  razonSocial: z.string(),
  estado: z.enum(['ACTIVO', 'BAJA DE OFICIO', 'BAJA PROVISIONAL', 'SUSPENSION TEMPORAL']),
  condicion: z.enum(['HABIDO', 'NO HABIDO', 'NO HALLADO']),
  direccion: z.string().nullable(),
  ubigeo: z.string().nullable(),
  viaTipo: z.string().nullable(),
  viaNombre: z.string().nullable(),
});

export type RucData = z.infer<typeof RucResponseSchema>;

const TTL_DAYS = 30;

export async function consultarRuc(ruc: string): Promise<RucData> {
  // 1. Buscar en cache
  const cached = await db
    .select()
    .from(validacionesDocumento)
    .where(
      and(
        eq(validacionesDocumento.tipoDoc, 'RUC'),
        eq(validacionesDocumento.numero, ruc),
        gt(validacionesDocumento.validadoAt, sql`now() - interval '${TTL_DAYS} days'`)
      )
    )
    .limit(1);

  if (cached[0]) return RucResponseSchema.parse(cached[0].datos);

  // 2. Si no, llamar API. Token desde env (es por tenant si lo necesitamos, pero apis.net.pe da 100/día gratis).
  const res = await fetch(`https://api.apis.net.pe/v2/sunat/ruc?numero=${ruc}`, {
    headers: { Authorization: `Bearer ${process.env.APIS_NET_PE_TOKEN}` },
    // Cache HTTP nivel runtime también — Vercel lo respeta.
    next: { revalidate: 60 * 60 * 24 * 30 },
  });

  if (!res.ok) throw new Error(`apis.net.pe ${res.status}`);
  const json = await res.json();
  const validated = RucResponseSchema.parse(json);

  // 3. Guardar en cache
  await db
    .insert(validacionesDocumento)
    .values({
      tipoDoc: 'RUC',
      numero: ruc,
      datos: validated,
      validadoAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [validacionesDocumento.tipoDoc, validacionesDocumento.numero],
      set: { datos: validated, validadoAt: new Date() },
    });

  return validated;
}
```

### ❌ Lo que evitar

- **No exponer este endpoint sin rate-limiting.** apis.net.pe corta a 100/día gratis y los abusos llegan rápido si el form lo llama en cada keystroke. Usar `useDebouncedCallback` (300ms) en el cliente.
- **No mezclar el cache con el flujo de creación de cliente.** Si `apis.net.pe` está caído, el form debe permitir crear el cliente con la info que el usuario tipee a mano (con un warning visible). Hardcoded dependency = punto de falla.

### 🔗 Archivos clave

- N/A (no hay repo). Pero ver `04-sunat-nubefact-spec.md` para los catálogos de tipo de documento (`Catálogo 06`).

### ⏱️ Estimación

- Original: 22h
- Re-estimada: **18h**. La integración apis.net.pe son 2-3h. El resto es CRUD estándar (form + table + Zod). Ahorramos las ~4h de "leer y entender repo de referencia".

---

## B.4 — Catálogo de productos

### 📦 Repo de referencia

- `pjborowiecki/QUANTUM-STASH` (`https://github.com/pjborowiecki/QUANTUM-STASH-inventory-Management-SaaS-NextJs-TypeScript-Postgres-Drizzle-Tailwind`)
- ⚠️ **Último commit: 2024-01-14** — más de 2 años sin actualizar. La API de Drizzle ha cambiado.
- ⚠️ Proyecto incompleto: el schema tiene `// TODO: Link to category id, define relations` en varios campos.

### ✅ Patrones a tomar

**1. Naming convention y type inference de Drizzle (válido pese a la edad)**

```typescript
// src/lib/db/schema.ts
import { pgTable, serial, varchar, text, decimal, integer, timestamp } from 'drizzle-orm/pg-core';

export const productos = pgTable('productos', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  sku: varchar('sku', { length: 64 }).notNull(),
  // OJO: QUANTUM-STASH usa precision: 10, scale: 2 — para Orión es 14, 4
  precioVenta: decimal('precio_venta', { precision: 14, scale: 4 }).notNull().default('0'),
  precioCompra: decimal('precio_compra', { precision: 14, scale: 4 }).notNull().default('0'),
  // ...
});

// Type inference: tomar este patrón
export type Producto = typeof productos.$inferSelect;
export type NewProducto = typeof productos.$inferInsert;
```

**2. Estructura de validations folder**: `src/validations/inventory.ts`, `auth.ts`, etc. Funciona bien, lo replicamos en `src/lib/schemas/`.

**3. Folder `actions/`** para Server Actions agrupadas por dominio. Ya está alineado con nuestro `src/server/actions/`.

### ❌ Lo que evitar

- **`varchar` en lugar de FK**. QUANTUM-STASH tiene cosas como `category: varchar('category', { length: 64 })` y `supplier: varchar('supplier', { length: 64 })` con `// TODO: Link to category id` al lado. Es deuda técnica admitida. Nosotros sí hacemos las FK desde el día 1 (tenant_id, categoria_id, etc.).
- **`precision: 10, scale: 2`** para precios. Nuestro catálogo real tiene 4 decimales (`0.1536`). El brain lo dice explícitamente: `numeric(14,4)`. Si copiamos ciego, perdemos precisión.
- **`quantity: integer('quantity')`** directo en la tabla `item`. Esto es lo que hay que NO hacer: el stock no vive en la fila del producto, vive como suma de movimientos en `kardex_movimientos` (ver B.7). Si lo guardás como columna se desincroniza.
- **No usa `pg_trgm` ni `tsvector`.** Para 475+ productos con fuzzy search, el brain manda `gin(search_vector)`. QUANTUM-STASH no lo tiene. Implementarlo nosotros (ver `06-modules-spec.md` líneas 76-87).

### 🔗 Archivos clave

- `src/db/schema/index.ts` — esquema completo (ojo a deuda admitida)
- `src/validations/inventory.ts` — Zod patterns
- `drizzle.config.ts` — config base
- `src/actions/` — para ver cómo organizan Server Actions (aunque la API de Next 14 cambió)

### ⏱️ Estimación

- Original: 32h
- Re-estimada: **32h sin cambios**. El repo no acelera tanto como esperaba; el módulo es genuinamente complejo (importación Excel con headers basura, doble lista de precios, fuzzy search, atributos estructurados como mm²/AWG/MCM).

---

## B.5 — Cotizaciones

### 📦 Repo de referencia

- `al1abb/invoify` (https://github.com/al1abb/invoify)
- ✅ Activo (último commit 2026-04-02), MIT, Next.js 15.3.8.

### ✅ Patrones a tomar

**1. Zod schema con field validators reusables** (excelente):

```typescript
// adaptado de invoify/lib/schemas.ts
const fieldValidators = {
  ruc: z
    .string()
    .length(11)
    .regex(/^(10|20)/, { message: 'RUC inválido' }),
  cantidad: z.coerce.number().gt(0, { message: 'Cantidad debe ser > 0' }),
  precio: z.coerce.number().nonnegative().lte(99999999.9999, { message: 'Precio fuera de rango' }),
  fecha: z.date().transform((d) => d.toISOString()),
  textoCorto: z.string().min(1).max(70),
  textoLargo: z.string().min(1).max(500),
};

const LineaCotizacionSchema = z.object({
  productoId: z.string().uuid(),
  descripcion: fieldValidators.textoCorto, // snapshot — no FK al PDF
  cantidad: fieldValidators.cantidad,
  precioUnitario: fieldValidators.precio,
  margenLinea: z.coerce.number().min(0).max(100).optional(),
});

export const CotizacionSchema = z.object({
  emisor: EmisorSchema,
  receptor: ReceptorSchema,
  detalle: CotizacionDetalleSchema,
  lineas: z.array(LineaCotizacionSchema).min(1),
});
```

Por qué es bueno: cuando agregás un campo nuevo, lo definís una vez en `fieldValidators` y lo reusás en todo el schema. Mensajes de error consistentes. Reuso 1:1 entre cliente (react-hook-form) y servidor (Server Action).

**2. Selector de plantilla de PDF como `pdfTemplate: number`** (cmpo en el schema). Nosotros podemos usar el mismo enfoque para versiones del PDF: cuando el comercial cambia algo después de "Enviar", se genera una nueva versión sin pisar la anterior.

**3. Hooks como `useDnDOrder` para reordenar líneas** (drag-and-drop con @dnd-kit). Aplicable directo: el brain dice `orden int NOT NULL` en `lineas_cotizacion`.

**4. `Context + useFieldArray + RHF`**: pattern estándar para forms con líneas dinámicas. Lo aplicamos sin cambios.

**5. Estructura de archivos del módulo**:

```
src/components/modules/cotizaciones/
├── CotizacionForm.tsx        # form completo
├── lineas/
│   ├── LineasTable.tsx       # tabla de líneas con DnD
│   ├── LineaRow.tsx
│   └── BuscarProducto.tsx    # combobox con pg_trgm
├── totales/
│   └── ResumenTotales.tsx    # subtotal/IGV/total live
└── acciones/
    ├── BotonesAccion.tsx
    └── ExportarPDF.tsx
```

### ❌ Lo que evitar

- **Generación de PDF con Puppeteer + Chromium.** invoify hace `await puppeteer.launch({...})` dentro de un Next.js API route. En desarrollo anda; en Vercel serverless **no** sin `@sparticuz/chromium` y aun así arranca lento (cold start ~5s) y consume ~250MB de RAM por render. El brain ya decidió `@react-pdf/renderer`. El archivo `services/invoice/server/generatePdfService.ts` es un anti-ejemplo: lo leemos para entender qué _no_ hacer.
- **`useState<Blob>` para el PDF en memoria** (`InvoiceContext.tsx`). En lugar de eso, generar el PDF en la Server Action que dispara el cambio de estado `enviada` y guardarlo en Supabase Storage como blob URL. El cliente solo recibe la URL.
- **No tiene state machine.** invoify es un form generator, no un sistema con estados de cotización. Para nuestros 6 estados (`borrador → enviada → aprobada → convertida | rechazada | vencida`) usamos xstate, no useState. invoify no nos enseña nada acá.
- **Validaciones de email/zipCode/country US-céntricas.** El schema de invoify asume ZIP code, no ubigeo peruano. Usá nuestro propio schema para `Cliente` (RUC/DNI + ubigeo).

### 🔗 Archivos clave

- `lib/schemas.ts` — Zod schemas (lo más valioso)
- `contexts/InvoiceContext.tsx` — pattern de form context (sin tomar el blob handling)
- `app/components/invoice/InvoiceActions.tsx` — botones de acción
- `types.ts` — type inference desde Zod
- ~~`services/invoice/server/generatePdfService.ts`~~ — **anti-ejemplo**, leer y descartar

### ⏱️ Estimación

- Original: 30h
- Re-estimada: **30h sin cambios**. Los Zod schemas nos ahorran ~2h, pero el state machine xstate y la generación PDF con react-pdf (que invoify NO nos enseña) compensan el ahorro.

---

## B.6 — Órdenes de compra

### 📦 Repo de referencia (del brain)

- `bigcapitalhq/bigcapital`. **No clonado en esta investigación** por límite de 90 min y por ser secundario al alcance: el brain dice "OC = cotización aprobada con un click, mismo state machine, otro template PDF". Se reusa el 80% de B.5.

### ✅ Patrones a tomar

- Reuso de la mecánica de cotizaciones (state machine, líneas, totales).
- Conversión `cotizacion → orden_compra` debe ser una transacción atómica que copia las líneas (snapshot), no las referencia. Si después de generar la OC alguien edita la cotización, la OC no se contamina.

### ❌ Lo que evitar

- Crear un módulo OC desde cero como si fuera independiente. **Reusar componentes de B.5** desde la primera hora.

### ⏱️ Estimación

- Original: 12h. **Sin cambios.** Si B.5 está bien factorizado, son 8-10h reales.

---

## B.7 — Inventario y Kardex

### 📦 Repo de referencia

- `arnobt78/Stock-Inventory-Management-System--NextJS-FullStack` (Stockly).
- ❌ **Mismatch profundo**. Stack: Next 16 + React 19 + **Prisma + MongoDB**. No hay Postgres triggers porque no hay Postgres. No hay tabla de movimientos. El stock vive como `quantity: BigInt` directo en `Product` + `reservedQuantity` para órdenes pendientes. Esto es exactamente lo que el brain dice **NO hacer**.

### ✅ Patrones a tomar (poco)

**1. Concepto de `reservedQuantity`** — útil para distinguir stock disponible de comprometido:

```typescript
// Pseudo-derived (NO columna directa, sino vista o cálculo on-the-fly)
const stockDisponible = sql`stock_actual - stock_reservado`;
// stock_reservado = SUM de líneas en cotizaciones aceptadas no facturadas
```

**2. Snapshot de campos del producto en `OrderItem`** (`productName`, `sku`, `price` al momento del pedido) — buen patrón. Lo replicamos en `lineas_cotizacion.descripcion` (ya está en el brain).

**3. Multi-warehouse via tabla puente** (`StockAllocation` con `(productId, warehouseId)`). Si en algún momento Idex/Agroalves tienen más de un almacén, este patrón aplica.

### ❌ Lo que evitar (mucho)

- **`quantity` como columna en `Product`.** Imposible en concurrencia: dos ventas simultáneas pisan el mismo valor. El brain manda `kardex_movimientos` (append-only) + vista `stock_actual` calculada por SUM. Ya está justificado.
- **Sin movimientos inmutables.** Stockly no tiene historial. Para Idex/Agroalves esto sería ilegal (hay que poder reconstruir el saldo a una fecha pasada para SUNAT).
- **MongoDB.** Sin transacciones ACID multi-documento por default; sin triggers; sin RLS. Todo lo que el brain dio por sentado para Postgres no aplica.
- **Sin costo unitario por movimiento.** Stockly no calcula costo promedio ni FIFO. Para CxC y márgenes en cotizaciones, necesitamos ese dato. Hay que diseñarlo desde cero — no hay nada que copiar.

### 🔗 Alternativa recomendada

Como Stockly no aporta, recomiendo **mirar el módulo `stock` de ERPNext** (`frappe/erpnext` en GitHub, MIT, ~22k stars). En particular `erpnext/stock/doctype/stock_ledger_entry/` que es exactamente el patrón kardex. Está en Python sobre Frappe (MariaDB), pero el modelo de datos y los algoritmos de costing (`fifo_queue`, `moving_average`) son los más completos de los repos open-source.

### 🔗 Archivos de Stockly (de referencia, no para copiar)

- `prisma/schema.prisma` — esquema MongoDB (modelos `Product`, `StockAllocation`, `StockTransfer`)
- `lib/cache/cache-utils.ts` — patterns de cache keys

### ⏱️ Estimación

- Original: 24h
- Re-estimada: **28h** (+4h). Stockly no aporta lo que esperaba el brain. Hay que diseñar el módulo desde cero (movimientos + triggers + costing). +4h de diseño antes de codear.

---

## B.8 — Guías de remisión y B.9 — Facturación SUNAT

### 📦 Repos de referencia

- `giansalex/lycet` (PHP/Symfony, MIT, **último commit 2026-04-28 — HOY**, repo activo).
- `erickorlando/openinvoiceperu` (.NET/C#, Apache 2.0, último commit **2022-03-20** — abandonado).

⚠️ **Ambos generan UBL 2.1 XML directo a SUNAT**. Nosotros vamos vía NUBEFACT (HTTP JSON) por ADR 0003. Por lo tanto:

- ❌ **No copiar la generación XML ni el firmado digital.** NUBEFACT lo hace por nosotros.
- ✅ **Sí copiar** el modelo de datos, los catálogos SUNAT, y el patrón de "fiscal module aislado del core".

### ✅ Patrones a tomar

**1. Modelo de datos canónico (de OpenInvoicePeru, traducir a Drizzle + Zod)**

`OpenInvoicePeru.Comun.Dto/Modelos/DocumentoElectronico.cs` define **38 campos** que cubren factura, boleta, NC y ND. Es la referencia más completa de campos SUNAT. Resumen de los críticos:

| Campo OpenInvoicePeru                                             | Nuestro Drizzle                    | Notas                                                         |
| ----------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------- |
| `IdDocumento`                                                     | `numero` (ej "F001-123")           | Serie + correlativo concatenado                               |
| `TipoDocumento`                                                   | `tipo_documento` (text)            | Catálogo 01: '01'/'03'/'07'/'08'                              |
| `Emisor`, `Receptor` (Compania)                                   | embebido o FK                      | Razón social + RUC + dirección + ubigeo                       |
| `FechaEmision`, `HoraEmision`                                     | `fecha_emision timestamptz`        | Una sola columna para ambos                                   |
| `Moneda`                                                          | `moneda text`                      | 'PEN' / 'USD' (catálogo 02)                                   |
| `Gravadas`, `Gratuitas`, `Inafectas`, `Exoneradas`, `Exportacion` | columnas separadas `numeric(14,4)` | Necesarias para totales SUNAT                                 |
| `LineExtensionAmount`, `TaxInclusiveAmount`                       | `subtotal`, `total`                | Nombres UBL — usamos los nuestros pero el cálculo es idéntico |
| `Items` (List<DetalleDocumento>)                                  | `lineas_factura`                   | FK a tabla aparte                                             |
| `MontoEnLetras`                                                   | `total_en_letras`                  | Necesario en factura impresa                                  |
| `Credito`, `MontoCredito`, `DatoCreditos`                         | enlace a `creditos_cliente` (B.10) | Para facturas a crédito                                       |
| `Relacionados`                                                    | `documento_origen_id`              | NC/ND apuntan a factura origen                                |

**Para guías de remisión** (`GuiaRemision.cs`), campos requeridos por SUNAT:

- `IdDocumento`, `FechaEmision`, `TipoDocumento` ('09' remitente, '31' transportista)
- `Remitente`, `Destinatario`, `Tercero` (todos `Contribuyente` con doc + razón)
- `CodigoMotivoTraslado` (catálogo 09: '01'=Venta, '02'=Compra, '04'=Traslado entre estab., '13'=Otros)
- `DescripcionMotivo`, `Transbordo bool`, `PesoBrutoTotal numeric`
- `ModalidadTraslado`, `FechaInicioTraslado`
- `RucTransportista`, `RazonSocialTransportista`

**2. Pattern "controllers por tipo de documento" (de Lycet)**

```
src/lib/sunat/
├── nubefact-client.ts          # cliente HTTP único
├── send/
│   ├── send-factura.ts         # POST a NUBEFACT
│   ├── send-boleta.ts
│   ├── send-nota-credito.ts
│   ├── send-nota-debito.ts
│   ├── send-guia-remitente.ts
│   └── send-guia-transportista.ts
├── builders/
│   └── ...                     # ya en el brain
```

Lycet hace `InvoiceController::send()`, `NoteController::send()`, etc., todos llamando a un `DocumentRequestInterface` genérico parametrizado por el tipo (`Invoice::class`). Replicamos en TS con un genérico:

```typescript
async function enviarComprobante<T extends ComprobanteSunat>(
  tipo: T['tipo_documento'],
  payload: T
): Promise<NubefactResponse> {
  // 1. validar idempotency: ya existe nubefact_response?
  // 2. construir payload con builders[tipo]
  // 3. POST a NUBEFACT
  // 4. guardar respuesta + CDR + XML en Storage
}
```

**3. Catálogos SUNAT como constantes tipadas**

```typescript
// src/lib/sunat/schemas/catalogos-sunat.ts
export const TIPO_DOCUMENTO = {
  FACTURA: '01',
  BOLETA: '03',
  NOTA_CREDITO: '07',
  NOTA_DEBITO: '08',
  GUIA_REMITENTE: '09',
  GUIA_TRANSPORTISTA: '31',
} as const;

export const TIPO_AFECTACION_IGV = {
  GRAVADO: '10',
  EXONERADO: '20',
  INAFECTO: '30',
  EXPORTACION: '40',
} as const;

export const MOTIVO_TRASLADO = {
  VENTA: '01',
  COMPRA: '02',
  TRASLADO_ENTRE_ESTAB: '04',
  OTROS: '13',
} as const;

export type TipoDocumento = (typeof TIPO_DOCUMENTO)[keyof typeof TIPO_DOCUMENTO];
// ... etc
```

OpenInvoicePeru hardcodea estos en `DetalleDocumento.cs` con defaults `UnidadMedida = "NIU"; TipoPrecio = "01"; TipoImpuesto = "10"`. Tomamos el patrón de defaults sensatos para el caso 95% (venta gravada de unidades).

**4. Cola de reintentos con `pgmq`** (no es de Lycet/OIP — es del brain). Patrón clave: el outbox `sunat_outbox` es una `pgmq.queue`, una Edge Function la procesa cada 30s, retry con backoff exponencial, max 5 intentos antes de marcar `error_sunat`. Lycet también tiene cola pero en Symfony Messenger — el concepto es el mismo.

**5. Idempotency por `serie + numero`** (ya en el brain). Antes de POST a NUBEFACT, query si la factura tiene `nubefact_response`. Si sí, refresh CDR sin reenviar. Esto evita duplicados cuando la respuesta llega tarde.

### ❌ Lo que evitar

- **Generar XML UBL directo.** Tanto Lycet como OpenInvoicePeru lo hacen (Greenter en PHP, custom en .NET). Nosotros NO. NUBEFACT recibe JSON, devuelve XML+CDR firmado. **No tocamos OpenSSL ni firmas digitales.**
- **Manejar el certificado digital nosotros.** Lycet pide convertir `.pfx` → `.pem` y guardarlo. OpenInvoicePeru tiene un proyecto entero `OpenInvoicePeru.Firmado` para esto. Es un dolor de cabeza legal y operacional. NUBEFACT lo abstrae — eso es lo que pagamos.
- **OpenInvoicePeru abandonado.** Última actividad 2022. SUNAT actualizó normativa después (UBL 2.1 v3). Si tomamos catálogos de ahí, **verificar contra el manual oficial NUBEFACT actual** antes de hardcodear.
- **Endpoints de "consultar CDR".** Lycet tiene `ConsultCdrServiceFactory`. NUBEFACT envía webhook. No hagamos polling.

### 🔗 Archivos clave

**De OpenInvoicePeru** (modelo de datos):

- `OpenInvoicePeru/OpenInvoicePeru.Comun.Dto/Modelos/DocumentoElectronico.cs` — modelo factura/boleta/NC/ND
- `OpenInvoicePeru/OpenInvoicePeru.Comun.Dto/Modelos/DetalleDocumento.cs` — modelo línea (incluye campos guía)
- `OpenInvoicePeru/OpenInvoicePeru.Comun.Dto/Modelos/GuiaRemision.cs` — modelo guía de remisión
- `OpenInvoicePeru/OpenInvoicePeru.Comun.Dto/Modelos/Compania.cs` — emisor/receptor
- `OpenInvoicePeru/OpenInvoicePeru.Comun.Dto/Modelos/DocumentoRelacionado.cs` — para NC/ND vinculadas

**De Lycet** (estructura de servicios):

- `src/Controller/v1/InvoiceController.php` — patrón endpoint por documento
- `src/Service/DocumentRequestInterface.php` + `DocumentRequest.php` — abstracción genérica
- `config/serializer/Sale.SaleDetail.yml` — campos de línea de venta (UBL)
- `config/serializer/Despatch.Despatch.yml` — campos de guía

### ⏱️ Estimación

- B.8 Guías: original 22h. **Sin cambios** — el modelo OpenInvoicePeru nos ahorra ~4h pero el modelado de remitente/transportista/tercero tiene su complejidad.
- B.9 Facturación: original 28h. **Sin cambios** — los catálogos SUNAT y los DTOs nos ahorran ~6h de leer manuales SUNAT, pero la cola de reintentos + webhook + idempotency + tests con MSW son trabajo real que el brain ya estimó bien.

---

## B.10 — Crédito y cuentas por cobrar

### 📦 Repo de referencia

- `flash-oss/medici` (https://github.com/flash-oss/medici)
- ✅ Mantenido (último commit 2025-07-11), MIT, ~700 stars en npm.
- ❌ **Stack incompatible**: Mongoose-only. No hay Postgres adapter.

### ✅ Patrones a tomar (conceptuales)

**1. El concepto de "Book → Journal → Transactions" con balance que debe ser zero.** Es la idea madre del double-entry: cada movimiento financiero genera al menos dos transacciones (debit + credit) que suman 0. Aplicable a nivel mental para nosotros, pero **no es necesario implementarlo en el MVP**.

```typescript
// PATRÓN MEDICI (ilustrativo, NO copiar a Orión):
await book
  .entry('Pago factura F001-00123')
  .debit('Activos:Caja', 1180) // entra plata
  .credit('CxC:GrupoIdex:F001-00123', 1180) // se cancela la cuenta
  .commit();
```

**2. Memo + audit trail por journal entry.** Cada operación financiera tiene un texto descriptivo + timestamp + autor. Aplicable: en `pagos.observacion` y `pagos.registrado_por`. Ya está en el brain.

**3. Cuentas con path jerárquico (`Activos:Caja`, `Activos:Banco:BCP`).** Si en el futuro el cliente quiere reportería contable, este pattern nos permite expandir. Por ahora, **no lo implementamos**.

### ❌ Lo que evitar

- **Introducir double-entry en el MVP.** El brain modela B.10 como `facturas + pagos + matview cuentas_por_cobrar`. Eso es **suficiente** para el alcance contractual (CxC con aging). Meter medici/lefra agrega 30-40h de complejidad innecesaria. Si después el cliente pide contabilidad real, hacemos un módulo B.12 separado.
- **Mongoose.** Stack mismatch absoluto. Si en algún momento se decide hacer double-entry de verdad, usar **`radzserg/lefra`** (Postgres-based, también mencionado en el brain) en lugar de medici.
- **Floats.** medici usa `number` con precision configurable. Nosotros usamos `numeric(14,4)` en Postgres → BigDecimal del lado TS. No mezclar.

### 🔗 Archivos clave (de medici, solo conceptual)

- `src/Book.ts` — concepto Book + balance snapshots
- `src/Entry.ts` — pattern fluido `entry().debit().credit().commit()`
- `README.md` — explicación de double-entry para devs sin background contable

### ⏱️ Estimación

- Original: 22h
- Re-estimada: **22h sin cambios**. medici NO se va a usar; el brain ya define un modelo más simple que ajusta. Las 22h son CRUD de pagos + matview + cron diario + UI de aging.

---

## B.11 — Panel y reportes

### 📦 Repo de referencia

- `tremorlabs/tremor` (https://github.com/tremorlabs/tremor)
- ✅ Activo (2025-10-10), Apache 2.0, ~17k stars.
- ⚠️ **OJO**: el repo `tremorlabs/tremor` es ahora **Tremor Raw** (sin licencia comercial) — son componentes copy-paste-able estilo shadcn, no un paquete npm. Esto es bueno: copiamos lo que necesitamos.

### ✅ Patrones a tomar

**1. Componentes que aplican directo** (todos compatibles con Tailwind + Radix):

- `BarChart` — para "ventas por mes" en dashboard
- `BarList` — top 10 clientes / top 20 productos
- `Card` — KPI cards con header/value/delta
- `ComboChart` — bar + line para "ventas vs cotizaciones"
- `CategoryBar` — distribución de stock por familia
- `Calendar` — date range picker para filtrar reportes

**2. Estructura de cada componente Tremor** (similar a shadcn):

```
src/components/components/BarChart/
├── BarChart.tsx
├── BarChart.stories.tsx
└── BarChart.test.tsx
```

Replicamos en `src/components/charts/` cuando los copiemos.

**3. Convención de variantes con CVA** (class-variance-authority) — ya la usamos por shadcn.

### ❌ Lo que evitar

- **`@tremor/react` como dep npm.** Tremor v3 (el paquete npm) tiene problemas de tree-shaking y costos de licencia para casos comerciales. Los componentes Raw del repo `tremorlabs/tremor` son MIT-equivalentes (Apache 2.0) — los copiamos a nuestro repo.
- **Storybook para todos los componentes.** Tremor lo tiene, nosotros no necesitamos. Borrar `*.stories.tsx` cuando copiemos.
- **Forzar la paleta de colores Tremor.** Usan azul/morado por default; nuestro tema es shadcn neutral + acento. Adaptar `tailwind.config.ts` cuando copiemos.

### 🔗 Archivos clave

- `src/components/BarChart/` — bar chart
- `src/components/BarList/` — top N lista
- `src/components/Card/` — KPI card
- `src/components/ComboChart/` — bar + line
- `src/components/Calendar/` + `DatePicker/` — picker de rango
- `src/utils/chartColors.ts` — paleta (adaptar a la nuestra)

### ⏱️ Estimación

- Original: 20h
- Re-estimada: **20h sin cambios**. Copiar 5-6 componentes son ~3h; el resto (drill-down, vistas materializadas en Postgres con `pg_cron`, diseño UX del dashboard) es trabajo real.

---

## Resumen de re-estimación

| Módulo           | Brain    | Re-estimado | Δ       |
| ---------------- | -------- | ----------- | ------- |
| B.3 Clientes     | 22h      | 18h         | **−4h** |
| B.4 Catálogo     | 32h      | 32h         | 0       |
| B.5 Cotizaciones | 30h      | 30h         | 0       |
| B.6 OC           | 12h      | 12h         | 0       |
| B.7 Kardex       | 24h      | 28h         | **+4h** |
| B.8 Guías        | 22h      | 22h         | 0       |
| B.9 Facturación  | 28h      | 28h         | 0       |
| B.10 Crédito     | 22h      | 22h         | 0       |
| B.11 Reportes    | 20h      | 20h         | 0       |
| **Subtotal**     | **212h** | **212h**    | **0**   |

Neto: **0 horas de impacto en el cronograma**. Las −4h de B.3 (sin repo guía pero implementación trivial) compensan las +4h de B.7 (Stockly no aporta).

## Próximos pasos sugeridos

1. **Antes de empezar B.3**: actualizar `06-modules-spec.md` para reemplazar `giansalex/consulta-ruc` por una nota de "implementación directa contra apis.net.pe".
2. **Antes de empezar B.4**: leer schemas de `pjborowiecki/QUANTUM-STASH/src/db/schema/index.ts` (15 min) — pero como base, no como destino.
3. **Antes de empezar B.5**: leer `al1abb/invoify/lib/schemas.ts` y `contexts/InvoiceContext.tsx` (30 min). Internalizar el pattern `fieldValidators`.
4. **Antes de empezar B.7**: agendar 4h de diseño en pizarra (kardex + concurrencia + costing). Stockly no aporta. Mejor alternativa: leer `frappe/erpnext/erpnext/stock/doctype/stock_ledger_entry/` antes.
5. **Antes de empezar B.8/B.9**: traducir `OpenInvoicePeru.Comun.Dto/Modelos/*.cs` → `src/lib/sunat/schemas/*.ts` como Zod schemas. ~4h. Esto destraba todo el módulo SUNAT.
6. **Para B.11**: copiar 5-6 componentes Tremor a `src/components/charts/` como primer paso del módulo (~2h, primer commit visible para el cliente).

---

_Investigación ejecutada el 2026-04-28 por Claude Opus 4.7 (1M context). Repos clonados a `/tmp/orion-research/` con `--depth 1`. Tiempo neto: ~70 min._
