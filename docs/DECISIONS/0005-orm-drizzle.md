# ADR 0005 — Drizzle ORM (no Prisma)

**Estado**: Aceptado
**Fecha**: 2026-04-28

## Contexto

Necesitamos un ORM TypeScript sobre Postgres/Supabase.

## Decisión

**Drizzle ORM**.

## Razones

1. **Tipos nativos** sin build step (Prisma necesita `prisma generate`)
2. **Queries más cercanas a SQL** — debugging directo en logs
3. **Mejor integración con RLS** de Supabase (Drizzle no abstrae demasiado, deja ver el SQL final)
4. **Tamaño de bundle menor** que Prisma client
5. **Migrations versionables** con `drizzle-kit`
6. **Proyecto activo y moderno** (2025+)

## Alternativas

- **Prisma**: más popular pero genera client gigante, peor con RLS, más mágico
- **Kysely**: query builder puro, más manual pero menos type-magic
- **TypeORM**: legacy, peor DX

## Consecuencias

- El equipo (Leonidas) debe leer doc de Drizzle (~2h de onboarding)
- Schema definido en `src/lib/db/schema.ts` en TypeScript
- Migrations en `supabase/migrations/` (SQL puro, generado por `pnpm db:diff`)
- Tipos auto-generados al cambiar el schema

## Referencias

- <https://orm.drizzle.team/>
- `.gemini/antigravity/brain/01-stack-conventions.md`
