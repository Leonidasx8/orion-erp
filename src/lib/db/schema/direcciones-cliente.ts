import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { clientes } from './clientes';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const direccionesCliente = pgTable('direcciones_cliente', {
  id: uuid('id').primaryKey().defaultRandom(),
  clienteId: uuid('cliente_id')
    .notNull()
    .references(() => clientes.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  tipo: text('tipo').notNull().default('fiscal'),
  esPrincipal: boolean('es_principal').notNull().default(false),
  alias: text('alias'),
  direccion: text('direccion').notNull(),
  distrito: text('distrito'),
  provincia: text('provincia'),
  departamento: text('departamento'),
  ubigeo: text('ubigeo'),
  referencia: text('referencia'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
});

export type DireccionCliente = typeof direccionesCliente.$inferSelect;
export type NewDireccionCliente = typeof direccionesCliente.$inferInsert;
