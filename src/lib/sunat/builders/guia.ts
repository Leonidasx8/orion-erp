import type { GuiaRemisionPayload } from '../types';

// Nubefact GRE type codes: 7=Remitente (SUNAT 09), 8=Transportista (SUNAT 31)
const TIPO_MAP: Record<string, number> = { '09': 7, '31': 8 };

function isoAFecha(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

function tipoDocToCode(tipo: string): number {
  if (/^\d+$/.test(tipo)) return parseInt(tipo, 10);
  const MAP: Record<string, number> = { RUC: 6, DNI: 1, CE: 4, CARNEEXTRANJERIA: 4, PASAPORTE: 7 };
  return MAP[tipo.toUpperCase().replace(/[\s_-]/g, '')] ?? 6;
}

export function buildGuia(p: GuiaRemisionPayload): Record<string, unknown> {
  const esRemitente = p.tipoDocumento === '09';

  // Para GRE Remitente: cliente = destinatario (quien recibe)
  // Para GRE Transportista: cliente = remitente original (dueño de mercadería)
  const clienteData = esRemitente ? p.destinatario : (p.remitente ?? p.destinatario);

  const base: Record<string, unknown> = {
    operacion: 'generar_guia',
    tipo_de_comprobante: TIPO_MAP[p.tipoDocumento] ?? 7,
    serie: p.serie,
    numero: String(p.numero),

    cliente_tipo_de_documento: tipoDocToCode(clienteData.tipoDocumento),
    cliente_numero_de_documento: clienteData.numeroDocumento,
    cliente_denominacion: clienteData.razonSocial,
    cliente_direccion: clienteData.direccion ?? '',
    cliente_email: '',

    fecha_de_emision: isoAFecha(p.fechaEmision),
    observaciones: p.observaciones ?? '',
    motivo_de_traslado: p.motivoTraslado,

    peso_bruto_total: String(p.pesoBrutoTotal),
    peso_bruto_unidad_de_medida: p.unidadPeso,
    numero_de_bultos: String(p.numeroBultos),

    punto_de_partida_ubigeo: p.ubigeoPartida,
    punto_de_partida_direccion: p.direccionPartida,
    punto_de_partida_codigo_establecimiento_sunat: '0000',
    punto_de_llegada_ubigeo: p.ubigeoLlegada,
    punto_de_llegada_direccion: p.direccionLlegada,
    punto_de_llegada_codigo_establecimiento_sunat: '0000',

    fecha_de_inicio_de_traslado: isoAFecha(p.fechaInicioTraslado),

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

  // Tipo de transporte y transportista — solo para GRE Remitente (09)
  if (esRemitente) {
    base.tipo_de_transporte = p.modalidadTraslado;

    if (p.transportista) {
      base.transportista_documento_tipo = '6';
      base.transportista_documento_numero = p.transportista.rucDocumento;
      base.transportista_denominacion = p.transportista.razonSocial;
    }
  }

  // Placa del vehículo (presente en ambos tipos)
  if (p.vehiculo?.placa) {
    base.transportista_placa_numero = p.vehiculo.placa;
  }

  // Conductor (campos vacíos cuando no aplica — Nubefact los espera)
  base.conductor_documento_tipo = '';
  base.conductor_documento_numero = '';
  base.conductor_nombre = '';
  base.conductor_apellidos = '';
  base.conductor_numero_licencia = '';

  // Para GRE Transportista (31): agregar destinatario separado
  if (!esRemitente) {
    base.destinatario_documento_tipo = String(tipoDocToCode(p.destinatario.tipoDocumento));
    base.destinatario_documento_numero = p.destinatario.numeroDocumento;
    base.destinatario_denominacion = p.destinatario.razonSocial;
  }

  return base;
}
