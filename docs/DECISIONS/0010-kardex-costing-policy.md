# 0010 — Política de costing de inventario y reglas de stock

## Status

Accepted (2026-05-01)

## Contexto

B.7 (Kardex) requiere decidir cómo se calculan costos de salida y cómo se manejan los bordes del inventario. Estas decisiones afectan: precios de venta basados en margen, valor del inventario en reportes, contabilidad SUNAT, y la lógica de la función `registrar_movimiento_stock()`.

## Decisión

### 1. Costing: **costo promedio ponderado**

Cada entrada actualiza el costo promedio del producto según:

```
costo_promedio_nuevo = (stock_old * costo_old + cantidad_in * costo_in) / stock_nuevo
```

Las salidas y ajustes negativos no modifican el costo promedio (se registran al costo promedio vigente al momento del movimiento).

**Por qué costo promedio (no FIFO):**

- Más simple para el equipo operativo de Idex y Agroalves.
- SUNAT acepta costo promedio o PEPS (FIFO) — ambas son válidas para reportes oficiales en Perú.
- Los datos en `kardex_movimientos` (cantidad + costo unitario por movimiento) permiten reconstruir FIFO si se necesita en el futuro.
- FIFO requiere mantener "lotes" virtuales y matching de cantidades, ceremonia que no aporta valor en este momento.

### 2. Stock negativo: **bloqueado por default, configurable por producto**

La función `registrar_movimiento_stock()` lanza excepción `stock_negativo` si una salida o ajuste negativo dejaría `cantidad_actual < 0`, **excepto** si el producto tiene `permite_stock_negativo = true`.

**Por qué:**

- Idex no maneja preventas; vender lo que no se tiene es un bug operativo, no un caso de negocio.
- Si un futuro tenant lo necesita (ej. servicios o productos digitales sin stock real), basta con flagear el producto.
- La columna vive en `costos_inventario` (no en `productos`) para mantener atomicidad con la cantidad actual.

### 3. Multi-warehouse: **no en MVP**

Schema de `kardex_movimientos` y `costos_inventario` no incluye `warehouse_id`. Idex y Agroalves operan con un solo almacén físico.

**Cómo se agrega cuando se necesite:**

- `ALTER TABLE kardex_movimientos ADD COLUMN warehouse_id uuid REFERENCES warehouses(id)`
- `ALTER TABLE costos_inventario ADD COLUMN warehouse_id uuid` y cambiar PK a `(producto_id, warehouse_id)`.
- La función `registrar_movimiento_stock()` recibe `p_warehouse_id` extra.

Hacerlo desde el día 1 metería complejidad (joins en cada query, default warehouse, migración de datos) que no se rentabiliza en MVP.

### 4. Reservas (stock comprometido): **no descuentan del disponible en MVP**

Una cotización aceptada no reserva stock. Solo la facturación (B.9) genera salida. Si el cliente acepta una cotización por más unidades de las que hay físicamente, se detecta al facturar (con `stock_negativo` bloqueando la operación).

**Por qué:**

- Reservas requieren un segundo contador (`cantidad_reservada`) y lógica de "liberación" cuando una cotización se rechaza o expira → complejidad alta.
- En la operación real de Idex el ciclo cotización→factura es de horas a pocos días; el riesgo de overselling es bajo.
- Si se vuelve un problema, se agrega `cantidad_reservada` en `costos_inventario` con triggers en B.5 sin tocar el resto.

### 5. Anulación de factura: **genera movimiento inverso**

Cuando B.9 implemente anulación, se invoca `registrar_movimiento_stock()` con `tipo='entrada'` por la cantidad y costo unitario del movimiento original (`origen_tipo='anulacion'`). Esto restituye el stock y queda auditado.

**Por qué movimiento nuevo y no UPDATE/DELETE:**

- `kardex_movimientos` es append-only por diseño (auditoría inmutable).
- Un INSERT inverso es trazable y reversible; un DELETE rompe la cadena de saldos cacheados.

## Implicancias

- Todas las salidas (factura, guía, ajuste negativo) usan el costo promedio vigente al momento — se cachea en `kardex_movimientos.costo_promedio_post`.
- El cliente puede ver "valor del inventario actual" calculando `cantidad_actual * costo_promedio` desde `costos_inventario` o la vista `stock_actual`.
- Si en el futuro Lucas quiere migrar a FIFO: hay que crear un "Cierre contable mensual" que congele costos por período. No bloquea ahora.

## Alternativas descartadas

- **PEPS (FIFO) puro**: descartado por complejidad. Requiere matching de lotes en cada salida.
- **Costo último**: descartado, distorsiona márgenes cuando hay variabilidad de precios de compra.
- **Stock negativo permitido por default**: descartado, esconde bugs operativos.
