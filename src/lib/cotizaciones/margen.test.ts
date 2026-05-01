import { describe, it, expect } from 'vitest';
import { validarMargenItem, type ProductoParaMargen } from './margen';

const baseProducto: ProductoParaMargen = {
  nombre: 'Producto X',
  costoUnitario: '100',
  margenMinimo: '20',
};

describe('validarMargenItem', () => {
  it('aprueba cuando el margen es exactamente igual al mínimo', () => {
    // costo 100, mínimo 20% → precio mínimo 120
    const r = validarMargenItem(120, baseProducto);
    expect(r.ok).toBe(true);
  });

  it('aprueba cuando el margen supera el mínimo', () => {
    const r = validarMargenItem(150, baseProducto); // margen 50%
    expect(r.ok).toBe(true);
  });

  it('rechaza cuando el margen está debajo del mínimo', () => {
    const r = validarMargenItem(110, baseProducto); // margen 10% < 20%
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain('10.0%');
      expect(r.error).toContain('20%');
      expect(r.error).toContain('Producto X');
      expect(r.margenCalculado).toBeCloseTo(10);
      expect(r.margenMinimo).toBe(20);
    }
  });

  it('omite la validación cuando margenMinimo es null', () => {
    const r = validarMargenItem(50, { ...baseProducto, margenMinimo: null });
    expect(r.ok).toBe(true);
  });

  it('omite la validación cuando costoUnitario es null', () => {
    const r = validarMargenItem(50, { ...baseProducto, costoUnitario: null });
    expect(r.ok).toBe(true);
  });

  it('omite cuando el costo es 0 (evita división por cero)', () => {
    const r = validarMargenItem(50, { ...baseProducto, costoUnitario: '0' });
    expect(r.ok).toBe(true);
  });

  it('omite cuando el costo es negativo (dato inválido)', () => {
    const r = validarMargenItem(50, { ...baseProducto, costoUnitario: '-10' });
    expect(r.ok).toBe(true);
  });

  it('rechaza vender bajo el costo (margen negativo)', () => {
    const r = validarMargenItem(80, baseProducto); // margen -20%
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.margenCalculado).toBeLessThan(0);
    }
  });

  it('maneja correctamente strings de Drizzle (numeric → string)', () => {
    // Drizzle entrega columnas numeric como string. Verificamos que parsea bien.
    const r = validarMargenItem(120.5, {
      nombre: 'Producto Y',
      costoUnitario: '100.00',
      margenMinimo: '15.50',
    });
    expect(r.ok).toBe(true);
  });

  it('rechaza con margen mínimo de 50% si no se llega', () => {
    const r = validarMargenItem(140, { ...baseProducto, margenMinimo: '50' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.margenCalculado).toBeCloseTo(40);
      expect(r.margenMinimo).toBe(50);
    }
  });

  it('omite cuando margenMinimo viene como undefined', () => {
    const r = validarMargenItem(50, { ...baseProducto, margenMinimo: undefined });
    expect(r.ok).toBe(true);
  });
});
