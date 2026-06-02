import Link from 'next/link';
import { eq, desc } from 'drizzle-orm';
import { FileCheck, Plus } from 'lucide-react';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { guiasRemision } from '@/lib/db/schema';
import { PageHead } from '@/components/shared/PageHead';

export const metadata = { title: 'Guías de remisión' };

const ESTADO_SUNAT_LABEL: Record<string, { label: string; cls: string }> = {
  sin_enviar: { label: 'Sin enviar', cls: 'text-orion-fg-muted' },
  pendiente: { label: 'Pendiente', cls: 'text-warn-fg' },
  aceptada: { label: 'Aceptada', cls: 'text-success-fg' },
  rechazada: { label: 'Rechazada', cls: 'text-danger-fg' },
  error_red: { label: 'Error red', cls: 'text-danger-fg' },
  anulada: { label: 'Anulada', cls: 'text-orion-fg-muted' },
};

const MOTIVO_LABEL: Record<string, string> = {
  '01': 'Venta',
  '02': 'Compra',
  '04': 'Traslado entre establecimientos',
  '08': 'Importación',
  '09': 'Exportación',
  '13': 'Otros',
  '14': 'Venta sujeta a confirmación',
  '18': 'Traslado emisor itinerante',
};

export default async function GuiasPage({ params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;
  await requirePermission('guias.ver');
  const tenant = await getCurrentTenant();

  const guias = await db
    .select()
    .from(guiasRemision)
    .where(eq(guiasRemision.tenantId, tenant.id))
    .orderBy(desc(guiasRemision.createdAt))
    .limit(100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageHead
          title="Guías de remisión"
          subtitle={`${guias.length} guías — traslado de mercadería con SUNAT`}
        />
        <Link
          href={`/${companySlug}/guias/nueva`}
          className="flex items-center gap-1.5 rounded-md bg-tenant-accent px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus size={14} />
          Nueva guía
        </Link>
      </div>

      {guias.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-orion-border bg-orion-bg py-16 text-center">
          <FileCheck size={36} className="mb-3 text-orion-fg-faint" />
          <p className="text-[14px] font-medium text-orion-fg">Sin guías de remisión</p>
          <p className="mt-1 text-[13px] text-orion-fg-muted">
            Las guías de traslado a SUNAT aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-orion-border bg-orion-bg shadow-orion-1">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-orion-border bg-orion-bg-subtle text-left">
                {[
                  'Número',
                  'Fecha emisión',
                  'Inicio traslado',
                  'Motivo',
                  'Origen → Destino',
                  'Estado SUNAT',
                ].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium text-orion-fg-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-orion-border">
              {guias.map((g) => {
                const estadoSunat = ESTADO_SUNAT_LABEL[g.estadoSunat] ?? {
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
                        {g.numeroCompleto ?? `${g.serie}-${String(g.numero).padStart(8, '0')}`}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-orion-fg-muted">{g.fechaEmision}</td>
                    <td className="px-4 py-2.5 text-orion-fg-muted">{g.fechaInicioTraslado}</td>
                    <td className="px-4 py-2.5 text-orion-fg">
                      {MOTIVO_LABEL[g.motivoTraslado] ?? g.motivoTraslado}
                    </td>
                    <td className="max-w-[200px] px-4 py-2.5 text-orion-fg-muted">
                      <span className="truncate">
                        {g.direccionPartida.split(',')[0]} → {g.direccionLlegada.split(',')[0]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[12px] font-medium ${estadoSunat.cls}`}>
                        {estadoSunat.label}
                      </span>
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
