/**
 * Cálculo de totales de cotización.
 * Función pura: misma entrada, misma salida — usada en cliente (preview reactivo)
 * y en servidor (validación al guardar).
 *
 * Reglas:
 * - IGV Perú = 18% sobre el subtotal de cada línea afecta a IGV.
 * - Descuento por línea es porcentaje sobre (cantidad * precio_unitario).
 * - Descuento global se resta del total final (no recalcula IGV) — simplificación
 *   para cotizaciones; SUNAT/facturas requieren prorrateo, lo manejamos en B.9.
 * - Redondeo a 2 decimales solo en el resultado final, no en pasos intermedios.
 */

export const IGV_RATE = 0.18;

export interface ItemInput {
  cantidad: number;
  precioUnitario: number;
  descuentoPorcentaje: number;
  afectaIgv: boolean;
}

export interface ItemCalculado {
  bruto: number;
  descuentoMonto: number;
  subtotal: number;
  igv: number;
  total: number;
}

export interface TotalesCotizacion {
  subtotal: number; // suma de subtotales de línea (post-descuento línea)
  totalDescuentosLineas: number;
  descuentoGlobal: number;
  totalDescuentos: number; // descuentos línea + global
  baseImponible: number; // suma de subtotales afectos a IGV
  noAfecto: number; // suma de subtotales no afectos
  igv: number;
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calcularItem(item: ItemInput): ItemCalculado {
  const bruto = item.cantidad * item.precioUnitario;
  const descuentoMonto = bruto * (item.descuentoPorcentaje / 100);
  const subtotal = bruto - descuentoMonto;
  const igv = item.afectaIgv ? subtotal * IGV_RATE : 0;
  const total = subtotal + igv;

  return {
    bruto: round2(bruto),
    descuentoMonto: round2(descuentoMonto),
    subtotal: round2(subtotal),
    igv: round2(igv),
    total: round2(total),
  };
}

export function calcularTotales(items: ItemInput[], descuentoGlobal = 0): TotalesCotizacion {
  const calc = items.map(calcularItem);

  const subtotal = calc.reduce((acc, i) => acc + i.subtotal, 0);
  const totalDescuentosLineas = calc.reduce((acc, i) => acc + i.descuentoMonto, 0);
  const baseImponible = items.reduce(
    (acc, item, idx) => acc + (item.afectaIgv ? calc[idx].subtotal : 0),
    0
  );
  const noAfecto = subtotal - baseImponible;
  const igv = calc.reduce((acc, i) => acc + i.igv, 0);
  const totalAntesDescuentoGlobal = subtotal + igv;
  const total = Math.max(0, totalAntesDescuentoGlobal - descuentoGlobal);

  return {
    subtotal: round2(subtotal),
    totalDescuentosLineas: round2(totalDescuentosLineas),
    descuentoGlobal: round2(descuentoGlobal),
    totalDescuentos: round2(totalDescuentosLineas + descuentoGlobal),
    baseImponible: round2(baseImponible),
    noAfecto: round2(noAfecto),
    igv: round2(igv),
    total: round2(total),
  };
}

export function formatMoneda(valor: number, moneda: 'PEN' | 'USD' = 'PEN'): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(valor);
}
