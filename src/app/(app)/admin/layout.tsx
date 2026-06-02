import Image from 'next/image';
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

  const initials = adminName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-[14px]">
          <Image
            src="/orion-logo.png"
            alt="Orión"
            width={28}
            height={28}
            className="shrink-0 rounded-md"
          />
          <div>
            <p className="text-sm font-semibold leading-tight text-slate-900">Sistema Orión</p>
            <p className="text-[11px] font-medium text-violet-600">Plataforma</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <AdminNav />
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2.5 border-t border-slate-100 px-4 py-3">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium leading-tight text-slate-900">{adminName}</p>
            <p className="truncate text-[10px] text-slate-400">Superadmin</p>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-12 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
        <Image src="/orion-logo.png" alt="Orión" width={22} height={22} className="rounded" />
        <span className="text-sm font-semibold text-slate-900">
          Sistema <span className="text-violet-600">Orión</span>
        </span>
        <span className="ml-auto text-[11px] font-medium text-violet-600">Plataforma</span>
      </div>

      {/* Main content */}
      <main className="min-w-0 flex-1 overflow-auto p-4 pt-16 lg:p-6 lg:pt-6">{children}</main>
    </div>
  );
}
