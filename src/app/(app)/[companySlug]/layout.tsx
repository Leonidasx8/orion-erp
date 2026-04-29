import { notFound } from 'next/navigation';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { TenantHeader } from '@/components/shared/TenantHeader';
import { TenantSidebar } from '@/components/shared/TenantSidebar';

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

  let tenant;
  try {
    tenant = await getCurrentTenant();
  } catch {
    notFound();
  }

  if (tenant.slug !== companySlug) notFound();

  return (
    <div className="flex min-h-screen">
      <TenantSidebar tenant={tenant} />
      <div className="flex flex-1 flex-col">
        <TenantHeader tenant={tenant} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
