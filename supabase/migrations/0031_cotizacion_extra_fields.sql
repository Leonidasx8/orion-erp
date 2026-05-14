-- Campos adicionales para mejorar tasa de aceptación de cotizaciones B2B Perú.

-- ─── Tenant ────────────────────────────────────────────────────────────────
alter table public.tenants
  add column if not exists web text,
  add column if not exists telefono text,
  add column if not exists contacto_email text,
  add column if not exists banco_nombre text,
  add column if not exists banco_cuenta text,
  add column if not exists banco_cci text,
  add column if not exists banco_detraccion_cuenta text;

-- ─── Cotización ────────────────────────────────────────────────────────────
alter table public.cotizaciones
  add column if not exists forma_pago text,
  add column if not exists tiempo_entrega text,
  add column if not exists lugar_entrega text,
  add column if not exists incluye_igv boolean not null default true,
  add column if not exists contacto_cliente_nombre text,
  add column if not exists contacto_cliente_cargo text,
  add column if not exists contacto_cliente_email text;

-- Comentarios
comment on column public.cotizaciones.forma_pago is 'ej: "Contado", "50% adelanto / 50% a 30 días", "Crédito 60 días"';
comment on column public.cotizaciones.tiempo_entrega is 'ej: "10 días hábiles desde confirmación"';
comment on column public.cotizaciones.lugar_entrega is 'ej: "Almacén del cliente, Lima"';
comment on column public.tenants.banco_cci is 'Código de Cuenta Interbancario (20 dígitos)';
comment on column public.tenants.banco_detraccion_cuenta is 'Cuenta de detracciones SUNAT en BN';
