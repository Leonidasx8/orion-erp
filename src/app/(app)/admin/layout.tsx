import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requirePlatformAdmin, ForbiddenError } from '@/lib/auth/platform-admin';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requirePlatformAdmin();
  } catch (e) {
    if (e instanceof ForbiddenError) redirect('/login');
    throw e;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r bg-muted/30 p-4">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Dignita
          </p>
          <p className="mt-0.5 text-sm font-bold">Plataforma</p>
        </div>

        <nav className="space-y-0.5 text-sm">
          <Link href="/admin" className="flex items-center rounded-md px-3 py-2 hover:bg-muted">
            Dashboard
          </Link>
          <Link
            href="/admin/tenants"
            className="flex items-center rounded-md px-3 py-2 hover:bg-muted"
          >
            Tenants
          </Link>
          <Link
            href="/admin/auditoria"
            className="flex items-center rounded-md px-3 py-2 hover:bg-muted"
          >
            Auditoría
          </Link>
        </nav>
      </aside>

      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
