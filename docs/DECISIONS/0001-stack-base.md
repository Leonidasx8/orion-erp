# ADR 0001 — Stack base del proyecto

**Estado**: Aceptado
**Fecha**: 2026-04-28
**Contexto**: Inicio de Sistema Orión

## Contexto

Necesitamos definir el stack tecnológico para construir Orión en 7 semanas con 1 desarrollador (Leonidas), entregar calidad production-ready, y dejar la base para escalar a otros clientes después de Idex.

## Decisión

Adoptar el siguiente stack:

**Frontend**:

- Next.js 15 (App Router) — obligatorio por contrato
- TypeScript estricto
- Tailwind CSS + shadcn/ui — obligatorio por contrato
- TanStack Query para server state
- TanStack Table para listados
- react-hook-form + Zod para forms
- xstate para máquinas de estado
- recharts para gráficos
- @react-pdf/renderer para PDFs
- sonner (toasts), cmdk (command palette)

**Backend**:

- Supabase (Postgres + Auth + Storage + Edge Functions) — obligatorio por contrato
- Drizzle ORM (decisión interna, no Prisma)
- Casbin para RBAC dinámico
- pgmq para colas de retry SUNAT

**Infra**:

- Vercel (frontend) — obligatorio por contrato
- GitHub (repo + Actions)
- Sentry (error tracking, plan free)
- Resend (email transaccional)

## Alternativas consideradas

### Prisma vs Drizzle

- **Prisma**: más popular, mejor DX para principiantes
- **Drizzle**: tipos nativos sin build step, juega mejor con RLS de Supabase, queries más cercanas a SQL. **Elegido**.

### Puppeteer vs react-pdf

- **Puppeteer**: HTML→PDF de alta fidelidad, pero requiere Chromium en el server (no funciona en Vercel serverless).
- **react-pdf**: serverless-friendly, layouts complejos requieren más trabajo. **Elegido** porque Vercel serverless lo permite y evitamos infra extra.

### NextAuth vs Supabase Auth

- Supabase Auth viene built-in. NextAuth duplicaría esfuerzo. **Supabase Auth elegido**.

### Zod vs Yup vs Valibot

- Zod tiene la mejor inferencia TypeScript y comunidad enorme. **Elegido**.

## Consecuencias

**Positivas**:

- Stack moderno con type-safety end-to-end
- Compatible con el contrato (Next.js + Supabase + Vercel + Tailwind + shadcn)
- Productividad alta para 1 dev
- Escalable a otros clientes (multi-tenant ya pensado)

**Negativas**:

- Drizzle es menos conocido que Prisma — Leonidas debe leer la doc atentamente
- react-pdf tiene curva con layouts complejos
- xstate es overkill si los flujos quedan simples (pero la cotización tiene 6 estados, justifica)

## Referencias

- Contrato firmado el 27/04/2026
- Anexo I cláusula 1 (stack obligatorio)
- ADR 0005 (Drizzle), 0006 (PDF), 0007 (xstate)
