# 07 — Roles de "agentes" en el proyecto

> Cómo dividimos las tareas entre Antigravity (Sonnet/Opus 4.6) y Claude Code (Opus 4.7).

## Plan B confirmado

**Antigravity como IDE principal** (vibe coding, browser testing, multi-archivo).
**Claude Code en paralelo** (CLI, Opus 4.7, subagentes especializados, tareas pesadas).

No competimos las dos herramientas. Cada una tiene su mejor uso.

## Cuándo usar Antigravity

✅ Crear componentes React/Tailwind nuevos
✅ Iterar sobre UI con feedback visual rápido
✅ Browser testing automatizado (subagent integrado)
✅ Edición multi-archivo de scope contenido
✅ Debugging visual de bugs UI/UX
✅ Refactors en una rama de trabajo
✅ Pair programming exploratorio
✅ Generación de mocks, fixtures, seeds

**Modelo default**: Claude Sonnet 4.6 (rápido, barato, suficiente)
**Modelo alterno**: Claude Opus 4.6 cuando la tarea sea compleja

## Cuándo usar Claude Code

✅ Arquitectura inicial (planning mode con Opus 4.7)
✅ Migrations Supabase con muchas tablas + RLS + triggers
✅ Wrapper de NUBEFACT entero (módulo crítico)
✅ Refactors masivos cross-cutting
✅ Reviewer pre-demo (lee diff completo y valida criterios Anexo I)
✅ Tareas de larga horizonte (> 30 min de trabajo continuo)
✅ Investigación profunda de bugs de DB / race conditions
✅ Documentación técnica densa (ADRs, RUNBOOK)

**Modelo**: Claude Opus 4.7

## Subagentes especializados (Claude Code)

Configurados en `claude-code/CLAUDE.md` y `claude-code/prompts/`:

### `architect`

Para tareas de diseño previo a programar.
Uso: "architect: diseñá el flujo completo del módulo de cotizaciones, desde Server Action hasta UI, incluyendo estados xstate y RLS policies."

### `schema-builder`

Para crear migrations Supabase + Drizzle schema + tipos TS sincronizados.
Uso: "schema-builder: agregá la tabla `pagos` con su esquema Drizzle, migration SQL, RLS policies y trigger que actualice `cuentas_por_cobrar`."

### `sunat-integrator`

Para tocar el wrapper Nubefact (módulo crítico).
Uso: "sunat-integrator: implementá la emisión de Nota de Crédito vinculada a factura anulada, con todos los estados y manejo de errores."

### `reviewer`

Para validar antes de mergear PR o antes de demo.
Uso: "reviewer: leé el diff de develop vs main y validá que todos los criterios del Anexo I del módulo B.5 estén cubiertos. Generá lista de gaps."

## Flujo típico de un módulo

```
1. ARQUITECTURA  → Claude Code "architect"
   Output: docs/MODULOS/B5-cotizaciones-design.md

2. SCHEMA        → Claude Code "schema-builder"
   Output: migration SQL + drizzle schema + tipos TS

3. SERVER LOGIC  → Antigravity (Sonnet 4.6)
   Output: Server Actions, Casbin checks, Zod schemas

4. UI COMPONENTS → Antigravity (Sonnet 4.6)
   Output: forms, tables, modals con shadcn

5. TESTING       → Antigravity browser subagent
   Output: tests Playwright

6. PRE-DEMO      → Claude Code "reviewer"
   Output: gap analysis + recomendaciones

7. DEMO con Lucas → Lucas confirma o pide cambios
   Loop: vuelta a paso 3 o 4 según el cambio
```

## MCP servers configurados

Ver `.gemini/antigravity/mcp_config.json`. Activos:

- **Supabase MCP** — Antigravity consulta el schema y datos (read-only en producción, read-write en local/staging)
- **GitHub MCP** — Crear PRs, leer issues, releases
- **Context7 MCP** — Documentación actualizada de librerías (Next.js, Drizzle, Casbin) sin desactualizar
- **Playwright MCP** — Browser automation
- **Filesystem MCP** — Acceso a archivos del proyecto

## Reglas de oro

1. **Antes de tocar SUNAT**: leer `04-sunat-nubefact-spec.md` completo.
2. **Antes de tocar permisos**: leer `05-rbac-casbin.md` completo.
3. **Antes de proponer una nueva librería**: verificar `01-stack-conventions.md`.
4. **Antes de modificar DB**: generar migration con `pnpm db:diff`, NO editar SQL directo.
5. **Cada decisión arquitectónica importante**: nuevo ADR en `docs/DECISIONS/`.
6. **Commits en español el módulo, inglés el verbo**: `feat(cotizaciones): add margin selector`.
7. **No mergear a main sin reviewer pasado** (Claude Code).
