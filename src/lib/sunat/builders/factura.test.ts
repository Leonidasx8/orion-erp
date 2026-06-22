import { describe, it, expect } from 'vitest';
import { buildFactura } from './factura';
import type { FacturaPayload } from '../types';

// Payload base mínimo válido (gravado, contado) reutilizable en cada test.
function basePayload(overrides: Partial<FacturaPayload> = {}): FacturaPayload {
  return {
    tipoDocumento: '01',
    serie: 'F001',
    numero: 20,
    fechaEmision: '2026-06-22',
    cliente: {
      tipoDocumento: '6', // RUC (catálogo 06)
      numeroDocumento: '20609374749',
      razonSocial: 'CITASCO CMC PERU SAC',
    },
    moneda: 'USD',
    formaPago: 'contado',
    totalGravadas: 100,
    totalExoneradas: 0,
    totalInafectas: 0,
    totalGratuitas: 0,
    descuentoGlobal: 0,
    igv: 18,
    total: 118,
    totalEnLetras: 'CIENTO DIECIOCHO CON 00/100 DÓLARES AMERICANOS',
    lineas: [
      {
        orden: 1,
        codigo: 'TEST-001',
        descripcion: 'Cable',
        unidadMedida: 'MTR',
        cantidad: 1,
        valorUnitario: 100,
        precioUnitario: 118,
        tipoAfectacionIgv: '10',
        porcentajeIgv: 18,
        baseImponible: 100,
        igvLinea: 18,
        totalLinea: 118,
      },
    ],
    ...overrides,
  };
}

describe('buildFactura — forma de pago', () => {
  it('contado: NO envía venta_al_credito y no usa campos inexistentes', () => {
    const out = buildFactura(basePayload({ formaPago: 'contado' }));

    expect(out.venta_al_credito).toBeUndefined();
    expect(out.medio_de_pago).toBeUndefined();
    // Campos que Nubefact NO reconoce — no deben emitirse nunca
    expect(out.formato_de_pago).toBeUndefined();
    expect(out.cuotas).toBeUndefined();
  });

  it('credito con cuotas explícitas: emite venta_al_credito con cuota/fecha_de_pago/importe', () => {
    const out = buildFactura(
      basePayload({
        formaPago: 'credito',
        fechaVencimiento: '2026-08-06',
        cuotasCredito: [
          { numero: 1, fecha: '2026-07-06', monto: 50 },
          { numero: 2, fecha: '2026-08-06', monto: 68 },
        ],
      })
    );

    expect(out.venta_al_credito).toEqual([
      { cuota: 1, fecha_de_pago: '06-07-2026', importe: 50 },
      { cuota: 2, fecha_de_pago: '06-08-2026', importe: 68 },
    ]);
    // Trigger que Nubefact necesita para marcar el comprobante como Crédito
    expect(out.medio_de_pago).toBe('credito');
    // Campos falsos no deben aparecer
    expect(out.formato_de_pago).toBeUndefined();
    expect(out.cuotas).toBeUndefined();
  });

  it('credito sin cuotas explícitas: sintetiza una sola cuota por el total a la fecha de vencimiento', () => {
    const out = buildFactura(
      basePayload({
        formaPago: 'credito',
        fechaVencimiento: '2026-08-06',
        cuotasCredito: undefined,
        total: 118,
      })
    );

    expect(out.venta_al_credito).toEqual([{ cuota: 1, fecha_de_pago: '06-08-2026', importe: 118 }]);
    expect(out.medio_de_pago).toBe('credito');
  });
});
