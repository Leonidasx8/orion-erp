import { redirect } from 'next/navigation';
import { requirePlatformAdmin, ForbiddenError } from '@/lib/auth/platform-admin';
import { AdminNav } from '@/components/modules/admin/AdminNav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let adminName = 'Leonidas Yauri';

  try {
    const { platformAdmin } = await requirePlatformAdmin();
    adminName = platformAdmin.nombre;
  } catch (e) {
    if (e instanceof ForbiddenError) redirect('/seleccionar-empresa');
    throw e;
  }

  // Derive initials from name (e.g. "Leonidas Yauri" → "LY")
  const initials = adminName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r bg-muted/30">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b px-4 py-4">
          <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
            O
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Sistema Orión</p>
            <p className="text-xs text-muted-foreground">Plataforma</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <AdminNav />
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2.5 border-t px-4 py-3">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium leading-tight">{adminName}</p>
            <p className="truncate text-[10px] text-muted-foreground">Superadmin de plataforma</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
