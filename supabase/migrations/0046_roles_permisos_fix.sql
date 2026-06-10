-- T5: Ajustar permisos de roles
-- Solo Admin/Superadmin puede aprobar cotizaciones; Facturación no.
DELETE FROM rol_permisos
WHERE permiso_codigo = 'cotizaciones.aprobar'
  AND rol_id IN (
    SELECT id FROM roles WHERE nombre = 'Facturación'
  );
