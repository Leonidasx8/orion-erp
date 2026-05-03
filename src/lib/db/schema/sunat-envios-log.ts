import { pgTable, bigserial, uuid, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const sunatEnviosLog = pgTable('sunat_envios_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),

  documentoTipo: text('documento_tipo').notNull(),
  documentoId: uuid('documento_id').notNull(),

  intento: integer('intento').notNull(),
  resultado: text('resultado').notNull(),

  sunatCodigo: integer('sunat_codigo'),
  sunatMensaje: text('sunat_mensaje'),
  requestPayload: jsonb('request_payload'),
  responsePayload: jsonb('response_payload'),

  ejecutadoAt: timestamptz('ejecutado_at').notNull().defaultNow(),
  duracionMs: integer('duracion_ms'),
});

export type SunatEnvioLog = typeof sunatEnviosLog.$inferSelect;
export type NewSunatEnvioLog = typeof sunatEnviosLog.$inferInsert;

export type ResultadoEnvioSunat =
  | 'ok'
  | 'error_red'
  | 'error_sunat'
  | 'error_validacion'
  | 'idempotency_skip';

export type DocumentoSunatTipo = 'guia_remision' | 'factura' | 'nota_credito_debito';
