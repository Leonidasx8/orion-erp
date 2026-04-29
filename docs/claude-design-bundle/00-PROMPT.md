# Sistema Orión — ERP B2B multi-tenant (Perú)

> **Prompt para Claude Design.** Pegar este bloque entero junto con los archivos
> 01 a 07 de esta misma carpeta como adjuntos / contexto.

---

Necesito mockups de UI para un ERP B2B multi-tenant para Grupo Idex SAC, una distribuidora
peruana de conectores eléctricos (marca "Idex") y agroquímicos (marca "Agroalves").
Es producto INTERNO, NO público. NO hay landing, NO hay marketing pages.

## Stack y restricciones técnicas (no negociables)

- Next.js 15 (App Router) + Server Components por default
- shadcn/ui + Tailwind CSS 3.x (sin Material, sin Chakra, sin Ant)
- Lucide React para iconos
- recharts para gráficos
- Idioma de la UI: ESPAÑOL (rioplatense neutral / peruano). Códigos en inglés.
- Multi-tenant path-based: rutas `/admin` (superadmin Dignita), `/idex/*`, `/agroalves/*`

## Audiencia

- Lucas Escrivá (gerente, decisor, usa todo)
- 2-3 vendedores comerciales (cotizaciones, clientes, productos)
- 1-2 personas de facturación SUNAT (facturas, guías, CxC)
- 1 administrador Dignita (gestión de tenants, multi-empresa)

Todos en escritorio (Windows + Chrome). Tablet ocasional. Mobile NO requerido.

## Personalidad visual

- Profesional, limpio, denso de información (es ERP, no app de consumer)
- Neutral con acento de color por tenant:
  - Idex: azul cobalto `#0070f3` (eléctrica/industrial)
  - Agroalves: verde `#16a34a` (agro)
  - /admin Dignita: morado `#7c3aed` (plataforma)
- Modo dark opcional (no obligatorio v1)
- Tipografía: Inter (default shadcn)
- Densidad: tablas con rows compactas (~36px), cards con padding moderado
- Sin emojis en UI, sin ilustraciones decorativas; solo iconos funcionales

## Layout base

- Sidebar fijo (240px) izquierda con logo del tenant arriba + nav vertical
- Header (56px) arriba con breadcrumbs + search global Cmd+K + user menu
- Main content con padding 24px, max-width fluida
- Mismo layout para `/admin` (Dignita) que para `/[slug]/*` (tenant) pero con
  branding y nav diferentes

## Componentes compartidos a diseñar como design system

1. **TenantLayout** — header + sidebar + breadcrumbs + user menu
2. **DataTable** — tabla con búsqueda integrada, filtros por columna,
   paginación, sorting, multi-select, acciones row
3. **EntityForm** — patrón estándar para CRUD: header con título + acciones,
   contenido en tabs opcionales, footer fijo con botones
4. **WizardSteps** — indicador horizontal de pasos (usado en onboarding tenant,
   importar Excel, nueva cotización)
5. **StatusBadge** — pill con colores semánticos:
   - borrador = gris
   - enviada/pendiente = azul
   - aprobada/aceptada = verde
   - rechazada/error = rojo
   - vencida = naranja
   - anulada = gris tachado
6. **TimelineEvento** — timeline vertical para detalle de cotización/factura
   con eventos cronológicos (created, sent, approved, sent_to_sunat, accepted)
7. **MoneyDisplay** y **MoneyInput** — formato `USD 1,234.5678` (4 decimales para
   precios de productos; 2 decimales para totales en facturas)
8. **CommandPalette (Cmd+K)** — overlay con búsqueda global productos/clientes/cotizaciones
9. **PermissionGate** — los mocks deben mostrar variantes con/sin elementos
   según rol (ej: comercial NO ve precio_compra)

## Estados a contemplar EN CADA pantalla

- Loading: skeleton loaders, NO spinners
- Empty: mensaje + CTA primario ("Aún no hay cotizaciones. Crear primera →")
- Error: fallback amigable cuando una acción falla
- Sin permiso: bloqueo a nivel pantalla con mensaje claro

## Pantallas a diseñar (PRIORIDAD ALTA — necesarias para arrancar)

> **El detalle completo de cada pantalla está en `01-implementation-plan.md`,
> Apéndice A "Catálogo de pantallas".** Lista resumida acá:

### Plataforma (admin Dignita)

1. `/admin` — dashboard plataforma
2. `/admin/tenants` — listado
3. `/admin/tenants/nuevo` — wizard 5 pasos (Datos / Branding / Admin / Fiscal / Plan)

### Auth

4. `/login` — magic link
5. `/login/mfa` — TOTP 6 dígitos
6. `/seleccionar-empresa` — picker visual cuando user pertenece a 2+ tenants

### Tenant — operación día a día

7. `/[slug]/` — dashboard homepage con 6 KPI cards + 2 charts + 2 listas
8. `/[slug]/clientes` — listado búsqueda fuzzy
9. `/[slug]/clientes/nuevo` — form con autocompletado RUC/DNI (4 estados:
   idle, consultando, autocompletado OK, error con fallback manual)
