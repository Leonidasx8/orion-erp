import type { NotaCreditoDebitoPayload, LineaSunatPayload } from '../types';

// Nubefact: 3=Nota de Crédito, 4=Nota de Débito
const TIPO_MAP: Record<string, number> = { '07': 3, '08': 4 };
const MONEDA_MAP: Record<string, number> = { PEN: 1, USD: 2, EUR: 3 };
const IGV_TIPO_MAP: Record<string, number> = {
  '10': 1,
  '11': 9,
  '20': 4,
  '21': 10,
  '30': 6,
  '31': 11,
  '32': 11,
  '40': 8,
};

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
    subtotal: l.baseImponible,
    igv: l.igvLinea,
    total: l.totalLinea,
    orden: idx + 1,
  };
}

// Nubefact espera el tipo del doc origen como número (1=factura, 3=boleta)
const DOC_ORIGEN_MAP: Record<string, number> = { '01': 1, '03': 3 };

export function buildNotaCreditoDebito(p: NotaCreditoDebitoPayload): Record<string, unknown> {
  const esNC = p.tipoDocumento === '07';
  const clienteNumDoc = parseInt(p.cliente.tipoDocumento, 10) || 6;

  const base: Record<string, unknown> = {
    operacion: 'generar_comprobante',
    tipo_de_comprobante: TIPO_MAP[p.tipoDocumento] ?? 7,
    serie: p.serie,
    numero: p.numero,
    sunat_transaction: 1,

    fecha_de_emision: isoAFecha(p.fechaEmision),

    // Documento que se modifica
    documento_que_se_modifica_tipo: DOC_ORIGEN_MAP[p.documentoOrigen.tipo] ?? 1,
    documento_que_se_modifica_serie: p.documentoOrigen.serie,
    documento_que_se_modifica_numero: p.documentoOrigen.numero,

    // Motivo
    ...(esNC
      ? {
          tipo_de_nota_de_credito: p.tipoMotivo,
          nota_de_credito_motivo: p.descripcionMotivo,
        }
      : {
          tipo_de_nota_de_debito: p.tipoMotivo,
          nota_de_debito_motivo: p.descripcionMotivo,
        }),

    // Cliente
    cliente_tipo_de_documento: clienteNumDoc,
    cliente_numero_de_documento: p.cliente.numeroDocumento,
    cliente_denominacion: p.cliente.razonSocial,
    cliente_direccion: p.cliente.direccion ?? '',
    cliente_email: p.cliente.email ?? '',

    // Moneda
    moneda: MONEDA_MAP[p.moneda] ?? 1,
    tipo_de_cambio: p.tipoCambio ?? (p.moneda !== 'PEN' ? 3.75 : ''),

    // Totales
    porcentaje_de_igv: 18.0,
    total_gravada: p.totalGravadas,
    total_exonerada: p.totalExoneradas,
    total_inafecta: p.totalInafectas,
    total_igv: p.igv,
    total: p.total,

    enviar_automaticamente_a_la_sunat: true,
    enviar_automaticamente_al_cliente: false,

    items: p.lineas.map(buildItem),
  };

  return base;
}
