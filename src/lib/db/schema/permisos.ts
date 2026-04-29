import { pgTable, text, boolean } from 'drizzle-orm/pg-core';

export const permisosDefinidos = pgTable('permisos_definidos', {
  codigo: text('codigo').primaryKey(),
  modulo: text('modulo').notNull(),
  accion: text('accion').notNull(),
  descripcion: text('descripcion').notNull(),
  esSensible: boolean('es_sensible').notNull().default(false),
});

export type PermisoDefinido = typeof permisosDefinidos.$inferSelect;
