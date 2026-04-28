# ADR 0008 — Estrategia de testing

**Estado**: Aceptado
**Fecha**: 2026-04-28

## Niveles

| Nivel             | Herramienta              | Cobertura objetivo    | Cuándo correr            |
| ----------------- | ------------------------ | --------------------- | ------------------------ |
| Unit              | Vitest                   | 70% en `src/lib/`     | Pre-commit (lint-staged) |
| Integration       | Vitest + Supabase local  | Endpoints críticos    | CI en PRs                |
| E2E               | Playwright               | Flujos principales    | CI antes de merge a main |
| Visual regression | Playwright + screenshots | PDFs, dashboard       | Pre-release              |
| Accessibility     | axe-core                 | Pantallas públicas    | CI                       |
| Performance       | Lighthouse CI            | LCP < 2.5s, CLS < 0.1 | Pre-release              |

## Cobertura mínima por módulo

| Módulo                | Unit | Integration             | E2E                  |
| --------------------- | ---- | ----------------------- | -------------------- |
| B.2 Auth/Roles        | 80%  | sí                      | sí                   |
| B.4 Productos         | 70%  | sí                      | sí                   |
| B.5 Cotizaciones      | 80%  | sí                      | sí (crítico)         |
| B.7 Kardex            | 100% | sí                      | sí (race conditions) |
| B.9 Facturación SUNAT | 100% | sí (con mocks NUBEFACT) | sí (sandbox)         |
| B.10 Crédito          | 90%  | sí                      | sí                   |
| Otros                 | 60%  | parcial                 | parcial              |

## Mock de NUBEFACT

Vitest + MSW (Mock Service Worker). Snapshots de respuestas reales en `tests/fixtures/nubefact/`.

## E2E: cómo corremos contra Supabase real

- Local: contra `supabase start` (Docker)
- CI: spinning up Supabase local en GitHub Actions
- Datos: cada test crea su propio tenant para aislamiento

## Referencias

- <https://vitest.dev/>
- <https://playwright.dev/>
