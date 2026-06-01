import { pgTable, uuid, text, timestamp, numeric, date } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { facturas } from './facturas';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export type MetodoPago = 'efectivo' | 'transferencia' | 'deposito' | 'cheque' | 'tarjeta' | 'otro';

export const pagos = pgTable('pagos', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  facturaId: uuid('factura_id')
    .notNull()
    .references(() => facturas.id, { onDelete: 'restrict' }),

  monto: numeric('monto', { precision: 14, scale: 4 }).notNull(),
  moneda: text('moneda').notNull(),
  tipoCambioAplicado: numeric('tipo_cambio_aplicado', { precision: 10, scale: 4 }),

  fechaPago: date('fecha_pago')
    .notNull()
    .default(sql`current_date`),
  metodo: text('metodo').notNull().$type<MetodoPago>(),
  referencia: text('referencia'),
  observaciones: text('observaciones'),

  registradoPor: uuid('registrado_por'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
});

export type Pago = typeof pagos.$inferSelect;
export type NewPago = typeof pagos.$inferInsert;
