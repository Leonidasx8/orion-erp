import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { DashboardContent } from '@/components/modules/dashboard/DashboardContent';

export default async function TenantDashboardPage() {
  const tenant = await getCurrentTenant();
  return <DashboardContent tenant={tenant} />;
}
