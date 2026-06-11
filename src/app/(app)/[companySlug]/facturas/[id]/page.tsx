import { and, asc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { requirePermissionPage } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { facturas, lineasFactura, notasCreditoDebito } from '@/lib/db/schema';
import {
  FacturaDetalle,
  type FacturaDetalleData,
  type LineaDetalleRow,
} from '@/components/modules/facturas/FacturaDetalle';

export const metadata = { title: 'Factura' };

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const meses = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ];
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
}

export default async function FacturaDetallePage({
  params,
}: {
  params: Promise<{ companySlug: string; id: string }>;
}) {
  const { companySlug, id } = await params;
  const { tenant } = await requirePermissionPage('facturas.ver', companySlug);

  const [row] = await db
    .select()
    .from(facturas)
    .where(and(eq(facturas.id, id), eq(facturas.tenantId, tenant.id)))
    .limit(1);

  if (!row) notFound();

  const lineas = await db
    .select()
    .from(lineasFactura)
    .where(eq(lineasFactura.facturaId, id))
    .orderBy(asc(lineasFactura.orden));

  // NC de anulación aceptada vinculada a esta factura (para el aviso de anulación)
  const [ncAnulacion] = await db
    .select({
      numeroCompleto: notasCreditoDebito.numeroCompleto,
      tipoMotivo: notasCreditoDebito.tipoMotivo,
      pdfUrl: notasCreditoDebito.pdfUrl,
      createdAt: notasCreditoDebito.createdAt,
    })
    .from(notasCreditoDebito)
    .where(
      and(
        eq(notasCreditoDebito.documentoOrigenId, id),
        eq(notasCreditoDebito.tipoDocumento, '07'),
        eq(notasCreditoDebito.estadoSunat, 'aceptada')
      )
    )
    .limit(1);

  const data: FacturaDetalleData = {
    id: row.id,
    numeroCompleto: row.numeroCompleto ?? '—',
    tipoDocumento: row.tipoDocumento,
    serie: row.serie,
    numero: row.numero,
    fechaEmision: formatDate(row.fechaEmision),
    fechaEmisionIso: row.fechaEmision,
    fechaVencimiento: row.fechaVencimiento ? formatDate(row.fechaVencimiento) : null,
    clienteRazon: row.clienteRazonSocialSnapshot,
    clienteNumDoc: row.clienteNumeroDocSnapshot,
    clienteTipoDoc: row.clienteTipoDocSnapshot,
    clienteDireccion: row.clienteDireccionSnapshot ?? null,
    moneda: row.moneda,
    tipoCambio: row.tipoCambio ?? null,
    totalGravadas: row.totalGravadas,
    totalExoneradas: row.totalExoneradas,
    igv: row.igv,
    total: row.total,
    totalEnLetras: row.totalEnLetras ?? null,
    formaPago: row.formaPago,
    observaciones: row.observaciones ?? null,
    estado: row.estado,
    estadoSunat: row.estadoSunat,
    sunatCodigo: row.sunatCodigo ?? null,
    sunatMensaje: row.sunatMensaje ?? null,
    cdrUrl: row.cdrUrl ?? null,
    xmlUrl: row.xmlUrl ?? null,
    pdfUrl: row.pdfUrl ?? null,
    lineas: lineas.map(
      (l): LineaDetalleRow => ({
        id: l.id,
        descripcion: l.descripcion,
        skuSnapshot: l.skuSnapshot,
        cantidad: l.cantidad,
        unidadMedida: l.unidadMedida,
        precioUnitario: l.precioUnitario,
        tipoAfectacionIgv: l.tipoAfectacionIgv,
        totalBaseIgv: l.totalBaseIgv,
        totalIgv: l.totalIgv,
        total: l.total,
      })
    ),
  };

  return (
    <div className="p-6">
      <FacturaDetalle
        data={data}
        companySlug={companySlug}
        ncAnulacion={
          ncAnulacion
            ? {
                numeroCompleto: ncAnulacion.numeroCompleto ?? '',
                tipoMotivo: ncAnulacion.tipoMotivo,
                pdfUrl: ncAnulacion.pdfUrl,
                anuladaTrasMs:
                  ncAnulacion.createdAt && row.createdAt
                    ? Math.max(
                        new Date(ncAnulacion.createdAt).getTime() -
                          new Date(row.createdAt).getTime(),
                        0
                      )
                    : null,
              }
            : null
        }
      />
    </div>
  );
}
