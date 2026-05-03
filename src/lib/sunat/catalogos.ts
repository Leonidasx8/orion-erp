/**
 * Catálogos SUNAT como constantes tipadas.
 * Referencias: https://www.sunat.gob.pe/legislacion/superin/2017/anexoVII-097-2012.pdf
 */

// Catálogo 01 — Tipo de Documento
export const TIPO_DOCUMENTO = {
  FACTURA: '01',
  BOLETA: '03',
  NOTA_CREDITO: '07',
  NOTA_DEBITO: '08',
  GUIA_REMITENTE: '09',
  GUIA_TRANSPORTISTA: '31',
} as const;

export type TipoDocumentoSunat = (typeof TIPO_DOCUMENTO)[keyof typeof TIPO_DOCUMENTO];

// Catálogo 06 — Tipo de Documento de Identidad del cliente
export const TIPO_DOC_IDENTIDAD = {
  DNI: '1',
  CARNET_EXTRANJERIA: '4',
  RUC: '6',
  PASAPORTE: '7',
  CEDULA_DIPLOMATICA: 'A',
} as const;

export type TipoDocIdentidad = (typeof TIPO_DOC_IDENTIDAD)[keyof typeof TIPO_DOC_IDENTIDAD];

// Catálogo 07 — Tipo de Afectación IGV
export const AFECTACION_IGV = {
  GRAVADO: '10',
  GRAVADO_RETIRO: '11',
  EXONERADO: '20',
  INAFECTO: '30',
  EXPORTACION: '40',
  GRATUITO_GRAVADO: '21',
  GRATUITO_EXONERADO: '31',
  GRATUITO_INAFECTO: '32',
} as const;

export type AfectacionIgv = (typeof AFECTACION_IGV)[keyof typeof AFECTACION_IGV];

// Catálogo 09 — Motivo de Traslado (guías de remisión)
export const MOTIVO_TRASLADO = {
  VENTA: '01',
  COMPRA: '02',
  VENTA_CON_ENTREGA_TERCEROS: '03',
  TRASLADO_ENTRE_ESTABLECIMIENTOS: '04',
  EXPORTACION: '08',
  IMPORTACION: '09',
  OTROS: '13',
} as const;

export type MotivoTraslado = (typeof MOTIVO_TRASLADO)[keyof typeof MOTIVO_TRASLADO];

// Modalidad de traslado
export const MODALIDAD_TRASLADO = {
  TRANSPORTE_PUBLICO: '01',
  TRANSPORTE_PRIVADO: '02',
} as const;

export type ModalidadTraslado = (typeof MODALIDAD_TRASLADO)[keyof typeof MODALIDAD_TRASLADO];

// Catálogo 09 — Tipos de Nota de Crédito (motivos)
export const MOTIVO_NOTA_CREDITO = {
  ANULACION_OPERACION: '01',
  ANULACION_ERROR_RUC: '02',
  CORRECCION_DESCRIPCION: '03',
  DESCUENTO_GLOBAL: '04',
  DESCUENTO_ITEM: '05',
  DEVOLUCION_TOTAL: '06',
  DEVOLUCION_ITEM: '07',
  BONIFICACION: '08',
  DISMINUCION_VALOR: '09',
  OTROS_CONCEPTOS: '10',
} as const;

export type MotivoNotaCredito = (typeof MOTIVO_NOTA_CREDITO)[keyof typeof MOTIVO_NOTA_CREDITO];

// Catálogo 10 — Tipos de Nota de Débito (motivos)
export const MOTIVO_NOTA_DEBITO = {
  INTERESES_MORA: '01',
  AUMENTO_VALOR: '02',
  PENALIDADES: '03',
  OTROS: '11',
} as const;

export type MotivoNotaDebito = (typeof MOTIVO_NOTA_DEBITO)[keyof typeof MOTIVO_NOTA_DEBITO];

// IGV vigente en Perú (18% al 2026)
export const IGV_RATE = 0.18;
export const IGV_PORCENTAJE = 18;

// Unidades de medida más usadas (catálogo 03 SUNAT — sub-set práctico)
export const UNIDAD_MEDIDA = {
  UNIDAD: 'NIU',
  KILOGRAMO: 'KGM',
  GRAMO: 'GRM',
  LITRO: 'LTR',
  METRO: 'MTR',
  CAJA: 'BX',
  DOCENA: 'DZN',
  HORA: 'HUR',
  SERVICIO: 'ZZ',
} as const;
