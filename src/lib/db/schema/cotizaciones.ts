import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  bigint,
  date,
  boolean,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { clientes } from './clientes';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const cotizaciones = pgTable('cotizaciones', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),

  numeroCorrelativo: bigint('numero_correlativo', { mode: 'number' }).notNull(),
  // numero_completo es GENERATED ALWAYS — referenciamos por sql`` cuando hace falta
  // pero Drizzle puede leerlo si lo declaramos como columna read-only:
  numeroCompleto: text('numero_completo'),

  clienteId: uuid('cliente_id')
    .notNull()
    .references(() => clientes.id),

  moneda: text('moneda').notNull().default('PEN'),
  tipoCambio: numeric('tipo_cambio', { precision: 10, scale: 4 }),

  fechaEmision: date('fecha_emision').notNull(),
  fechaVencimiento: date('fecha_vencimiento').notNull(),

  estado: text('estado').notNull().default('borrador'),

  subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull().default('0'),
  totalDescuentos: numeric('total_descuentos', { precision: 14, scale: 2 }).notNull().default('0'),
  descuentoGlobal: numeric('descuento_global', { precision: 14, scale: 2 }).notNull().default('0'),
  baseImponible: numeric('base_imponible', { precision: 14, scale: 2 }).notNull().default('0'),
  igv: numeric('igv', { precision: 14, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 14, scale: 2 }).notNull().default('0'),

  notas: text('notas'),
  terminosCondiciones: text('terminos_condiciones'),

  enviadaAt: timestamptz('enviada_at'),
  aceptadaAt: timestamptz('aceptada_at'),
  rechazadaAt: timestamptz('rechazada_at'),
  motivoRechazo: text('motivo_rechazo'),

  ordenCompraId: uuid('orden_compra_id'),
  facturaId: uuid('factura_id'),

  creadoPor: uuid('creado_por').notNull(),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
});

export const cotizacionItems = pgTable('cotizacion_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  cotizacionId: uuid('cotizacion_id')
    .notNull()
    .references(() => cotizaciones.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),

  orden: integer('orden').notNull(),

  productoId: uuid('producto_id'),
  codigo: text('codigo'),
  descripcion: text('descripcion').notNull(),
  unidadMedida: text('unidad_medida').notNull().default('NIU'),

  cantidad: numeric('cantidad', { precision: 14, scale: 4 }).notNull(),
  precioUnitario: numeric('precio_unitario', { precision: 14, scale: 4 }).notNull(),
  descuentoPorcentaje: numeric('descuento_porcentaje', { precision: 5, scale: 2 })
    .notNull()
    .default('0'),
  descuentoMonto: numeric('descuento_monto', { precision: 14, scale: 2 }).notNull().default('0'),
  afectaIgv: boolean('afecta_igv').notNull().default(true),

  subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull(),
  igv: numeric('igv', { precision: 14, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 14, scale: 2 }).notNull(),

  createdAt: timestamptz('created_at').notNull().defaultNow(),
});

export const cotizacionesVersiones = pgTable('cotizaciones_versiones', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  cotizacionId: uuid('cotizacion_id')
    .notNull()
    .references(() => cotizaciones.id, { onDelete: 'cascade' }),

  version: integer('version').notNull(),

  tipoEvento: text('tipo_evento').notNull(),

  datos: jsonb('datos').notNull(),

  creadoPor: uuid('creado_por').notNull(),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
});

export type Cotizacion = typeof cotizaciones.$inferSelect;
export type NewCotizacion = typeof cotizaciones.$inferInsert;
export type CotizacionItem = typeof cotizacionItems.$inferSelect;
export type NewCotizacionItem = typeof cotizacionItems.$inferInsert;
export type CotizacionVersion = typeof cotizacionesVersiones.$inferSelect;
export type NewCotizacionVersion = typeof cotizacionesVersiones.$inferInsert;
export type TipoEventoVersion = 'pre_edicion' | 'pdf_generado' | 'envio';

export type EstadoCotizacion = 'borrador' | 'enviada' | 'aceptada' | 'rechazada' | 'vencida';
