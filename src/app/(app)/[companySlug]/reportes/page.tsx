import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { PageHead } from '@/components/shared/PageHead';
import { ModuleHelp } from '@/components/shared/ModuleHelp';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { db } from '@/lib/db/client';
import { sql, eq, and } from 'drizzle-orm';
import { facturas, cotizaciones } from '@/lib/db/schema';

export const metadata = { title: 'Reportes' };

function formatMoney(value: number): string {
  return `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function ReportesPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const tenant = await getCurrentTenant();

  // 4 queries en paralelo
  const [ventasResult, cotizacionesResult, cxcResult, inventarioResult] = await Promise.all([
    // Ventas: COUNT + SUM de facturas aceptadas
    db
      .select({
        count: sql<number>`cast(count(*) as int)`,
        total: sql<number>`coalesce(cast(sum(cast(${facturas.total} as numeric)) as float), 0)`,
      })
      .from(facturas)
      .where(and(eq(facturas.tenantId, tenant.id), eq(facturas.estadoSunat, 'aceptada'))),

    // Cotizaciones: total + convertidas
    db
      .select({
        total: sql<number>`cast(count(*) as int)`,
        convertidas: sql<number>`cast(sum(case when ${cotizaciones.estado} = 'convertida' then 1 else 0 end) as int)`,
      })
      .from(cotizaciones)
      .where(eq(cotizaciones.tenantId, tenant.id)),

    // CxC: saldo total desde vista cuentas_por_cobrar
    db.execute(
      sql`SELECT COALESCE(SUM(saldo_total), 0) AS cxc FROM cuentas_por_cobrar WHERE tenant_id = ${tenant.id}`
    ),

    // Inventario crítico desde vista stock_actual
    db.execute(
      sql`SELECT COUNT(*) AS critico FROM stock_actual WHERE tenant_id = ${tenant.id} AND stock <= stock_minimo AND stock_minimo > 0`
    ),
  ]);

  const ventasTotal: number = ventasResult[0]?.total ?? 0;
  const ventasCount: number = ventasResult[0]?.count ?? 0;

  const cotTotal: number = cotizacionesResult[0]?.total ?? 0;
  const cotConvertidas: number = cotizacionesResult[0]?.convertidas ?? 0;
  const cotTasa: number = cotTotal > 0 ? Math.round((cotConvertidas / cotTotal) * 100) : 0;

  const cxcRow = cxcResult[0] as Record<string, unknown> | undefined;
  const cxcTotal: number = cxcRow ? Number(cxcRow['cxc'] ?? 0) : 0;

  const inventarioRow = inventarioResult[0] as Record<string, unknown> | undefined;
  const inventarioCritico: number = inventarioRow ? Number(inventarioRow['critico'] ?? 0) : 0;

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
        {/* Ventas */}
        <Link href={`/${companySlug}/reportes/ventas`}>
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-orion-fg-faint">Ventas</p>
              <p className="mt-1 text-2xl font-bold text-orion-fg">{formatMoney(ventasTotal)}</p>
              <p className="mt-0.5 text-xs text-orion-fg-muted">
                {ventasCount} factura{ventasCount !== 1 ? 's' : ''} aceptada
                {ventasCount !== 1 ? 's' : ''} SUNAT
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Cotizaciones */}
        <Link href={`/${companySlug}/reportes/cotizaciones`}>
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-orion-fg-faint">Cotizaciones</p>
              <p className="mt-1 text-2xl font-bold text-orion-fg">{cotTasa}%</p>
              <p className="mt-0.5 text-xs text-orion-fg-muted">
                {cotTotal} total · {cotConvertidas} convertida{cotConvertidas !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Historial de precios */}
        <Link href={`/${companySlug}/reportes/precios`}>
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-orion-fg-faint">
                Historial de precios
              </p>
              <p className="mt-1 text-2xl font-bold text-orion-fg">Auditoría de precios</p>
              <p className="mt-0.5 text-xs text-orion-fg-muted">
                Cambios por producto, autor y razón
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* CxC */}
        <Link href={`/${companySlug}/credito`}>
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-orion-fg-faint">
                Cuentas por cobrar
              </p>
              <p className="mt-1 text-2xl font-bold text-orion-fg">{formatMoney(cxcTotal)}</p>
              <p className="mt-0.5 text-xs text-orion-fg-muted">Saldo pendiente de clientes</p>
            </CardContent>
          </Card>
        </Link>

        {/* Inventario */}
        <Link href={`/${companySlug}/inventario`}>
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-orion-fg-faint">Inventario</p>
              <p className="mt-1 text-2xl font-bold text-orion-fg">
                {inventarioCritico} producto{inventarioCritico !== 1 ? 's' : ''}
              </p>
              <p className="mt-0.5 text-xs text-orion-fg-muted">con stock bajo mínimo</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
