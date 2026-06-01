DROP INDEX IF EXISTS pagos_tenant_idx;
DROP INDEX IF EXISTS pagos_fecha_idx;
CREATE INDEX pagos_tenant_factura_idx ON pagos(tenant_id, factura_id);
CREATE INDEX pagos_tenant_fecha_idx ON pagos(tenant_id, fecha_pago DESC);

ALTER POLICY "pagos_tenant" ON pagos RENAME TO "pagos_tenant_isolation";
