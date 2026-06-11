import Link from 'next/link';
import { eq, desc } from 'drizzle-orm';
import { Plus, Truck } from 'lucide-react';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { requirePermissionPage } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { guiasRemision, clientes } from '@/lib/db/schema';
import { PageHead } from '@/components/shared/PageHead';
import { ModuleHelp } from '@/components/shared/ModuleHelp';
import { GuiaActions } from '@/components/modules/guias/GuiaActions';

export const metadata = { title: 'Guías de remisión' };

const MOTIVO_LABEL: Record<string, string> = {
  '01': 'Venta',
  '02': 'Compra',
  '04': 'Traslado',
  '13': 'Otros',
  '14': 'Venta c/confirmación',
  '18': 'Itinerante',
};

const ESTADO_ENVIO: Record<string, { label: string; cls: string }> = {
  pendiente_despacho: { label: 'Pendiente', cls: 'bg-warn-soft text-warn-fg' },
  en_camino: { label: 'En camino', cls: 'bg-info-soft text-info-fg' },
  entregado: { label: 'Entregado', cls: 'bg-success-soft text-success-fg' },
  borrador: { label: 'Borrador', cls: 'bg-orion-bg-muted text-orion-fg-muted' },
  anulada: { label: 'Anulado', cls: 'bg-orion-bg-muted text-orion-fg-faint line-through' },
};

const ESTADO_SUNAT: Record<string, { label: string; cls: string }> = {
  sin_enviar: { label: 'Sin emitir', cls: 'text-orion-fg-muted' },
  pendiente: { label: 'Enviando…', cls: 'text-warn-fg' },
  aceptada: { label: 'SUNAT ✓', cls: 'text-success-fg font-medium' },
  rechazada: { label: 'SUNAT ✗', cls: 'text-danger-fg font-medium' },
  error_red: { label: 'Error red', cls: 'text-danger-fg' },
  anulada: { label: 'Anulada', cls: 'text-orion-fg-muted' },
};