10. `/[slug]/clientes/[id]` — detalle 4 tabs
11. `/[slug]/productos` — grilla cards con búsqueda fuzzy en vivo
12. `/[slug]/productos/[id]` — detalle 4 tabs (datos, precios histórico, kardex, ventas)
13. `/[slug]/productos/importar` — wizard 3 pasos (Upload / Preview con errores marcados / Confirmar)
14. `/[slug]/cotizaciones` — listado con filtros
15. `/[slug]/cotizaciones/nueva` — form complejo: cliente + líneas drag&drop +
    búsqueda producto cmdk + totales panel + margen selector
16. `/[slug]/cotizaciones/[id]` — detalle con timeline + acciones según estado
17. `/[slug]/inventario` — resumen con stock crítico destacado
18. `/[slug]/inventario/[productoId]` — kardex timeline vertical
19. `/[slug]/guias/nueva` — form con campos SUNAT
20. `/[slug]/facturas` — listado con badges estado SUNAT
21. `/[slug]/facturas/nueva` — auto-detecta factura/boleta según tipo doc cliente
22. `/[slug]/facturas/[id]` — detalle con timeline SUNAT + descargas PDF/XML/CDR
23. `/[slug]/credito` — dashboard CxC con aging chart (buckets 0-30/31-60/61-90/90+)
24. `/[slug]/credito/clientes/[id]` — detalle: línea, facturas, pagos, alertas

### Tenant — admin del tenant (Lucas)

25. `/[slug]/admin/usuarios` — listado + invitar
26. `/[slug]/admin/roles` — matriz checkboxes rol × permiso, agrupada por módulo,
    con icono ⚠️ para permisos sensibles (en naranja)

## Pantallas PRIORIDAD MEDIA (segunda iteración OK)

- Configuración tenant (branding, fiscal, plan)
- Auditoría log (filtros + tabla)
- Reportes (selector + ventas + cxc + stock + comerciales)
- Familias/categorías de productos
- Transportistas y vehículos (config guías)

## Decisiones de UX a respetar

(Detalle en `01-implementation-plan.md` y `06-modules-spec.md`)

- **Cotización tiene 6 estados**; los botones cambian según estado:
  - `borrador` → [Editar] [Enviar]
  - `enviada` → [Aprobar] [Rechazar]
  - `aprobada` → [Convertir a factura] [Convertir a OC]
  - `rechazada/vencida/convertida` → solo lectura, sin acciones

- **Factura SUNAT timeline visible**: Creada → En cola → Enviada NUBEFACT →
  Aceptada SUNAT con CDR. Si hay error, mostrar código SUNAT y mensaje
  (los códigos importantes son 2017, 2105, 2335, 4243).

- **Importación Excel**: en preview, filas con error en rojo, warnings en
  naranja, total de cambios visible, botón "Confirmar import" deshabilitado
  si hay errores.

- **Validación SUNAT del RUC en form de cliente**: progreso inline (skeleton
  del campo razón social mientras se consulta apis.net.pe), después auto-fill
  con animación sutil. Si apis.net.pe falla, mostrar warning naranja "API no
  responde, ingrese datos manualmente" pero NO bloquear el form.

## Datos a incluir en mockups (realismo)

- Empresa Idex: razón social "GRUPO IDEX SAC", RUC 20614847370, USD como moneda
- Productos típicos:
  - SKU "TER-50AWG-1/4", "Terminal compresión 1 hueco 50 AWG agujero 1/4 pulgada"
  - SKU "CAB-10AWG-NEG", "Cable cobre 10 AWG color negro 600V"
  - Familia "Terminales 1 hueco 35Kv", calibre "50mm²", voltaje "600V"
- Clientes típicos: empresas peruanas con RUC iniciando 20...
- Series SUNAT: F001 (factura), B001 (boleta), T001 (guía), FC01 (NC factura)
- Numeración: F001-00000123 formato

## Lo que NO quiero

- ❌ Páginas de marketing / landing
- ❌ Pricing pages
- ❌ Onboarding tutorial floating
- ❌ Mockups con look Material Design / Bootstrap
- ❌ Iconos coloridos / emojis
- ❌ Gradientes excesivos
- ❌ Imágenes stock photography

## Output esperado

Mockups con:

1. Las 26 pantallas de prioridad alta
2. Sistema de diseño documentado (los 9 componentes compartidos)
3. Cada pantalla en 2 estados clave (default + uno destacado: empty/loading/error/sin-permiso)
4. Tema light obligatorio, dark opcional
5. Spec mínima: spacing scale, color tokens, tipografía
6. Identificar para cada pantalla: ruta exacta, propósito, datos mostrados,
   acciones disponibles, rol que la ve

## Archivos de contexto adjuntos en este bundle

- `01-implementation-plan.md` — **CRÍTICO**: Apéndice A tiene las ~50 pantallas
  con propósito, datos, acciones, estados, rol que las ve
- `02-project-overview.md` — qué es Orión y para quién
- `03-stack-conventions.md` — convenciones de naming, idioma, estructura
- `04-multi-tenant-pattern.md` — estructura de URLs path-based
- `05-rbac-casbin.md` — permisos por rol (qué oculta o muestra cada uno)
- `06-modules-spec.md` — detalle de módulos (campos, estados de cada entidad)
- `07-patterns-from-references.md` — patrones de UI extraídos de invoify, tremor

Por favor empezá con el sistema de diseño (paleta, tipografía, spacing, los 9
componentes compartidos), después seguí con las pantallas de prioridad alta
en este orden: 1, 2, 3, 4, 5, 6, 7 (dashboard tenant), 14, 15, 16
(flujo cotización completo), después el resto.
