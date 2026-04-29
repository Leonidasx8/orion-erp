import { pgTable, uuid, text, bigint, boolean } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const seriesDocumentos = pgTable('series_documentos', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  tipoDocumento: text('tipo_documento').notNull(),
  serie: text('serie').notNull(),
  correlativoActual: bigint('correlativo_actual', { mode: 'number' }).notNull().default(0),
  activa: boolean('activa').notNull().default(true),
});

export type SerieDocumento = typeof seriesDocumentos.$inferSelect;
export type NewSerieDocumento = typeof seriesDocumentos.$inferInsert;
