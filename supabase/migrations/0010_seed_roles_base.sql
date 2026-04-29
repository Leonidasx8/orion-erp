-- Función que siembra los 3 roles base + permisos al crear un tenant.
-- Se invoca desde el Server Action crearTenant (B.0) dentro de la transacción.
CREATE OR REPLACE FUNCTION seed_roles_base_para_tenant(p_tenant_id uuid, p_creator uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  rol_super       uuid;
  rol_comercial   uuid;
  rol_facturacion uuid;
BEGIN
  -- Superadmin: todos los permisos del tenant (excluye gestión de otros tenants)
  INSERT INTO roles (tenant_id, nombre, es_predefinido, descripcion, created_by)
  VALUES (p_tenant_id, 'Superadmin', true, 'Acceso total al tenant', p_creator)
  RETURNING id INTO rol_super;

  INSERT INTO rol_permisos (rol_id, permiso_codigo)
  SELECT rol_super, codigo FROM permisos_definidos
  WHERE modulo != 'tenants';

  -- Comercial: vendedores
  INSERT INTO roles (tenant_id, nombre, es_predefinido, descripcion, created_by)
  VALUES (p_tenant_id, 'Comercial', true, 'Vendedores: cotizaciones y clientes', p_creator)
  RETURNING id INTO rol_comercial;

  INSERT INTO rol_permisos (rol_id, permiso_codigo) VALUES
    (rol_comercial, 'clientes.ver'),
    (rol_comercial, 'clientes.crear'),
    (rol_comercial, 'clientes.editar'),
    (rol_comercial, 'clientes.exportar'),
    (rol_comercial, 'productos.ver'),
    (rol_comercial, 'productos.importar'),
    (rol_comercial, 'cotizaciones.ver'),
    (rol_comercial, 'cotizaciones.crear'),
    (rol_comercial, 'cotizaciones.editar'),
    (rol_comercial, 'ordenes.ver'),
    (rol_comercial, 'inventario.ver'),
    (rol_comercial, 'reportes.ver');

  -- Facturación: SUNAT y CxC
  INSERT INTO roles (tenant_id, nombre, es_predefinido, descripcion, created_by)
  VALUES (p_tenant_id, 'Facturación', true, 'Emisión SUNAT y CxC', p_creator)
  RETURNING id INTO rol_facturacion;

  INSERT INTO rol_permisos (rol_id, permiso_codigo) VALUES
    (rol_facturacion, 'clientes.ver'),
    (rol_facturacion, 'productos.ver'),
    (rol_facturacion, 'productos.ver_costo'),
    (rol_facturacion, 'cotizaciones.ver'),
    (rol_facturacion, 'cotizaciones.aprobar'),
    (rol_facturacion, 'facturas.ver'),
    (rol_facturacion, 'facturas.emitir'),
    (rol_facturacion, 'facturas.anular'),
    (rol_facturacion, 'facturas.reenviar_sunat'),
    (rol_facturacion, 'guias.ver'),
    (rol_facturacion, 'guias.crear'),
    (rol_facturacion, 'guias.anular'),
    (rol_facturacion, 'credito.ver'),
    (rol_facturacion, 'credito.otorgar'),
    (rol_facturacion, 'credito.registrar_pago'),
    (rol_facturacion, 'inventario.ver'),
    (rol_facturacion, 'inventario.ajuste_manual'),
    (rol_facturacion, 'reportes.ver'),
    (rol_facturacion, 'reportes.exportar');
END;
$$;

GRANT EXECUTE ON FUNCTION seed_roles_base_para_tenant(uuid, uuid) TO service_role;
