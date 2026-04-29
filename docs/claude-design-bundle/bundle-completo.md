# Sistema Orión — Bundle completo para Claude Design

> Archivo único concatenado con todo el contexto. Usalo cuando Claude Design
> solo acepta una subida. Si podés subir varios archivos, mejor adjuntar
> 00-PROMPT.md + los 7 archivos individuales.

---

================================================================================

# ARCHIVO: 00-PROMPT.md

================================================================================

# Sistema Orión — ERP B2B multi-tenant (Perú)

> **Prompt para Claude Design.** Pegar este bloque entero junto con los archivos
> 01 a 07 de esta misma carpeta como adjuntos / contexto.

---

Necesito mockups de UI para un ERP B2B multi-tenant para Grupo Idex SAC, una distribuidora
peruana de conectores eléctricos (marca "Idex") y agroquímicos (marca "Agroalves").
Es producto INTERNO, NO público. NO hay landing, NO hay marketing pages.

## Stack y restricciones técnicas (no negociables)

- Next.js 15 (App Router) + Server Components por default
- shadcn/ui + Tailwind CSS 3.x (sin Material, sin Chakra, sin Ant)
- Lucide React para iconos
- recharts para gráficos
- Idioma de la UI: ESPAÑOL (rioplatense neutral / peruano). Códigos en inglés.
- Multi-tenant path-based: rutas `/admin` (superadmin Dignita), `/idex/*`, `/agroalves/*`

## Audiencia

- Lucas Escrivá (gerente, decisor, usa todo)
- 2-3 vendedores comerciales (cotizaciones, clientes, productos)
- 1-2 personas de facturación SUNAT (facturas, guías, CxC)
- 1 administrador Dignita (gestión de tenants, multi-empresa)

Todos en escritorio (Windows + Chrome). Tablet ocasional. Mobile NO requerido.

## Personalidad visual

- Profesional, limpio, denso de información (es ERP, no app de consumer)
- Neutral con acento de color por tenant:
  - Idex: azul cobalto `#0070f3` (eléctrica/industrial)
  - Agroalves: verde `#16a34a` (agro)
  - /admin Dignita: morado `#7c3aed` (plataforma)
- Modo dark opcional (no obligatorio v1)
- Tipografía: Inter (default shadcn)
- Densidad: tablas con rows compactas (~36px), cards con padding moderado
- Sin emojis en UI, sin ilustraciones decorativas; solo iconos funcionales

## Layout base

- Sidebar fijo (240px) izquierda con logo del tenant arriba + nav vertical
- Header (56px) arriba con breadcrumbs + search global Cmd+K + user menu
- Main content con padding 24px, max-width fluida
- Mismo layout para `/admin` (Dignita) que para `/[slug]/*` (tenant) pero con
  branding y nav diferentes

## Componentes compartidos a diseñar como design system

1. **TenantLayout** — header + sidebar + breadcrumbs + user menu
2. **DataTable** — tabla con búsqueda integrada, filtros por columna,
   paginación, sorting, multi-select, acciones row
3. **EntityForm** — patrón estándar para CRUD: header con título + acciones,
   contenido en tabs opcionales, footer fijo con botones
4. **WizardSteps** — indicador horizontal de pasos (usado en onboarding tenant,
   importar Excel, nueva cotización)
5. **StatusBadge** — pill con colores semánticos:
   - borrador = gris
   - enviada/pendiente = azul
   - aprobada/aceptada = verde
   - rechazada/error = rojo
   - vencida = naranja
   - anulada = gris tachado
6. **TimelineEvento** — timeline vertical para detalle de cotización/factura
   con eventos cronológicos (created, sent, approved, sent_to_sunat, accepted)
7. **MoneyDisplay** y **MoneyInput** — formato `USD 1,234.5678` (4 decimales para
   precios de productos; 2 decimales para totales en facturas)
8. **CommandPalette (Cmd+K)** — overlay con búsqueda global productos/clientes/cotizaciones
9. **PermissionGate** — los mocks deben mostrar variantes con/sin elementos
   según rol (ej: comercial NO ve precio_compra)

## Estados a contemplar EN CADA pantalla

- Loading: skeleton loaders, NO spinners
- Empty: mensaje + CTA primario ("Aún no hay cotizaciones. Crear primera →")
- Error: fallback amigable cuando una acción falla
- Sin permiso: bloqueo a nivel pantalla con mensaje claro

## Pantallas a diseñar (PRIORIDAD ALTA — necesarias para arrancar)

> **El detalle completo de cada pantalla está en `01-implementation-plan.md`,
> Apéndice A "Catálogo de pantallas".** Lista resumida acá:

### Plataforma (admin Dignita)

1. `/admin` — dashboard plataforma
2. `/admin/tenants` — listado
3. `/admin/tenants/nuevo` — wizard 5 pasos (Datos / Branding / Admin / Fiscal / Plan)

### Auth

4. `/login` — magic link
5. `/login/mfa` — TOTP 6 dígitos
6. `/seleccionar-empresa` — picker visual cuando user pertenece a 2+ tenants

### Tenant — operación día a día

7. `/[slug]/` — dashboard homepage con 6 KPI cards + 2 charts + 2 listas
8. `/[slug]/clientes` — listado búsqueda fuzzy
9. `/[slug]/clientes/nuevo` — form con autocompletado RUC/DNI (4 estados:
   idle, consultando, autocompletado OK, error con fallback manual)
10. `/[slug]/clientes/[id]` — detalle 4 tabs
11. `/[slug]/productos` — grilla cards con búsqueda fuzzy en vivo
12. `/[slug]/productos/[id]` — detalle 4 tabs (datos, precios histórico, kardex, ventas)
13. `/[slug]/productos/importar` — wizard 3 pasos (Upload / Preview con errores marcados / Confirmar)
14. `/[slug]/cotizaciones` — listado con filtros
15. `/[slug]/cotizaciones/nueva` — form complejo: cliente + líneas drag&drop +
    búsqueda producto cmdk + totales panel + margen selector
16. `/[slug]/cotizaciones/[id]` — detalle con timeline + acciones según estado
17. `/[slug]/inventario` — resumen con stock crítico destacado
18. `/[slug]/inventario/[productoId]` — kardex timeline vertical
19. `/[slug]/guias/nueva` — form con campos SUNAT
20. `/[slug]/facturas` — listado con badges estado SUNAT
21. `/[slug]/facturas/nueva` — auto-detecta factura/boleta según tipo doc cliente
22. `/[slug]/facturas/[id]` — detalle con timeline SUNAT + descargas PDF/XML/CDR
23. `/[slug]/credito` — dashboard CxC con aging chart (buckets 0-30/31-60/61-90/90+)
24. `/[slug]/credito/clientes/[id]` — detalle: línea, facturas, pagos, alertas

### Tenant — admin del tenant (Lucas)

25. `/[slug]/admin/usuarios` — listado + invitar
26. `/[slug]/admin/roles` — matriz checkboxes rol × permiso, agrupada por módulo,
    con icono ⚠️ para permisos sensibles (en naranja)

## Pantallas PRIORIDAD MEDIA (segunda iteración OK)

- Configuración tenant (branding, fiscal, plan)
- Auditoría log (filtros + tabla)
- Reportes (selector + ventas + cxc + stock + comerciales)
- Familias/categorías de productos
- Transportistas y vehículos (config guías)

## Decisiones de UX a respetar

(Detalle en `01-implementation-plan.md` y `06-modules-spec.md`)

- **Cotización tiene 6 estados**; los botones cambian según estado:
  - `borrador` → [Editar] [Enviar]
  - `enviada` → [Aprobar] [Rechazar]
  - `aprobada` → [Convertir a factura] [Convertir a OC]
  - `rechazada/vencida/convertida` → solo lectura, sin acciones

- **Factura SUNAT timeline visible**: Creada → En cola → Enviada NUBEFACT →
  Aceptada SUNAT con CDR. Si hay error, mostrar código SUNAT y mensaje
  (los códigos importantes son 2017, 2105, 2335, 4243).

- **Importación Excel**: en preview, filas con error en rojo, warnings en
  naranja, total de cambios visible, botón "Confirmar import" deshabilitado
  si hay errores.

- **Validación SUNAT del RUC en form de cliente**: progreso inline (skeleton
  del campo razón social mientras se consulta apis.net.pe), después auto-fill
  con animación sutil. Si apis.net.pe falla, mostrar warning naranja "API no
  responde, ingrese datos manualmente" pero NO bloquear el form.

## Datos a incluir en mockups (realismo)

- Empresa Idex: razón social "GRUPO IDEX SAC", RUC 20614847370, USD como moneda
- Productos típicos:
  - SKU "TER-50AWG-1/4", "Terminal compresión 1 hueco 50 AWG agujero 1/4 pulgada"
  - SKU "CAB-10AWG-NEG", "Cable cobre 10 AWG color negro 600V"
  - Familia "Terminales 1 hueco 35Kv", calibre "50mm²", voltaje "600V"
- Clientes típicos: empresas peruanas con RUC iniciando 20...
- Series SUNAT: F001 (factura), B001 (boleta), T001 (guía), FC01 (NC factura)
- Numeración: F001-00000123 formato

## Lo que NO quiero

- ❌ Páginas de marketing / landing
- ❌ Pricing pages
- ❌ Onboarding tutorial floating
- ❌ Mockups con look Material Design / Bootstrap
- ❌ Iconos coloridos / emojis
- ❌ Gradientes excesivos
- ❌ Imágenes stock photography

## Output esperado

Mockups con:

1. Las 26 pantallas de prioridad alta
2. Sistema de diseño documentado (los 9 componentes compartidos)
3. Cada pantalla en 2 estados clave (default + uno destacado: empty/loading/error/sin-permiso)
4. Tema light obligatorio, dark opcional
5. Spec mínima: spacing scale, color tokens, tipografía
6. Identificar para cada pantalla: ruta exacta, propósito, datos mostrados,
   acciones disponibles, rol que la ve

## Archivos de contexto adjuntos en este bundle

- `01-implementation-plan.md` — **CRÍTICO**: Apéndice A tiene las ~50 pantallas
  con propósito, datos, acciones, estados, rol que las ve
- `02-project-overview.md` — qué es Orión y para quién
- `03-stack-conventions.md` — convenciones de naming, idioma, estructura
- `04-multi-tenant-pattern.md` — estructura de URLs path-based
- `05-rbac-casbin.md` — permisos por rol (qué oculta o muestra cada uno)
- `06-modules-spec.md` — detalle de módulos (campos, estados de cada entidad)
- `07-patterns-from-references.md` — patrones de UI extraídos de invoify, tremor

Por favor empezá con el sistema de diseño (paleta, tipografía, spacing, los 9
componentes compartidos), después seguí con las pantallas de prioridad alta
en este orden: 1, 2, 3, 4, 5, 6, 7 (dashboard tenant), 14, 15, 16
(flujo cotización completo), después el resto.

================================================================================

# ARCHIVO: 01-implementation-plan.md

================================================================================

# Sistema Orión — Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar los plans módulo por módulo. Cada `docs/plans/B-XX-*.md` tiene tasks con checkboxes para tracking.
>
> **Para Claude Design:** ver Apéndice A "Catálogo de pantallas" al final de este documento — es el input directo.

**Goal:** Plan de implementación completo de Sistema Orión, un ERP B2B multi-tenant para Grupo Idex SAC, listo para ejecutarse con subagentes especializados.

**Architecture:** Next.js 15 (App Router) + Supabase (Postgres + RLS + Auth + Storage + Edge Functions) + Drizzle ORM + Casbin (RBAC) + Tailwind + shadcn/ui. Multi-tenant path-based (`/idex`, `/agroalves`, `/admin`). Aislamiento real vía RLS, Casbin para permisos granulares por acción.

**Tech Stack:** Next.js 15.x, TypeScript 5.x strict, Drizzle ORM, Supabase, Tailwind 3.x, shadcn/ui, Zod, react-hook-form, TanStack Query/Table, @react-pdf/renderer, xstate, Casbin, papaparse, recharts, vitest, playwright.

**Plazo contractual:** 33 días calendario. Internamente 7 semanas L-V × 10h = 350h disponibles. Estimado: 312h. Buffer: 38h.

---

## Tabla de contenidos

