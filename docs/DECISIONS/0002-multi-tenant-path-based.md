# ADR 0002 — Multi-tenancy: path-based, no subdominios

**Estado**: Aceptado
**Fecha**: 2026-04-28
**Decidido por**: Leonidas (Dignita)

## Contexto

Orión sirve a 2 empresas (Grupo Idex y Agroalves) y debe estar preparado para más clientes. Hay que decidir cómo separar los tenants en la URL: subdominios (`idex.orion.app`) o paths (`orion.app/idex`).

## Decisión

**Path-based**: `<dominio>/idex/...`, `<dominio>/agroalves/...`, `<dominio>/admin`.

## Alternativas

### Subdominios (`idex.orion.app`)

- ✅ Aislamiento percibido más fuerte
- ✅ SEO independiente
- ❌ Requiere wildcard SSL y wildcard DNS
- ❌ Cookies de sesión más complicadas (cross-subdomain)
- ❌ Vercel: configurar dominio wildcard en cada deploy
- ❌ Supabase Auth: redirect URLs múltiples
- ❌ Más complejidad de DevOps sin ganancia para sistema interno

### Path-based (`orion.app/idex`) — elegido

- ✅ Un solo dominio, un solo SSL
- ✅ Cookies simples (mismo origen)
- ✅ Routing nativo Next.js App Router con `[companySlug]`
- ✅ Compartir links es trivial
- ✅ Switching entre empresas = redirect, no recargar sesión
- ❌ El path no es seguridad real (válido tanto acá como con subdominios)

## Consecuencias

- RLS Postgres es la única defensa real (path es solo UX)
- Middleware Next.js valida `companySlug` en cada request
- Slugs inmutables, validados en regex `^[a-z0-9][a-z0-9-]{1,30}$`
- Path `/admin` queda reservado para Superadmin Global Dignita
- Path `/seleccionar-empresa` para users con múltiples tenants en primer login

## Slugs definidos

- `idex` — Grupo Idex SAC
- `agroalves` — Agroalves
- (futuros clientes según definan)

## Referencias

- Conversación de planificación 28/04/2026
- `.gemini/antigravity/brain/03-multi-tenant-pattern.md`
- Vercel oficial: <https://github.com/vercel/platforms> (referencia)
