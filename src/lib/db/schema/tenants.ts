import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  numeric,
  integer,
  date,
  boolean,
  primaryKey,
} from 'drizzle-orm/pg-core';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  razonSocial: text('razon_social').notNull(),
  ruc: text('ruc').notNull(),
  direccionFiscal: text('direccion_fiscal'),
  ubigeo: text('ubigeo'),
  logoUrl: text('logo_url'),
  colorPrimario: text('color_primario').notNull().default('#0070f3'),
  colorSecundario: text('color_secundario').notNull().default('#7928ca'),
  faviconUrl: text('favicon_url'),
  plan: text('plan').notNull().default('starter'),
  estado: text('estado').notNull().default('activo'),
  configSunat: jsonb('config_sunat'),
  fechaAlta: timestamptz('fecha_alta').notNull().defaultNow(),
  fechaBaja: timestamptz('fecha_baja'),
  createdBy: uuid('created_by'),
  // Datos de contacto del tenant (PDF cotización)
  web: text('web'),
  telefono: text('telefono'),
  contactoEmail: text('contacto_email'),
  // Datos bancarios para pago (PDF cotización)
  bancoNombre: text('banco_nombre'),
  bancoCuenta: text('banco_cuenta'),
  bancoCci: text('banco_cci'),
  bancoDetraccionCuenta: text('banco_detraccion_cuenta'),
  bancoCuentaUsd: text('banco_cuenta_usd'),
  bancoCciUsd: text('banco_cci_usd'),
  comercialNombre: text('comercial_nombre'),
  comercialCargo: text('comercial_cargo'),
  comercialTelefono: text('comercial_telefono'),
});

export const tenantUsageMetrics = pgTable(
  'tenant_usage_metrics',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    periodo: date('periodo').notNull(),
    cotizacionesEmitidas: integer('cotizaciones_emitidas').notNull().default(0),
    facturasEmitidas: integer('facturas_emitidas').notNull().default(0),
    guiasEmitidas: integer('guias_emitidas').notNull().default(0),
    storageMbUsado: numeric('storage_mb_usado', { precision: 10, scale: 2 }).notNull().default('0'),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.periodo] })]
);

export const platformAdmins = pgTable('platform_admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
  email: text('email').notNull(),
  nombre: text('nombre').notNull(),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
});

export const platformAuditLog = pgTable('platform_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id'),
  actorEmail: text('actor_email'),
  accion: text('accion').notNull(),
  entidad: text('entidad').notNull(),
  entidadId: text('entidad_id'),
  payload: jsonb('payload'),
  ip: text('ip'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
});

export const tenantMembers = pgTable('tenant_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  rol: text('rol').notNull().default('comercial'),
  estado: text('estado').notNull().default('activo'),
  invitadoPor: uuid('invitado_por'),
  invitedAt: timestamptz('invited_at').notNull().defaultNow(),
  joinedAt: timestamptz('joined_at'),
  ultimoLoginAt: timestamptz('ultimo_login_at'),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type TenantMember = typeof tenantMembers.$inferSelect;
export type NewTenantMember = typeof tenantMembers.$inferInsert;
export type PlatformAdmin = typeof platformAdmins.$inferSelect;
export type PlatformAuditLog = typeof platformAuditLog.$inferSelect;
