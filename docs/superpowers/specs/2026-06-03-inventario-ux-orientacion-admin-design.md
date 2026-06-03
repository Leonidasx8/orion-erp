# Orientación al administrador: flujo inventario → OC

**Fecha:** 2026-06-03  
**Estado:** Aprobado, listo para implementar

## Problema

El módulo de Inventario no tiene botón para "agregar stock". El stock sube cuando se registra la recepción de una Orden de Compra — un flujo que los administradores nuevos (sin experiencia en ERP) no conocen y no encuentran intuitivo.

Hay comerciales que apoyan al admin, pero el flujo completo (crear OC → enviar → aprobar → recibir → stock actualizado) no está documentado ni guiado en la interfaz.

## Solución: 3 cambios coordinados (opción C)

### 1. Panel "Pendientes de operación" en el Dashboard

**Dónde:** `src/app/(app)/[companySlug]/page.tsx` y `DashboardKpis` / nuevo componente.

**Qué hace:** Una card nueva debajo de los KPI cards existentes que muestra acciones que requieren atención hoy. Solo aparece si hay al menos un ítem pendiente.

**Ítems mostrados (en orden de urgencia):**

| Item                                        | Condición                                                                       | Link destino                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| "N OC listas para recibir"                  | OC en estado `aprobada` o `recibida_parcial`                                    | `/[slug]/ordenes?estado=pendiente_recepcion` (filtra ambos estados) |
| "N productos con stock crítico o sin stock" | `COUNT(*) FROM stock_critico WHERE tenant_id` > 0                               | `/[slug]/inventario?filtro=critico`                                 |
| ~~"N cotizaciones aceptadas sin OC"~~       | **Excluido de v1** — requiere join adicional y lógica de vinculación no trivial | —                                                                   |

**Datos:** Se obtienen en el mismo `Promise.all` del dashboard, añadiendo 2 queries:

- `SELECT COUNT(*), array_agg(numero) FROM ordenes_compra WHERE tenant_id = $1 AND estado IN ('aprobada','recibida_parcial')`
- Ya existe: `COUNT(*) FROM stock_critico` (actualmente solo muestra el número, ahora también lista los nombres)

**Comportamiento:**

- Si no hay ningún pendiente, el panel no se renderiza.
- El item de cotizaciones sin OC está **excluido de v1** — requiere lógica de vinculación adicional.

---

### 2. Stepper + banner de "siguiente paso" en detalle de OC

**Dónde:** `src/components/modules/ordenes/OrdenDetalle.tsx`

**Qué hace:**

**A) Stepper visual** — barra horizontal de 5 pasos encima del contenido de la OC:
`Borrador → Enviada → Aprobada → Recibir → Cerrada`

- Pasos completados: círculo verde con ✓
- Paso actual: círculo amarillo/accent con número, label en negrita
- Pasos futuros: círculo gris claro

**B) Banner contextual** — aparece debajo del stepper, cambia de texto según `estado`:

| Estado             | Mensaje                                                                                                   | Botón                             |
| ------------------ | --------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `borrador`         | "Siguiente: enviar la OC al proveedor para su aprobación."                                                | "Enviar" (mismo que el existente) |
| `enviada`          | "Esperando aprobación. Una vez aprobada podrás registrar la recepción."                                   | —                                 |
| `aprobada`         | "Siguiente: registrar la recepción cuando llegue la mercadería. El stock se actualizará automáticamente." | "Registrar recepción"             |
| `recibida_parcial` | "Recepción parcial registrada. Registra el resto cuando llegue."                                          | "Registrar recepción"             |
| `recibida_total`   | "Toda la mercadería fue recibida. Puedes cerrar la OC."                                                   | "Cerrar OC"                       |
| `cerrada`          | — (no mostrar banner)                                                                                     | —                                 |

El botón en el banner llama al mismo handler que el botón ya existente en el header — no duplica lógica, solo duplica el punto de entrada visual.

**Permisos:** El banner y su botón se muestran/ocultan con las mismas condiciones que los botones existentes (`puedeRecibir`, `puedeAprobar`, etc.).

---

### 3. Banner de reposición en el módulo de Inventario

**Dónde:** `src/app/(app)/[companySlug]/inventario/page.tsx` y `src/components/modules/inventario/InventarioList.tsx`

**Qué hace:** Un banner rojo/amber en la parte superior de la lista de inventario cuando hay productos en `sin_stock` o `critico`.

**Contenido:**

- Título: "N productos necesitan reposición de stock"
- Descripción: "Para agregar stock, crea una Orden de Compra y registra la recepción cuando llegue la mercadería. El inventario se actualiza automáticamente."
- Botón primario: "+ Nueva orden de compra" → `/[slug]/ordenes/nueva`
- Botón secundario: "Ver OC pendientes →" → `/[slug]/ordenes?estado=pendiente_recepcion` (muestra aprobada + recibida_parcial)

**Comportamiento:**

- Aparece solo si `counts.sin_stock + counts.critico > 0` (datos ya disponibles en la prop `counts` del componente).
- No tiene botón de cerrar (siempre visible mientras haya stock crítico — más simple y más efectivo).
- Los datos ya están disponibles: el componente `InventarioList` recibe `counts` que incluye `sin_stock` y `critico`.

---

## Arquitectura y restricciones

- Sin nuevas tablas ni migraciones — todo se resuelve con queries a vistas existentes (`stock_critico`, `ordenes_compra`).
- Sin nuevo estado del lado cliente — el banner de inventario es puramente reactivo a los datos del servidor.
- El stepper de OC es un componente interno de `OrdenDetalle`, no un componente compartido.
- Permisos: el panel del dashboard requiere `reportes.ver` (ya está). El banner de inventario requiere `inventario.ver`. El banner de OC respeta los permisos existentes de cada acción.

## Archivos afectados

| Archivo                                                | Cambio                                                      |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| `src/app/(app)/[companySlug]/page.tsx`                 | +2 queries al Promise.all, renderizar `<PendientesPanel>`   |
| `src/components/modules/reportes/PendientesPanel.tsx`  | Nuevo componente                                            |
| `src/components/modules/ordenes/OrdenDetalle.tsx`      | Agregar `<OrdenStepper>` y `<OrdenBannerSiguientePaso>`     |
| `src/app/(app)/[companySlug]/inventario/page.tsx`      | Pasar datos de OC pendientes si se decide mostrar link      |
| `src/components/modules/inventario/InventarioList.tsx` | Agregar `<BannerReposicion>` usando prop `counts` existente |

## Fuera de alcance (v1)

- Notificaciones push o emails cuando hay OC listas para recibir.
- Conectar guía de remisión con el kardex (movimiento de salida automático) — eso es otro feature.
- Tutorial o onboarding interactivo paso a paso.
