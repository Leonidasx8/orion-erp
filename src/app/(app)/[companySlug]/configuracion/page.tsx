import { eq } from 'drizzle-orm';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { tenants, seriesDocumentos } from '@/lib/db/schema';
import { ConfigSunatForm } from '@/components/modules/configuracion/ConfigSunatForm';

const TIPO_DOC_LABEL: Record<string, string> = {
  '01': 'Factura',
  '03': 'Boleta',
  '07': 'Nota de crédito',
  '08': 'Nota de débito',
  '09': 'Guía de remisión',
};

export default async function ConfiguracionPage() {
  await requirePermission('admin.config.editar');
  const tenant = await getCurrentTenant();

  const [row] = await db
    .select({ configSunat: tenants.configSunat })
    .from(tenants)
    .where(eq(tenants.id, tenant.id));

  const cfg = (row?.configSunat ?? null) as { ruta?: string; token?: string } | null;

  const series = await db
    .select()
    .from(seriesDocumentos)
    .where(eq(seriesDocumentos.tenantId, tenant.id));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Credenciales y series de facturación electrónica de {tenant.razonSocial}.
        </p>
      </div>

      <ConfigSunatForm rutaActual={cfg?.ruta ?? ''} tokenConfigurado={Boolean(cfg?.token)} />

      <div className="space-y-3 rounded-lg border p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Series de comprobantes</h2>
          <p className="text-sm text-muted-foreground">
            Estas son las series que el sistema usará al emitir. Deben estar{' '}
            <strong>habilitadas con el mismo nombre en tu panel de Nubefact</strong>, de lo
            contrario SUNAT rechazará el comprobante.
          </p>
        </div>

        {series.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No hay series configuradas para este tenant.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                <th className="py-2">Tipo</th>
                <th className="py-2">Serie</th>
                <th className="py-2">Correlativo actual</th>
                <th className="py-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {series.map((s) => (
                <tr key={s.id}>
                  <td className="py-2.5">{TIPO_DOC_LABEL[s.tipoDocumento] ?? s.tipoDocumento}</td>
                  <td className="py-2.5 font-mono">{s.serie}</td>
                  <td className="py-2.5 text-muted-foreground">{s.correlativoActual}</td>
                  <td className="py-2.5">
                    <span
                      className={
                        s.activa
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-muted-foreground'
                      }
                    >
                      {s.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
