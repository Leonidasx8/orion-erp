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
import { facturas } from './facturas';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const notasCreditoDebito = pgTable('notas_credito_debito', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),

  tipoDocumento: text('tipo_documento').notNull(), // '07' NC | '08' ND
  serie: text('serie').notNull(),
  numero: bigint('numero', { mode: 'number' }).notNull(),
  numeroCompleto: text('numero_completo'),

  fechaEmision: date('fecha_emision').notNull(),

  documentoOrigenTipo: text('documento_origen_tipo').notNull(),
  documentoOrigenSerie: text('documento_origen_serie').notNull(),
  documentoOrigenNumero: bigint('documento_origen_numero', { mode: 'number' }).notNull(),
  documentoOrigenId: uuid('documento_origen_id').references(() => facturas.id),

  tipoMotivo: text('tipo_motivo').notNull(),
  descripcionMotivo: text('descripcion_motivo').notNull(),

  clienteId: uuid('cliente_id')
    .notNull()
    .references(() => clientes.id),
  clienteTipoDocSnapshot: text('cliente_tipo_doc_snapshot').notNull(),
  clienteNumeroDocSnapshot: text('cliente_numero_doc_snapshot').notNull(),
  clienteRazonSocialSnapshot: text('cliente_razon_social_snapshot').notNull(),

  moneda: text('moneda').notNull(),
  tipoCambio: numeric('tipo_cambio', { precision: 10, scale: 4 }),

  totalGravadas: numeric('total_gravadas', { precision: 14, scale: 4 }).notNull().default('0'),
  totalExoneradas: numeric('total_exoneradas', { precision: 14, scale: 4 }).notNull().default('0'),
  totalInafectas: numeric('total_inafectas', { precision: 14, scale: 4 }).notNull().default('0'),
  igv: numeric('igv', { precision: 14, scale: 4 }).notNull().default('0'),
  total: numeric('total', { precision: 14, scale: 4 }).notNull().default('0'),

  estado: text('estado').notNull().default('borrador'),
  estadoSunat: text('estado_sunat').notNull().default('sin_enviar'),
  cdrUrl: text('cdr_url'),
  xmlUrl: text('xml_url'),
  pdfUrl: text('pdf_url'),
  nubefactResponse: jsonb('nubefact_response'),
  sunatCodigo: integer('sunat_codigo'),
  sunatMensaje: text('sunat_mensaje'),

  emitidaPor: uuid('emitida_por').notNull(),
  fechaEmisionSunat: timestamptz('fecha_emision_sunat'),

  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
});

export const lineasNcNd = pgTable('lineas_nc_nd', {
  id: uuid('id').primaryKey().defaultRandom(),
  ncNdId: uuid('nc_nd_id')
    .notNull()
    .references(() => notasCreditoDebito.id, { onDelete: 'cascade' }),
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

  orden: integer('orden').notNull().default(0),
});

export type NotaCreditoDebito = typeof notasCreditoDebito.$inferSelect;
export type NewNotaCreditoDebito = typeof notasCreditoDebito.$inferInsert;
export type LineaNcNd = typeof lineasNcNd.$inferSelect;
export type NewLineaNcNd = typeof lineasNcNd.$inferInsert;

export type TipoNota = '07' | '08'; // '07' NC | '08' ND
