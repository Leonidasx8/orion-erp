import { pgTable, uuid, text, boolean, timestamp, numeric } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { clientes } from './clientes';

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
  margenMinimo: numeric('margen_minimo', { precision: 5, scale: 2 }),

  controlaStock: boolean('controla_stock').notNull().default(false),
  stockMinimo: numeric('stock_minimo', { precision: 14, scale: 4 }),
  stockActual: numeric('stock_actual', { precision: 14, scale: 4 }).notNull().default('0'),

  codigoSunat: text('codigo_sunat'),
  imagenUrl: text('imagen_url'),
  activo: boolean('activo').notNull().default(true),

  proveedorPrincipalId: uuid('proveedor_principal_id').references(() => clientes.id, {
    onDelete: 'set null',
  }),

  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  createdBy: uuid('created_by'),
  // search_vector GENERATED ALWAYS referenciado via sql`` en queries
});

export const historialPrecios = pgTable('historial_precios', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  productoId: uuid('producto_id')
    .notNull()
    .references(() => productos.id, { onDelete: 'cascade' }),
  precioAnterior: numeric('precio_anterior', { precision: 14, scale: 4 }).notNull(),
  precioNuevo: numeric('precio_nuevo', { precision: 14, scale: 4 }).notNull(),
  costoAnterior: numeric('costo_anterior', { precision: 14, scale: 4 }),
  costoNuevo: numeric('costo_nuevo', { precision: 14, scale: 4 }),
  razon: text('razon'),
  creadoPor: uuid('creado_por'),
  creadoPorNombre: text('creado_por_nombre'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
});

export type UnidadMedida = typeof unidadesMedida.$inferSelect;
export type CategoriaProducto = typeof categoriasProducto.$inferSelect;
export type Producto = typeof productos.$inferSelect;
export type NewProducto = typeof productos.$inferInsert;
export type HistorialPrecio = typeof historialPrecios.$inferSelect;
