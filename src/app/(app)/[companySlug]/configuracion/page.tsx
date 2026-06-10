import Link from 'next/link';
import { and, eq } from 'drizzle-orm';
import { UserPlus } from 'lucide-react';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { requirePermissionPage } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { tenants, seriesDocumentos, tenantMembers } from '@/lib/db/schema';
import { ConfigSunatForm } from '@/components/modules/configuracion/ConfigSunatForm';
import { EmpresaForm } from '@/components/modules/configuracion/EmpresaForm';
import { ComercialForm } from '@/components/modules/configuracion/ComercialForm';
import { PoliticaPreciosForm } from '@/components/modules/configuracion/PoliticaPreciosForm';
import { ConfigTabBar, type TabId } from '@/components/modules/configuracion/ConfigTabBar';
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
  superadmin: 'Admin',
  comercial: 'Comercial',
  facturacion: 'Facturación',
  contabilidad: 'Contabilidad',
};

const VALID_TABS: TabId[] = ['empresa', 'comercial', 'facturacion', 'usuarios'];

export default async function ConfiguracionPage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { companySlug } = await params;
  const { tab } = await searchParams;
  const activeTab: TabId = (VALID_TABS.includes(tab as TabId) ? tab : 'empresa') as TabId;

  await requirePermissionPage('admin.config.editar', companySlug);
  const tenant = await getCurrentTenant();

  const [tenantRow] = await db.select().from(tenants).where(eq(tenants.id, tenant.id));

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      <PageHead
        title="Configuración"
        subtitle={`${tenantRow?.razonSocial ?? tenant.slug} — ajusta la información de tu empresa y las integraciones.`}
      />

      <ConfigTabBar active={activeTab} />

      {activeTab === 'empresa' && (
        <>
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

          <SectionCard
            title="Política de precios y márgenes"
            description="Reglas globales que aplican a cotizaciones y control de márgenes."
            tag="Solo Admin"
          >
            <PoliticaPreciosForm
              initial={{
                margenMinimoGlobal: Number(tenantRow?.margenMinimoGlobal ?? 10),
                aprobacionMontoMaximo: Number(tenantRow?.aprobacionMontoMaximo ?? 5000),
                igvAutomatico: tenantRow?.igvAutomatico ?? true,
                descuentosPorLinea: tenantRow?.descuentosPorLinea ?? true,
              }}
            />
          </SectionCard>
        </>
      )}

      {activeTab === 'comercial' && (
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
      )}

      {activeTab === 'facturacion' && <TabFacturacion tenant={tenant} tenantRow={tenantRow} />}

      {activeTab === 'usuarios' && <TabUsuarios companySlug={companySlug} tenantId={tenant.id} />}
    </div>
  );
}

// ─── Tab Facturación ─────────────────────────────────────────────────────────

async function TabFacturacion({
  tenant,
  tenantRow,
}: {
  tenant: { id: string; slug: string };
  tenantRow: typeof import('@/lib/db/schema').tenants.$inferSelect | undefined;
}) {
  const cfg = (tenantRow?.configSunat ?? null) as { ruta?: string; token?: string } | null;
  const series = await db
    .select()
    .from(seriesDocumentos)
    .where(eq(seriesDocumentos.tenantId, tenant.id));

  return (
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
            No hay series configuradas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-orion-border text-left">
                  {['Tipo', 'Serie', 'Correlativo', 'Estado'].map((h) => (
                    <th key={h} className="pb-2.5 pr-6 font-medium text-orion-fg-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-orion-border">
                {series.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2.5 pr-6 text-orion-fg">
                      {TIPO_DOC_LABEL[s.tipoDocumento] ?? s.tipoDocumento}
                    </td>
                    <td className="py-2.5 pr-6 font-mono text-[12px] text-orion-fg">{s.serie}</td>
                    <td className="py-2.5 pr-6 tabular-nums text-orion-fg-muted">
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
  );
}

// ─── Tab Usuarios ─────────────────────────────────────────────────────────────

async function TabUsuarios({ companySlug, tenantId }: { companySlug: string; tenantId: string }) {
  const members = await db
    .select()
    .from(tenantMembers)
    .where(and(eq(tenantMembers.tenantId, tenantId)));

  return (
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
                {['ID usuario', 'Rol', 'Estado', 'Invitado', 'Último acceso'].map((h) => (
                  <th key={h} className="pb-2.5 pr-5 font-medium text-orion-fg-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-orion-border">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-orion-bg-subtle">
                  <td className="py-2.5 pr-5 font-mono text-[11px] text-orion-fg-muted">
                    {m.userId.slice(0, 12)}…
                  </td>
                  <td className="py-2.5 pr-5">
                    <span className="rounded-full bg-orion-bg-subtle px-2.5 py-0.5 text-[11px] font-medium text-orion-fg">
                      {ROL_LABEL[m.rol] ?? m.rol}
                    </span>
                  </td>
                  <td className="py-2.5 pr-5">
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
                  <td className="py-2.5 pr-5 text-orion-fg-muted">
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
  );
}

// ─── SectionCard ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  description,
  tag,
  action,
  children,
}: {
  title: string;
  description: string;
  tag?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-orion-border bg-orion-bg p-6 shadow-orion-1">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-orion-fg">{title}</h2>
            {tag && (
              <span className="rounded-md bg-orion-bg-muted px-2 py-0.5 text-[10.5px] font-medium text-orion-fg-muted">
                {tag}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12px] text-orion-fg-muted">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
