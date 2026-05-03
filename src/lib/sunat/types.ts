/**
 * Types compartidos para wrapping NUBEFACT.
 * Diseñados a partir de la documentación pública de NUBEFACT.
 * Cuando lleguen las credenciales sandbox, se validan contra respuestas reales.
 */

import type {
  TipoDocumentoSunat,
  TipoDocIdentidad,
  AfectacionIgv,
  MotivoTraslado,
  ModalidadTraslado,
  MotivoNotaCredito,
  MotivoNotaDebito,
} from './catalogos';

// ----------------------------------------------------------------------------
// Cliente / receptor en el documento
// ----------------------------------------------------------------------------
export interface ClienteSunatPayload {
  tipoDocumento: TipoDocIdentidad;
  numeroDocumento: string;
  razonSocial: string;
  direccion?: string;
  email?: string;
}

// ----------------------------------------------------------------------------
// Línea genérica de factura/boleta/NC/ND
// ----------------------------------------------------------------------------
export interface LineaSunatPayload {
  orden: number;
  codigo?: string;
  descripcion: string;
  unidadMedida: string;
  cantidad: number;
  valorUnitario: number; // sin IGV
  precioUnitario: number; // con IGV
  tipoAfectacionIgv: AfectacionIgv;
  porcentajeIgv: number; // 18.00 para gravado en Perú
  baseImponible: number;
  igvLinea: number;
  totalLinea: number;
  descuento?: number;
}

// ----------------------------------------------------------------------------
// Factura / Boleta
// ----------------------------------------------------------------------------
export interface FacturaPayload {
  tipoDocumento: '01' | '03';
  serie: string;
  numero: number;
  fechaEmision: string; // 'YYYY-MM-DD'
  fechaVencimiento?: string;
  cliente: ClienteSunatPayload;
  moneda: 'PEN' | 'USD';
  tipoCambio?: number;
  formaPago: 'contado' | 'credito';
  cuotasCredito?: { numero: number; fecha: string; monto: number }[];
  totalGravadas: number;
  totalExoneradas: number;
  totalInafectas: number;
  totalGratuitas: number;
  descuentoGlobal: number;
  igv: number;
  total: number;
  totalEnLetras: string;
  observaciones?: string;
  documentoReferencia?: {
    tipo: TipoDocumentoSunat;
    serie: string;
    numero: number;
  };
  lineas: LineaSunatPayload[];
}

// ----------------------------------------------------------------------------
// Nota de Crédito / Débito
// ----------------------------------------------------------------------------
export interface NotaCreditoDebitoPayload {
  tipoDocumento: '07' | '08';
  serie: string;
  numero: number;
  fechaEmision: string;
  documentoOrigen: {
    tipo: '01' | '03';
    serie: string;
    numero: number;
  };
  tipoMotivo: MotivoNotaCredito | MotivoNotaDebito;
  descripcionMotivo: string;
  cliente: ClienteSunatPayload;
  moneda: 'PEN' | 'USD';
  tipoCambio?: number;
  totalGravadas: number;
  totalExoneradas: number;
  totalInafectas: number;
  igv: number;
  total: number;
  lineas: LineaSunatPayload[];
}

// ----------------------------------------------------------------------------
// Guía de Remisión (Remitente '09' o Transportista '31')
// ----------------------------------------------------------------------------
export interface GuiaRemisionPayload {
  tipoDocumento: '09' | '31';
  serie: string;
  numero: number;
  fechaEmision: string;
  fechaInicioTraslado: string;

  remitente?: ClienteSunatPayload;
  destinatario: ClienteSunatPayload;

  motivoTraslado: MotivoTraslado;
  descripcionMotivo?: string;
  modalidadTraslado: ModalidadTraslado;

  pesoBrutoTotal: number;
  unidadPeso: string;
  numeroBultos: number;

  direccionPartida: string;
  ubigeoPartida: string;
  direccionLlegada: string;
  ubigeoLlegada: string;

  transportista?: {
    rucDocumento: string;
    razonSocial: string;
    numeroMtc?: string;
  };
  vehiculo?: {
    placa: string;
    configuracionVehicular?: string;
  };

  facturaRelacionada?: {
    serie: string;
    numero: number;
  };

  lineas: Array<{
    orden: number;
    codigo?: string;
    descripcion: string;
    unidadMedida: string;
    cantidad: number;
  }>;

  observaciones?: string;
}

// ----------------------------------------------------------------------------
// Respuestas NUBEFACT (shape esperado según docs públicas)
// Cuando lleguen credenciales reales, validar y ajustar.
// ----------------------------------------------------------------------------
export interface NubefactSuccessResponse {
  aceptada_por_sunat: boolean;
  sunat_description: string;
  sunat_note: string | null;
  sunat_responsecode: string; // ej. '0' aceptada
  enlace_del_pdf: string;
  enlace_del_xml: string;
  enlace_del_cdr: string;
  cadena_para_codigo_qr: string;
  codigo_hash: string;
  serie: string;
  numero: number;
  tipo_de_comprobante: number;
}

export interface NubefactErrorResponse {
  errors: string;
  codigo?: number;
}

export type NubefactResponse = NubefactSuccessResponse | NubefactErrorResponse;
