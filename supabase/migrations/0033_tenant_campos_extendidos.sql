-- 0033_tenant_campos_extendidos.sql
-- Agrega campos bancarios USD y datos del representante comercial al tenant

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS banco_cuenta_usd      text,
  ADD COLUMN IF NOT EXISTS banco_cci_usd         text,
  ADD COLUMN IF NOT EXISTS comercial_nombre      text,
  ADD COLUMN IF NOT EXISTS comercial_cargo       text,
  ADD COLUMN IF NOT EXISTS comercial_telefono    text;
