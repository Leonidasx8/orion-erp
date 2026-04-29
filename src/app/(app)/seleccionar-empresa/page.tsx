import { redirect } from 'next/navigation';
import { eq, and } from 'drizzle-orm';
import { createSSRClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { tenants, tenantMembers } from '@/lib/db/schema';
import { TenantPicker } from '@/components/modules/auth/TenantPicker';

export const metadata = { title: 'Seleccionar empresa — Orion ERP' };

export default async function SeleccionarEmpresaPage() {
  const supabase = await createSSRClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const memberships = await db
    .select({ tenant: tenants, rol: tenantMembers.rol })
    .from(tenantMembers)
    .innerJoin(tenants, eq(tenants.id, tenantMembers.tenantId))
    .where(
      and(
        eq(tenantMembers.userId, user.id),
        eq(tenantMembers.estado, 'activo'),
        eq(tenants.estado, 'activo')
      )
    );

  if (memberships.length === 0) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold">No tienes empresas asignadas</h1>
          <p className="mt-2 text-muted-foreground">
            Contacta al administrador para que te invite.
          </p>
        </div>
      </div>
    );
  }

  if (memberships.length === 1) {
    redirect(`/${memberships[0].tenant.slug}`);
  }

  return <TenantPicker memberships={memberships} />;
}
