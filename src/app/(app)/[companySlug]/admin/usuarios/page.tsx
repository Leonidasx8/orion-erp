import Link from 'next/link';
import { and, eq } from 'drizzle-orm';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { tenantMembers } from '@/lib/db/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default async function UsuariosPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  await requirePermission('admin.usuarios.ver');
  const tenant = await getCurrentTenant();

  const members = await db
    .select()
    .from(tenantMembers)
    .where(and(eq(tenantMembers.tenantId, tenant.id)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <Button asChild>
          <Link href={`/${companySlug}/admin/usuarios/invitar`}>Invitar usuario</Link>
        </Button>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-left text-xs font-medium text-muted-foreground">
              <th className="px-4 py-2">Usuario ID</th>
              <th className="px-4 py-2">Rol</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Invitado</th>
              <th className="px-4 py-2">Último login</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-muted/20">
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                  {m.userId.slice(0, 8)}…
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant="secondary">{m.rol}</Badge>
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant={m.estado === 'activo' ? 'default' : 'outline'}>{m.estado}</Badge>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {m.invitedAt.toISOString().slice(0, 10)}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {m.ultimoLoginAt?.toISOString().slice(0, 10) ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Sin usuarios.</p>
        )}
      </div>
    </div>
  );
}
