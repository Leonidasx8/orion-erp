import type { GuiaRemisionPayload } from '../types';

// Nubefact GRE codes (distinto de SUNAT): 7=Remitente (SUNAT 09), 8=Transportista (SUNAT 31)
const TIPO_MAP: Record<string, number> = { '09': 7, '31': 8 };

function isoAFecha(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

export function buildGuia(p: GuiaRemisionPayload): Record<string, unknown> {
  const esRemitente = p.tipoDocumento === '09';

  const base: Record<string, unknown> = {
    operacion: 'generar_guia',
    tipo_de_comprobante: TIPO_MAP[p.tipoDocumento] ?? 7,
    serie: p.serie,
    numero: p.numero,

    fecha_de_emision: isoAFecha(p.fechaEmision),
    fecha_de_inicio_de_traslado: isoAFecha(p.fechaInicioTraslado),

    // Destinatario (siempre requerido)
    destinatario_tipo_de_documento: parseInt(p.destinatario.tipoDocumento, 10) || 6,
    destinatario_numero_de_documento: p.destinatario.numeroDocumento,
    destinatario_denominacion: p.destinatario.razonSocial,
    destinatario_direccion: p.destinatario.direccion ?? '',

    // Traslado
    motivo_de_traslado: p.motivoTraslado,
    descripcion_motivo_de_traslado: p.descripcionMotivo ?? '',
    modalidad_de_transporte: p.modalidadTraslado, // '01' público, '02' privado

    // Peso y bultos
    peso_bruto_total: p.pesoBrutoTotal,
    unidad_de_medida_de_peso: p.unidadPeso,
    numero_de_bultos: p.numeroBultos,

    // Puntos de partida/llegada
    lugar_punto_de_partida: p.direccionPartida,
    ubigeo_punto_de_partida: p.ubigeoPartida,
    lugar_punto_de_llegada: p.direccionLlegada,
    ubigeo_punto_de_llegada: p.ubigeoLlegada,

    observaciones: p.observaciones ?? '',

    enviar_automaticamente_a_la_sunat: true,
    enviar_automaticamente_al_cliente: false,

    items: p.lineas.map((l, i) => ({
      unidad_de_medida: l.unidadMedida,
      codigo: l.codigo ?? '',
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      orden: i + 1,
    })),
  };

  // Remitente — para tipo 09 es el propio tenant, para 31 es el transportista
  if (p.remitente) {
    base.remitente_tipo_de_documento = parseInt(p.remitente.tipoDocumento, 10) || 6;
    base.remitente_numero_de_documento = p.remitente.numeroDocumento;
    base.remitente_denominacion = p.remitente.razonSocial;
    base.remitente_direccion = p.remitente.direccion ?? '';
  }

  // Vehículo (transporte privado)
  if (p.modalidadTraslado === '02' && p.vehiculo) {
    base.placa_vehiculo = p.vehiculo.placa;
    if (p.vehiculo.configuracionVehicular) {
      base.configuracion_vehicular = p.vehiculo.configuracionVehicular;
    }
  }

  // Transportista — requerido para: tipo 31, o tipo 09 con modalidad 01 (público)
  if (p.transportista && (!esRemitente || p.modalidadTraslado === '01')) {
    base.ruc_transportista = p.transportista.rucDocumento;
    base.nombre_transportista = p.transportista.razonSocial;
    if (p.transportista.numeroMtc) {
      base.numero_mtc = p.transportista.numeroMtc;
    }
  }

  // Factura relacionada
  if (p.facturaRelacionada) {
    base.numero_de_serie_comprobante_pago = p.facturaRelacionada.serie;
    base.numero_de_comprobante_pago = p.facturaRelacionada.numero;
  }

  return base;
}
