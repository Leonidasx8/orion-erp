import { pgTable, uuid, text, timestamp, boolean, numeric } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const clientes = pgTable('clientes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),

  tipoDocumento: text('tipo_documento').notNull(),
  numeroDocumento: text('numero_documento').notNull(),
  tipoPersona: text('tipo_persona').notNull().default('natural'),

  razonSocial: text('razon_social'),
  nombres: text('nombres'),
  apellidoPaterno: text('apellido_paterno'),
  apellidoMaterno: text('apellido_materno'),
  // nombre_display is GENERATED ALWAYS — not mapped to Drizzle insert

  email: text('email'),
  telefono: text('telefono'),

  nombreComercial: text('nombre_comercial'),
  lineaCredito: numeric('linea_credito', { precision: 14, scale: 2 }).notNull().default('0'),
  plazoCredito: text('plazo_credito').notNull().default('contado'),
  lineaCreditoPen: numeric('linea_credito_pen', { precision: 14, scale: 2 }).notNull().default('0'),
  plazoCreditoPen: text('plazo_credito_pen').notNull().default('contado'),
  listaPrecio: text('lista_precio').notNull().default('default'),
  comercialId: uuid('comercial_id'),

  condicionSunat: text('condicion_sunat'),
  estadoSunat: text('estado_sunat'),
  ubigeoSunat: text('ubigeo_sunat'),
  direccionSunat: text('direccion_sunat'),

  canalCaptacion: text('canal_captacion'),
  notas: text('notas'),
  tags: text('tags').array().notNull().default([]),

  esProveedor: boolean('es_proveedor').notNull().default(false),
  esCliente: boolean('es_cliente').notNull().default(true),

  estado: text('estado').notNull().default('activo'),

  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  createdBy: uuid('created_by'),
  // search_vector is GENERATED ALWAYS in postgres; referenced via sql`` in queries
});

export type Cliente = typeof clientes.$inferSelect;
export type NewCliente = typeof clientes.$inferInsert;
