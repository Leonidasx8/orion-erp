import type { FacturaPayload, LineaSunatPayload } from '../types';

// Nubefact tipo_de_comprobante: 1=factura, 3=boleta
const TIPO_MAP: Record<string, number> = { '01': 1, '03': 3 };

// Nubefact tipo_de_igv (catálogo 07 SUNAT → número Nubefact)
const IGV_TIPO_MAP: Record<string, number> = {
  '10': 1, // Gravado Op. Onerosa
  '11': 9, // Gratuito Gravado
  '20': 4, // Exonerado Op. Onerosa
  '21': 10, // Gratuito Exonerado
  '30': 6, // Inafecto Op. Onerosa
  '31': 11, // Gratuito Inafecto
  '32': 11,
  '40': 8, // Exportación
};

// Nubefact moneda: 1=PEN, 2=USD, 3=EUR
const MONEDA_MAP: Record<string, number> = { PEN: 1, USD: 2, EUR: 3 };

// Convierte fecha YYYY-MM-DD → DD-MM-YYYY (formato Nubefact)
function isoAFecha(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

function buildItem(l: LineaSunatPayload, idx: number): Record<string, unknown> {
  return {
    unidad_de_medida: l.unidadMedida,
    codigo: l.codigo ?? '',
    descripcion: l.descripcion,
    cantidad: l.cantidad,
    valor_unitario: l.valorUnitario,
    precio_unitario: l.precioUnitario,
    descuento: l.descuento ?? 0,
    tipo_de_igv: IGV_TIPO_MAP[l.tipoAfectacionIgv] ?? 1,
    total_base_igv: l.baseImponible,
    porcentaje_igv: l.porcentajeIgv,
    total_igv: l.igvLinea,
    total: l.totalLinea,
    orden: idx + 1,
  };
}

export function buildFactura(p: FacturaPayload): Record<string, unknown> {
  const clienteNumDoc = parseInt(p.cliente.tipoDocumento, 10) || 6;

  const base: Record<string, unknown> = {
    operacion: 'generar_comprobante',
    tipo_de_comprobante: TIPO_MAP[p.tipoDocumento] ?? 1,
    serie: p.serie,
    numero: p.numero,
    sunat_transaction: 1,

    // Cliente
    cliente_tipo_de_documento: clienteNumDoc,
    cliente_numero_de_documento: p.cliente.numeroDocumento,
    cliente_denominacion: p.cliente.razonSocial,
    cliente_direccion: p.cliente.direccion ?? '',
    cliente_email: p.cliente.email ?? '',

    // Fechas
    fecha_de_emision: isoAFecha(p.fechaEmision),
    fecha_de_vencimiento: p.fechaVencimiento ? isoAFecha(p.fechaVencimiento) : '',

    // Moneda
    moneda: MONEDA_MAP[p.moneda] ?? 1,
    tipo_de_cambio: p.tipoCambio ?? '',

    // Totales
    porcentaje_de_igv: 18.0,
    total_gravada: p.totalGravadas,
    total_exonerada: p.totalExoneradas,
    total_inafecta: p.totalInafectas,
    total_gratuita: p.totalGratuitas,
    total_otros_cargos: 0,
    total_descuento: p.descuentoGlobal,
    total_igv: p.igv,
    total: p.total,
    total_en_letras: p.totalEnLetras ?? '',

    observaciones: p.observaciones ?? '',

    enviar_automaticamente_a_la_sunat: true,
    enviar_automaticamente_al_cliente: false,

    items: p.lineas.map(buildItem),
  };

  // Forma de pago
  if (p.formaPago === 'credito' && p.cuotasCredito?.length) {
    base.formato_de_pago = 'Credito';
    base.cuotas = p.cuotasCredito.map((c) => ({
      numero: c.numero,
      fecha_de_pago: isoAFecha(c.fecha),
      importe: c.monto,
    }));
  } else {
    base.formato_de_pago = 'Contado';
  }

  // Documento de referencia (ej. cotización → no aplica; guía relacionada)
  if (p.documentoReferencia) {
    base.documento_de_referencia_tipo = TIPO_MAP[p.documentoReferencia.tipo] ?? 1;
    base.documento_de_referencia_serie = p.documentoReferencia.serie;
    base.documento_de_referencia_numero = p.documentoReferencia.numero;
  }

  return base;
}
