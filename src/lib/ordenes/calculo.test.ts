import { describe, it, expect } from 'vitest';
import { calcularTotalesOrden } from './calculo';

describe('calcularTotalesOrden', () => {
  it('OC con una línea afecta a IGV', () => {
    const r = calcularTotalesOrden([{ cantidad: 10, precioUnitario: 100, afectaIgv: true }]);
    expect(r.subtotal).toBe(1000);
    expect(r.igv).toBe(180);
    expect(r.total).toBe(1180);
  });

  it('OC con línea no afecta a IGV', () => {
    const r = calcularTotalesOrden([{ cantidad: 5, precioUnitario: 50, afectaIgv: false }]);
    expect(r.subtotal).toBe(250);
    expect(r.igv).toBe(0);
    expect(r.total).toBe(250);
  });

  it('OC con mezcla de líneas afectas y no afectas: IGV solo sobre afectas', () => {
    const r = calcularTotalesOrden([
      { cantidad: 10, precioUnitario: 100, afectaIgv: true }, // 1000 + 180
      { cantidad: 2, precioUnitario: 50, afectaIgv: false }, // 100
    ]);
    expect(r.subtotal).toBe(1100);
    expect(r.igv).toBe(180);
    expect(r.total).toBe(1280);
  });

  it('OC vacía retorna ceros', () => {
    const r = calcularTotalesOrden([]);
    expect(r.subtotal).toBe(0);
    expect(r.igv).toBe(0);
    expect(r.total).toBe(0);
  });

  it('redondeo a 2 decimales con valores que generan más decimales', () => {
    // 3.33 * 7 = 23.31, IGV = 4.1958, total ≈ 27.51 (redondeado)
    const r = calcularTotalesOrden([{ cantidad: 7, precioUnitario: 3.33, afectaIgv: true }]);
    expect(r.subtotal).toBe(23.31);
    expect(r.igv).toBe(4.2);
    expect(r.total).toBe(27.51);
  });

  it('múltiples líneas afectas suma correctamente', () => {
    const r = calcularTotalesOrden([
      { cantidad: 1, precioUnitario: 100, afectaIgv: true },
      { cantidad: 1, precioUnitario: 200, afectaIgv: true },
      { cantidad: 1, precioUnitario: 300, afectaIgv: true },
    ]);
    expect(r.subtotal).toBe(600);
    expect(r.igv).toBe(108);
    expect(r.total).toBe(708);
  });

  it('precio unitario decimal con cantidad fraccionaria', () => {
    // 2.5 unidades * 80.50 = 201.25, IGV = 36.225 ≈ 36.23, total = 237.48
    const r = calcularTotalesOrden([{ cantidad: 2.5, precioUnitario: 80.5, afectaIgv: true }]);
    expect(r.subtotal).toBe(201.25);
    expect(r.igv).toBe(36.23);
    expect(r.total).toBe(237.48);
  });
});
