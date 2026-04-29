import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { clientes } from './clientes';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const contactosCliente = pgTable('contactos_cliente', {
  id: uuid('id').primaryKey().defaultRandom(),
  clienteId: uuid('cliente_id')
    .notNull()
    .references(() => clientes.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  cargo: text('cargo'),
  email: text('email'),
  telefono: text('telefono'),
  esPrincipal: boolean('es_principal').notNull().default(false),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
});

export type ContactoCliente = typeof contactosCliente.$inferSelect;
export type NewContactoCliente = typeof contactosCliente.$inferInsert;
