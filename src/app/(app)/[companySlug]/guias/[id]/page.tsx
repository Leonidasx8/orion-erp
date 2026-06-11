import Link from 'next/link';
import { and, eq } from 'drizzle-orm';
import { ArrowLeft, FileText, MapPin, Truck } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { requirePermissionPage } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { clientes, cotizaciones, guiasRemision, lineasGuia } from '@/lib/db/schema';
import { PageHead } from '@/components/shared/PageHead';
import { EstadoBadge } from '@/components/shared/EstadoBadge';
import { ReenviarGuiaButton } from '@/components/modules/guias/ReenviarGuiaButton';

export const metadata = { title: 'Guía de remisión' };

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

export default async function GuiaDetallePage({
  params,
}: {
  params: Promise<{ companySlug: string; id: string }>;
}) {
  const { companySlug, id } = await params;
  await requirePermissionPage('guias.ver', companySlug);
  const tenant = await getCurrentTenant();

  const [guia] = await db
    .select()
    .from(guiasRemision)
    .where(and(eq(guiasRemision.id, id), eq(guiasRemision.tenantId, tenant.id)));

  if (!guia) notFound();

  const [lineas, cotizacionVinculada] = await Promise.all([
    db
      .select()
      .from(lineasGuia)
      .where(and(eq(lineasGuia.guiaId, id), eq(lineasGuia.tenantId, tenant.id))),
    guia.cotizacionId
      ? db
          .select({
            id: cotizaciones.id,
            numeroCompleto: cotizaciones.numeroCompleto,
            fechaEmision: cotizaciones.fechaEmision,
            total: cotizaciones.total,
            moneda: cotizaciones.moneda,
            clienteNombre: clientes.razonSocial,
            clienteNombres: clientes.nombres,
            clienteApellido: clientes.apellidoPaterno,
          })
          .from(cotizaciones)
          .innerJoin(clientes, eq(cotizaciones.clienteId, clientes.id))
          .where(eq(cotizaciones.id, guia.cotizacionId))
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
  ]);

  const numero = guia.numeroCompleto ?? `${guia.serie}-${String(guia.numero).padStart(8, '0')}`;

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/${companySlug}/guias`}
            className="grid h-8 w-8 place-items-center rounded-md border border-orion-border text-orion-fg-muted hover:bg-orion-bg-subtle"
          >
            <ArrowLeft size={14} />
          </Link>
          <PageHead title={numero} subtitle="Guía de remisión" />
        </div>
        <ReenviarGuiaButton guiaId={guia.id} estadoSunat={guia.estadoSunat ?? 'pendiente'} />
      </div>

      {/* Cotización vinculada */}
      {cotizacionVinculada && (
        <Link
          href={`/${companySlug}/cotizaciones/${cotizacionVinculada.id}`}
          className="flex items-center gap-3 rounded-xl border border-orion-border bg-orion-bg p-4 shadow-orion-1 transition-colors hover:bg-orion-bg-subtle"
        >
          <FileText size={16} className="shrink-0 text-tenant-accent" />
          <div className="min-w-0">
            <p className="text-[11px] text-orion-fg-muted">Cotización de origen</p>
            <p className="text-[13px] font-medium text-orion-fg">
              {cotizacionVinculada.numeroCompleto}
              {' · '}
              {cotizacionVinculada.clienteNombre ??
                [cotizacionVinculada.clienteNombres, cotizacionVinculada.clienteApellido]
                  .filter(Boolean)
                  .join(' ')}
            </p>
          </div>
          <div className="ml-auto shrink-0 text-right">
            <p className="text-[12px] text-orion-fg-muted">{cotizacionVinculada.fechaEmision}</p>
            <p className="text-[13px] font-semibold text-orion-fg">
              {cotizacionVinculada.moneda === 'USD' ? '$' : 'S/'}{' '}
              {parseFloat(cotizacionVinculada.total).toLocaleString('es-PE', {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
        </Link>
      )}

      {/* Estado + fechas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: 'Estado SUNAT',
            value: (
              <EstadoBadge
                estado={guia.estadoSunat as import('@/components/shared/EstadoBadge').Estado}
              />
            ),
          },
          { label: 'Fecha emisión', value: guia.fechaEmision },
          { label: 'Inicio traslado', value: guia.fechaInicioTraslado },
          { label: 'Motivo', value: MOTIVO_LABEL[guia.motivoTraslado] ?? guia.motivoTraslado },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-orion-border bg-orion-bg p-3">
            <p className="text-[11px] text-orion-fg-muted">{item.label}</p>
            <p className="mt-1 text-[13px] font-medium text-orion-fg">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Origen → Destino */}
      <div className="rounded-xl border border-orion-border bg-orion-bg p-5 shadow-orion-1">
        <h2 className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-orion-fg">
          <MapPin size={14} className="text-tenant-accent" />
          Ruta de traslado
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-orion-fg-muted">
              Punto de partida
            </p>
            <p className="text-[13px] text-orion-fg">{guia.direccionPartida}</p>
            <p className="text-[11px] text-orion-fg-muted">Ubigeo: {guia.ubigeoPartida}</p>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-orion-fg-muted">
              Punto de llegada
            </p>
            <p className="text-[13px] text-orion-fg">{guia.direccionLlegada}</p>
            <p className="text-[11px] text-orion-fg-muted">Ubigeo: {guia.ubigeoLlegada}</p>
          </div>
        </div>
      </div>

      {/* Transporte */}
      {(guia.modalidadTraslado || guia.pesoBrutoTotal) && (
        <div className="rounded-xl border border-orion-border bg-orion-bg p-5 shadow-orion-1">
          <h2 className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-orion-fg">
            <Truck size={14} className="text-tenant-accent" />
            Datos de transporte
          </h2>
          <div className="grid gap-3 text-[13px] sm:grid-cols-3">
            <div>
              <p className="text-[11px] text-orion-fg-muted">Modalidad</p>
              <p className="font-medium text-orion-fg">
                {guia.modalidadTraslado === '01' ? 'Transporte público' : 'Transporte privado'}
              </p>
            </div>
            {guia.pesoBrutoTotal && (
              <div>
                <p className="text-[11px] text-orion-fg-muted">Peso bruto</p>
                <p className="font-medium text-orion-fg">
                  {guia.pesoBrutoTotal} {guia.unidadPeso ?? 'KGM'}
                </p>
              </div>
            )}
            {guia.numeroBultos && (
              <div>
                <p className="text-[11px] text-orion-fg-muted">N° bultos</p>
                <p className="font-medium text-orion-fg">{guia.numeroBultos}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Líneas / mercadería */}
      {lineas.length > 0 && (
        <div className="rounded-xl border border-orion-border bg-orion-bg shadow-orion-1">
          <div className="border-b border-orion-border px-5 py-3">
            <h2 className="text-[13px] font-semibold text-orion-fg">
              Mercadería ({lineas.length} ítem{lineas.length !== 1 ? 's' : ''})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-orion-border bg-orion-bg-subtle text-left">
                  {['SKU', 'Descripción', 'Cant.', 'Unidad'].map((h) => (
                    <th key={h} className="px-4 py-2.5 font-medium text-orion-fg-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-orion-border">
                {lineas.map((l) => (
                  <tr key={l.id} className="hover:bg-orion-bg-subtle">
                    <td className="px-4 py-2.5 font-mono text-[12px] text-orion-fg-muted">
                      {l.skuSnapshot}
                    </td>
                    <td className="px-4 py-2.5 text-orion-fg">{l.descripcion}</td>
                    <td className="px-4 py-2.5 tabular-nums text-orion-fg">{l.cantidad}</td>
                    <td className="px-4 py-2.5 text-orion-fg-muted">{l.unidadMedida}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Documentos SUNAT */}
      {(guia.pdfUrl || guia.xmlUrl || guia.cdrUrl) && (
        <div className="rounded-xl border border-orion-border bg-orion-bg p-5 shadow-orion-1">
          <h2 className="mb-3 text-[13px] font-semibold text-orion-fg">Documentos SUNAT</h2>
          <div className="flex flex-wrap gap-3">
            {guia.pdfUrl && (
              <a
                href={guia.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-orion-border px-3 py-1.5 text-[12px] text-orion-fg hover:bg-orion-bg-subtle"
              >
                PDF
              </a>
            )}
            {guia.xmlUrl && (
              <a
                href={guia.xmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-orion-border px-3 py-1.5 text-[12px] text-orion-fg hover:bg-orion-bg-subtle"
              >
                XML
              </a>
            )}
            {guia.cdrUrl && (
              <a
                href={guia.cdrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-orion-border px-3 py-1.5 text-[12px] text-orion-fg hover:bg-orion-bg-subtle"
              >
                CDR
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
