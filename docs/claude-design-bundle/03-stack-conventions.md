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
