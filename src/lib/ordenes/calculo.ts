/**
 * Cálculo de totales de Orden de Compra.
 * Reusa `calcularItem` de cotizaciones (mismo modelo de IGV/línea), pero las OC:
 * - No tienen descuento por línea (siempre 0).
 * - No tienen descuento global.
 * - Manejan numeric con 4 decimales en DB; redondeamos solo el resultado final.
 *
 * Función pura — usable en cliente y servidor.
 */

import { calcularItem, IGV_RATE } from '@/lib/cotizaciones/calculo';

export { IGV_RATE };

export interface LineaOrdenInput {
  cantidad: number;
  precioUnitario: number;
  afectaIgv: boolean;
}

export interface TotalesOrdenCompra {
  subtotal: number;
  igv: number;
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calcularTotalesOrden(lineas: LineaOrdenInput[]): TotalesOrdenCompra {
  let subtotal = 0;
  let igvTotal = 0;

  for (const linea of lineas) {
    const calc = calcularItem({
      cantidad: linea.cantidad,
      precioUnitario: linea.precioUnitario,
      descuentoPorcentaje: 0,
      afectaIgv: linea.afectaIgv,
    });
    subtotal += calc.subtotal;
    igvTotal += calc.igv;
  }

  return {
    subtotal: round2(subtotal),
    igv: round2(igvTotal),
    total: round2(subtotal + igvTotal),
  };
}
