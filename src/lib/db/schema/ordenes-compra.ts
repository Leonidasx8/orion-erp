import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  date,
  boolean,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { clientes } from './clientes';
import { cotizaciones } from './cotizaciones';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const ordenesCompra = pgTable('ordenes_compra', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),

  numero: text('numero').notNull(),

  proveedorId: uuid('proveedor_id')
    .notNull()
    .references(() => clientes.id),

  cotizacionOrigenId: uuid('cotizacion_origen_id').references(() => cotizaciones.id),

  estado: text('estado').notNull().default('borrador'),

  fechaEmision: date('fecha_emision').notNull(),
  fechaEntregaEsperada: date('fecha_entrega_esperada'),

  moneda: text('moneda').notNull().default('USD'),
  tipoCambio: numeric('tipo_cambio', { precision: 10, scale: 4 }),

  subtotal: numeric('subtotal', { precision: 14, scale: 4 }).notNull().default('0'),
  igv: numeric('igv', { precision: 14, scale: 4 }).notNull().default('0'),
  total: numeric('total', { precision: 14, scale: 4 }).notNull().default('0'),

  terminosPago: text('terminos_pago'),
  direccionEntrega: text('direccion_entrega'),
  observaciones: text('observaciones'),
  pdfUrl: text('pdf_url'),

  compradorId: uuid('comprador_id'),

  fechaEnvio: timestamptz('fecha_envio'),
  fechaAprobacion: timestamptz('fecha_aprobacion'),
  fechaRecepcionCompleta: timestamptz('fecha_recepcion_completa'),

  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
});

export const lineasOrdenCompra = pgTable('lineas_orden_compra', {
  id: uuid('id').primaryKey().defaultRandom(),
  ordenId: uuid('orden_id')
    .notNull()
    .references(() => ordenesCompra.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),

  productoId: uuid('producto_id'),
  skuSnapshot: text('sku_snapshot').notNull(),
  descripcion: text('descripcion').notNull(),

  cantidad: numeric('cantidad', { precision: 14, scale: 4 }).notNull(),
  cantidadRecibida: numeric('cantidad_recibida', { precision: 14, scale: 4 })
    .notNull()
    .default('0'),
  precioUnitario: numeric('precio_unitario', { precision: 14, scale: 4 }).notNull(),
  afectaIgv: boolean('afecta_igv').notNull().default(true),

  subtotal: numeric('subtotal', { precision: 14, scale: 4 }).notNull(),
  igv: numeric('igv', { precision: 14, scale: 4 }).notNull().default('0'),
  total: numeric('total', { precision: 14, scale: 4 }).notNull(),

  orden: integer('orden').notNull().default(0),
});

export type OrdenCompra = typeof ordenesCompra.$inferSelect;
export type NewOrdenCompra = typeof ordenesCompra.$inferInsert;
export type LineaOrdenCompra = typeof lineasOrdenCompra.$inferSelect;
export type NewLineaOrdenCompra = typeof lineasOrdenCompra.$inferInsert;

export type EstadoOrdenCompra =
  | 'borrador'
  | 'enviada'
  | 'aprobada'
  | 'recibida_parcial'
  | 'recibida_total'
  | 'cerrada';
