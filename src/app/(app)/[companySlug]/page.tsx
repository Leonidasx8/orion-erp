import { getCurrentTenant } from '@/lib/auth/current-tenant';

export default async function TenantDashboardPage() {
  const tenant = await getCurrentTenant();

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Bienvenido a {tenant.razonSocial}</p>
    </div>
  );
}
