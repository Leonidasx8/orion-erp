import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  bigint,
  date,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { clientes } from './clientes';
import { productos } from './productos';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const transportistas = pgTable('transportistas', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  ruc: text('ruc').notNull(),
  razonSocial: text('razon_social').notNull(),
  nombreComercial: text('nombre_comercial'),
  numeroMtc: text('numero_mtc'),
  estado: text('estado').notNull().default('activo'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
});

export const vehiculosTransporte = pgTable('vehiculos_transporte', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  transportistaId: uuid('transportista_id').references(() => transportistas.id, {
    onDelete: 'set null',
  }),
  placa: text('placa').notNull(),
  marca: text('marca'),
  modelo: text('modelo'),
  capacidadKg: numeric('capacidad_kg', { precision: 14, scale: 2 }),
  configuracionVehicular: text('configuracion_vehicular'),
  estado: text('estado').notNull().default('activo'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
});

export const guiasRemision = pgTable('guias_remision', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),

  tipoDocumento: text('tipo_documento').notNull(),
  serie: text('serie').notNull(),
  numero: bigint('numero', { mode: 'number' }).notNull(),
  numeroCompleto: text('numero_completo'),

  fechaEmision: date('fecha_emision').notNull(),
  fechaInicioTraslado: date('fecha_inicio_traslado').notNull(),

  remitenteId: uuid('remitente_id').references(() => clientes.id),
  destinatarioId: uuid('destinatario_id').references(() => clientes.id),
  transportistaId: uuid('transportista_id').references(() => transportistas.id),
  vehiculoId: uuid('vehiculo_id').references(() => vehiculosTransporte.id),

  motivoTraslado: text('motivo_traslado').notNull(),
  descripcionMotivo: text('descripcion_motivo'),
  modalidadTraslado: text('modalidad_traslado').notNull(),

  pesoBrutoTotal: numeric('peso_bruto_total', { precision: 14, scale: 2 }),
  unidadPeso: text('unidad_peso').default('KGM'),
  numeroBultos: integer('numero_bultos'),

  direccionPartida: text('direccion_partida').notNull(),
  ubigeoPartida: text('ubigeo_partida').notNull(),
  direccionLlegada: text('direccion_llegada').notNull(),
  ubigeoLlegada: text('ubigeo_llegada').notNull(),

  estado: text('estado').notNull().default('borrador'),
  estadoSunat: text('estado_sunat').notNull().default('sin_enviar'),

  cdrUrl: text('cdr_url'),
  xmlUrl: text('xml_url'),
  pdfUrl: text('pdf_url'),
  nubefactResponse: jsonb('nubefact_response'),
  sunatCodigo: integer('sunat_codigo'),
  sunatMensaje: text('sunat_mensaje'),

  destinatarioRazonSocialSnapshot: text('destinatario_razon_social_snapshot'),
  destinatarioNumDocSnapshot: text('destinatario_num_doc_snapshot'),
  destinatarioTipoDocSnapshot: text('destinatario_tipo_doc_snapshot'),
  transportistaRucSnapshot: text('transportista_ruc_snapshot'),
  transportistaNombreSnapshot: text('transportista_nombre_snapshot'),
  vehiculoPlacaSnapshot: text('vehiculo_placa_snapshot'),

  facturaRelacionadaId: uuid('factura_relacionada_id'),
  cotizacionId: uuid('cotizacion_id'),
  observaciones: text('observaciones'),
  creadoPor: uuid('creado_por').notNull(),
  fechaEmisionSunat: timestamptz('fecha_emision_sunat'),
  fechaAnulacion: timestamptz('fecha_anulacion'),

  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
});

export const lineasGuia = pgTable('lineas_guia', {
  id: uuid('id').primaryKey().defaultRandom(),
  guiaId: uuid('guia_id')
    .notNull()
    .references(() => guiasRemision.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  productoId: uuid('producto_id').references(() => productos.id),
  skuSnapshot: text('sku_snapshot').notNull(),
  descripcion: text('descripcion').notNull(),
  cantidad: numeric('cantidad', { precision: 14, scale: 4 }).notNull(),
  unidadMedida: text('unidad_medida').notNull().default('NIU'),
  orden: integer('orden').notNull().default(0),
});

export type Transportista = typeof transportistas.$inferSelect;
export type NewTransportista = typeof transportistas.$inferInsert;
export type VehiculoTransporte = typeof vehiculosTransporte.$inferSelect;
export type NewVehiculoTransporte = typeof vehiculosTransporte.$inferInsert;
export type GuiaRemision = typeof guiasRemision.$inferSelect;
export type NewGuiaRemision = typeof guiasRemision.$inferInsert;
export type LineaGuia = typeof lineasGuia.$inferSelect;
export type NewLineaGuia = typeof lineasGuia.$inferInsert;

export type EstadoGuia = 'borrador' | 'lista_para_emitir' | 'emitida' | 'anulada';
export type EstadoSunat =
  | 'sin_enviar'
  | 'pendiente'
  | 'aceptada'
  | 'rechazada'
  | 'error_red'
  | 'anulada';
export type TipoGuia = '09' | '31'; // '09' remitente, '31' transportista