1. [Estado actual del proyecto](#estado-actual-del-proyecto)
2. [Mapa de dependencias entre módulos](#mapa-de-dependencias-entre-módulos)
3. [Roadmap por fases (7 semanas)](#roadmap-por-fases-7-semanas)
4. [Catálogo de subagentes y mapeo](#catálogo-de-subagentes-y-mapeo)
5. [Convenciones transversales](#convenciones-transversales)
6. [Resumen ejecutivo por módulo](#resumen-ejecutivo-por-módulo)
   - [B.0 Tenants y Plataforma](#b0--tenants-y-plataforma--18h)
   - [B.1 Multiempresa](#b1--multiempresa--8h)
   - [B.2 Autenticación y Roles](#b2--autenticación-y-roles--20h)
   - [B.3 Gestión de Clientes](#b3--gestión-de-clientes--18h-re-estimado)
   - [B.4 Catálogo de Productos](#b4--catálogo-de-productos--32h)
   - [B.5 Cotizaciones](#b5--cotizaciones--30h)
   - [B.6 Órdenes de Compra](#b6--órdenes-de-compra--12h)
   - [B.7 Inventario y Kardex](#b7--inventario-y-kardex--28h-re-estimado)
   - [B.8 Guías de Remisión](#b8--guías-de-remisión--22h)
   - [B.9 Facturación SUNAT](#b9--facturación-sunat--28h)
   - [B.10 Crédito y CxC](#b10--crédito-y-cxc--22h)
   - [B.11 Panel y Reportes](#b11--panel-y-reportes--20h)
7. [Riesgos transversales](#riesgos-transversales)
8. [Setup inicial y DevOps (12h)](#setup-inicial-y-devops-12h)
9. [Testing y Hardening (22h)](#testing-y-hardening-22h)
10. [Apéndice A: Catálogo de pantallas (input para Claude Design)](#apéndice-a--catálogo-de-pantallas)
11. [Apéndice B: Tipos compartidos](#apéndice-b--tipos-compartidos)

---

## Estado actual del proyecto

| Aspecto                                        | Estado                                           |
| ---------------------------------------------- | ------------------------------------------------ |
| Brain con specs (`.gemini/antigravity/brain/`) | ✅ Completo (8 archivos)                         |
| Investigación de repos de referencia           | ✅ Completa (`docs/PATTERNS-FROM-REFERENCES.md`) |
| Repositorio git                                | ✅ Inicializado (sin remoto aún)                 |
| Master plan (este documento)                   | 🟡 En curso                                      |
| Plans por módulo (`docs/plans/B-XX-*.md`)      | 🟡 En curso                                      |
| Mockups Claude Design                          | ⏸️ Pendiente (input = Apéndice A)                |
| Implementación módulo por módulo               | ⏸️ Pendiente                                     |

**Pre-requisitos antes de iniciar implementación**:

1. Ejecutar `setup-orion.sh` o equivalente para tener el scaffold Next.js + Drizzle + Supabase local funcionando.
2. Conectar el repo a un remoto GitHub para que CI/CD opere.
3. Conseguir credenciales sandbox NUBEFACT (bloqueante para B.8/B.9 — no bloquea otros módulos).
4. Confirmar disponibilidad de credenciales apis.net.pe (bloqueante para B.3 nice-to-have, no estrictamente).
5. Claude Design ejecutado con Apéndice A como input → mockups en `docs/design/`.

---

## Mapa de dependencias entre módulos

```
                    ┌─────────────────────┐
                    │ Setup + DevOps (12h)│
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ B.0 Tenants (18h)   │ ← bloqueante de TODO
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
       ┌───────────┐    ┌───────────┐    ┌──────────────┐
       │B.1 Multi- │    │B.2 Auth/  │    │              │
       │ empresa   │◄───│ Roles 20h │    │              │
       │ 8h        │    │ + Casbin  │    │              │
       └─────┬─────┘    └─────┬─────┘    │              │
             └────────┬───────┘          │              │
                      │                  │              │
            ┌─────────┴────────┐         │              │
            ▼                  ▼         │              │
       ┌──────────┐      ┌──────────┐    │              │
       │B.3 Clien │      │B.4 Catá- │    │              │
       │ tes 18h  │      │ logo 32h │    │              │
       └────┬─────┘      └────┬─────┘    │              │
            │                 │          │              │
            └────────┬────────┘          │              │
                     ▼                   │              │
                ┌──────────┐             │              │
                │B.5 Coti- │             │              │
                │zacs 30h  │             │              │
                └────┬─────┘             │              │
                     │                   │              │
              ┌──────┼───────┐           │              │
              ▼      ▼       ▼           │              │
         ┌──────┐ ┌──────┐ ┌──────┐      │              │
         │B.6 OC│ │B.7   │ │B.8   │ ◄────┘              │
         │ 12h  │ │Kardex│ │Guías │ (B.8 también        │
         └──────┘ │ 28h  │ │ 22h  │  necesita NUBEFACT) │
                  └───┬──┘ └──┬───┘                     │
                      │       │                         │
                      └───┬───┘                         │
                          ▼                             │
                     ┌──────────┐                       │
                     │B.9 SUNAT │ ◄─────────────────────┘
                     │ 28h      │  (NUBEFACT credentials)
                     └────┬─────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
         ┌────────┐  ┌──────────┐  ┌────────┐
         │B.10    │  │B.11      │  │Testing │
         │Crédito │  │Reportes  │  │+ Hard. │
         │ 22h    │  │ 20h      │  │ 22h    │
         └────────┘  └──────────┘  └────────┘
```

**Reglas de dependencias derivadas**:

- Nada arranca sin Setup + B.0.
- B.1 y B.2 pueden ir en paralelo.
- B.3 y B.4 pueden ir en paralelo (ambos requieren B.1 + B.2).
- B.5 requiere B.3 + B.4 (cliente + productos).
- B.6 reusa el 80% de B.5; arrancar después de cerrar B.5.
- B.7 puede arrancar en paralelo con B.6 (solo necesita B.4).
- B.8 requiere B.5 + B.7 + credenciales NUBEFACT.
- B.9 es el último módulo crítico (depende de B.8 estar funcionando).
- B.10 y B.11 pueden ir en paralelo después de B.9.
- Testing+Hardening corre en paralelo a todos los módulos pero culmina al final.

---

## Roadmap por fases (7 semanas)

| Semana | Foco                | Módulos                                 | Demo al cliente                             |
| ------ | ------------------- | --------------------------------------- | ------------------------------------------- |
| **1**  | Fundación           | Setup, B.0, B.1, B.2                    | Login + selector empresa + onboarding admin |
| **2**  | Datos maestros      | B.3, B.4                                | CRUD clientes + catálogo con búsqueda       |
| **3**  | Cotizaciones        | B.5                                     | Cotización completa con PDF + estados       |
| **4**  | Operaciones         | B.6, B.7                                | OC + kardex con movimientos                 |
| **5**  | SUNAT (alto riesgo) | B.8, B.9                                | Guía + factura emitida a sandbox NUBEFACT   |
| **6**  | Cierre comercial    | B.10, B.11                              | Pagos + dashboard con métricas              |
| **7**  | Hardening           | Testing E2E + bugs + onboarding cliente | Go-Live                                     |

**Decisiones clave del roadmap**:

- **Semana 5 = pico de riesgo**: SUNAT puede salir mal por temas de credenciales, cambios de catálogos, ambigüedades en el manual NUBEFACT. Buffer reservado para esta semana.
- **Demos semanales**: cada viernes, demo al cliente Lucas con lo cerrado en la semana. Cláusula 7.4 del contrato — Lucas valida o pide cambios.
- **Buffer 38h** distribuido: 8h/semana 5, 8h/semana 7, 22h flotantes para imprevistos del cliente.

---

## Catálogo de subagentes y mapeo

El brain `07-agent-roles.md` ya define 4 subagentes propios del proyecto. Los planes detallados los referencian usando estos nombres:

| Agente del proyecto | Cuándo usar                                                          | Equivalente en mi catálogo Claude Code    |
| ------------------- | -------------------------------------------------------------------- | ----------------------------------------- |
| `architect`         | Diseño previo a programar (ej: "diseñá flujo cotización end-to-end") | `architect-reviewer` o `general-purpose`  |
| `schema-builder`    | Migrations + Drizzle schema + tipos TS sincronizados                 | `database-administrator` + `postgres-pro` |
| `sunat-integrator`  | Wrapper Nubefact, módulo crítico B.8/B.9                             | `general-purpose` con prompt SUNAT        |
| `reviewer`          | Validar pre-merge contra criterios Anexo I                           | `code-reviewer`                           |

**Para tareas que NO mapean a los 4 propios** (ej: armar UI components con Tailwind), el plan usa subagentes de mi catálogo:

| Tipo de tarea                 | Subagent recomendado                               |
| ----------------------------- | -------------------------------------------------- |
| Server Actions + Zod          | `backend-developer`                                |
| UI con shadcn + Tailwind      | `frontend-developer` o `react-specialist`          |
| Forms con react-hook-form     | `react-specialist`                                 |
| Tests Vitest unitarios        | `test-automator`                                   |
| Tests Playwright E2E          | `qa-expert`                                        |
| Optimización queries Postgres | `postgres-pro`                                     |
| RLS + triggers                | `database-administrator`                           |
| Casbin policies               | `security-engineer`                                |
| react-pdf templates           | `frontend-developer`                               |
| Importación Excel             | `python-pro` o `backend-developer` (con papaparse) |
| Charts/Reportes               | `frontend-developer`                               |

**Antigravity vs Claude Code (del brain `07-agent-roles.md`)**:

- Antigravity (Sonnet 4.6): UI components, formularios, iteración visual rápida.
- Claude Code (Opus 4.7): arquitectura, migrations complejas, SUNAT, refactors, review pre-demo.

---

## Convenciones transversales

Aplican a TODOS los módulos. Los plans detallados las repiten cuando sea relevante.

### Idioma

- **DB**: tablas y columnas en `snake_case` español (`cotizaciones`, `lineas_cotizacion`, `fecha_emision`).
- **UI**: textos visibles en español.
- **Código**: variables, funciones, comentarios en inglés (`function calculateTotal`, no `function calcularTotal`).
- **Mensajes de error de Zod**: en español ("Cantidad debe ser mayor a 0", no "Quantity must be greater than 0").

### Numérico

- **Precios**: `numeric(14,4)` en Postgres → `string` en TS (Drizzle no convierte automático para evitar pérdida de precisión).
- **IGV**: 18.00 (siempre `numeric(5,2)`, nunca hardcoded como `0.18`).
- **Cantidades**: `numeric(10,2)` (permite 99,999,999.99).
- **Tipo de cambio**: `numeric(10,4)` (4 decimales por convención SUNAT).

### Estructura de archivos

```
src/
├── app/
│   ├── (auth)/
│   ├── (app)/
│   │   ├── [companySlug]/
│   │   │   ├── <modulo>/
│   │   │   │   ├── page.tsx               # listado
│   │   │   │   ├── nuevo/page.tsx         # crear
│   │   │   │   └── [id]/page.tsx          # detalle/editar
│   │   ├── admin/                         # superadmin Dignita
│   │   └── seleccionar-empresa/
│   └── api/                               # solo webhooks/casos especiales
├── components/
│   ├── ui/                                # shadcn (no modificar)
│   ├── shared/                            # reusables
│   └── modules/<modulo>/                  # específicos
├── lib/
│   ├── db/{schema.ts, client.ts}
│   ├── schemas/                           # Zod
│   ├── auth/                              # casbin + helpers
│   ├── sunat/                             # wrapper NUBEFACT
│   ├── pdf/                               # templates react-pdf
│   └── utils/
├── server/
│   └── actions/<modulo>.ts                # Server Actions
└── middleware.ts
```

### Server Actions

Toda mutación pasa por una Server Action. Patrón estándar:

```typescript
'use server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/casbin';
import { db } from '@/lib/db/client';
import { revalidatePath } from 'next/cache';

const InputSchema = z.object({
  /* ... */
});
type Input = z.infer<typeof InputSchema>;

export async function nombreAccion(input: Input) {
  try {
    const data = InputSchema.parse(input);
    await requirePermission('modulo.accion');

    const result = await db.transaction(async (tx) => {
      // ... lógica
    });

    revalidatePath(`/[companySlug]/<modulo>`);
    return { success: true as const, data: result };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { success: false as const, error: 'validation', details: e.errors };
    }
    if (e instanceof ForbiddenError) {
      return { success: false as const, error: 'forbidden' };
    }
    if (e instanceof BusinessError) {
      return { success: false as const, error: 'business', message: e.message };
    }
    throw e; // bug, dejá que Next lo capture
  }
}
```

### Tests

- **Unit**: `*.test.ts` al lado del archivo. Vitest. Cobertura ≥70% en `src/lib/`.
- **Integration**: `tests/integration/*.test.ts`. Vitest + Supabase local.
- **E2E**: `tests/e2e/*.spec.ts`. Playwright.
- **Crítico (100% cobertura)**: `src/lib/sunat/`, `src/server/actions/facturas*`, `src/server/actions/kardex*`.

### Commits

- Conventional Commits con scope del módulo.
- Idioma del scope: español; verbo: inglés.
- Ejemplos:
  - `feat(cotizaciones): add margin selector with presets`
  - `fix(kardex): resolve race condition on concurrent invoicing`
  - `chore(sunat): update catálogo 07 to latest SUNAT spec`

### Branches

- `main` — producción
- `develop` — staging
- `feat/B-XX-<modulo>` — branch por módulo
- PR a `develop`, no directo a `main`

---

## Resumen ejecutivo por módulo

Cada módulo tiene su plan detallado en `docs/plans/B-XX-*.md`. Acá un resumen.

---

### B.0 — Tenants y Plataforma — 18h

**Plan detallado**: `docs/plans/B-00-tenants.md`

**Goal**: Módulo Superadmin Global de Dignita. Permite crear nuevos tenants vía wizard de 5 pasos, gestionar platform admins, y ver auditoría de plataforma.

**Pre-requisitos**: Setup completo. NUBEFACT credentials NO requeridas (las del tenant se ingresan en wizard paso 4 pero pueden quedar dummy).

**Tablas creadas**: `tenants`, `platform_admins`, `tenant_members`, `platform_audit_log`, `tenant_usage_metrics`.

**Pantallas**:

- `/admin` — dashboard superadmin
- `/admin/tenants` — listado de tenants
- `/admin/tenants/nuevo` — wizard 5 pasos
- `/admin/tenants/[id]` — detalle/editar tenant
- `/admin/usuarios-globales` — otros platform admins
- `/admin/auditoria` — audit log

**Tareas (resumen)**: 6 tareas, ~18h.

1. Schema `tenants` + RLS (3h)
2. Schema `platform_admins` + `tenant_members` + RLS (3h)
3. Wizard onboarding paso 1-2 (datos básicos + branding) (4h)
4. Wizard paso 3-5 (admin, fiscal, plan) + seed Casbin (4h)
5. Listado + detalle tenants (2h)
6. Audit log + métricas uso (2h)

**Agentes asignados**: `schema-builder` (tareas 1-2), `architect` + `frontend-developer` (3-4), `frontend-developer` (5), `backend-developer` (6).

**Riesgos**:

- ⚠️ Slug único en tiempo real con debounce 300ms — bug si no se cancela bien al navegar.
- ⚠️ Magic link de invitación al admin del tenant — confiar en Supabase Auth, NO inventar.

**Done criteria**:

- [x] Lucas (futuro tenant superadmin) puede recibir magic link y entrar a `/idex/admin`.
- [x] Crear tenant duplicado (mismo slug) falla con mensaje claro en UI.
- [x] Audit log registra `tenant.created` con `created_by`.

---

### B.1 — Multiempresa — 8h

**Plan detallado**: `docs/plans/B-01-multiempresa.md`

**Goal**: Selector path-based de empresa, persistencia de la última empresa visitada, RLS aplicada a TODAS las tablas de negocio creadas en módulos posteriores.

**Pre-requisitos**: B.0 completo (tablas tenants y tenant_members existen).

**Tablas creadas**: ninguna nueva (solo agrega RLS policies y JWT custom claims).

**Pantallas**:

- `/seleccionar-empresa` — picker visual de tenants disponibles
- (todas las otras rutas heredan el `[companySlug]`)

**Tareas (resumen)**: 4 tareas, ~8h.

1. Middleware `[companySlug]` validation + inyección header (2h)
2. JWT custom claim hook + función `current_tenant_id()` Postgres (2h)
3. Pantalla `/seleccionar-empresa` (2h)
4. Helper `getCurrentTenant()` + persistencia en `auth.users.user_metadata` (2h)

**Agentes asignados**: `architect` (1), `schema-builder` (2), `frontend-developer` (3), `backend-developer` (4).

**Riesgos**:

- 🔴 Si el JWT claim no se inyecta bien, las RLS no filtran y se expone data cross-tenant. Test de seguridad obligatorio.

**Done criteria**:

- [x] Usuario miembro de 2 tenants ve picker. De 1 tenant, va directo a `/[slug]`.
- [x] Cambiar de tenant actualiza JWT y persiste en user_metadata.
- [x] Test E2E: user de Idex no puede ver `/agroalves/clientes` (redirige a selector).

---

### B.2 — Autenticación y Roles — 20h

**Plan detallado**: `docs/plans/B-02-auth-roles.md`

**Goal**: Login con magic link, MFA obligatorio para Superadmin, sistema de roles dinámicos editables vía UI con Casbin enforcer + RLS combinado, vista `productos_publicos` que oculta costos a no-Superadmin.

**Pre-requisitos**: B.0 + B.1.

**Tablas creadas**: `roles`, `permisos_definidos`, `rol_permisos`, `casbin_rule`, `audit_permisos`.

**Pantallas**:

- `/login` — formulario email + magic link
- `/login/mfa` — verificación MFA (TOTP)
- `/login/recuperar` — reset password
- `/[slug]/admin/usuarios` — listado + invitar
- `/[slug]/admin/usuarios/[id]` — editar usuario, asignar rol
- `/[slug]/admin/roles` — matriz de permisos editable
- `/[slug]/admin/roles/nuevo` — crear rol custom

**Tareas (resumen)**: 8 tareas, ~20h.

1. Schema roles + permisos + Casbin tables + RLS (3h)
2. Seed catálogo `permisos_definidos` (1h)
3. Casbin enforcer + adapter Postgres (3h)
4. Helper `requirePermission()` + `usePermission()` cliente (2h)
5. Login + magic link flow (Supabase Auth) (2h)
6. MFA enrollment + verification (TOTP) (3h)
7. UI gestión usuarios + invitación (3h)
8. UI matriz de permisos por rol (3h)

**Agentes asignados**: `schema-builder` (1-2), `security-engineer` (3-4, 6), `frontend-developer` (5, 7-8).

**Riesgos**:

- 🔴 Vista `productos_publicos` vs `productos`. Si una query usa `productos` desde la UI, se filtran costos. Test obligatorio.
- ⚠️ Casbin policies se cachean en memoria; cambios desde UI necesitan invalidar. Usar `enforcer.loadPolicy()` post-mutación.

**Done criteria**:

- [x] User con rol Comercial NO ve `precio_compra` en ninguna pantalla.
- [x] Toggle de un permiso en UI cambia el comportamiento sin restart de app.
- [x] Audit log registra cambios de permisos con IP del actor.

---

### B.3 — Gestión de Clientes — 18h (re-estimado)

**Plan detallado**: `docs/plans/B-03-clientes.md`

**Goal**: CRUD clientes B2B/B2C, validación SUNAT/RENIEC en tiempo real con caché 30 días, exportación a Excel.

**Pre-requisitos**: B.1 + B.2. APIs.net.pe token (nice-to-have, hay fallback a captura manual).

**Tablas creadas**: `clientes`, `validaciones_documento`, `direcciones_cliente`, `contactos_cliente`.

**Pantallas**:

- `/[slug]/clientes` — listado con búsqueda, paginación, filtros
- `/[slug]/clientes/nuevo` — crear (con autocompletado RUC/DNI)
- `/[slug]/clientes/[id]` — detalle/editar + tabs (datos, direcciones, contactos, historial)

**Tareas (resumen)**: 6 tareas, ~18h.

1. Schema clientes + validaciones_documento + RLS (3h)
2. Wrapper apis.net.pe con caché TTL 30d (3h)
3. Server Actions CRUD + Zod schemas (3h)
4. Listado + búsqueda + paginación TanStack Table (3h)
5. Form crear/editar con autocompletado RUC (3h)
6. Tabs detalle: direcciones, contactos, historial (3h)

**Agentes asignados**: `schema-builder` (1), `backend-developer` (2-3), `frontend-developer` (4-6).

**Riesgos**:

- ⚠️ Rate limit apis.net.pe (100/día gratis). Debounce + cache obligatorio.
- ⚠️ Si apis.net.pe está caído, NO bloquear la creación; mostrar warning y permitir ingreso manual.

**Done criteria**:

- [x] Crear cliente con RUC válido autocompleta razón social, dirección, ubigeo.
- [x] Crear cliente con RUC inválido muestra error específico.
- [x] Crear cliente con apis.net.pe caído permite continuar con warning.

---

### B.4 — Catálogo de Productos — 32h

**Plan detallado**: `docs/plans/B-04-catalogo.md`

**Goal**: CRUD productos con atributos estructurados (calibre mm²/AWG/MCM, voltaje, color, diámetro), doble lista de precios (compra + venta), búsqueda fuzzy con `pg_trgm` + `tsvector`, importación Excel tolerante a headers basura.

**Pre-requisitos**: B.1 + B.2.

**Tablas creadas**: `productos`, `precios_producto`, `categorias_producto`, `productos_publicos` (vista que oculta costos).

**Pantallas**:

- `/[slug]/productos` — grilla con búsqueda fuzzy instantánea
- `/[slug]/productos/nuevo` — form crear
- `/[slug]/productos/[id]` — detalle con historial de precios
- `/[slug]/productos/importar` — wizard upload Excel con preview
- `/[slug]/productos/familias` — gestión de familias/categorías

**Tareas (resumen)**: 9 tareas, ~32h.

1. Schema productos + precios_producto + RLS + tsvector trigger (4h)
2. Vista `productos_publicos` que oculta `precio_compra` (1h)
3. Server Actions CRUD + Zod (4h)
4. Listado con búsqueda fuzzy en vivo (`pg_trgm`) (4h)
5. Form crear/editar producto con atributos dinámicos (4h)
6. Historial de precios (gráfico + tabla) (3h)
7. Importador Excel: parser + preview + commit (6h)
8. Detección de errores en preview (SKU duplicado, precio < costo, etc.) (3h)
9. UI familias/categorías + asignación masiva (3h)

**Agentes asignados**: `schema-builder` (1-2), `backend-developer` (3, 7-8), `frontend-developer` (4-6, 9).

**Riesgos**:

- 🔴 Importación Excel: el archivo real de Idex tiene 9 filas de headers basura. Parser tiene que ser tolerante. Sin esto, importación no funciona.
- ⚠️ `pg_trgm` requiere `CREATE EXTENSION pg_trgm` — verificar que Supabase lo permita (sí lo permite).
- ⚠️ 475 SKUs por tenant es chico, pero la búsqueda en vivo (sin debounce) puede saturar conexiones. Debounce 300ms obligatorio.

**Done criteria**:

- [x] Importar el Excel real de SegElectrica (475 productos) sin pérdida.
- [x] Buscar "term 50" devuelve "Terminal 50mm² 1 hueco" en <200ms.
- [x] User con rol Comercial NO ve `precio_compra` en grilla ni detalle.

---

### B.5 — Cotizaciones — 30h

**Plan detallado**: `docs/plans/B-05-cotizaciones.md`

**Goal**: CRUD cotizaciones con xstate (6 estados: borrador → enviada → aprobada → convertida | rechazada | vencida), generación PDF profesional con react-pdf en serverless, conversión a OC/factura/guía sin perder trazabilidad, selector de margen con presets 5/10/15.

**Pre-requisitos**: B.3 + B.4.

**Tablas creadas**: `cotizaciones`, `lineas_cotizacion`, `cotizaciones_versiones` (snapshots por cambio post-envío).

**Pantallas**:

- `/[slug]/cotizaciones` — listado con filtros por estado, cliente, comercial
- `/[slug]/cotizaciones/nueva` — wizard/form de creación
- `/[slug]/cotizaciones/[id]` — detalle con timeline de estados
- `/[slug]/cotizaciones/[id]/editar` — solo si estado=borrador
- `/[slug]/cotizaciones/[id]/preview-pdf` — preview antes de enviar
- `/[slug]/cotizaciones/[id]/convertir` — modal convertir a OC/factura/guía

**Tareas (resumen)**: 9 tareas, ~30h.

1. Schema cotizaciones + lineas + versiones + RLS (3h)
2. Trigger SQL para `numero` autoincremental por tenant (`COT-2026-00123`) (1h)
3. State machine xstate (6 estados, eventos, guards) (4h)
4. Server Actions: crear, editar, enviar, aprobar, rechazar, convertir (4h)
5. Form creación con líneas dinámicas, búsqueda producto, totales en vivo (5h)
6. Selector de margen con preset + bloqueo si margen < mínimo del producto (2h)
7. Template react-pdf de cotización (4h)
8. Generación PDF en Server Action + upload Storage (2h)
9. Conversión a OC/factura/guía (snapshot inmutable) (5h)

**Agentes asignados**: `schema-builder` (1-2), `architect` (3), `backend-developer` (4, 8-9), `frontend-developer` (5-7).

**Riesgos**:

- 🔴 react-pdf en serverless: cold start ~1.5s. Aceptable. Pero si el bundle pasa los 50MB de Vercel function, hay que mover a edge function.
- ⚠️ Conversión cotización → factura debe copiar líneas (snapshot), no referenciar. Si después editan la cotización, la factura no se contamina.
- ⚠️ El número correlativo `COT-YYYY-NNNNN` debe ser secuencial sin huecos por tenant. Trigger SQL atómico.

**Done criteria**:

- [x] Cotización en `borrador` editable; en `enviada` no editable, solo Aprobar/Rechazar.
- [x] PDF generado tiene logo del tenant, datos completos, total en letras correcto.
- [x] Convertir a factura no modifica la cotización original.

---

### B.6 — Órdenes de Compra — 12h

**Plan detallado**: `docs/plans/B-06-ordenes-compra.md`

**Goal**: OC = cotización aprobada con un click hacia el proveedor. Reusa 80% de la mecánica de B.5 con state machine y template propio.

**Pre-requisitos**: B.5 cerrado.

**Tablas creadas**: `ordenes_compra`, `lineas_orden_compra`. Ambas con relaciones opcionales a `cotizaciones`.

**Pantallas**:

- `/[slug]/ordenes` — listado
- `/[slug]/ordenes/nueva` — crear desde cotización aprobada o desde cero
- `/[slug]/ordenes/[id]` — detalle + timeline

**Tareas (resumen)**: 4 tareas, ~12h.

1. Schema ordenes_compra + lineas (2h)
2. Reuso form de B.5 con adaptaciones (proveedor en vez de cliente) (4h)
3. State machine OC (estados: borrador → enviada → aprobada → recibida) (3h)
4. Template react-pdf OC (3h)

**Agentes asignados**: `schema-builder` (1), `frontend-developer` (2, 4), `architect` (3).

**Riesgos**:

- ⚠️ Refactor cuidadoso de los componentes de B.5 para que sirvan en B.6. Si está mal factorizado, B.6 dobla en horas.

**Done criteria**:

- [x] OC creada desde cotización aprobada copia las líneas correctamente.
- [x] PDF de OC tiene visualmente identidad propia (no se confunde con cotización).

---

### B.7 — Inventario y Kardex — 28h (re-estimado)

**Plan detallado**: `docs/plans/B-07-kardex.md`

**Goal**: Sistema de movimientos de stock inmutable (kardex), vista materializada de stock actual, costo promedio o FIFO según política, ajustes manuales con auditoría, alertas de stock crítico.

**Pre-requisitos**: B.4. **+ 4h de diseño en pizarra antes de empezar** (decidir FIFO vs promedio, política stock negativo).

**Tablas creadas**: `kardex_movimientos` (append-only), `costos_inventario` (snapshots por movimiento), vista `stock_actual`, vista `stock_critico`.

**Pantallas**:

- `/[slug]/inventario` — kardex por producto con timeline
- `/[slug]/inventario/ajustes` — form ajuste manual (requiere permiso)
- `/[slug]/inventario/critico` — productos bajo umbral
- `/[slug]/inventario/historial` — todos los movimientos con filtros

**Tareas (resumen)**: 8 tareas, ~28h (incluye 4h de diseño previo). 0. Diseño pizarra: FIFO vs promedio, política stock negativo, costing (4h) — **OBLIGATORIO antes de empezar**

1. Schema kardex_movimientos + costos_inventario + RLS (3h)
2. Vista materializada `stock_actual` con refresh por trigger (3h)
3. Función `registrar_movimiento_stock()` con `SELECT FOR UPDATE` (4h)
4. Server Actions: ajuste manual, consulta kardex (3h)
5. Trigger SQL: al confirmar venta/factura, dispara movimiento (3h)
6. UI kardex por producto + timeline (3h)
7. UI ajustes manuales con auditoría (3h)
8. Tests de concurrencia (2 INSERTs simultáneos al mismo SKU) (2h)

**Agentes asignados**: `architect` (0), `schema-builder` (1-3, 5), `backend-developer` (4), `frontend-developer` (6-7), `test-automator` (8).

**Riesgos**:

- 🔴 Race conditions: 2 ventas simultáneas del mismo SKU. **Sin `SELECT FOR UPDATE`, el stock se desincroniza.**
- 🔴 No hay repo guía. Diseñar desde cero. La hora de pizarra es no-negociable.
- ⚠️ Vistas materializadas necesitan REFRESH MATERIALIZED VIEW; con `pg_cron` o trigger es OK, pero hay que decidir cuál.
- ⚠️ Costing FIFO vs promedio: decidir antes de codear. Si es FIFO, `costos_inventario` es una cola; si es promedio, una sola fila por producto.

**Done criteria**:

- [x] Test de concurrencia: 100 INSERTs simultáneos a la misma fila producen el saldo correcto.
- [x] Ajuste manual queda en audit log con IP, motivo y user.
- [x] Anular factura emite movimiento inverso al original (no DELETE).

---

### B.8 — Guías de Remisión — 22h

**Plan detallado**: `docs/plans/B-08-guias.md`

**Goal**: Emisión de Guías de Remisión Remitente (tipo 09) y Transportista (tipo 31) vía NUBEFACT, con cola de reintentos `pgmq` y manejo de webhook CDR.

**Pre-requisitos**: B.5 + B.7 + **credenciales sandbox NUBEFACT**.

**Tablas creadas**: `guias_remision`, `lineas_guia`, `transportistas`, `vehiculos_transporte`, `sunat_outbox` (cola pgmq), `series_documentos` (correlativos).

**Pantallas**:

- `/[slug]/guias` — listado
- `/[slug]/guias/nueva` — form remitente o transportista
- `/[slug]/guias/[id]` — detalle + estado SUNAT + reintento manual
- `/[slug]/guias/configuracion/transportistas` — CRUD transportistas
- `/[slug]/guias/configuracion/vehiculos` — CRUD vehículos

**Tareas (resumen)**: 8 tareas, ~22h.

1. Schema guias_remision + lineas + transportistas + vehiculos + RLS (3h)
2. Schema series_documentos + función `reservar_correlativo()` atómica (2h)
3. Schema sunat_outbox (pgmq queue) (2h)
4. Wrapper NUBEFACT: builder + sender de guías (4h)
5. Edge Function `procesar-cola-sunat` (consume queue, retry exponencial) (3h)
6. Webhook NUBEFACT (CDR confirmation) (2h)
7. UI form guía remitente/transportista (4h)
8. UI listado + estado SUNAT + retry manual (2h)

**Agentes asignados**: `schema-builder` (1-3), `sunat-integrator` (4-6), `frontend-developer` (7-8).

**Riesgos**:

- 🔴 Sin sandbox NUBEFACT, todo se prueba con mocks (MSW). Riesgo de divergencia con producción.
- 🔴 Idempotency: si NUBEFACT procesa pero responde tarde, no reenviar. Verificar `nubefact_response` en DB antes de enviar.
- ⚠️ Catálogo 09 (motivos de traslado) puede cambiar; no hardcodear, leer de tabla.

**Done criteria**:

- [x] Guía emitida correctamente al sandbox NUBEFACT, CDR recibido.
- [x] Reintento manual desde UI funciona y no duplica.
- [x] Test E2E: emitir guía + simular fallo NUBEFACT + retry automático.

---

### B.9 — Facturación SUNAT — 28h

**Plan detallado**: `docs/plans/B-09-facturacion-sunat.md`

**Goal**: Emisión de Facturas (01), Boletas (03), Notas de Crédito (07), Notas de Débito (08) vía NUBEFACT. Reusa la cola `sunat_outbox` y los wrappers de B.8. Idempotency, anulación correcta vía NC vinculada.

**Pre-requisitos**: B.8 cerrado (cola y wrapper en producción).

**Tablas creadas**: `facturas`, `lineas_factura`, `notas_credito_debito`. Reusa `series_documentos` y `sunat_outbox`.

**Pantallas**:

- `/[slug]/facturas` — listado con filtros (tipo, estado SUNAT, cliente, fecha)
- `/[slug]/facturas/nueva` — form (factura/boleta) con detección automática según tipo cliente
- `/[slug]/facturas/[id]` — detalle + timeline SUNAT + descargar PDF/XML/CDR
- `/[slug]/facturas/[id]/anular` — modal anulación con motivo (genera NC)
- `/[slug]/notas-credito-debito` — listado de NC/ND
- `/[slug]/notas-credito-debito/nueva` — crear NC/ND vinculada

**Tareas (resumen)**: 10 tareas, ~28h.

1. Schema facturas + lineas + notas_credito_debito + RLS (3h)
2. Wrapper NUBEFACT: builders factura/boleta/NC/ND (5h)
3. Catálogos SUNAT como constantes tipadas (2h)
4. Server Actions: emitir, anular, reenviar (3h)
5. Idempotency check pre-envío (1h)
6. Form factura/boleta con líneas, totales, IGV (4h)
7. Detección automática tipo (factura RUC / boleta DNI) (1h)
8. Listado + filtros (3h)
9. Anulación: form motivo → emisión NC vinculada (3h)
10. Descarga PDF/XML/CDR de Storage (2h)

**Agentes asignados**: `schema-builder` (1, 3), `sunat-integrator` (2, 4-5, 9), `frontend-developer` (6-8, 10).

**Riesgos**:

- 🔴 Errores SUNAT (códigos 2017, 2105, 2335, 4243): hay que mapearlos a UX clara. Sin esto, el comercial no sabe qué corregir.
- 🔴 Anulación mal hecha = sanción legal. NC debe estar vinculada con `documento_relacionado_id` y motivo correcto del catálogo 10.
- ⚠️ Boleta a consumidor final con DNI 00000000 — caso permitido por SUNAT pero hay que aceptarlo en validación.

**Done criteria**:

- [x] Factura aceptada por SUNAT sandbox, CDR recibido vía webhook.
- [x] Anulación emite NC con motivo "01 — Anulación", queda en DB con vínculo bidireccional.
- [x] Tests con MSW cubren los 5 códigos SUNAT más comunes.

---

### B.10 — Crédito y CxC — 22h

**Plan detallado**: `docs/plans/B-10-credito-cxc.md`

**Goal**: Gestión de líneas de crédito por cliente, registro de pagos parciales, vista materializada de cuentas por cobrar con aging, cron diario que marca facturas vencidas.

**Pre-requisitos**: B.9 (facturas existen y se pueden filtrar por estado).

**Tablas creadas**: `creditos_cliente`, `pagos`, vista materializada `cuentas_por_cobrar`, vista `aging_cxc`.

**Pantallas**:

- `/[slug]/credito` — dashboard CxC con aging
- `/[slug]/credito/clientes` — listado clientes con saldo
- `/[slug]/credito/clientes/[id]` — detalle: línea, facturas, pagos, alertas
- `/[slug]/credito/pagos/nuevo` — registrar pago
- `/[slug]/credito/configuracion` — políticas globales de crédito

**Tareas (resumen)**: 6 tareas, ~22h.

1. Schema creditos_cliente + pagos + RLS (3h)
2. Vista materializada `cuentas_por_cobrar` + refresh por trigger (3h)
3. Vista `aging_cxc` (0-30, 31-60, 61-90, 90+) (2h)
4. Server Actions: otorgar crédito, registrar pago, bloquear cliente (3h)
5. Cron `pg_cron` diario: marcar facturas vencidas (2h)
6. UI dashboard CxC + listado por cliente + form pago (9h)

**Agentes asignados**: `schema-builder` (1-3, 5), `backend-developer` (4), `frontend-developer` (6).

**Riesgos**:

- ⚠️ Pago en moneda distinta a la factura: si factura en USD y pago en PEN, hay que aplicar tipo de cambio del día. **Decidir política**.
- ⚠️ Pago mayor al saldo: ¿se acepta como "a cuenta"? Decidir.
- ⚠️ Refresh de matview cada 5min via `pg_cron` puede ser lento con muchas facturas. Considerar refresh incremental.

**Done criteria**:

- [x] Aging report muestra correctamente las edades.
- [x] Pago parcial actualiza saldo en <5min (refresh matview).
- [x] Cliente bloqueado por crédito no permite emitir nueva factura a crédito (validación en B.9).

---

### B.11 — Panel y Reportes — 20h

**Plan detallado**: `docs/plans/B-11-reportes.md`

**Goal**: Dashboard del tenant con KPIs en vivo, drill-down a detalle, exportación a Excel. Métricas: ventas mes vs mes anterior, top 10 clientes, top 20 productos, CxC vencidas, stock crítico, pipeline cotizaciones.

**Pre-requisitos**: TODOS los módulos anteriores. Datos reales para mostrar.

**Tablas creadas**: vistas materializadas `dashboard_metricas`, `top_clientes`, `top_productos`, `pipeline_cotizaciones`. Refresh cada 5 min vía `pg_cron`.

**Pantallas**:

- `/[slug]/` — dashboard del tenant (homepage)
- `/[slug]/reportes` — selector de reportes
- `/[slug]/reportes/ventas` — reporte de ventas con filtros
- `/[slug]/reportes/cxc` — aging detallado
- `/[slug]/reportes/stock` — productos críticos
- `/[slug]/reportes/comerciales` — performance por comercial

**Tareas (resumen)**: 6 tareas, ~20h.

1. Vistas materializadas + refresh `pg_cron` (3h)
2. Copiar 6 componentes Tremor a `src/components/charts/` (3h)
3. Dashboard homepage con 6 cards + 2 charts (4h)
4. Reporte de ventas con filtros (fecha, comercial, cliente) (3h)
5. Drill-down: click KPI → tabla detalle (3h)
6. Exportación a Excel de cada reporte (4h)

**Agentes asignados**: `schema-builder` (1), `frontend-developer` (2-5), `backend-developer` (6).

**Riesgos**:

- ⚠️ Refresh matview puede saturar DB con muchos tenants (improbable con 2-3, pero pensarlo).
- ⚠️ Exportación a Excel grande (>10k filas): si el server timeout es 60s, generar en background. Por ahora export síncrono porque los volúmenes son chicos.

**Done criteria**:

- [x] Dashboard carga en <2s con datos reales.
- [x] Click en "Top 1: Cliente X" abre la lista de facturas de ese cliente.
- [x] Excel exportado tiene formato consistente, no datos crudos.

---

## Riesgos transversales

| Riesgo                                                       | Probabilidad | Impacto | Mitigación                                                                      |
| ------------------------------------------------------------ | ------------ | ------- | ------------------------------------------------------------------------------- |
| Demoras del cliente entregando assets (logo, datos fiscales) | Alta         | Medio   | Cláusula 4.3 — habilita ajustar cronograma                                      |
| Cambios SUNAT mid-proyecto                                   | Media        | Alto    | Catálogos en DB (no hardcoded), wrapper desacoplado                             |
| Race conditions en kardex                                    | Media        | Crítico | Tests de concurrencia obligatorios (B.7 task 8)                                 |
| Vista `productos_publicos` mal implementada → leak de costos | Baja         | Crítico | Test obligatorio: user Comercial intenta SELECT productos.precio_compra y falla |
| RLS policy faltante en una tabla nueva                       | Media        | Crítico | Checklist pre-merge: toda tabla nueva tiene `ENABLE ROW LEVEL SECURITY`         |
| Vercel function timeout en generación PDF                    | Baja         | Medio   | Plan B: mover a edge function o usar background job                             |
| Bundle size Vercel >50MB                                     | Baja         | Medio   | Code splitting + dynamic imports en módulos pesados (PDF, charts)               |
| Bug en correlativo SUNAT (saltos)                            | Baja         | Crítico | Función SQL atómica `reservar_correlativo()` con UPDATE...RETURNING             |

---

## Setup inicial y DevOps (12h)

Antes de B.0. Tareas que se ejecutan una sola vez.

| Tarea                                                      | Horas | Agente                     |
| ---------------------------------------------------------- | ----- | -------------------------- |
| Repo GitHub + branches `main`/`develop`                    | 1h    | `devops-engineer`          |
| Vercel project + envs (dev/staging/prod)                   | 2h    | `vercel:deployment-expert` |
| Supabase projects (local con Docker, staging, prod)        | 2h    | `database-administrator`   |
| Pipeline CI: lint + typecheck + tests + build              | 2h    | `devops-engineer`          |
| Sentry + Vercel Analytics                                  | 1h    | `devops-engineer`          |
| pre-commit hooks (lint-staged + commitlint)                | 1h    | `devops-engineer`          |
| README de onboarding dev                                   | 1h    | `documentation-engineer`   |
| RUNBOOK de deploy (`docs/RUNBOOK.md` ya existe, completar) | 2h    | `documentation-engineer`   |

**Done criteria**:

- [x] `git push origin develop` → CI verde + deploy a Vercel preview en <5 min.
- [x] Nuevo dev clona el repo, ejecuta `pnpm install && pnpm dev` y tiene la app corriendo en <10 min.

---

## Testing y Hardening (22h)

En paralelo a los módulos, intensifica la última semana.

| Tarea                                                      | Horas | Agente                   |
| ---------------------------------------------------------- | ----- | ------------------------ |
| Tests E2E de flujos críticos (cotización → factura → pago) | 6h    | `qa-expert`              |
| Tests de seguridad RLS (cross-tenant)                      | 3h    | `security-engineer`      |
| Performance: queries lentas, índices faltantes             | 3h    | `postgres-pro`           |
| Audit log: completar lo que falta                          | 2h    | `backend-developer`      |
| Onboarding cliente (tutoriales en-app)                     | 4h    | `documentation-engineer` |
| Bug bash final                                             | 4h    | `qa-expert`              |

---

## Apéndice A — Catálogo de pantallas

> **Input directo para Claude Design.** Para cada pantalla: ruta, propósito, datos, acciones, estados visibles, rol que la ve. Lo que el modelo necesita para generar mockups útiles.

### Pantallas de plataforma (`/admin`)

| Ruta                       | Propósito               | Datos clave                                                                            | Acciones                                            | Estados                  | Rol            |
| -------------------------- | ----------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------ | -------------- |
| `/admin`                   | Dashboard superadmin    | # tenants activos, # usuarios, métricas uso, alertas                                   | "Crear tenant", "Ver auditoría"                     | activo / con alertas     | Platform Admin |
| `/admin/tenants`           | Listado de tenants      | tabla: razón social, slug, RUC, plan, estado, fecha alta                               | crear, suspender, ver detalle                       | activo, suspendido, baja | Platform Admin |
| `/admin/tenants/nuevo`     | Wizard 5 pasos          | step 1: datos / step 2: branding / step 3: admin / step 4: fiscal SUNAT / step 5: plan | siguiente, atrás, guardar borrador                  | wizard active step       | Platform Admin |
| `/admin/tenants/[id]`      | Detalle tenant          | tabs: datos, usuarios, fiscal, uso, auditoría                                          | editar datos, suspender, reactivar, ver impersonate | activo / suspendido      | Platform Admin |
| `/admin/usuarios-globales` | Otros platform admins   | tabla: email, nombre, último login, MFA enabled                                        | invitar, suspender                                  | activo / suspendido      | Platform Admin |
| `/admin/auditoria`         | Audit log de plataforma | tabla: fecha, actor, acción, target, IP                                                | filtrar por fecha/actor/acción                      | —                        | Platform Admin |

### Pantallas de auth (`/login`, `/seleccionar-empresa`)

| Ruta                   | Propósito                | Datos clave                         | Acciones    | Estados                  | Rol                |
| ---------------------- | ------------------------ | ----------------------------------- | ----------- | ------------------------ | ------------------ |
| `/login`               | Login email + magic link | input email                         | enviar link | idle / sent / error      | público            |
| `/login/mfa`           | Verificación MFA TOTP    | input 6 dígitos                     | verificar   | idle / verifying / error | con sesión parcial |
| `/login/recuperar`     | Reset password           | input email                         | enviar link | idle / sent              | público            |
| `/seleccionar-empresa` | Picker visual de tenants | cards: logo + nombre + rol del user | seleccionar | —                        | con sesión         |

### Pantallas del tenant (`/[slug]/*`)

#### Dashboard

| Ruta       | Propósito           | Datos clave                                                                                   | Acciones                | Estados   | Rol                              |
| ---------- | ------------------- | --------------------------------------------------------------------------------------------- | ----------------------- | --------- | -------------------------------- |
| `/[slug]/` | Homepage del tenant | 6 KPI cards (ventas mes, CxC, stock crítico, etc.), 2 charts (ventas tendencia, top clientes) | drill-down en cada card | live data | cualquier rol con `reportes.ver` |

#### Clientes (B.3)

| Ruta                     | Propósito        | Datos clave                                                                                 | Acciones                                          | Estados                           | Rol              |
| ------------------------ | ---------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------- | ---------------- |
| `/[slug]/clientes`       | Listado          | tabla: doc, razón social, tipo, deuda, último mov                                           | crear, exportar, filtrar                          | activo / suspendido               | `clientes.ver`   |
| `/[slug]/clientes/nuevo` | Crear cliente    | form: tipo doc, número (autocompletado), razón social, dirección, contactos, condición pago | guardar                                           | idle / loading-validacion / saved | `clientes.crear` |
| `/[slug]/clientes/[id]`  | Detalle (4 tabs) | tab datos / tab direcciones / tab contactos / tab historial                                 | editar, eliminar (si permiso), exportar historial | —                                 | `clientes.ver`   |

#### Productos (B.4)

| Ruta                         | Propósito                 | Datos clave                                                                             | Acciones                                                | Estados                | Rol                  |
| ---------------------------- | ------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------- | -------------------- |
| `/[slug]/productos`          | Grilla con búsqueda fuzzy | grid: imagen, SKU, descripción, familia, calibre, precios (oculto si no permiso), stock | crear, importar, filtrar por familia, exportar          | activo / descatalogado | `productos.ver`      |
| `/[slug]/productos/nuevo`    | Crear producto            | form: SKU, descripción, familia, calibre/voltaje/etc, precios, margen mínimo, imagen    | guardar                                                 | idle / saved           | `productos.crear`    |
| `/[slug]/productos/[id]`     | Detalle                   | tabs: datos, precios histórico, kardex, ventas                                          | editar, archivar                                        | activo / descatalogado | `productos.ver`      |
| `/[slug]/productos/importar` | Wizard upload Excel       | step 1: upload / step 2: preview con errores / step 3: confirmar                        | siguiente, cancelar                                     | —                      | `productos.importar` |
| `/[slug]/productos/familias` | Gestión familias          | tabla: nombre, # productos                                                              | crear, editar, eliminar (si vacía), reasignar productos | —                      | `productos.editar`   |

#### Cotizaciones (B.5)

| Ruta                                    | Propósito     | Datos clave                                                                                      | Acciones                                                                  | Estados                                                          | Rol                  |
| --------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------- |
| `/[slug]/cotizaciones`                  | Listado       | tabla: número, cliente, total, estado, comercial, fecha, vence                                   | crear, filtrar por estado                                                 | borrador / enviada / aprobada / rechazada / convertida / vencida | `cotizaciones.ver`   |
| `/[slug]/cotizaciones/nueva`            | Form creación | wizard: cliente → líneas (búsqueda producto + cantidad + precio) → totales con margen → términos | guardar borrador, enviar, preview PDF                                     | wizard step                                                      | `cotizaciones.crear` |
| `/[slug]/cotizaciones/[id]`             | Detalle       | datos + líneas + totales + timeline estados                                                      | editar (si borrador), enviar, aprobar, rechazar, convertir, descargar PDF | según estado                                                     | `cotizaciones.ver`   |
| `/[slug]/cotizaciones/[id]/preview-pdf` | Preview PDF   | render del template con datos                                                                    | descargar, enviar al cliente                                              | —                                                                | `cotizaciones.ver`   |

#### Órdenes de compra (B.6)

| Ruta                    | Propósito                   | Datos clave                             | Acciones                            | Estados                                  | Rol             |
| ----------------------- | --------------------------- | --------------------------------------- | ----------------------------------- | ---------------------------------------- | --------------- |
| `/[slug]/ordenes`       | Listado                     | tabla: número, proveedor, total, estado | crear desde cotización, crear nueva | borrador / enviada / aprobada / recibida | `ordenes.ver`   |
| `/[slug]/ordenes/nueva` | Form (similar a cotización) | proveedor + líneas + totales            | guardar, enviar                     | wizard step                              | `ordenes.crear` |
| `/[slug]/ordenes/[id]`  | Detalle                     | datos + timeline + recepción parcial    | editar, aprobar, marcar recibido    | según estado                             | `ordenes.ver`   |

#### Inventario / Kardex (B.7)

| Ruta                              | Propósito                   | Datos clave                                                         | Acciones                          | Estados                 | Rol                        |
| --------------------------------- | --------------------------- | ------------------------------------------------------------------- | --------------------------------- | ----------------------- | -------------------------- |
| `/[slug]/inventario`              | Resumen + búsqueda producto | tabla productos: SKU, descripción, stock actual, stock crítico flag | seleccionar producto → ver kardex | normal / crítico / cero | `inventario.ver`           |
| `/[slug]/inventario/[productoId]` | Kardex de un producto       | timeline movimientos: fecha, tipo, origen, cantidad, saldo          | filtrar por fecha/tipo, exportar  | —                       | `inventario.ver`           |
| `/[slug]/inventario/ajustes`      | Form ajuste manual          | producto + cantidad + motivo                                        | guardar (genera movimiento)       | idle / saved            | `inventario.ajuste_manual` |
| `/[slug]/inventario/critico`      | Productos bajo umbral       | tabla: SKU, descripción, stock, umbral                              | exportar, generar OC sugerida     | —                       | `inventario.ver`           |

#### Guías de remisión (B.8)

| Ruta                                         | Propósito           | Datos clave                                                                      | Acciones                                        | Estados                                | Rol           |
| -------------------------------------------- | ------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------- | ------------- |
| `/[slug]/guias`                              | Listado             | tabla: número, tipo (rem/transp), destinatario, fecha, estado SUNAT              | crear, filtrar                                  | pendiente / enviada / aceptada / error | `guias.ver`   |
| `/[slug]/guias/nueva`                        | Form                | tipo (rem/transp), destinatario, motivo traslado, ítems, transportista, vehículo | guardar borrador, emitir                        | wizard step                            | `guias.crear` |
| `/[slug]/guias/[id]`                         | Detalle             | datos + estado SUNAT + descargas                                                 | reintentar SUNAT, anular, descargar PDF/XML/CDR | según estado SUNAT                     | `guias.ver`   |
| `/[slug]/guias/configuracion/transportistas` | CRUD transportistas | tabla: razón social, RUC, registro MTC                                           | crear, editar                                   | —                                      | `guias.crear` |
| `/[slug]/guias/configuracion/vehiculos`      | CRUD vehículos      | tabla: placa, marca, modelo, capacidad                                           | crear, editar                                   | —                                      | `guias.crear` |

#### Facturación (B.9)

| Ruta                                 | Propósito                | Datos clave                                                          | Acciones                          | Estados                                              | Rol               |
| ------------------------------------ | ------------------------ | -------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------- | ----------------- |
| `/[slug]/facturas`                   | Listado                  | tabla: serie-número, tipo (F/B), cliente, total, estado SUNAT, fecha | crear, filtrar, exportar          | pendiente / enviada / aceptada / rechazada / anulada | `facturas.ver`    |
| `/[slug]/facturas/nueva`             | Form (auto-detecta tipo) | cliente (autodetecta F/B), líneas, totales con IGV, forma pago       | guardar borrador, emitir          | wizard step                                          | `facturas.emitir` |
| `/[slug]/facturas/[id]`              | Detalle                  | datos + timeline SUNAT + descargas + pagos asociados                 | reenviar SUNAT, anular, descargar | según estado                                         | `facturas.ver`    |
| `/[slug]/facturas/[id]/anular`       | Modal anulación          | motivo (catálogo 10), observaciones                                  | confirmar (genera NC)             | —                                                    | `facturas.anular` |
| `/[slug]/notas-credito-debito`       | Listado NC/ND            | tabla con vínculo a factura origen                                   | crear, filtrar                    | —                                                    | `facturas.ver`    |
| `/[slug]/notas-credito-debito/nueva` | Form NC/ND               | factura origen, tipo, motivo, líneas afectadas                       | emitir                            | —                                                    | `facturas.emitir` |

#### Crédito y CxC (B.10)

| Ruta                            | Propósito                  | Datos clave                                                   | Acciones                                          | Estados                      | Rol                      |
| ------------------------------- | -------------------------- | ------------------------------------------------------------- | ------------------------------------------------- | ---------------------------- | ------------------------ |
| `/[slug]/credito`               | Dashboard CxC              | KPI: total CxC, vencido, # clientes morosos. Aging chart      | drill-down                                        | —                            | `credito.ver`            |
| `/[slug]/credito/clientes`      | Listado clientes con saldo | tabla: cliente, línea crédito, saldo, vencido, días más viejo | filtrar morosos, exportar                         | al día / vencido / bloqueado | `credito.ver`            |
| `/[slug]/credito/clientes/[id]` | Detalle cliente            | línea crédito + facturas pendientes + pagos + alertas         | otorgar/modificar línea, registrar pago, bloquear | —                            | `credito.ver`            |
| `/[slug]/credito/pagos/nuevo`   | Registrar pago             | factura, monto, moneda, método, referencia                    | guardar                                           | —                            | `credito.registrar_pago` |
| `/[slug]/credito/configuracion` | Políticas globales         | plazos default, alertas                                       | guardar                                           | —                            | `admin.config.editar`    |

#### Reportes (B.11)

| Ruta                           | Propósito               | Datos clave                                    | Acciones       | Estados | Rol              |
| ------------------------------ | ----------------------- | ---------------------------------------------- | -------------- | ------- | ---------------- |
| `/[slug]/reportes`             | Selector                | cards de reportes disponibles                  | abrir reporte  | —       | `reportes.ver`   |
| `/[slug]/reportes/ventas`      | Reporte ventas          | tabla + chart, filtros fecha/comercial/cliente | exportar Excel | —       | `reportes.ver`   |
| `/[slug]/reportes/cxc`         | Aging detallado         | tabla con buckets 0-30/31-60/61-90/90+         | exportar       | —       | `credito.ver`    |
| `/[slug]/reportes/stock`       | Productos críticos      | tabla con sugerencia compra                    | generar OC     | —       | `inventario.ver` |
| `/[slug]/reportes/comerciales` | Performance comerciales | ranking + métricas                             | exportar       | —       | `reportes.ver`   |

#### Admin del tenant (`/[slug]/admin`)

| Ruta                          | Propósito              | Datos clave                                      | Acciones                                  | Estados                         | Rol                      |
| ----------------------------- | ---------------------- | ------------------------------------------------ | ----------------------------------------- | ------------------------------- | ------------------------ |
| `/[slug]/admin`               | Panel admin del tenant | accesos rápidos a usuarios, roles, config, audit | —                                         | —                               | tenant Superadmin        |
| `/[slug]/admin/usuarios`      | Listado usuarios       | email, nombre, rol, último login, MFA            | invitar, editar, suspender                | activo / suspendido / pendiente | `admin.usuarios.ver`     |
| `/[slug]/admin/usuarios/[id]` | Editar usuario         | datos + roles asignados + sesiones activas       | cambiar rol, forzar logout, suspender     | —                               | `admin.usuarios.invitar` |
| `/[slug]/admin/roles`         | Matriz de permisos     | tabla: rol × permiso (checkbox)                  | editar, crear rol custom, eliminar custom | —                               | `admin.roles.ver`        |
| `/[slug]/admin/roles/nuevo`   | Crear rol custom       | nombre + descripción + matriz permisos           | guardar                                   | —                               | `admin.roles.editar`     |
| `/[slug]/admin/configuracion` | Config tenant          | branding, fiscal, plan, integraciones            | guardar                                   | —                               | `admin.config.editar`    |
| `/[slug]/admin/auditoria`     | Audit log del tenant   | tabla de eventos                                 | filtrar, exportar                         | —                               | tenant Superadmin        |

### Componentes compartidos (UI primitives a diseñar una vez)

Estos aparecen en múltiples pantallas; conviene que Claude Design los defina como design tokens / componentes reutilizables:

- **TenantLayout** — header + sidebar + breadcrumbs + user menu (todas las páginas `/[slug]/*`)
- **DataTable** — tabla con búsqueda, filtros, paginación, sorting (TanStack Table)
- **EntityForm** — patrón estándar de form CRUD (header + tabs opcionales + footer con acciones)
- **WizardSteps** — indicador de pasos para wizards (B.0 onboarding, B.4 importar, B.5 nueva cotización)
- **StatusBadge** — pill de estado con colores semánticos (borrador=gris, enviada=azul, aprobada=verde, rechazada=rojo, vencida=naranja)
- **TimelineEvento** — para detalle de cotización/factura con eventos en orden cronológico
- **MoneyInput** / **MoneyDisplay** — formato consistente para montos con moneda
- **CommandPalette (`cmdk`)** — Cmd+K global con búsqueda de productos/clientes/cotizaciones
- **PermissionGate** — wrapper que oculta children si user no tiene permiso (`<PermissionGate permiso="cotizaciones.crear">`)

### Estados globales del sistema

Que Claude Design tenga en cuenta:

- **Modo dark** (preferencia del cliente, no obligatorio para v1)
- **Mobile responsive** — alcance contractual no obliga a mobile, pero tabla principal y detalle deberían ser leíbles en tablet
- **Loading states** — skeleton loaders para tablas y cards (no spinners)
- **Empty states** — cada listado debe tener su empty state con CTA ("No hay cotizaciones. Crear primera →")
- **Error states** — fallback amigable cuando un Server Action falla por red/timeout
- **i18n** — solo español por ahora, pero textos en archivos `messages/es.json` para futuro

---

## Apéndice B — Tipos compartidos

Tipos TypeScript que aparecen en varios módulos. Definir en `src/lib/types/index.ts` y exportar.

```typescript
// src/lib/types/index.ts

// Branded type para evitar mezclar IDs
export type TenantId = string & { __brand: 'TenantId' };
export type UserId = string & { __brand: 'UserId' };
export type ClienteId = string & { __brand: 'ClienteId' };
export type ProductoId = string & { __brand: 'ProductoId' };
export type CotizacionId = string & { __brand: 'CotizacionId' };
export type FacturaId = string & { __brand: 'FacturaId' };

// Resultado estándar de Server Actions
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: 'validation'; details: ZodIssue[] }
  | { success: false; error: 'forbidden' }
  | { success: false; error: 'business'; message: string }
  | { success: false; error: 'sunat'; code: number; message: string };

// Moneda
export type Moneda = 'PEN' | 'USD' | 'EUR';

// Decimal-as-string (Drizzle no convierte numeric a number)
export type Decimal = string;

// Estados de cotización
export type EstadoCotizacion =
  | 'borrador'
  | 'enviada'
  | 'aprobada'
  | 'rechazada'
  | 'convertida'
  | 'vencida';

// Estados de factura SUNAT
export type EstadoFacturaSunat =
  | 'borrador'
  | 'pendiente_envio'
  | 'enviada_sunat'
  | 'aceptada_sunat'
  | 'rechazada_sunat'
  | 'error_envio'
  | 'anulada';

// Tipos de documento de identidad SUNAT (catálogo 06)
export const TIPO_DOC_IDENTIDAD = {
  DNI: '1',
  CARNET_EXTRANJERIA: '4',
  RUC: '6',
  PASAPORTE: '7',
} as const;

// Tipos de comprobante (catálogo 01)
export const TIPO_COMPROBANTE = {
  FACTURA: '01',
  BOLETA: '03',
  NOTA_CREDITO: '07',
  NOTA_DEBITO: '08',
  GUIA_REMITENTE: '09',
  GUIA_TRANSPORTISTA: '31',
} as const;

// Tipo afectación IGV (catálogo 07)
export const TIPO_AFECTACION_IGV = {
  GRAVADO: '10',
  EXONERADO: '20',
  INAFECTO: '30',
  EXPORTACION: '40',
} as const;

// Errores de negocio
export class BusinessError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}

export class ForbiddenError extends Error {
  constructor(public permiso: string) {
    super(`Sin permiso: ${permiso}`);
    this.name = 'ForbiddenError';
  }
}

export class SunatError extends Error {
  constructor(
    public sunatCode: number,
    message: string
  ) {
    super(message);
    this.name = 'SunatError';
  }
}
```

---

## Próximos pasos sugeridos

1. **Revisar este master plan** y los plans por módulo (`docs/plans/B-XX-*.md`) — ajustar si algo no encaja con tu visión.
2. **Mandar el Apéndice A a Claude Design** con un prompt tipo: "Generar mockups para ERP B2B Sistema Orión. Stack: Next.js + shadcn/ui. Usar las pantallas listadas. Estética: profesional, limpia, neutral con acento color (azul Idex / verde Agroalves). Mobile-tablet responsive. Modo dark opcional."
3. **Cuando vuelvan los mockups**, ajustar plans (puede que algunas pantallas se merjan o splitten).
4. **Setup inicial (12h)** se puede ejecutar en paralelo a Claude Design — no espera mockups.
5. **B.0 (18h)** se puede arrancar en paralelo a Claude Design también — su UI es de admin interno, no necesita aprobación de diseño del cliente.
6. **Recién con mockups aprobados**, lanzar B.3+ con subagentes en paralelo donde el grafo de dependencias lo permita.

---

_Plan generado por Claude Opus 4.7 (1M context) el 2026-04-28. Plans detallados por módulo en `docs/plans/`. Total estimado: 312h sobre 350h disponibles, buffer 38h._

================================================================================

# ARCHIVO: 02-project-overview.md

================================================================================

# 00 — Project Overview

> Este archivo es leído automáticamente por Antigravity al abrir el proyecto.
> Es el contexto base que el modelo (Claude Sonnet 4.6 / Opus 4.6) usa para entender en qué está trabajando.

## ¿Qué es Orion-ERP?

Sistema Orión es una plataforma B2B multi-empresa que cubre el ciclo comercial completo de Grupo Idex SAC y Agroalves: cotizaciones, órdenes de compra, inventario con kardex, guías de remisión electrónicas, facturación SUNAT, gestión de crédito y cuentas por cobrar.

**Cliente principal**: Grupo Idex SAC (RUC 20614847370), con dos unidades de negocio activas:

- **Idex**: distribución eléctrica, conectores y aditivos (~475 SKUs)
- **Agroalves**: fertilizantes y agroquímicos

**Prestador**: Dignita.tech SAC (RUC 20609709201), Leonidas Yauri.

## Decisiones arquitectónicas no negociables

1. **Multi-tenant path-based**: URLs `/idex/cotizaciones`, `/agroalves/clientes`, `/admin` (Superadmin global Dignita). NO subdominios.
2. **Aislamiento por RLS**: cada query de negocio filtra por `tenant_id` automáticamente vía Postgres Row Level Security.
3. **Stack obligatorio por contrato**: Next.js 15 (App Router) + Supabase + Tailwind + shadcn/ui + Vercel.
4. **Stack interno (decisión Dignita)**: Drizzle ORM (NO Prisma), Zod, TanStack Query/Table, react-hook-form, @react-pdf/renderer (NO Puppeteer), xstate (state machines), Casbin (RBAC dinámico).
5. **SUNAT vía NUBEFACT** (PSE+OSE+ISO 27001), NO APISUNAT directo.
6. **Precios `numeric(14,4)`** — el catálogo real tiene 4 decimales (`0.1536`).
7. **Búsqueda con `pg_trgm` + `tsvector`** para fuzzy search en productos.

## Restricciones del contrato

- **Plazo**: 33 días calendario. Internamente extendido a 7 semanas L-V × 10h = 350h. Estimado de trabajo: 262h. Buffer: 88h.
- **Contraprestación**: USD 1,380 (50% adelanto, 50% al Go-Live).
- **Garantía**: 30 días post-entrega para corregir bugs sin costo.
- **Soporte continuado**: contrato separado (Anexo II) post-garantía.
- **Cláusula 7.4**: cliente designa una persona contacto principal con autoridad para validar entregables.
- **Cláusula 4.3**: demoras imputables al cliente (no entregar assets) habilitan ajustar el cronograma.

## Referencias rápidas

- Catálogo Idex: PDF de 14 familias de conectores, sin SKUs, calibres mm²/AWG/MCM
- Catálogo SegElectrica (proveedor de Idex): Excel con 475 productos, 7 categorías, doble columna de precios (lista AAA + venta sugerida)
- Margen promedio implícito: ~14.3% entre precio compra y precio venta
- Precios en USD, IGV 18% no incluido en listas

## Equipo

- **Leonidas Yauri** (Dignita): tech lead, full-stack
- **Lucas M. Escrivá de Romaní** (Idex): cliente, decisor de negocio

## Convenciones de comunicación con el modelo

Cuando me hagas pedidos:

- Si menciono un módulo (B.4 Catálogo, B.5 Cotizaciones, etc.), lee primero `06-modules-spec.md`.
- Si vas a tocar permisos, lee `05-rbac-casbin.md`.
- Si vas a tocar SUNAT, lee `04-sunat-nubefact-spec.md`.
- Antes de proponer una librería externa nueva, verificá que esté justificada en `01-stack-conventions.md`.
- Antes de modificar el modelo de datos, verificá `02-architecture.md` y `03-multi-tenant-pattern.md`.

================================================================================

# ARCHIVO: 03-stack-conventions.md

================================================================================

# 01 — Stack y convenciones de código

## Stack obligatorio (contrato)

| Capa                          | Tecnología   | Versión           |
| ----------------------------- | ------------ | ----------------- |
| Framework                     | Next.js      | 15.x (App Router) |
| Runtime                       | Node.js      | 20+               |
| Lenguaje                      | TypeScript   | 5.x (strict mode) |
| Estilos                       | Tailwind CSS | 3.x               |
| Componentes UI                | shadcn/ui    | última            |
| Backend / DB / Auth / Storage | Supabase     | última            |
| Hosting frontend              | Vercel       | -                 |
| Repositorio                   | GitHub       | -                 |

## Stack interno (decisión Dignita)

| Capa            | Librería                           | Por qué                                                  |
| --------------- | ---------------------------------- | -------------------------------------------------------- |
| ORM             | **Drizzle**                        | Type-safety nativa, juega mejor con RLS Supabase         |
| Validación      | **Zod**                            | Schemas compartidos cliente/servidor                     |
| Server state    | **TanStack Query**                 | Cache, mutations, optimistic updates                     |
| Tablas          | **TanStack Table**                 | Headless, filtros, paginación, sorting                   |
| Forms           | **react-hook-form** + Zod resolver | Performance + DX                                         |
| Fechas          | **date-fns**                       | Tree-shakeable, locale ES                                |
| PDF             | **@react-pdf/renderer**            | Funciona en serverless (a diferencia de Puppeteer)       |
| Notificaciones  | **sonner**                         | Toasts, default de shadcn                                |
| Estados         | **xstate**                         | Para máquinas de estado complejas (cotización 6 estados) |
| Autorización    | **casbin**                         | RBAC dinámico editable desde UI                          |
| Búsqueda fuzzy  | **pg_trgm** (Postgres)             | Sin librerías cliente, todo en SQL                       |
| CSV/Excel parse | **papaparse**                      | + Drizzle directo a la DB                                |
| Charts          | **recharts**                       | Compatible con shadcn                                    |
| Command palette | **cmdk**                           | Default de shadcn                                        |

## Convenciones de código

### TypeScript

- `strict: true` en `tsconfig.json` siempre.
- NO `any`. Si necesitás escape, usá `unknown` y narrowing.
- Tipos de DB se generan con `pnpm db:types` desde Supabase. Nunca escribirlos a mano.
- Schemas de validación viven en `src/lib/schemas/` y se reusan front + back.

### Estructura de archivos

```
src/
├── app/
│   ├── (auth)/                    Login, signup, password reset
│   │   ├── login/
│   │   └── signup/
│   ├── (app)/                     Rutas autenticadas
│   │   ├── [companySlug]/         /idex, /agroalves
│   │   │   ├── layout.tsx         Valida acceso al tenant
│   │   │   ├── page.tsx           Dashboard del tenant
│   │   │   ├── clientes/
│   │   │   ├── productos/
│   │   │   ├── cotizaciones/
│   │   │   ├── ordenes/
│   │   │   ├── inventario/
│   │   │   ├── guias/
│   │   │   ├── facturas/
│   │   │   ├── credito/
│   │   │   └── reportes/
│   │   ├── admin/                 Superadmin global Dignita
│   │   │   ├── tenants/
│   │   │   ├── usuarios-globales/
│   │   │   └── auditoria/
│   │   └── seleccionar-empresa/   Si user tiene acceso a múltiples
│   ├── api/                       Solo si Server Actions no aplica
│   └── layout.tsx
├── components/
│   ├── ui/                        shadcn (NO modificar el original)
│   ├── shared/                    Componentes reusables
│   └── modules/                   Componentes por módulo
│       ├── cotizaciones/
│       ├── productos/
│       └── ...
├── lib/
│   ├── db/
│   │   ├── schema.ts              Drizzle schema completo
│   │   └── client.ts              Drizzle + Supabase client
│   ├── schemas/                   Zod schemas (negocio)
│   ├── utils/                     Helpers genéricos
│   ├── auth/                      Casbin enforcer + helpers
│   ├── sunat/                     Wrapper Nubefact
│   ├── pdf/                       Templates react-pdf
│   └── database.types.ts          Generado por Supabase, NO editar
├── server/
│   └── actions/                   Server Actions de Next.js
│       ├── cotizaciones.ts
│       ├── productos.ts
│       └── ...
└── middleware.ts                  Auth + validación companySlug
```

### Naming

- **Archivos**: `kebab-case.ts` (`crear-cotizacion.ts`)
- **Componentes**: `PascalCase.tsx` (`CotizacionForm.tsx`)
- **Hooks**: `useCamelCase.ts` (`useCotizacion.ts`)
- **Server Actions**: `verbo-recurso` (`crear-cotizacion`, `enviar-factura-sunat`)
- **Tablas DB**: `snake_case` plural (`cotizaciones`, `lineas_cotizacion`)
- **Columnas DB**: `snake_case` (`fecha_emision`, `tenant_id`)
- **Tipos TS**: `PascalCase` (`Cotizacion`, `LineaCotizacion`)
- **Idioma**: tablas, columnas, mensajes UI en **español**. Código (variables, funciones, comentarios) en **inglés**.

### Server Actions

- Toda mutación pasa por una Server Action (`src/server/actions/`).
- Validar input con Zod siempre.
- Verificar permisos con Casbin antes de ejecutar.
- Devolver `{ success: true, data }` o `{ success: false, error }`.

```typescript
'use server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/casbin';
import { db } from '@/lib/db/client';

const schema = z.object({
  clienteId: z.string().uuid(),
  lineas: z
    .array(
      z.object({
        productoId: z.string().uuid(),
        cantidad: z.number().positive(),
        precio: z.number().nonnegative(),
      })
    )
    .min(1),
});

export async function crearCotizacion(input: z.infer<typeof schema>) {
  const data = schema.parse(input);
  await requirePermission('cotizaciones.crear');
  // ...lógica...
  return { success: true, data: cotizacionCreada };
}
```

### Manejo de errores

- Errores de validación: lanzar `ZodError` (Server Action lo serializa).
- Errores de permisos: `class ForbiddenError extends Error`.
- Errores de negocio: `class BusinessError extends Error` (ej: "stock insuficiente").
- Errores SUNAT: `class SunatError` con `code` (ej: 2017 — RUC no existe).

### Commits (Conventional Commits)

```
feat(cotizaciones): selector de margen con presets 5/10/15
fix(kardex): race condition al concurrentizar facturación
docs(adr): agregar 0009 sobre repo ownership
chore: actualizar deps a Next 15.1
refactor(productos): extraer parseador Excel a util
test(sunat): mocks de respuestas Nubefact
```

Scopes válidos por módulo: `auth`, `tenants`, `clientes`, `productos`, `cotizaciones`, `ordenes`, `kardex`, `guias`, `facturas`, `credito`, `reportes`, `admin`, `sunat`, `pdf`, `db`, `ui`, `infra`.

### Tests

- Unit: `*.test.ts` al lado del archivo. Vitest.
- Integration: `tests/integration/`. Vitest + Supabase local.
- E2E: `tests/e2e/`. Playwright.
- Cobertura mínima: 70% en `src/lib/`. Endpoints críticos (facturación, kardex) 100%.

### Comentarios

- Comentar **el porqué**, no el qué. El código dice qué hace; el comentario dice por qué.
- Para reglas de negocio complejas, linkear al ADR correspondiente.

================================================================================

# ARCHIVO: 04-multi-tenant-pattern.md

================================================================================

# 03 — Multi-tenancy: patrón path-based

## Decisión

URLs con path: `orion.../idex/cotizaciones`, `orion.../agroalves/clientes`, `orion.../admin`.

**No subdominios.** Decidido en ADR 0002.

## Estructura de URLs

```
/login                          Pantalla de login
/seleccionar-empresa            Si user tiene acceso a múltiples
/[companySlug]/                 Dashboard del tenant
/[companySlug]/clientes
/[companySlug]/productos
/[companySlug]/cotizaciones
/[companySlug]/cotizaciones/nueva
/[companySlug]/cotizaciones/[id]
/[companySlug]/admin            Superadmin del tenant (Lucas)
/[companySlug]/admin/usuarios
/[companySlug]/admin/roles
/admin                          Superadmin global Dignita
/admin/tenants                  CRUD de tenants
/admin/tenants/nuevo            Wizard onboarding
/admin/usuarios-globales        Otros admins de Dignita
/admin/auditoria                Audit log de plataforma
```

## Slugs definidos

| Empresa        | Slug        | RUC           |
| -------------- | ----------- | ------------- |
| Grupo Idex SAC | `idex`      | 20614847370   |
| Agroalves      | `agroalves` | (a completar) |

Reglas:

- `lowercase`, alfanumérico + guiones
- 2-30 caracteres
- Único en toda la plataforma
- Inmutable una vez creado (cambio requiere migración manual)

## Niveles de Superadmin

### Superadmin Global (Dignita)

- Vive en `/admin/*`
- Pertenece a tabla `platform_admins`
- Puede: crear/editar/suspender tenants, ver métricas globales, gestionar otros platform admins, ver audit log de plataforma
- NO puede: ver datos transaccionales de los tenants (cotizaciones, facturas, etc.) — separación de responsabilidades

### Superadmin del Tenant (Lucas)

- Vive en `/[companySlug]/admin/*`
- Pertenece a tabla `tenant_members` con rol `Superadmin`
- Puede: gestionar usuarios y permisos dentro de su tenant, configurar series SUNAT, márgenes, ver todo lo transaccional de su empresa
- NO puede: crear nuevos tenants, ver datos de otros tenants

## Middleware

```typescript
// src/middleware.ts (simplificado)
export async function middleware(req: NextRequest) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;

  // Rutas públicas
  if (path.startsWith('/login') || path === '/') return NextResponse.next();

  // Sin user → login
  if (!user) return redirect('/login');

  // /admin → solo platform admins
  if (path.startsWith('/admin')) {
    const isPlatformAdmin = await checkPlatformAdmin(user.id);
    return isPlatformAdmin ? NextResponse.next() : redirect('/seleccionar-empresa');
  }

  // /[companySlug] → validar acceso
  const slug = path.split('/')[1];
  if (slug) {
    const hasAccess = await userBelongsToTenant(user.id, slug);
    if (!hasAccess) return redirect('/seleccionar-empresa');

    // Inyectar tenant_id en header para que las queries lo lean
    const tenantId = await getTenantIdBySlug(slug);
    const res = NextResponse.next();
    res.headers.set('x-tenant-id', tenantId);
    return res;
  }

  return NextResponse.next();
}
```

## RLS — la única defensa real

El path solo es UX. Que la URL diga `/idex` no impide nada por sí mismo.
**RLS de Postgres es lo que de verdad evita que un usuario vea datos ajenos.**

Patrón básico:

```sql
-- Cada tabla de negocio tiene tenant_id
CREATE TABLE clientes (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  -- ...
);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- El user solo ve filas de tenants donde es member
CREATE POLICY "tenant_isolation_select" ON clientes FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  )
);

-- Insert: tenant_id forzado del JWT custom claim, no del input
CREATE POLICY "tenant_isolation_insert" ON clientes FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  )
);
```

## JWT custom claims

Para no joinear contra `tenant_members` en cada query, inyectamos el `current_tenant_id` en el JWT vía Supabase hook:

```sql
-- supabase/migrations/00X_jwt_custom_claims.sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  current_tenant uuid;
BEGIN
  -- Tenant guardado en user_metadata o calculado del último login
  SELECT (event->'user_metadata'->>'current_tenant_id')::uuid INTO current_tenant;

  IF current_tenant IS NOT NULL THEN
    event := jsonb_set(event, '{claims,current_tenant_id}', to_jsonb(current_tenant));
  END IF;

  RETURN event;
END;
$$;
```

Y en RLS usamos `auth.jwt() ->> 'current_tenant_id'` directo.

## Recordar la última empresa visitada

Decisión confirmada: al hacer login, redirigir a `/[ultimaEmpresa]/dashboard`. Si es primer login o no tiene preferencia, ir a `/seleccionar-empresa`.

```typescript
// Al cambiar de empresa o al login exitoso
await supabase.auth.updateUser({
  data: { current_tenant_id: newTenantId },
});
```

## Onboarding de un nuevo tenant (wizard)

Vive en `/admin/tenants/nuevo`. 5 pasos:

1. **Datos básicos**: razón social, RUC, slug (validación de unicidad en tiempo real con debounce 300ms), dirección fiscal, ubigeo.
2. **Branding**: logo (upload a Supabase Storage), colores HEX, favicon.
3. **Superadmin del tenant**: email del primer usuario. Sistema envía magic link de invitación.
4. **Configuración fiscal**: series autorizadas (F001, B001, T001), correlativos iniciales, modo SUNAT (NUBEFACT con RUTA y TOKEN del tenant).
5. **Plan y cuotas**: Starter / Pro / Enterprise. Para Idex: Pro con cuotas ampliadas.

Al completar:

1. INSERT en `tenants`
2. Seed de roles base (Superadmin, Comercial, Facturación) en `roles` con `tenant_id`
3. Seed de permisos en `rol_permisos` según matriz default
4. INSERT en `series_documentos` con correlativo en cero
5. Crear el primer usuario en `auth.users` + `tenant_members` + asignación de rol Superadmin
6. Enviar email magic link
7. Audit log entry: `tenant.created` con `created_by = platform_admin.id`

## Costos por tenant

Tracking en `tenant_usage_metrics`:

- Cotizaciones emitidas/mes
- Facturas emitidas/mes
- Guías emitidas/mes
- Storage MB usado

Sirve para: cobranza Dignita al cliente, vista al cliente de su consumo, alertas si se acerca al límite del plan.

================================================================================

# ARCHIVO: 05-rbac-casbin.md

================================================================================

# 05 — RBAC dinámico con Casbin

## Decisión

**Casbin para policies dinámicas** + **Supabase RLS para aislamiento por tenant**.

Las dos capas son complementarias:

- **RLS** filtra qué FILAS puede ver un usuario (separación entre tenants)
- **Casbin** filtra qué ACCIONES puede ejecutar (crear cotización, anular factura, ver costo)

Decidido en ADR 0004.

## Niveles de admin

| Nivel                     | Vive en           | Tabla                             | Puede                                           |
| ------------------------- | ----------------- | --------------------------------- | ----------------------------------------------- |
| Platform Admin (Dignita)  | `/admin`          | `platform_admins`                 | Crear/suspender tenants, ver métricas globales  |
| Tenant Superadmin (Lucas) | `/[slug]/admin`   | `tenant_members` (rol Superadmin) | Gestionar usuarios, roles y permisos del tenant |
| Roles base del tenant     | dentro del tenant | `tenant_members` (rol X)          | Lo que el Superadmin del tenant les asigne      |
| Roles custom              | dentro del tenant | `tenant_members` (rol X)          | Creados por el Superadmin del tenant            |

## Esquema

```sql
-- Roles (predefinidos + custom por tenant)
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),  -- NULL = rol global de plataforma
  nombre text NOT NULL,
  es_predefinido boolean DEFAULT false,    -- Superadmin/Comercial/Facturación = true
  descripcion text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, nombre)
);

-- Catálogo de permisos (semilla, NO editable desde UI)
CREATE TABLE permisos_definidos (
  codigo text PRIMARY KEY,             -- 'cotizaciones.crear'
  modulo text NOT NULL,                -- 'cotizaciones'
  accion text NOT NULL,                -- 'crear'
  descripcion text NOT NULL,
  es_sensible boolean DEFAULT false    -- 'productos.ver_costo' = true
);

-- Asignación de permisos a roles (editable por Superadmin del tenant)
CREATE TABLE rol_permisos (
  rol_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  permiso_codigo text REFERENCES permisos_definidos(codigo),
  PRIMARY KEY (rol_id, permiso_codigo)
);

-- Casbin guarda sus policies acá (esquema estándar Casbin)
CREATE TABLE casbin_rule (
  id bigserial PRIMARY KEY,
  ptype varchar(100),
  v0 varchar(100),
  v1 varchar(100),
  v2 varchar(100),
  v3 varchar(100),
  v4 varchar(100),
  v5 varchar(100)
);

-- Audit log de cambios de permisos
CREATE TABLE audit_permisos (
  id bigserial PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id),
  user_id uuid REFERENCES auth.users(id),
  accion text NOT NULL,                 -- 'permiso_agregado', 'permiso_removido'
  rol_id uuid,
  permiso_codigo text,
  detalles jsonb,
  ip_address inet,
  created_at timestamptz DEFAULT now()
);
```

## Catálogo de permisos (seed)

Por módulo, definimos las acciones disponibles:

```sql
INSERT INTO permisos_definidos (codigo, modulo, accion, descripcion, es_sensible) VALUES
-- Tenants (solo platform admins)
('tenants.crear', 'tenants', 'crear', 'Crear nuevos tenants', true),
('tenants.suspender', 'tenants', 'suspender', 'Suspender un tenant', true),

-- Clientes (módulo B.3)
('clientes.ver', 'clientes', 'ver', 'Ver lista de clientes', false),
('clientes.crear', 'clientes', 'crear', 'Crear cliente', false),
('clientes.editar', 'clientes', 'editar', 'Editar cliente existente', false),
('clientes.eliminar', 'clientes', 'eliminar', 'Eliminar cliente', true),
('clientes.exportar', 'clientes', 'exportar', 'Exportar lista a Excel', false),

-- Productos (módulo B.4)
('productos.ver', 'productos', 'ver', 'Ver catálogo', false),
('productos.crear', 'productos', 'crear', 'Crear producto', false),
('productos.editar', 'productos', 'editar', 'Editar producto', false),
('productos.eliminar', 'productos', 'eliminar', 'Eliminar producto', true),
('productos.ver_costo', 'productos', 'ver_costo', 'Ver precio de compra (costo)', true),
('productos.editar_margen', 'productos', 'editar_margen', 'Cambiar margen mínimo', true),
('productos.importar', 'productos', 'importar', 'Importar masivamente desde Excel', false),

-- Cotizaciones (módulo B.5)
('cotizaciones.ver', 'cotizaciones', 'ver', 'Ver cotizaciones', false),
('cotizaciones.crear', 'cotizaciones', 'crear', 'Crear cotización', false),
('cotizaciones.editar', 'cotizaciones', 'editar', 'Editar cotización borrador', false),
('cotizaciones.aprobar', 'cotizaciones', 'aprobar', 'Aprobar cotización', false),
('cotizaciones.eliminar', 'cotizaciones', 'eliminar', 'Eliminar cotización', true),
('cotizaciones.cambiar_margen', 'cotizaciones', 'cambiar_margen', 'Modificar margen en línea', false),
('cotizaciones.descuento_excepcional', 'cotizaciones', 'descuento_excepcional', 'Aplicar descuento mayor al estándar', true),

-- Órdenes de compra (B.6)
('ordenes.ver', 'ordenes', 'ver', 'Ver órdenes de compra', false),
('ordenes.crear', 'ordenes', 'crear', 'Crear orden de compra', false),
('ordenes.aprobar', 'ordenes', 'aprobar', 'Aprobar orden', false),

-- Inventario / Kardex (B.7)
('inventario.ver', 'inventario', 'ver', 'Ver kardex', false),
('inventario.ajuste_manual', 'inventario', 'ajuste_manual', 'Ajustar stock manualmente', true),

-- Guías de remisión (B.8)
('guias.ver', 'guias', 'ver', 'Ver guías', false),
('guias.crear', 'guias', 'crear', 'Crear guía de remisión', false),
('guias.anular', 'guias', 'anular', 'Anular guía', true),

-- Facturación (B.9)
('facturas.ver', 'facturas', 'ver', 'Ver facturas', false),
('facturas.emitir', 'facturas', 'emitir', 'Emitir factura/boleta', false),
('facturas.anular', 'facturas', 'anular', 'Anular factura (NC)', true),
('facturas.reenviar_sunat', 'facturas', 'reenviar_sunat', 'Forzar reenvío a SUNAT', true),

-- Crédito y CxC (B.10)
('credito.ver', 'credito', 'ver', 'Ver cuentas por cobrar', false),
('credito.otorgar', 'credito', 'otorgar', 'Otorgar/modificar línea de crédito', true),
('credito.registrar_pago', 'credito', 'registrar_pago', 'Registrar pago de cliente', false),

-- Reportes (B.11)
('reportes.ver', 'reportes', 'ver', 'Ver dashboard y reportes', false),
('reportes.exportar', 'reportes', 'exportar', 'Exportar reportes a Excel', false),

-- Admin del tenant
('admin.usuarios.ver', 'admin', 'usuarios.ver', 'Ver usuarios del tenant', false),
('admin.usuarios.invitar', 'admin', 'usuarios.invitar', 'Invitar nuevos usuarios', true),
('admin.usuarios.suspender', 'admin', 'usuarios.suspender', 'Suspender usuarios', true),
('admin.roles.ver', 'admin', 'roles.ver', 'Ver roles y permisos', false),
('admin.roles.editar', 'admin', 'roles.editar', 'Crear/editar roles y permisos', true),
('admin.config.editar', 'admin', 'config.editar', 'Editar configuración del tenant', true);
```

## Roles base predefinidos

Cuando se crea un tenant, se siembran estos 3 roles automáticamente:

### Superadmin

TODOS los permisos del tenant. NO puede ser editado ni borrado.

### Comercial

- `clientes.*` (excepto eliminar)
- `productos.ver`, `productos.importar` NO `productos.ver_costo` (sensible)
- `cotizaciones.crear`, `cotizaciones.editar`, `cotizaciones.ver`
- `ordenes.ver`
- `inventario.ver`
- `reportes.ver` (solo del comercial)

### Facturación

- `clientes.ver`
- `productos.ver` (con costo)
- `cotizaciones.ver`, `cotizaciones.aprobar`
- `facturas.*`
- `guias.*`
- `credito.*`
- `inventario.ver`, `inventario.ajuste_manual`
- `reportes.*`

## Helper de verificación

```typescript
// src/lib/auth/casbin.ts
import { Enforcer, newEnforcer } from 'casbin';

let enforcer: Enforcer | null = null;

export async function getEnforcer() {
  if (!enforcer) {
    enforcer = await newEnforcer('model.conf', adapter);
  }
  return enforcer;
}

export async function userCan(userId: string, tenantId: string, permiso: string): Promise<boolean> {
  const e = await getEnforcer();
  return e.enforce(userId, tenantId, permiso);
}

// Uso en Server Actions
export async function requirePermission(permiso: string) {
  const user = await getUser();
  const tenant = await getCurrentTenant();
  const allowed = await userCan(user.id, tenant.id, permiso);
  if (!allowed) throw new ForbiddenError(`Sin permiso: ${permiso}`);
}
```

## Helper de UI (mostrar/ocultar)

```typescript
// src/lib/auth/use-permission.ts (Client)
import { create } from 'zustand';

const usePermissionsStore = create<{
  permisos: Set<string>;
}>(() => ({ permisos: new Set() }));

export function usePermission(permiso: string): boolean {
  return usePermissionsStore((s) => s.permisos.has(permiso));
}

// En componente
function Toolbar() {
  const canCrear = usePermission('cotizaciones.crear');
  return (
    <div>
      {canCrear && <Button>Nueva cotización</Button>}
    </div>
  );
}
```

⚠️ **Esto es solo UX.** La validación REAL ocurre en el server con `requirePermission()`. Nunca confiar en el frontend.

## Auditoría

Todo cambio de permisos queda registrado:

```typescript
await db.insert(auditPermisos).values({
  tenantId,
  userId: actor.id,
  accion: 'permiso_agregado',
  rolId: targetRol.id,
  permisoCodigo: 'productos.ver_costo',
  detalles: { rolNombre: targetRol.nombre },
  ipAddress: req.ip,
});
```

## UI del Superadmin

Vive en `/[companySlug]/admin/roles`. Lista de roles a la izquierda, matriz de permisos al medio, sección de "Roles personalizados" con botón "Crear nuevo rol".

Para crear rol custom:

1. Click "Nuevo rol" → modal con nombre + descripción
2. Después abre la matriz de permisos: checkboxes agrupados por módulo
3. Permisos sensibles tienen un ícono ⚠️ y color naranja
4. Guardar = INSERT en `roles` + `rol_permisos` + `audit_permisos`

## Repos de referencia

- **`apache/casbin`** + **`casbin/node-casbin`**: enforcer, model.conf, adapters
- **`casbin/casbin.js`**: versión frontend para mostrar/ocultar UI
- **`point-source/supabase-tenant-rbac`**: patrón JWT custom claims
- **`permit.io`** blog post sobre RLS + Casbin: cómo combinarlos correctamente

================================================================================

# ARCHIVO: 06-modules-spec.md

================================================================================

# 06 — Especificación de módulos

> Detalle por módulo del Anexo I: alcance, riesgos, repos de referencia, horas estimadas.
> Total estimado: 262 horas. Buffer: 88h sobre las 350h disponibles (7 sem × 50h).

## B.0 — Tenants y Plataforma (NUEVO, no estaba en Anexo I) — 18h

**Alcance**: módulo Superadmin Global Dignita para crear/gestionar tenants. Onboarding wizard 5 pasos.

**Por qué se agregó**: vendiendo Orión a un solo cliente es bi-empresa. Si vendemos a un segundo cliente (probable), necesitamos crear nuevos tenants sin tocar SQL.

**Tablas**: `tenants`, `platform_admins`, `tenant_members`, `platform_audit_log`, `tenant_usage_metrics`.

**Repos**: `usebasejump/basejump` (multi-tenant accounts en Supabase, 931 stars). Aplicar la migration encima del template.

## B.1 — Multiempresa — 8h (parte ya cubierta por B.0)

Selector de empresa (path-based), persistencia de última empresa, RLS por tenant en todas las tablas.

## B.2 — Autenticación y Roles — 20h

3 roles base (Superadmin/Comercial/Facturación) + roles custom dinámicos editables por Superadmin del tenant. Casbin + RLS. Login con magic link, MFA para Superadmin.

**Riesgo crítico**: ocultar costos a no-Superadmin no se hace solo en frontend. Necesitamos vista `productos_publicos` que NUNCA devuelve `precio_compra` salvo si el rol incluye `productos.ver_costo`.

**Repos**: `apache/casbin`, `casbin/casbin.js`, `Razikus/supabase-nextjs-template` (MFA).

## B.3 — Gestión de Clientes — 22h

CRUD B2B/B2C, validación SUNAT/RENIEC en tiempo real con caché de 30 días.

**Riesgo**: APIs pagas se queman si no hay caché. Tabla `validaciones_documento` con `(tipo_doc, numero, datos_jsonb, validado_at)` y trigger que solo consulta API si `validado_at < now() - 30 days`.

**Repos**: `giansalex/consulta-ruc`, ERPNext doctype Customer.

**APIs**: apis.net.pe (RUC/DNI gratis hasta 100/día).

## B.4 — Catálogo de productos — 32h

**El módulo más complejo después de SUNAT.** Por qué:

- 475+ productos por empresa
- Atributos estructurados (calibre mm²/AWG/MCM, diámetro agujero, voltaje, color)
- Importación Excel con headers basura (9 filas iniciales)
- Búsqueda fuzzy instantánea (`pg_trgm`)
- Doble lista de precios desde día 1 (compra + venta)
- Margen mínimo bloqueante en cotizaciones

**Esquema clave**:

```sql
CREATE TABLE productos (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id),
  sku text NOT NULL,
  descripcion text NOT NULL,
  familia text,                        -- 'Terminales 1 hueco 35Kv'
  calibre text,                        -- '50mm2', '4 AWG'
  unidad_calibre text,                 -- 'mm2', 'AWG', 'MCM', 'A'
  diametro_agujero text,               -- '3/16', '1/4'... null si no aplica
  voltaje text,
  color text,
  unidad_medida text DEFAULT 'NIU',
  imagen_url text,
  estado text DEFAULT 'activo',        -- 'activo', 'descatalogado'
  margen_minimo numeric(5,2),          -- 10.00 = 10%
  search_vector tsvector,
  created_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, sku)
);

CREATE INDEX productos_search_idx ON productos USING gin(search_vector);
CREATE INDEX productos_descripcion_trgm ON productos USING gin(descripcion gin_trgm_ops);
CREATE INDEX productos_tenant_idx ON productos (tenant_id);

-- Trigger para mantener search_vector actualizado
CREATE OR REPLACE FUNCTION productos_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('spanish', coalesce(NEW.sku, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(NEW.descripcion, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(NEW.familia, '')), 'C');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER productos_search_update
BEFORE INSERT OR UPDATE ON productos
FOR EACH ROW EXECUTE FUNCTION productos_search_trigger();

CREATE TABLE precios_producto (
  id uuid PRIMARY KEY,
  producto_id uuid REFERENCES productos(id),
  tipo text NOT NULL,                  -- 'compra' | 'venta_sugerido' | 'mayorista'
  moneda text NOT NULL,                -- 'USD' | 'PEN'
  precio numeric(14,4) NOT NULL,
  vigente_desde date NOT NULL,
  vigente_hasta date,
  UNIQUE (producto_id, tipo, vigente_desde)
);
```

**Importación Excel**: parser tolerante a headers basura. Ver `scripts/import-catalog.ts`.

**Repos**: `pjborowiecki/QUANTUM-STASH` (stack idéntico), `tableflow/tableflow` (importación con preview), `inventree/InvenTree` (variantes).

## B.5 — Cotizaciones — 30h

**Corazón del sistema.** 6 estados con xstate, generación PDF profesional, conversión a OC/factura/guía sin perder trazabilidad.

**Estados**: `borrador → enviada → aprobada → convertida` o `rechazada` o `vencida`.

**Tabla**:

```sql
CREATE TABLE cotizaciones (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id),
  numero text NOT NULL,                -- COT-2026-00123
  cliente_id uuid REFERENCES clientes(id),
  estado text NOT NULL DEFAULT 'borrador',
  fecha_emision date NOT NULL,
  fecha_vencimiento date NOT NULL,
  moneda text NOT NULL,
  tipo_cambio numeric(10,4),           -- congelado al momento de emitir
  subtotal numeric(14,4) NOT NULL,
  descuento numeric(14,4) DEFAULT 0,
  igv numeric(14,4) NOT NULL,
  total numeric(14,4) NOT NULL,
  margen_aplicado numeric(5,2),        -- 5, 10, 15 o custom
  terminos_pago text,
  tiempo_entrega text,
  observaciones text,
  pdf_url text,                        -- Supabase Storage URL
  comercial_id uuid REFERENCES auth.users(id),
  created_at timestamptz,
  UNIQUE (tenant_id, numero)
);

CREATE TABLE lineas_cotizacion (
  id uuid PRIMARY KEY,
  cotizacion_id uuid REFERENCES cotizaciones(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES productos(id),
  descripcion text NOT NULL,           -- copiada al momento (no FK)
  cantidad numeric(10,2) NOT NULL,
  precio_unitario numeric(14,4) NOT NULL,
  margen_linea numeric(5,2),           -- override del margen general
  subtotal numeric(14,4) NOT NULL,
  orden int NOT NULL                   -- para ordenamiento en PDF
);
```

**PDF**: react-pdf en serverless. Generar al "Enviar" la cotización y guardar en Storage. Cada cambio post-envío crea versión nueva (no se pisa).

**Repos**: `al1abb/invoify` (Next.js + react-pdf), `xstate`, ERPNext doctype Quotation.

## B.6 — Órdenes de Compra — 12h

Cotización aprobada → OC con un click. Misma máquina de estados, otro template PDF.

**Repos**: `bigcapitalhq/bigcapital`.

## B.7 — Inventario y Kardex — 24h

**Riesgo**: race conditions al confirmar venta. Solución: triggers SQL (no lógica de aplicación) + `SELECT FOR UPDATE`.

```sql
CREATE TABLE kardex_movimientos (
  id bigserial PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id),
  producto_id uuid REFERENCES productos(id),
  fecha timestamptz NOT NULL,
  tipo text NOT NULL,                  -- 'entrada' | 'salida' | 'ajuste'
  origen_tipo text NOT NULL,           -- 'orden_compra' | 'factura' | 'guia' | 'manual'
  origen_id uuid,
  cantidad numeric(10,2) NOT NULL,
  costo_unitario numeric(14,4),
  saldo_post int,                      -- cached para velocidad
  observacion text,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX kardex_producto_idx ON kardex_movimientos(producto_id, fecha DESC);

-- Vista: stock actual por producto
CREATE VIEW stock_actual AS
SELECT
  producto_id,
  SUM(CASE WHEN tipo='entrada' THEN cantidad ELSE -cantidad END) AS stock
FROM kardex_movimientos
GROUP BY producto_id;
```

**Constraint opcional**: `CHECK (stock >= 0)` o flag de "permite stock negativo" según política decidida en kickoff.

**Repos**: `arnobt78/Stock-Inventory-Management-System--NextJS-FullStack` (Stockly), ERPNext Stock module.

## B.8 — Guías de remisión — 22h

Ver `04-sunat-nubefact-spec.md`. Cola de reintentos con `pgmq`.

## B.9 — Facturación SUNAT — 28h

Ver `04-sunat-nubefact-spec.md`. **El módulo más sensible.**

## B.10 — Crédito y Cuentas por Cobrar — 22h

```sql
CREATE TABLE creditos_cliente (
  cliente_id uuid PRIMARY KEY REFERENCES clientes(id),
  tenant_id uuid REFERENCES tenants(id),
  linea_credito numeric(14,4),         -- 0 = sin crédito (contado)
  plazo_dias int DEFAULT 0,
  bloqueado boolean DEFAULT false,
  motivo_bloqueo text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz
);

CREATE TABLE pagos (
  id uuid PRIMARY KEY,
  factura_id uuid REFERENCES facturas(id),
  monto numeric(14,4) NOT NULL,
  moneda text NOT NULL,
  fecha_pago date NOT NULL,
  metodo text,                         -- 'transferencia', 'efectivo', 'cheque'
  referencia text,                     -- nro operación bancaria
  registrado_por uuid REFERENCES auth.users(id),
  created_at timestamptz
);

-- Vista de saldo por cliente
CREATE MATERIALIZED VIEW cuentas_por_cobrar AS
SELECT
  f.cliente_id,
  SUM(f.total - COALESCE(p.total_pagado, 0)) AS saldo,
  MIN(f.fecha_vencimiento) FILTER (
    WHERE f.estado != 'pagada' AND f.fecha_vencimiento < CURRENT_DATE
  ) AS dia_mas_vencido
FROM facturas f
LEFT JOIN (
  SELECT factura_id, SUM(monto) AS total_pagado FROM pagos GROUP BY factura_id
) p ON p.factura_id = f.id
WHERE f.estado != 'anulada'
GROUP BY f.cliente_id;

CREATE INDEX cuentas_por_cobrar_idx ON cuentas_por_cobrar(cliente_id);

-- Refresh por trigger o cron cada 5 min
```

**`pg_cron` job diario**: marcar facturas como `vencida` cuando `fecha_vencimiento < CURRENT_DATE`.

**Repos**: ERPNext Accounts Receivable, `bigcapitalhq/bigcapital`, `flash-oss/medici` o `radzserg/lefra` (double-entry ledger).

## B.11 — Panel y Reportes — 20h

Vistas materializadas con refresh cada 5 min para el dashboard. Drill-down en vivo.

**Métricas**:

- Ventas mes vs mes anterior
- Top 10 clientes
- Top 20 productos
- CxC vencidas (aging report)
- Stock crítico (productos bajo umbral)
- Pipeline de cotizaciones (estado)

**Repos**: `tremorlabs/tremor`, `tremorlabs/tremor-blocks`, `recharts`.

---

## Resumen de horas

| Módulo                 | Horas   |
| ---------------------- | ------- |
| B.0 Tenants/Plataforma | 18      |
| B.1 Multiempresa       | 8       |
| B.2 Auth/Roles         | 20      |
| B.3 Clientes           | 22      |
| B.4 Catálogo           | 32      |
| B.5 Cotizaciones       | 30      |
| B.6 OC                 | 12      |
| B.7 Kardex             | 24      |
| B.8 Guías              | 22      |
| B.9 Facturación SUNAT  | 28      |
| B.10 Crédito           | 22      |
| B.11 Reportes          | 20      |
| Setup + DevOps         | 12      |
| Testing + Hardening    | 22      |
| **Total**              | **312** |

Buffer = 350h - 312h = **38 horas** para imprevistos del cliente, demoras en assets, y un par de iteraciones extras post-demo.

================================================================================

# ARCHIVO: 07-patterns-from-references.md

================================================================================

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
