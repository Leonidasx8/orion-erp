import { pgTable, bigserial, uuid, text, jsonb, timestamp, inet } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const auditPermisos = pgTable('audit_permisos', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  userId: uuid('user_id'),
  accion: text('accion').notNull(),
  rolId: uuid('rol_id'),
  permisoCodigo: text('permiso_codigo'),
  detalles: jsonb('detalles'),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
});

export type AuditPermiso = typeof auditPermisos.$inferSelect;
