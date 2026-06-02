import Link from 'next/link';
import { and, eq } from 'drizzle-orm';
import { UserPlus } from 'lucide-react';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { tenants, seriesDocumentos, tenantMembers } from '@/lib/db/schema';
import { ConfigSunatForm } from '@/components/modules/configuracion/ConfigSunatForm';
import { EmpresaForm } from '@/components/modules/configuracion/EmpresaForm';
import { ComercialForm } from '@/components/modules/configuracion/ComercialForm';
import { ConfigTabs } from '@/components/modules/configuracion/ConfigTabs';
import { PageHead } from '@/components/shared/PageHead';

export const metadata = { title: 'Configuración' };

const TIPO_DOC_LABEL: Record<string, string> = {
  '01': 'Factura',
  '03': 'Boleta',
  '07': 'Nota de crédito',
  '08': 'Nota de débito',
  '09': 'Guía de remisión',
};

const ROL_LABEL: Record<string, string> = {
  superadmin: 'Superadmin',
  comercial: 'Comercial',
  facturación: 'Facturación',
  contabilidad: 'Contabilidad',
};

export default async function ConfiguracionPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  await requirePermission('admin.config.editar');
  const tenant = await getCurrentTenant();

  const [tenantRow] = await db.select().from(tenants).where(eq(tenants.id, tenant.id));
  const cfg = (tenantRow?.configSunat ?? null) as { ruta?: string; token?: string } | null;
  const series = await db
    .select()
    .from(seriesDocumentos)
    .where(eq(seriesDocumentos.tenantId, tenant.id));
  const members = await db
    .select()
    .from(tenantMembers)
    .where(and(eq(tenantMembers.tenantId, tenant.id)));

  const tabContent = {
    empresa: (
      <SectionCard
        title="Información de la empresa"
        description="Nombre, logo y datos de contacto que aparecen en PDFs y en el sistema."
      >
        <EmpresaForm
          razonSocial={tenantRow?.razonSocial ?? ''}
          ruc={tenantRow?.ruc ?? ''}
          direccionFiscal={tenantRow?.direccionFiscal ?? null}
          logoUrl={tenantRow?.logoUrl ?? null}
          web={tenantRow?.web ?? null}
          telefono={tenantRow?.telefono ?? null}
          contactoEmail={tenantRow?.contactoEmail ?? null}
        />
      </SectionCard>
    ),
    comercial: (
      <SectionCard
        title="Datos comerciales y bancarios"
        description="Aparecen en cotizaciones y facturas como datos del vendedor y cuenta de cobro."
      >
        <ComercialForm
          comercialNombre={tenantRow?.comercialNombre ?? null}
          comercialCargo={tenantRow?.comercialCargo ?? null}
          comercialTelefono={tenantRow?.comercialTelefono ?? null}
          bancoNombre={tenantRow?.bancoNombre ?? null}
          bancoCuenta={tenantRow?.bancoCuenta ?? null}
          bancoCci={tenantRow?.bancoCci ?? null}
          bancoDetraccionCuenta={tenantRow?.bancoDetraccionCuenta ?? null}
          bancoCuentaUsd={tenantRow?.bancoCuentaUsd ?? null}
          bancoCciUsd={tenantRow?.bancoCciUsd ?? null}
        />
      </SectionCard>
    ),
    facturacion: (
      <div className="space-y-5">
        <SectionCard
          title="Credenciales Nubefact"
          description="Conecta tu cuenta de Nubefact para emitir comprobantes electrónicos a SUNAT."
        >
          <ConfigSunatForm rutaActual={cfg?.ruta ?? ''} tokenConfigurado={Boolean(cfg?.token)} />
        </SectionCard>
        <SectionCard
          title="Series de comprobantes"
          description="Deben coincidir exactamente con las series habilitadas en tu panel de Nubefact."
        >
          {series.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-orion-fg-muted">
              No hay series configuradas para este tenant.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-orion-border text-left">
                    <th className="pb-2.5 font-medium text-orion-fg-muted">Tipo</th>
                    <th className="pb-2.5 font-medium text-orion-fg-muted">Serie</th>
                    <th className="pb-2.5 font-medium text-orion-fg-muted">Correlativo</th>
                    <th className="pb-2.5 font-medium text-orion-fg-muted">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orion-border">
                  {series.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2.5 text-orion-fg">
                        {TIPO_DOC_LABEL[s.tipoDocumento] ?? s.tipoDocumento}
                      </td>
                      <td className="py-2.5 font-mono text-[12px] text-orion-fg">{s.serie}</td>
                      <td className="py-2.5 tabular-nums text-orion-fg-muted">
                        {s.correlativoActual}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={
                            s.activa
                              ? 'text-[12px] font-medium text-success-fg'
                              : 'text-[12px] text-orion-fg-muted'
                          }
                        >
                          {s.activa ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    ),
    usuarios: (
      <SectionCard
        title="Usuarios y permisos"
        description="Gestiona quién tiene acceso al sistema y qué puede hacer."
        action={
          <Link
            href={`/${companySlug}/admin/usuarios/invitar`}
            className="bg-orion-brand flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90"
          >
            <UserPlus size={13} />
            Invitar usuario
          </Link>
        }
      >
        {members.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-orion-fg-muted">Sin usuarios activos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-orion-border text-left">
                  {['Email / ID', 'Rol', 'Estado', 'Invitado', 'Último acceso'].map((h) => (
                    <th key={h} className="pb-2.5 pr-4 font-medium text-orion-fg-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-orion-border">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-orion-bg-subtle">
                    <td className="py-2.5 pr-4 font-mono text-[11px] text-orion-fg-muted">
                      {m.userId.slice(0, 12)}…
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="rounded-full bg-orion-bg-subtle px-2.5 py-0.5 text-[11px] font-medium text-orion-fg">
                        {ROL_LABEL[m.rol] ?? m.rol}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={
                          m.estado === 'activo'
                            ? 'text-[12px] font-medium text-success-fg'
                            : 'text-[12px] text-orion-fg-muted'
                        }
                      >
                        {m.estado}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-orion-fg-muted">
                      {m.invitedAt.toISOString().slice(0, 10)}
                    </td>
                    <td className="py-2.5 text-orion-fg-muted">
                      {m.ultimoLoginAt?.toISOString().slice(0, 10) ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    ),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <PageHead
        title="Configuración"
        subtitle={`${tenantRow?.razonSocial ?? tenant.slug} — ajusta la información de tu empresa y las integraciones.`}
      />
      <ConfigTabs content={tabContent} />
    </div>
  );
}

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-orion-border bg-orion-bg p-6 shadow-orion-1">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-orion-fg">{title}</h2>
          <p className="mt-0.5 text-[12px] text-orion-fg-muted">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
