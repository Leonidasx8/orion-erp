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
