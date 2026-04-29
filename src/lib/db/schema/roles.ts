import { pgTable, uuid, text, timestamp, boolean, primaryKey } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  esPredefinido: boolean('es_predefinido').notNull().default(false),
  descripcion: text('descripcion'),
  createdBy: uuid('created_by'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
});

export const rolPermisos = pgTable(
  'rol_permisos',
  {
    rolId: uuid('rol_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permisoCodigo: text('permiso_codigo').notNull(),
  },
  (t) => [primaryKey({ columns: [t.rolId, t.permisoCodigo] })]
);

export type Rol = typeof roles.$inferSelect;
export type NewRol = typeof roles.$inferInsert;
