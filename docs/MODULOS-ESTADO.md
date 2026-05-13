# Módulos de operación — Cómo se relacionan y qué falta

> Snapshot 13-may-2026 antes de demo Manna.

---

## 1. Flujo end-to-end del negocio

```
                          ┌──────────────────────────────────┐
                          │  CATÁLOGOS (maestros del tenant) │
                          ├──────────────────────────────────┤
                          │  • Clientes   ✅ UI + DB         │
                          │  • Productos  ✅ UI + DB (fotos) │
                          │  • Series doc ✅ DB (en wizard)  │
                          └─────────────────┬────────────────┘
                                            │ alimentan
                                            ▼
       ┌──────────────────────────────────────────────────────────────┐
       │                       VENTAS                                 │
       │                                                              │
       │   Cotización ─── aprobar ──▶ "Orden de venta" ── facturar    │
       │   ✅ UI + DB              (no existe aún)        ▼            │
       │   + PDF                                       Factura       │
       │                                            🟡 DB sin UI      │
       │                                                              │
       └──────────────────────────────────────────────────────────────┘
                  │                                       │
                  │                                       │ (saldo)
                  ▼                                       ▼
       ┌────────────────────┐                ┌────────────────────────┐
       │   COMPRAS          │                │   CRÉDITO / CxC        │
       │   ✅ UI + DB        │                │   ❌ no existe         │
       │                    │                │   (depende de Facturas)│
       │   Orden de compra  │                └────────────────────────┘
       │   → Recepción      │
       └─────────┬──────────┘
                 │ (movimientos +/−)
                 ▼
       ┌────────────────────┐                ┌────────────────────────┐
       │   INVENTARIO       │ ─── despacho ──▶│   GUÍAS DE REMISIÓN    │
       │   ✅ UI + DB        │                │   🟡 DB sin UI         │
       │   (kardex)         │                │   (necesita transport.)│
       └────────────────────┘                └────────────────────────┘

                                            ┌────────────────────────┐
                                            │   SUNAT (NUBEFACT)     │
                                            │   🟡 schema + outbox   │
                                            │   listo, envío real    │
                                            │   sin probar           │
                                            └────────────────────────┘
```

**La regla:** Cliente + Producto → Cotización → (aprobada) → Factura → CxC.
Productos + Compras alimentan Inventario; Inventario respalda salida vía Guías.

---

## 2. Estado por módulo

### ✅ Listos (UI funcional + DB)

| Módulo               | Qué hace                                                        | Demo-ready |
| -------------------- | --------------------------------------------------------------- | ---------: |
| **Clientes**         | CRUD, contactos, direcciones, línea crédito (campo)             |         ✅ |
| **Productos**        | CRUD, categorías, stock, márgenes, importar Excel, fotos        |         ✅ |
| **Cotizaciones**     | CRUD, items, IGV/descuentos, PDF, estados (borrador→convertida) |         ✅ |
| **Órdenes compra**   | CRUD, recepción parcial/total, alimenta kardex                  |         ✅ |
| **Inventario**       | Stock real-time, kardex por SKU, ajustes manuales               |         ✅ |
| **Admin plataforma** | Wizard alta tenant, listado, dashboard global                   |         ✅ |

### 🟡 Backend listo, UI no construida

| Módulo             | Qué hay                                            | Qué falta para demo                    |
| ------------------ | -------------------------------------------------- | -------------------------------------- |
| **Facturas**       | Tabla `facturas`, schema completo, FK a cotización | UI emitir/listar, integración NUBEFACT |
| **Guías remisión** | Tabla `guias`, transportistas, vehículos           | UI + transportistas catálogo           |
| **Notas C/D**      | Tabla `notas_credito_debito`                       | UI emitir, vincular a factura          |
| **SUNAT envíos**   | Tabla `sunat_envios_log` + outbox pattern          | Worker que dispara envíos a NUBEFACT   |

### ❌ No existen (ni schema ni UI)

