import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const validacionesDocumento = pgTable('validaciones_documento', {
  id: uuid('id').primaryKey().defaultRandom(),
  tipoDocumento: text('tipo_documento').notNull(),
  numero: text('numero').notNull(),
  resultado: jsonb('resultado').notNull(),
  consultadoAt: timestamptz('consultado_at').notNull().defaultNow(),
});
