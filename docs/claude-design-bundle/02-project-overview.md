# 00 — Project Overview

> Este archivo es leído automáticamente por Antigravity al abrir el proyecto.
> Es el contexto base que el modelo (Claude Sonnet 4.6 / Opus 4.6) usa para entender en qué está trabajando.

## ¿Qué es Orion-ERP?

Sistema Orión es una plataforma B2B multi-empresa que cubre el ciclo comercial completo de Grupo Idex SAC y Agroalves: cotizaciones, órdenes de compra, inventario con kardex, guías de remisión electrónicas, facturación SUNAT, gestión de crédito y cuentas por cobrar.

**Cliente principal**: Grupo Idex SAC (RUC 20614847370), con dos unidades de negocio activas:

- **Idex**: distribución eléctrica, conectores y aditivos (~475 SKUs)
- **Agroalves**: fertilizantes y agroquímicos

**Prestador**: Dignita.tech SAC (RUC 20609709201), Leonidas Yauri.

## Decisiones arquitectónicas no negociables

1. **Multi-tenant path-based**: URLs `/idex/cotizaciones`, `/agroalves/clientes`, `/admin` (Superadmin global Dignita). NO subdominios.
2. **Aislamiento por RLS**: cada query de negocio filtra por `tenant_id` automáticamente vía Postgres Row Level Security.
3. **Stack obligatorio por contrato**: Next.js 15 (App Router) + Supabase + Tailwind + shadcn/ui + Vercel.
4. **Stack interno (decisión Dignita)**: Drizzle ORM (NO Prisma), Zod, TanStack Query/Table, react-hook-form, @react-pdf/renderer (NO Puppeteer), xstate (state machines), Casbin (RBAC dinámico).
5. **SUNAT vía NUBEFACT** (PSE+OSE+ISO 27001), NO APISUNAT directo.
6. **Precios `numeric(14,4)`** — el catálogo real tiene 4 decimales (`0.1536`).
7. **Búsqueda con `pg_trgm` + `tsvector`** para fuzzy search en productos.

## Restricciones del contrato

- **Plazo**: 33 días calendario. Internamente extendido a 7 semanas L-V × 10h = 350h. Estimado de trabajo: 262h. Buffer: 88h.
- **Contraprestación**: USD 1,380 (50% adelanto, 50% al Go-Live).
- **Garantía**: 30 días post-entrega para corregir bugs sin costo.
- **Soporte continuado**: contrato separado (Anexo II) post-garantía.
- **Cláusula 7.4**: cliente designa una persona contacto principal con autoridad para validar entregables.
- **Cláusula 4.3**: demoras imputables al cliente (no entregar assets) habilitan ajustar el cronograma.

## Referencias rápidas

- Catálogo Idex: PDF de 14 familias de conectores, sin SKUs, calibres mm²/AWG/MCM
- Catálogo SegElectrica (proveedor de Idex): Excel con 475 productos, 7 categorías, doble columna de precios (lista AAA + venta sugerida)
- Margen promedio implícito: ~14.3% entre precio compra y precio venta
- Precios en USD, IGV 18% no incluido en listas

## Equipo

- **Leonidas Yauri** (Dignita): tech lead, full-stack
- **Lucas M. Escrivá de Romaní** (Idex): cliente, decisor de negocio

## Convenciones de comunicación con el modelo

Cuando me hagas pedidos:

- Si menciono un módulo (B.4 Catálogo, B.5 Cotizaciones, etc.), lee primero `06-modules-spec.md`.
- Si vas a tocar permisos, lee `05-rbac-casbin.md`.
- Si vas a tocar SUNAT, lee `04-sunat-nubefact-spec.md`.
- Antes de proponer una librería externa nueva, verificá que esté justificada en `01-stack-conventions.md`.
- Antes de modificar el modelo de datos, verificá `02-architecture.md` y `03-multi-tenant-pattern.md`.