export default async function GuiasPage({ params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;
  await requirePermissionPage('guias.ver', companySlug);
  const tenant = await getCurrentTenant();

  const rows = await db
    .select({
      id: guiasRemision.id,
      numeroCompleto: guiasRemision.numeroCompleto,
      serie: guiasRemision.serie,
      numero: guiasRemision.numero,
      fechaEmision: guiasRemision.fechaEmision,
      fechaInicioTraslado: guiasRemision.fechaInicioTraslado,
      estado: guiasRemision.estado,
      estadoSunat: guiasRemision.estadoSunat,
      motivoTraslado: guiasRemision.motivoTraslado,
      direccionLlegada: guiasRemision.direccionLlegada,
      destinatarioId: guiasRemision.destinatarioId,
      clienteRazonSocial: clientes.razonSocial,
      clienteNombres: clientes.nombres,
    })
    .from(guiasRemision)
    .leftJoin(clientes, eq(guiasRemision.destinatarioId, clientes.id))
    .where(eq(guiasRemision.tenantId, tenant.id))
    .orderBy(desc(guiasRemision.createdAt))
    .limit(100);

  const pendientes = rows.filter((r) => r.estado === 'pendiente_despacho').length;
  const enCamino = rows.filter((r) => r.estado === 'en_camino').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHead
          title="Guías de remisión"
          subtitle={
            rows.length === 0
              ? 'Sin guías — crea la primera'
              : `${rows.length} total · ${pendientes} pendientes · ${enCamino} en camino`
          }
          help={
            <ModuleHelp
              module="guias"
              title="Guías de Remisión"
              description="Registra el despacho de mercadería al cliente. Incluye seguimiento interno (Pendiente / En camino / Entregado) y el documento electrónico T001 para SUNAT."
              tips={[
                'Crea la guía → haz clic "Despachar" cuando sale el camión → "Entregado" al confirmar',
                'El documento T001 se envía automáticamente a Nubefact al crear la guía',
                'El estado SUNAT (columna derecha) confirma si fue aceptado por SUNAT',
              ]}
            />
          }
        />
        <Link
          href={`/${companySlug}/guias/nueva`}
          className="flex items-center gap-1.5 rounded-md bg-tenant-accent px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus size={14} />
          Nueva guía
        </Link>
      </div>

      {/* KPI rápido */}
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Pendientes', n: pendientes, warn: pendientes > 0 },
            { label: 'En camino', n: enCamino, warn: false },
            {
              label: 'Entregadas',
              n: rows.filter((r) => r.estado === 'entregado').length,
              warn: false,
            },
            {
              label: 'SUNAT aceptadas',
              n: rows.filter((r) => r.estadoSunat === 'aceptada').length,
              warn: false,
            },
          ].map((k) => (
            <div
              key={k.label}
              className="rounded-lg border border-orion-border bg-orion-bg px-4 py-2.5"
            >
              <p className={`text-[11px] ${k.warn ? 'text-warn-fg' : 'text-orion-fg-muted'}`}>
                {k.label}
              </p>
              <p
                className={`text-[20px] font-semibold tabular-nums ${k.warn ? 'text-warn-fg' : 'text-orion-fg'}`}
              >
                {k.n}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Lista */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-orion-border bg-orion-bg py-16 text-center">
          <Truck size={32} className="mb-3 text-orion-fg-faint" />
          <p className="text-[14px] font-medium text-orion-fg">Sin guías de remisión</p>
          <p className="mt-1 text-[13px] text-orion-fg-muted">
            Crea una guía para registrar el despacho de mercadería.
          </p>
          <Link
            href={`/${companySlug}/guias/nueva`}
            className="mt-4 flex items-center gap-1.5 rounded-md bg-tenant-accent px-4 py-2 text-[13px] font-medium text-white hover:opacity-90"
          >
            <Plus size={14} /> Nueva guía
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-orion-border bg-orion-bg shadow-orion-1">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-orion-border bg-orion-bg-subtle text-left">
                {['Guía', 'Destinatario', 'Fecha envío', 'Motivo', 'Despacho', 'SUNAT', ''].map(
                  (h) => (
                    <th key={h} className="px-4 py-3 font-medium text-orion-fg-muted">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-orion-border">
              {rows.map((g) => {
                const numDisplay =
                  g.numeroCompleto ?? `${g.serie}-${String(g.numero).padStart(8, '0')}`;
                const destinatario =
                  g.clienteRazonSocial ?? g.clienteNombres ?? g.direccionLlegada.split(',')[0];
                const envio = ESTADO_ENVIO[g.estado] ?? {
                  label: g.estado,
                  cls: 'text-orion-fg-muted',
                };
                const sunat = ESTADO_SUNAT[g.estadoSunat] ?? {
                  label: g.estadoSunat,
                  cls: 'text-orion-fg-muted',
                };

                return (
                  <tr key={g.id} className="hover:bg-orion-bg-subtle">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/${companySlug}/guias/${g.id}`}
                        className="text-orion-brand font-mono text-[12px] font-medium hover:underline"
                      >
                        {numDisplay}
                      </Link>
                      <div className="text-[11px] text-orion-fg-muted">{g.fechaEmision}</div>
                    </td>
                    <td className="max-w-[160px] px-4 py-2.5">
                      <div className="truncate text-orion-fg">{destinatario}</div>
                      <div className="truncate text-[11px] text-orion-fg-muted">
                        {g.direccionLlegada.split(',').slice(0, 2).join(',')}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-orion-fg-muted">{g.fechaInicioTraslado}</td>
                    <td className="px-4 py-2.5 text-orion-fg">
                      {MOTIVO_LABEL[g.motivoTraslado] ?? g.motivoTraslado}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${envio.cls}`}
                      >
                        {envio.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[12px] ${sunat.cls}`}>{sunat.label}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <GuiaActions
                        guiaId={g.id}
                        estado={g.estado}
                        estadoSunat={g.estadoSunat}
                        tenantSlug={companySlug}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
