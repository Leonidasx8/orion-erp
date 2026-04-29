# CLAUDE.md — Instrucciones para Claude Code

> Este archivo es leído automáticamente por Claude Code al iniciar sesión en este repo.
> Define cómo Claude Code debe comportarse en el proyecto Orión.

## Identidad del proyecto

Sistema Orión es un ERP comercial multi-tenant para Grupo Idex SAC (Perú).
Stack: Next.js 15 + Supabase + Tailwind + shadcn + Drizzle ORM.
Cliente: Lucas M. Escrivá. Prestador: Dignita.tech (Leonidas Yauri).
Plazo: 7 semanas. Estado: Day 1 (kickoff próximo).

## Contexto base obligatorio

Antes de cualquier tarea, leé en este orden:

1. `.gemini/antigravity/brain/00-project-overview.md` — qué es Orión
2. `.gemini/antigravity/brain/01-stack-conventions.md` — convenciones de código
3. `.gemini/antigravity/brain/02-architecture.md` — diagrama lógico
4. `.gemini/antigravity/brain/03-multi-tenant-pattern.md` — multi-tenancy
5. `.gemini/antigravity/brain/06-modules-spec.md` — spec de los 11 módulos

**Si la tarea toca SUNAT**: leé también `04-sunat-nubefact-spec.md`.
**Si la tarea toca permisos**: leé también `05-rbac-casbin.md`.

## Cuándo activarme (vs Antigravity)

Antigravity es el IDE principal del proyecto. Soy el segundo cerebro para tareas pesadas.

**Usá Claude Code para**:

- Arquitectura previa a programar (planning con Opus 4.7)
- Migrations Supabase complejas con RLS + triggers
- Wrapper completo de NUBEFACT (módulo crítico)
- Refactors masivos cross-cutting
- Reviewer pre-demo (validar Anexo I)
- Investigación de bugs DB / race conditions
- Documentación técnica densa (ADRs)

**NO usar Claude Code para**:

- Componentes UI simples (eso es Antigravity)
- Iteración visual rápida (Antigravity browser preview es más rápido)
- Tareas de < 15 min (overhead innecesario)

## Subagentes especializados

Tengo 4 prompts específicos en `claude-code/prompts/`:

- `architect.md` — Diseño previo a programar
- `schema-builder.md` — Migrations + Drizzle + tipos sincronizados
- `sunat-integrator.md` — Tocar el wrapper NUBEFACT
- `reviewer.md` — Validación pre-demo contra Anexo I

Para usarlos: `claude --prompt claude-code/prompts/<role>.md "tu petición"`.

## Reglas de oro

1. **NUNCA** modificar `src/lib/database.types.ts` a mano. Siempre `pnpm db:types`.
2. **NUNCA** tocar `src/components/ui/*` (shadcn original). Crear wrappers en `src/components/shared/`.
3. **NUNCA** mergear a `main` sin que el reviewer haya pasado.
4. **SIEMPRE** validar Server Actions con Zod antes de tocar DB.
5. **SIEMPRE** verificar permisos con Casbin antes de mutaciones sensibles.
6. **SIEMPRE** crear ADR en `docs/DECISIONS/` para decisiones arquitectónicas importantes.
7. **SIEMPRE** generar migration con `pnpm db:diff`, NO escribir SQL directo en el repo.

## Comandos frecuentes

```bash
pnpm dev                  # Next.js localhost:3000
pnpm db:start             # Supabase local con Docker
pnpm db:reset             # Reset DB con migrations + seed
pnpm db:diff              # Genera migration desde cambios
pnpm db:types             # Regenera tipos TS
pnpm typecheck            # tsc --noEmit
pnpm lint:fix             # ESLint autofix
pnpm test                 # Vitest
pnpm test:e2e             # Playwright
```

## Convenciones de commits

Conventional Commits con scope del módulo:

```
feat(cotizaciones): selector de margen con presets 5/10/15
fix(kardex): race condition al concurrentizar facturación
chore(deps): bump Next.js a 15.1
docs(adr): agregar 0010 sobre estrategia de cache
refactor(productos): extraer parser Excel a util
test(sunat): mocks de respuestas Nubefact
```

Scopes válidos: `auth`, `tenants`, `clientes`, `productos`, `cotizaciones`, `ordenes`, `kardex`, `guias`, `facturas`, `credito`, `reportes`, `admin`, `sunat`, `pdf`, `db`, `ui`, `infra`, `deps`, `adr`.

## Idioma

- **Código** (variables, funciones, comentarios): inglés
- **DB** (tablas, columnas): español snake_case
- **UI** (mensajes al usuario): español
- **Commits**: scope español, verbo inglés
- **ADRs / docs**: español

## Cómo te quiero comunicando

- Directo, sin rodeos
- Si una decisión tuya tiene riesgo, decímelo
- Si encontrás algo mal en mi código existente, decímelo en el PR
- Sugerí refactors cuando los veas
- No me digas "sí" si no estás de acuerdo — argumentá

## Persona del cliente (referencia)

Cuando estoy preparando una demo o validando una entrega contra el contrato:

- Lucas es ingeniero, no técnico (no programador)
- Le interesa: tiempo, precio, márgenes, control de stock, evitar problemas con SUNAT
- No le interesa: stack tecnológico, "elegancia del código"
- Habla español Perú
- Idioma de la demo: 100% español, 0 jerga técnica
