import { requirePermission } from '@/lib/auth/require-permission';

export default async function ReportesLayout({ children }: { children: React.ReactNode }) {
  await requirePermission('reportes.ver');
  return <>{children}</>;
}
