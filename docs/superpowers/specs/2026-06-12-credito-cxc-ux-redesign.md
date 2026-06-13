# Spec: Rediseño UX — Módulo Crédito y CxC

**Fecha:** 2026-06-12
**Alcance:** `src/app/(app)/[companySlug]/credito/page.tsx` y componentes en `src/components/modules/credito/`

---

## Problema

El módulo actual tiene tres problemas:

1. **Terminología confusa:** "Aging report" es inglés técnico desconocido para el usuario final.
2. **KPI cards ambiguas:** "Total por cobrar" muestra USD y PEN apilados en una sola tarjeta — difícil de leer de un vistazo.
3. **Bug TypeScript + datos:** `page.tsx` pasa props con nombres del formato anterior (`totalCxC`, `agingBuckets`) que no coinciden con los tipos actuales de los componentes. El query de aging no separa por moneda.

---

## Solución — Opción C

### 1. KPI Cards (5 tarjetas)

**Layout:** `grid-cols-5` en desktop, `grid-cols-2 + 1` en tablet.

| #   | Título                 | Valor         | Variante                |
| --- | ---------------------- | ------------- | ----------------------- |
| 1   | Clientes con deuda     | número entero | neutro                  |
| 2   | Total por cobrar USD   | `Money` USD   | badge azul `USD`        |
| 3   | Vencido USD            | `Money` USD   | rojo si >0, guión si =0 |
| 4   | Total por cobrar soles | `Money` PEN   | badge verde `S/`        |
| 5   | Vencido en soles       | `Money` PEN   | rojo si >0, guión si =0 |

El componente `DashboardCxC` se actualiza al tipo `DashboardCxCData` ya correcto (campos `totalCxCUsd`, `totalCxCPen`, `totalVencidoUsd`, `totalVencidoPen`). Se corrige `page.tsx` para pasar los props correctos.

### 2. Antigüedad de cartera (antes "Aging report")

**Renombrado a "Antigüedad de cartera"** en todos los textos visibles.

**Siempre dos bloques, siempre visibles:**

```
Antigüedad de cartera · <fecha>          <N> clientes
─────────────────────────────────────────────────────
[USD]  USD X,XXX vencido
  [ 1-30d ] [ 31-60d ] [ 61-90d ] [ +90d ]   ← 4 cards coloreadas
  [████████████░░░░░░]                         ← barra proporcional

──────────────────────────────────────────────

[S/]  Sin facturas vencidas en soles           ← mensaje cuando =0
  (o misma estructura 4 cards + barra cuando >0)
```

- Colores: verde (1-30d) → amarillo (31-60d) → naranja (61-90d) → rojo (+90d)
- Si una moneda tiene `totalVencido = 0`: mostrar mensaje "Sin facturas vencidas en [moneda]", no ocultar el bloque.
- **Fix de datos:** el query de `aging_cxc` se separa en dos queries (o se añade columna `moneda`) para devolver buckets USD y buckets PEN de forma independiente.

### 3. Tabla de clientes

- **Siempre dos filas por cliente:** fila USD + fila PEN (`↳`), sin excepción.
- **Fondo zebra por grupo:** la fila USD y la fila `↳` del mismo cliente comparten un `bg-orion-bg-subtle/40` alternado para leerse como una unidad visual.
- El resto de columnas, lógica de bloqueo y botón "Cobrar" no cambia.

---

## Archivos a modificar

| Archivo                                             | Cambio                                                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `src/components/modules/credito/DashboardCxC.tsx`   | Layout 5 cards, tipos ya correctos                                                                     |
| `src/app/(app)/[companySlug]/credito/page.tsx`      | Fix props `dashboardData`, fix `AgingReportCard`, renombrar "Aging report", fix query aging por moneda |
| `src/components/modules/credito/ClientesSaldos.tsx` | Añadir fondo zebra por grupo; eliminar el filtro de filas vacías                                       |

`AgingChart.tsx` queda sin cambios (no se usa en la página principal, solo en detalle de cliente).

---

## Out of scope

- Detalle de cliente (`/credito/clientes/[id]`)
- Formularios de crédito y pagos
- Lógica de bloqueo automático
- Cualquier cambio en la base de datos más allá del query de aging
