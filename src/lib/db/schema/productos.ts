import { pgTable, uuid, text, boolean, timestamp, numeric } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const unidadesMedida = pgTable('unidades_medida', {
  codigo: text('codigo').primaryKey(),
  descripcion: text('descripcion').notNull(),
  simbolo: text('simbolo'),
});

export const categoriasProducto = pgTable('categorias_producto', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  padreId: uuid('padre_id'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
});

export const productos = pgTable('productos', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),

  codigo: text('codigo').notNull(),
  nombre: text('nombre').notNull(),
  descripcion: text('descripcion'),
  tipo: text('tipo').notNull().default('bien'),
  categoriaId: uuid('categoria_id'),
  unidadMedida: text('unidad_medida').notNull().default('NIU'),

  precioUnitario: numeric('precio_unitario', { precision: 14, scale: 4 }).notNull().default('0'),
  tieneIgv: boolean('tiene_igv').notNull().default(true),
  costoUnitario: numeric('costo_unitario', { precision: 14, scale: 4 }),

  controlaStock: boolean('controla_stock').notNull().default(false),
  stockMinimo: numeric('stock_minimo', { precision: 14, scale: 4 }),
  stockActual: numeric('stock_actual', { precision: 14, scale: 4 }).notNull().default('0'),

  codigoSunat: text('codigo_sunat'),
  activo: boolean('activo').notNull().default(true),

  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  createdBy: uuid('created_by'),
  // search_vector GENERATED ALWAYS referenciado via sql`` en queries
});

export type UnidadMedida = typeof unidadesMedida.$inferSelect;
export type CategoriaProducto = typeof categoriasProducto.$inferSelect;
export type Producto = typeof productos.$inferSelect;
export type NewProducto = typeof productos.$inferInsert;
