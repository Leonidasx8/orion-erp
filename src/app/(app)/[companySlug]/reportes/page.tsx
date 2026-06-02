import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { PageHead } from '@/components/shared/PageHead';
import { ModuleHelp } from '@/components/shared/ModuleHelp';

export const metadata = { title: 'Reportes' };

export default async function ReportesPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

  return (
    <div className="space-y-4">
      <PageHead
        title="Reportes"
        subtitle="Selecciona el reporte que deseas consultar."
        help={
          <ModuleHelp
            module="reportes"
            title="Reportes"
            description="Análisis del negocio: ventas por período, seguimiento de cotizaciones por comercial y auditoría de cambios de precios."
            tips={[
              'Cotizaciones por comercial: tasa de conversión y pipeline en tiempo real',
              'Historial de precios: quién cambió qué precio, cuándo y por qué',
              'Ventas: agrupa por mes, cliente, producto o comercial',
            ]}
          />
        }
      />
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
        <Link href={`/${companySlug}/reportes/cotizaciones`}>
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardContent className="p-4">
              <p className="text-sm font-medium">Cotizaciones por comercial</p>
              <p className="mt-1 text-xs text-orion-fg-muted">
                Seguimiento y panel de control de cotizaciones generadas
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/${companySlug}/reportes/precios`}>
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardContent className="p-4">
              <p className="text-sm font-medium">Historial de precios</p>
              <p className="mt-1 text-xs text-orion-fg-muted">
                Cambios de precio por producto, autor y razón
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
