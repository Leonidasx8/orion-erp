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

  updatedBy: uuid('updated_by'),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
});

export type CreditoCliente = typeof creditosCliente.$inferSelect;
export type NewCreditoCliente = typeof creditosCliente.$inferInsert;
