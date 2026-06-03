/**
 * DIAGNÓSTICO sin DB: arma el payload de la factura F001-6 (datos reales de prod)
 * usando el builder real y lo envía a Nubefact, imprimiendo payload + respuesta CRUDA.
 * Uso: NUBEFACT_RUTA_IDEX=... NUBEFACT_TOKEN_IDEX=... pnpm tsx scripts/diag-nubefact.ts
 */
import { buildFactura } from '../src/lib/sunat/builders/factura';
import type { FacturaPayload } from '../src/lib/sunat/types';

const payload: FacturaPayload = {
  tipoDocumento: '01',
  serie: 'F001',
  numero: 6,
  fechaEmision: '2026-06-02',
  fechaVencimiento: undefined,
  cliente: {
    tipoDocumento: 'RUC' as never,
    numeroDocumento: '20109876543',
    razonSocial: 'GRUPO MINERA CERRO VERDE',
    direccion: undefined,
  },
  moneda: 'USD',
  tipoCambio: 3.785,
  formaPago: 'contado',
  cuotasCredito: undefined,
  totalGravadas: 13737.63,
  totalExoneradas: 0,
  totalInafectas: 0,
  totalGratuitas: 0,
  descuentoGlobal: 0,
  igv: 2472.77,
  total: 16210.4,
  totalEnLetras: 'DIECISÉIS MIL DOSCIENTOS DIEZ CON 40/100 DÓLARES AMERICANOS',
  observaciones: undefined,
  lineas: [
    {
      orden: 1,
      codigo: 'TX-4825',
      descripcion: 'Transformador trifásico 100 kVA · 220V/380V',
      unidadMedida: 'NIU',
      cantidad: 4,
      valorUnitario: 1847.4576,
      precioUnitario: 2180,
      tipoAfectacionIgv: '10' as never,
      porcentajeIgv: 18,
      baseImponible: 7389.8304,
      igvLinea: 1330.1695,
      totalLinea: 8719.9999,
      descuento: 0,
    },
    {
      orden: 2,
      codigo: 'SW-2210',
      descripcion: 'Tablero de distribución modular 24 vías',
      unidadMedida: 'NIU',
      cantidad: 6,
      valorUnitario: 518.9831,
      precioUnitario: 612.4,
      tipoAfectacionIgv: '10' as never,
      porcentajeIgv: 18,
      baseImponible: 3113.8986,
      igvLinea: 560.5017,
      totalLinea: 3674.4003,
      descuento: 0,
    },
    {
      orden: 3,
      codigo: 'BK-0042',
      descripcion: 'Interruptor termomagnético 32A · 2P',
      unidadMedida: 'NIU',
      cantidad: 30,
      valorUnitario: 50.8475,
      precioUnitario: 60,
      tipoAfectacionIgv: '10' as never,
      porcentajeIgv: 18,
      baseImponible: 1525.425,
      igvLinea: 274.5765,
      totalLinea: 1800.0015,
      descuento: 0,
    },
    {
      orden: 4,
      codigo: 'DF-0040',
      descripcion: 'Diferencial 40A · 4P',
      unidadMedida: 'NIU',
      cantidad: 12,
      valorUnitario: 142.3729,
      precioUnitario: 168,
      tipoAfectacionIgv: '10' as never,
      porcentajeIgv: 18,
      baseImponible: 1708.4748,
      igvLinea: 307.5255,
      totalLinea: 2016.0003,
      descuento: 0,
    },
  ],
};

async function main() {
  const body = buildFactura(payload);
  // EXPERIMENTO: probar sin envío automático a SUNAT (cuenta no activada)
  if (process.env.SUNAT_SEND === 'false') {
    body.enviar_automaticamente_a_la_sunat = false;
  }
  // EXPERIMENTO: probar con otro número de serie si se pasa SERIE_TEST
  if (process.env.SERIE_TEST) {
    body.serie = process.env.SERIE_TEST;
  }
  // EXPERIMENTO: sobreescribir receptor con un RUC real para que SUNAT acepte
  if (process.env.RECEPTOR_RUC) {
    body.cliente_numero_de_documento = process.env.RECEPTOR_RUC;
    body.cliente_denominacion = process.env.RECEPTOR_NOMBRE ?? body.cliente_denominacion;
  }
  if (process.env.NUMERO_TEST) {
    body.numero = Number(process.env.NUMERO_TEST);
  }
  console.log('=== PAYLOAD NUBEFACT ===');
  console.log(JSON.stringify(body, null, 2));

  const ruta = process.env.NUBEFACT_RUTA_IDEX!;
  const token = process.env.NUBEFACT_TOKEN_IDEX!;
  console.log('\n=== POST a Nubefact ===');
  console.log('URL:', `https://api.nubefact.com/api/v1/${ruta}`);

  const res = await fetch(`https://api.nubefact.com/api/v1/${ruta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

  console.log('HTTP STATUS:', res.status);
  console.log('\n=== RESPUESTA CRUDA ===');
  console.log(await res.text());
  process.exit(0);
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
