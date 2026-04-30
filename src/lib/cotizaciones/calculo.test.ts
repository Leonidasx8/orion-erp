import { describe, it, expect } from 'vitest';
import { calcularItem, calcularTotales } from './calculo';

describe('calcularItem', () => {
  it('item simple sin descuento, afecto a IGV', () => {
    const r = calcularItem({
      cantidad: 2,
      precioUnitario: 100,
      descuentoPorcentaje: 0,
      afectaIgv: true,
    });
    expect(r).toEqual({
      bruto: 200,
      descuentoMonto: 0,
      subtotal: 200,
      igv: 36, // 200 * 0.18
      total: 236,
    });
  });

  it('item con descuento del 10%', () => {
    const r = calcularItem({
      cantidad: 1,
      precioUnitario: 1000,
      descuentoPorcentaje: 10,
      afectaIgv: true,
    });
    expect(r).toEqual({
      bruto: 1000,
      descuentoMonto: 100,
      subtotal: 900,
      igv: 162, // 900 * 0.18
      total: 1062,
    });
  });

  it('item no afecto a IGV', () => {
    const r = calcularItem({
      cantidad: 5,
      precioUnitario: 50,
      descuentoPorcentaje: 0,
      afectaIgv: false,
    });
    expect(r).toEqual({
      bruto: 250,
      descuentoMonto: 0,
      subtotal: 250,
      igv: 0,
      total: 250,
    });
  });

  it('redondea a 2 decimales con valores que generan más decimales', () => {
    const r = calcularItem({
      cantidad: 3,
      precioUnitario: 33.333,
      descuentoPorcentaje: 0,
      afectaIgv: true,
    });
    // bruto = 99.999 → 100.00
    expect(r.bruto).toBe(100);
    expect(r.subtotal).toBe(100);
    expect(r.igv).toBe(18);
    expect(r.total).toBe(118);
  });
});

describe('calcularTotales', () => {
  it('suma totales de múltiples líneas afectas', () => {
    const t = calcularTotales([
      { cantidad: 2, precioUnitario: 100, descuentoPorcentaje: 0, afectaIgv: true },
      { cantidad: 1, precioUnitario: 50, descuentoPorcentaje: 0, afectaIgv: true },
    ]);
    expect(t.subtotal).toBe(250);
    expect(t.baseImponible).toBe(250);
    expect(t.noAfecto).toBe(0);
    expect(t.igv).toBe(45); // 250 * 0.18
    expect(t.total).toBe(295);
  });

  it('mezcla afectas y no afectas, calcula base imponible solo de afectas', () => {
    const t = calcularTotales([
      { cantidad: 1, precioUnitario: 100, descuentoPorcentaje: 0, afectaIgv: true },
      { cantidad: 1, precioUnitario: 200, descuentoPorcentaje: 0, afectaIgv: false },
    ]);
    expect(t.subtotal).toBe(300);
    expect(t.baseImponible).toBe(100);
    expect(t.noAfecto).toBe(200);
    expect(t.igv).toBe(18);
    expect(t.total).toBe(318);
  });

  it('aplica descuentos por línea sin doble descuento', () => {
    const t = calcularTotales([
      { cantidad: 1, precioUnitario: 1000, descuentoPorcentaje: 10, afectaIgv: true },
    ]);
    expect(t.totalDescuentosLineas).toBe(100);
    expect(t.subtotal).toBe(900);
    expect(t.baseImponible).toBe(900);
    expect(t.igv).toBe(162);
    expect(t.total).toBe(1062);
  });

  it('aplica descuento global al total final', () => {
    const t = calcularTotales(
      [{ cantidad: 1, precioUnitario: 1000, descuentoPorcentaje: 0, afectaIgv: true }],
      100 // descuento global
    );
    expect(t.subtotal).toBe(1000);
    expect(t.igv).toBe(180);
    // total antes = 1180, menos 100 = 1080
    expect(t.total).toBe(1080);
    expect(t.descuentoGlobal).toBe(100);
    expect(t.totalDescuentos).toBe(100); // 0 línea + 100 global
  });

  it('cotización vacía retorna ceros', () => {
    const t = calcularTotales([]);
    expect(t).toMatchObject({
      subtotal: 0,
      baseImponible: 0,
      igv: 0,
      total: 0,
    });
  });

  it('descuento global no puede dejar el total negativo', () => {
    const t = calcularTotales(
      [{ cantidad: 1, precioUnitario: 100, descuentoPorcentaje: 0, afectaIgv: true }],
      9999 // descuento absurdo
    );
    expect(t.total).toBe(0); // clamp a 0
  });
});
