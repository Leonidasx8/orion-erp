import { pgTable, bigserial, uuid, text, timestamp, numeric, boolean } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { productos } from './productos';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const kardexMovimientos = pgTable('kardex_movimientos', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  productoId: uuid('producto_id')
    .notNull()
    .references(() => productos.id, { onDelete: 'restrict' }),

  fecha: timestamptz('fecha').notNull().defaultNow(),

  tipo: text('tipo').notNull(),
  origenTipo: text('origen_tipo').notNull(),
  origenId: uuid('origen_id'),

  cantidad: numeric('cantidad', { precision: 14, scale: 4 }).notNull(),
  costoUnitario: numeric('costo_unitario', { precision: 14, scale: 4 }),

  saldoPost: numeric('saldo_post', { precision: 14, scale: 4 }).notNull(),
  costoPromedioPost: numeric('costo_promedio_post', { precision: 14, scale: 4 }).notNull(),

  observacion: text('observacion'),
  userId: uuid('user_id'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
});

export const costosInventario = pgTable('costos_inventario', {
  productoId: uuid('producto_id')
    .primaryKey()
    .references(() => productos.id, { onDelete: 'cascade' }),
  cantidadActual: numeric('cantidad_actual', { precision: 14, scale: 4 }).notNull().default('0'),
  costoPromedio: numeric('costo_promedio', { precision: 14, scale: 4 }).notNull().default('0'),
  permiteStockNegativo: boolean('permite_stock_negativo').notNull().default(false),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
});

export type KardexMovimiento = typeof kardexMovimientos.$inferSelect;
export type NewKardexMovimiento = typeof kardexMovimientos.$inferInsert;
export type CostoInventario = typeof costosInventario.$inferSelect;

export type TipoMovimientoKardex = 'entrada' | 'salida' | 'ajuste_pos' | 'ajuste_neg';
export type OrigenMovimientoKardex = 'orden_compra' | 'factura' | 'guia' | 'manual' | 'anulacion';
