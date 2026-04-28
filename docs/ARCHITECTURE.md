# Arquitectura — Sistema Orión

> Documento vivo. Actualizar al hacer cambios estructurales.

## Resumen ejecutivo

Sistema Orión es una aplicación web SaaS multi-tenant para gestión comercial B2B. Sirve a múltiples empresas (tenants) desde una sola instancia, con aislamiento de datos por Row Level Security de Postgres.

## Diagrama lógico

Ver `.gemini/antigravity/brain/02-architecture.md` para el diagrama detallado.

## Decisiones clave

Todas las decisiones arquitectónicas están en ADRs numerados:

- [0001 — Stack base](DECISIONS/0001-stack-base.md)
- [0002 — Multi-tenant path-based](DECISIONS/0002-multi-tenant-path-based.md)
- [0003 — SUNAT NUBEFACT](DECISIONS/0003-sunat-nubefact.md)
- [0004 — RBAC Casbin](DECISIONS/0004-rbac-casbin-dynamic.md)
- [0005 — Drizzle ORM](DECISIONS/0005-orm-drizzle.md)
- [0006 — react-pdf](DECISIONS/0006-pdf-react-pdf.md)
- [0007 — xstate](DECISIONS/0007-state-machine-xstate.md)
- [0008 — Test strategy](DECISIONS/0008-test-strategy.md)
- [0009 — Repo ownership](DECISIONS/0009-repo-ownership.md)

## Modelo de datos (overview)

```
tenants (Idex, Agroalves, ...)
  ├── tenant_members (Lucas, comerciales, contadores)
  ├── roles (Superadmin, Comercial, Facturación, custom)
  │   └── rol_permisos
  ├── clientes
  │   └── creditos_cliente
  ├── productos
  │   └── precios_producto
  ├── cotizaciones
  │   └── lineas_cotizacion
  ├── ordenes_compra
  ├── kardex_movimientos
  ├── guias_remision
  ├── facturas
  │   ├── lineas_factura
  │   └── pagos
  ├── series_documentos       (correlativos SUNAT)
  ├── audit_permisos          (cambios en roles/permisos)
  └── tenant_usage_metrics    (para Dignita facturar)

platform_admins              (Superadmin Dignita global)
platform_audit_log           (auditoría de plataforma)
casbin_rule                  (policies dinámicas)
permisos_definidos           (catálogo seed, no editable)
```

## Flujos críticos

### 1. Login + selección de tenant

```
Login → Supabase Auth → JWT con custom claim current_tenant_id
  → Si user tiene 1 tenant: redirect /<slug>/dashboard
  → Si user tiene N tenants:
      ├── Si tiene last_visited_tenant_id en metadata: redirect a ese
      └── Si no: /seleccionar-empresa
  → Si user es platform_admin: opción extra "Ir a /admin"
```

### 2. Crear cotización

```
Comercial → /idex/cotizaciones/nueva
  → Selecciona cliente (autocompletado con búsqueda fuzzy)
  → Agrega productos (combobox con cmdk + pg_trgm search)
  → xstate state machine: borrador
  → Aplica margen (presets 5/10/15 o custom, validado contra margen_minimo)
  → Save = Server Action validateInput → Casbin → INSERT cotizaciones + lineas
  → "Enviar al cliente" = generate PDF (react-pdf) → Storage → email Resend
  → state: borrador → enviada
```

### 3. Emitir factura SUNAT

```
Facturación → /idex/facturas/nueva (puede venir de una cotización aprobada)
  → Selecciona serie (F001 / B001) → reservar_correlativo() en DB (atómico)
  → INSERT facturas con estado='pendiente_envio'
  → Encolar en pgmq.send('sunat_outbox', payload)
  → Edge Function consume cada 30s:
      → POST a NUBEFACT con RUTA + TOKEN del tenant
      → Si OK: download XML+CDR → Storage → state='aceptada_sunat'
      → Si error: retry con backoff exponencial (5 intentos)
      → Si fail: state='error_sunat' + notificar admin
  → Webhook NUBEFACT cuando SUNAT confirma → update factura.cdr_aceptado_at
```

## Performance targets

- LCP < 2.5s (Core Web Vitals "Good")
- TTI < 3.5s
- Búsqueda de productos: < 200ms para 500+ items
- Generación PDF cotización: < 3s
- Emisión factura → CDR aceptado: < 60s en happy path

## Escalabilidad esperada

Para Idex (cliente actual):

- ~500 productos por empresa, 2 empresas
- ~50-200 cotizaciones/mes
- ~30-100 facturas/mes
- 5-15 usuarios concurrentes

Diseñado para escalar 100x sin rediseño:

- 50,000 productos: índices `pg_trgm` + paginación cursor-based
- 100,000 facturas/mes: particionado por fecha
- Multi-tenant: limitado por hardware Supabase (Pro Plan = 8GB RAM)

## Dependencias externas (riesgos)

| Servicio    | Criticidad | Plan B                            |
| ----------- | ---------- | --------------------------------- |
| Supabase    | Alta       | Self-host docker (no inmediato)   |
| NUBEFACT    | Alta       | Efact (ADR 0003)                  |
| Vercel      | Media      | Cloudflare Pages, Netlify         |
| Resend      | Baja       | Postmark, SES                     |
| apis.net.pe | Baja       | Caché 30 días + scraping fallback |
| Sentry      | Baja       | LogTail, BetterStack              |
