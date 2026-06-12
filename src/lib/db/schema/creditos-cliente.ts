import { pgTable, uuid, text, timestamp, numeric, integer, boolean } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { clientes } from './clientes';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const creditosCliente = pgTable('creditos_cliente', {
  clienteId: uuid('cliente_id')
    .primaryKey()
    .references(() => clientes.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),

  lineaCredito: numeric('linea_credito', { precision: 14, scale: 4 }).notNull().default('0'),
  moneda: text('moneda').notNull().default('PEN'),
  plazoDias: integer('plazo_dias').notNull().default(0),

  bloqueado: boolean('bloqueado').notNull().default(false),
  motivoBloqueo: text('motivo_bloqueo'),
  bloqueadoPor: uuid('bloqueado_por'),
  bloqueadoAt: timestamptz('bloqueado_at'),

  lineaCreditoPen: numeric('linea_credito_pen', { precision: 14, scale: 4 }).notNull().default('0'),
  plazoDiasPen: integer('plazo_dias_pen').notNull().default(0),
  bloqueadoPen: boolean('bloqueado_pen').notNull().default(false),
  motivoBloqueopPen: text('motivo_bloqueo_pen'),
  bloqueadoPenPor: uuid('bloqueado_pen_por'),
  bloqueadoPenAt: timestamptz('bloqueado_pen_at'),

  updatedBy: uuid('updated_by'),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type CreditoCliente = typeof creditosCliente.$inferSelect;
export type NewCreditoCliente = typeof creditosCliente.$inferInsert;
