import Link from 'next/link';
import { requirePermission } from '@/lib/auth/require-permission';
import { Card, CardContent } from '@/components/ui/card';
import { PageHead } from '@/components/shared/PageHead';

export const metadata = { title: 'Reportes' };

export default async function ReportesPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  await requirePermission('reportes.ver');

  return (
    <div className="space-y-4">
      <PageHead title="Reportes" subtitle="Selecciona el reporte que deseas consultar." />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href={`/${companySlug}/reportes/ventas`}>
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardContent className="p-4">
              <p className="text-sm font-medium">Reporte de ventas</p>
              <p className="mt-1 text-xs text-orion-fg-muted">
                Facturas y boletas aceptadas por SUNAT
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/${companySlug}/credito`}>
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardContent className="p-4">
              <p className="text-sm font-medium">Cuentas por cobrar</p>
              <p className="mt-1 text-xs text-orion-fg-muted">
                Saldos pendientes y cartera vencida
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/${companySlug}/inventario`}>
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardContent className="p-4">
              <p className="text-sm font-medium">Stock e inventario</p>
              <p className="mt-1 text-xs text-orion-fg-muted">
                Niveles de stock y alertas de stock crítico
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
