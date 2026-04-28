# 02 — Arquitectura general

## Diagrama lógico

```
┌─────────────────────────────────────────────────────────┐
│  Cliente (Next.js App Router en Vercel Edge)            │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ /idex/*  │  │/agroalves│  │ /admin   │              │
│  │ tenant 1 │  │ tenant 2 │  │ Dignita  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│       │             │             │                     │
│       └─── middleware (auth + tenant check) ────────────│
│                                                         │
│  Server Actions (con Casbin + Drizzle)                  │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ HTTPS
                  ▼
┌─────────────────────────────────────────────────────────┐
│  Supabase (Backend)                                     │
│                                                         │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐      │
│  │ Postgres   │  │ Auth       │  │ Storage      │      │
│  │ + RLS      │  │ (GoTrue)   │  │ (PDFs, XMLs) │      │
│  │ + pg_trgm  │  │ + MFA      │  │              │      │
│  │ + pg_cron  │  │            │  │              │      │
│  └────────────┘  └────────────┘  └──────────────┘      │
│                                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │ Edge Functions (cron jobs, jobs async)         │    │
│  │  - vencer-cotizaciones (diario)                │    │
│  │  - marcar-facturas-vencidas (diario)           │    │
│  │  - reintentar-envios-sunat (cada 5 min)        │    │
│  │  - calcular-metricas-uso-tenant (diario)       │    │
│  └────────────────────────────────────────────────┘    │
└─────────────┬──────────────────────────┬────────────────┘
              │                          │
              ▼                          ▼
   ┌──────────────────┐         ┌─────────────────┐
   │ NUBEFACT (SUNAT) │         │ APIs Perú       │
   │                  │         │ - apis.net.pe   │
   │ Facturas, boletas│         │   (RUC/DNI)     │
   │ notas, guías     │         │ - SUNAT TC      │
   └──────────────────┘         └─────────────────┘
```

## Capas

### 1. Frontend (Next.js 15 App Router)

- **Server Components** por default. Solo Client Components cuando hay interactividad (forms, modals, charts).
- **Server Actions** para mutaciones. NO API routes salvo casos puntuales (webhooks).
- **Streaming** con Suspense para tablas/listados grandes.
- **Optimistic UI** con TanStack Query para feedback instantáneo.

### 2. Middleware

```typescript
// src/middleware.ts
// 1. Lee token de Supabase
// 2. Si la URL es /[companySlug]/..., valida que el user tenga acceso al tenant
// 3. Si no, redirect a /seleccionar-empresa
// 4. Inyecta el tenant_id en headers para que Server Actions lo lean
```

### 3. Server Actions

- Validan input con Zod
- Verifican permisos con Casbin (`requirePermission('cotizaciones.crear')`)
- Acceden a DB vía Drizzle
- Devuelven `{ success: boolean, data? | error? }`

### 4. Base de datos (Postgres en Supabase)

- **Aislamiento por RLS**: cada tabla de negocio tiene policies que filtran por `tenant_id` (= `companies.id`)
- **Drizzle como ORM**: schema definido en TypeScript, migrations versionadas en `supabase/migrations/`
- **Triggers SQL** para integridad: ej. al confirmar una venta, dispara movimiento de kardex automático
- **Vistas materializadas** para reportes (refresh cada 5 min con `pg_cron`)
- **Extensiones activas**: `pg_trgm`, `pg_cron`, `pgcrypto`, `pgmq` (cola para reintentos SUNAT)

### 5. Edge Functions (Supabase)

Solo para tareas que NO pueden vivir en Server Actions:

- Cron jobs (marcar facturas vencidas)
- Reintentos asíncronos de SUNAT
- Webhooks de NUBEFACT (cuando SUNAT confirma CDR)

### 6. Servicios externos

- **NUBEFACT**: facturación electrónica SUNAT (PSE+OSE)
- **apis.net.pe**: validación RUC/DNI con caché de 30 días en nuestra DB
- **Resend**: envío de emails (cotizaciones, recordatorios de pago)
- **Sentry**: monitoreo de errores
- **Vercel Analytics**: performance frontend

## Multi-tenancy

Ver `03-multi-tenant-pattern.md` para el detalle. En resumen:

- Path-based: `/idex`, `/agroalves`
- DOS niveles de Superadmin: Global (Dignita) y Tenant (Lucas)
- RLS como única defensa real (path solo es UX)

## Permisos

Ver `05-rbac-casbin.md`. En resumen:

- Casbin para policies dinámicas editables desde UI
- Roles base predefinidos (Superadmin, Comercial, Facturación) + roles custom creados por el Superadmin de cada tenant
- Permisos granulares por módulo y acción

## Performance

- **Caching**:
  - TanStack Query: server state cliente
  - Next.js: route caching (Server Components)
  - Postgres: vistas materializadas para dashboard
- **Búsqueda**: GIN indexes con `pg_trgm` y `tsvector` en productos/clientes
- **Paginación**: cursor-based en TanStack Table
- **Bundle size**: tree-shaking, dynamic imports para módulos pesados (PDF generator)

## Seguridad

- HTTPS forzado (Vercel + dominio `.app` o configurar HSTS)
- 2FA obligatorio para Superadmin Global y de Tenant
- RLS no opcional en ninguna tabla de negocio
- Audit log: cualquier acción sensible (anular factura, cambiar precio, otorgar crédito) queda registrada
- Secrets en Vercel env vars + GitHub Secrets, nunca en código
- Snyk en pipeline para detectar deps vulnerables

## Despliegue

Ver `docs/RUNBOOK.md` para el detalle. Tres entornos:

- **Local**: Supabase Docker + `pnpm dev`
- **Staging**: branch `develop` → Vercel preview + Supabase staging
- **Production**: branch `main` → Vercel prod + Supabase prod (con PITR habilitado)
