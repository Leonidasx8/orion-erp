# Contributing — Orion-ERP

## Setup local

Ver README.md.

## Workflow

```
1. git checkout develop
2. git pull
3. git checkout -b feat/B5-selector-margen develop
4. ... codear ...
5. pnpm typecheck && pnpm lint && pnpm test
6. git commit -m "feat(cotizaciones): selector margen presets"
7. git push -u origin feat/B5-selector-margen
8. gh pr create --base develop
9. Esperar CI green
10. Merge cuando reviewer apruebe
```

## Convenciones

- **Commits**: Conventional Commits (`feat`, `fix`, `docs`, `chore`, `refactor`, `test`)
- **Scope**: nombre del módulo (`auth`, `cotizaciones`, `sunat`, etc.)
- **Idioma**: español en mensajes de usuario, tablas/columnas DB. Inglés en código y comentarios.
- **PRs**: descripción + screenshots si UI + checklist de tests

## Pre-commit hooks

Husky corre automáticamente:

1. lint-staged (eslint + prettier en archivos staged)
2. commitlint (valida formato Conventional Commit)

Si falla, arreglar antes de commitear.

## Adding dependencies

Antes de `pnpm add <lib>`:

1. ¿Está justificada en `01-stack-conventions.md`?
2. ¿Cuánto pesa? (`bundlephobia.com`)
3. ¿Está mantenida? (último commit < 6 meses)
4. ¿Tiene types?
5. ¿Hay alternativa nativa o ya en el stack?

Si todo OK, agregar y documentar en el PR.

## Crear ADR nuevo

Cuando tomas una decisión arquitectónica importante:

1. Copiar template desde un ADR existente
2. Numerar siguiente (`0010-...md`)
3. Estado: Aceptado / Propuesto / Reemplazado por XXXX / Deprecado
4. Linkear desde README

## Tests

Ver ADR 0008. En resumen:

- Unit: junto al código (`*.test.ts`)
- Integration: `tests/integration/`
- E2E: `tests/e2e/`

Antes de PR a main: todos los tests pasan en CI.
