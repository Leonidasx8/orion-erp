import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { roles, rolPermisos, permisosDefinidos } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { PermissionsMatrix } from '@/components/modules/admin/PermissionsMatrix';

export default async function RolesPage({ params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;
  await requirePermission('admin.roles.ver');
  const tenant = await getCurrentTenant();

  const tenantRoles = await db.select().from(roles).where(eq(roles.tenantId, tenant.id));
  const allPermisos = await db.select().from(permisosDefinidos);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Roles y permisos</h1>
        <Button asChild variant="outline">
          <Link href={`/${companySlug}/admin/roles/nuevo`}>+ Crear rol</Link>
        </Button>
      </div>

      {tenantRoles.map(async (rol) => {
        const perms = await db
          .select({ codigo: rolPermisos.permisoCodigo })
          .from(rolPermisos)
          .where(eq(rolPermisos.rolId, rol.id));

        const readOnly = rol.nombre === 'Superadmin' && rol.esPredefinido;

        return (
          <div key={rol.id} className="rounded-lg border p-5">
            <div className="mb-4">
              <p className="font-semibold">{rol.nombre}</p>
              {rol.descripcion && (
                <p className="text-sm text-muted-foreground">{rol.descripcion}</p>
              )}
              {readOnly && <p className="text-xs italic text-muted-foreground">Solo lectura</p>}
            </div>
            <PermissionsMatrix
              permisosDef={allPermisos}
              rol={rol}
              permisosActuales={perms.map((p) => p.codigo)}
              readOnly={readOnly}
            />
          </div>
        );
      })}

      {tenantRoles.length === 0 && (
        <p className="text-sm text-muted-foreground">Sin roles configurados.</p>
      )}
    </div>
  );
}
