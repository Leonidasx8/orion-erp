import { db } from '@/lib/db/client';
import { tenantMembers, tenants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const metadata = { title: 'Usuarios globales — Orión ERP' };

const ROL_LABEL: Record<string, string> = {
  superadmin: 'Superadmin',
  comercial: 'Comercial',
  facturacion: 'Facturación',
  bodega: 'Bodega',
};

export default async function UsuariosGlobalesPage() {
  const members = await db
    .select({
      userId: tenantMembers.userId,
      rol: tenantMembers.rol,
      estado: tenantMembers.estado,
      tenantSlug: tenants.slug,
      tenantNombre: tenants.razonSocial,
    })
    .from(tenantMembers)
    .innerJoin(tenants, eq(tenants.id, tenantMembers.tenantId))
    .orderBy(tenants.slug);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios globales</h1>
          <p className="text-sm text-muted-foreground">
            {members.length} membresía{members.length !== 1 ? 's' : ''} en la plataforma
          </p>
        </div>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-10 text-center text-muted-foreground">
                  Sin usuarios registrados
                </td>
              </tr>
            ) : (
              members.map((m, i) => (
                <tr key={i} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary text-[11px] font-bold text-white">
                        {m.tenantSlug.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{m.tenantNombre}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          /{m.tenantSlug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                      {ROL_LABEL[m.rol] ?? m.rol}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        m.estado === 'activo'
                          ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${m.estado === 'activo' ? 'bg-green-500' : 'bg-muted-foreground'}`}
                      />
                      {m.estado}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
