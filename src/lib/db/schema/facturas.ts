import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  bigint,
  date,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { clientes } from './clientes';
import { productos } from './productos';
import { cotizaciones } from './cotizaciones';
import { guiasRemision } from './guias';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const facturas = pgTable('facturas', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),

  tipoDocumento: text('tipo_documento').notNull(), // '01' factura | '03' boleta
  serie: text('serie').notNull(),
  numero: bigint('numero', { mode: 'number' }).notNull(),
  numeroCompleto: text('numero_completo'),

  fechaEmision: date('fecha_emision').notNull(),
  fechaVencimiento: date('fecha_vencimiento'),

  clienteId: uuid('cliente_id')
    .notNull()
    .references(() => clientes.id),
  clienteTipoDocSnapshot: text('cliente_tipo_doc_snapshot').notNull(),
  clienteNumeroDocSnapshot: text('cliente_numero_doc_snapshot').notNull(),
  clienteRazonSocialSnapshot: text('cliente_razon_social_snapshot').notNull(),
  clienteDireccionSnapshot: text('cliente_direccion_snapshot'),

  moneda: text('moneda').notNull().default('PEN'),
  tipoCambio: numeric('tipo_cambio', { precision: 10, scale: 4 }),

  totalGravadas: numeric('total_gravadas', { precision: 14, scale: 4 }).notNull().default('0'),
  totalExoneradas: numeric('total_exoneradas', { precision: 14, scale: 4 }).notNull().default('0'),
  totalInafectas: numeric('total_inafectas', { precision: 14, scale: 4 }).notNull().default('0'),
  totalGratuitas: numeric('total_gratuitas', { precision: 14, scale: 4 }).notNull().default('0'),
  descuentoGlobal: numeric('descuento_global', { precision: 14, scale: 4 }).notNull().default('0'),
  igv: numeric('igv', { precision: 14, scale: 4 }).notNull().default('0'),
  total: numeric('total', { precision: 14, scale: 4 }).notNull().default('0'),
  totalEnLetras: text('total_en_letras'),

  formaPago: text('forma_pago').notNull().default('contado'),
  cuotasCredito: jsonb('cuotas_credito'),

  cotizacionOrigenId: uuid('cotizacion_origen_id').references(() => cotizaciones.id),
  guiaRelacionadaId: uuid('guia_relacionada_id').references(() => guiasRemision.id),

  observaciones: text('observaciones'),

  estado: text('estado').notNull().default('borrador'),
  estadoSunat: text('estado_sunat').notNull().default('sin_enviar'),
  cdrUrl: text('cdr_url'),
  xmlUrl: text('xml_url'),
  pdfUrl: text('pdf_url'),
  nubefactResponse: jsonb('nubefact_response'),
  sunatCodigo: integer('sunat_codigo'),
  sunatMensaje: text('sunat_mensaje'),

  anuladaPorId: uuid('anulada_por_id'),
  emitidaPor: uuid('emitida_por').notNull(),
  fechaEmisionSunat: timestamptz('fecha_emision_sunat'),
  fechaAnulacion: timestamptz('fecha_anulacion'),

  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
});

export const lineasFactura = pgTable('lineas_factura', {
  id: uuid('id').primaryKey().defaultRandom(),
  facturaId: uuid('factura_id')
    .notNull()
    .references(() => facturas.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),

  productoId: uuid('producto_id').references(() => productos.id),
  skuSnapshot: text('sku_snapshot').notNull(),
  descripcion: text('descripcion').notNull(),

  cantidad: numeric('cantidad', { precision: 14, scale: 4 }).notNull(),
  unidadMedida: text('unidad_medida').notNull().default('NIU'),

  valorUnitario: numeric('valor_unitario', { precision: 14, scale: 4 }).notNull(),
  precioUnitario: numeric('precio_unitario', { precision: 14, scale: 4 }).notNull(),
  tipoAfectacionIgv: text('tipo_afectacion_igv').notNull().default('10'),
  porcentajeIgv: numeric('porcentaje_igv', { precision: 5, scale: 2 }).notNull().default('18.00'),

  totalBaseIgv: numeric('total_base_igv', { precision: 14, scale: 4 }).notNull(),
  totalIgv: numeric('total_igv', { precision: 14, scale: 4 }).notNull().default('0'),
  total: numeric('total', { precision: 14, scale: 4 }).notNull(),
  descuento: numeric('descuento', { precision: 14, scale: 4 }).notNull().default('0'),

  orden: integer('orden').notNull().default(0),
});

export type Factura = typeof facturas.$inferSelect;
export type NewFactura = typeof facturas.$inferInsert;
export type LineaFactura = typeof lineasFactura.$inferSelect;
export type NewLineaFactura = typeof lineasFactura.$inferInsert;

export type TipoFactura = '01' | '03';
export type FormaPago = 'contado' | 'credito';
export type EstadoFactura = 'borrador' | 'lista_para_emitir' | 'emitida' | 'anulada';