| Módulo                   | Qué necesitaría                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| **Crédito / CxC**        | Tabla pagos, saldos por cliente, antigüedad                                                |
| **Reportes**             | Vistas materializadas + UI (probablemente Metabase embed o consultas server-side)          |
| **Auditoría tenant**     | El backend ya escribe a `platform_audit_log` (admin lo ve). Falta una vista para el tenant |
| **Usuarios tenant**      | Invitar/quitar/cambiar rol dentro del tenant                                               |
| **Configuración tenant** | Editar branding, series, NUBEFACT post-wizard                                              |

---

## 3. Mi recomendación para Manna mañana

### Lo que SÍ mostrás (todo funciona):

1. Multi-tenant + selector (Idex/Agroalves).
2. Catálogo de productos con fotos.
3. **Cotización completa con PDF** ← núcleo del valor.
4. Órdenes de compra + recepción.
5. Inventario + kardex.
6. Wizard de alta de tenant.

### Lo que NO mostrás clickeando (te tira 404):

- Guías de remisión, Facturas, Crédito y CxC, Reportes, Auditoría, Usuarios, Configuración.

**Solución para el sidebar:** dos opciones, decidí ahora:

**Opción A — Honesto:** dejar los links visibles con tooltip "Próximamente" o badge "Beta".
Lo positivo: muestra el roadmap visualmente.
Lo negativo: si alguien clickea, queda mal.

**Opción B — Limpio:** ocultar del sidebar los módulos no implementados.
Lo positivo: nadie clickea en lo que no funciona.
Lo negativo: la demo se ve más chica.

**Mi voto: Opción A con un cambio.** Dejá los links pero hacelos **disabled** (gris, no clickeables) con etiqueta "Próximamente". Le decís a Manna:

> "El núcleo transaccional —catálogos, cotizaciones, órdenes, inventario, SUNAT— está operativo. Estos módulos de acá (señala los grises) están en el backend pero sin UI todavía: Facturación electrónica vía NUBEFACT, guías de remisión, CxC, reportes. Son fase 2 y los tenemos planificados para las próximas 2-3 semanas."

Esa narrativa muestra honestidad técnica + roadmap claro = más confianza.

---

## 4. ¿Realmente todos esos módulos son necesarios para "Ops"?

Pregunta tuya: "¿son necesarios en OPS?". Mi opinión:

| Módulo            | ¿Indispensable para operar una PyME peruana?                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| Facturas          | **Sí** (es lo que SUNAT exige)                                                                              |
| Guías remisión    | **Sí** si despachan mercadería físicamente. No si solo servicios.                                           |
| Crédito y CxC     | **Sí** si venden a crédito. Muchas PyMEs sí.                                                                |
| Reportes          | **Útil pero no indispensable** — postergable mientras hay datos limpios y se puede consultar desde Postgres |
| Auditoría tenant  | **Compliance** — opcional para arranque, requerido para enterprise                                          |
| Usuarios (tenant) | **Sí** desde el segundo usuario en adelante                                                                 |
| Configuración     | **Sí** — sin esto solo el superadmin puede tocar branding/series                                            |

**Prioridad fase 2 si tuviera que elegir 3:**

1. Facturas (cerrar el ciclo SUNAT)
2. Usuarios + Configuración del tenant (mover responsabilidad al cliente)
3. CxC (lo que más pide PyME peruana después de facturar)

Guías y Reportes para fase 3.

---

## 5. Snapshot de tablas existentes

```
clientes               productos                cotizaciones
contactos_cliente      categorias_producto      cotizacion_items
direcciones_cliente    unidades_medida

ordenes_compra         kardex_movimientos       series_documentos
ordenes_compra_items   stock_views (vw)

facturas               guias                    notas_credito_debito
sunat_envios_log       roles                    audit_permisos
casbin                 platform_admins          platform_audit_log
                       tenants                  tenant_members
                       vw_user_tenant_access    validaciones_documento
                       permisos
```

Total: ~25 tablas. La mitad respalda módulos con UI; la otra mitad está esperando UI.
