import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { db } from '@/lib/db/client';
import { clientes, cotizaciones } from '@/lib/db/schema';
import { PipelineBoard, type PipelineCard } from '@/components/modules/pipeline/PipelineBoard';
import { ModuleHelp } from '@/components/shared/ModuleHelp';

export const metadata = { title: 'Pipeline de ventas' };

function diasDesde(date: Date | null): number {
  if (!date) return 0;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

export default async function PipelinePage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const tenant = await getCurrentTenant();

  // Cotizaciones de los últimos 90 días + existencia de OC/factura/guía
  const rows = await db
    .select({
      id: cotizaciones.id,
      numero: cotizaciones.numeroCompleto,
      estado: cotizaciones.estado,
      total: cotizaciones.total,
      moneda: cotizaciones.moneda,
      createdAt: cotizaciones.createdAt,
      creadoPorNombre: cotizaciones.creadoPorNombre,
      clienteRazon: clientes.razonSocial,
      clienteNombres: clientes.nombres,
      clienteApellido: clientes.apellidoPaterno,
      tieneOC: sql<boolean>`EXISTS(
        SELECT 1 FROM ordenes_compra
        WHERE cotizacion_origen_id = ${cotizaciones.id}
        AND tenant_id = ${tenant.id}
      )`,
      tieneFactura: sql<boolean>`EXISTS(
        SELECT 1 FROM facturas
        WHERE cotizacion_origen_id = ${cotizaciones.id}
        AND tenant_id = ${tenant.id}
      )`,
      tieneGuia: sql<boolean>`EXISTS(
        SELECT 1 FROM guias_remision gr
        JOIN facturas f ON f.guia_relacionada_id = gr.id
        WHERE f.cotizacion_origen_id = ${cotizaciones.id}
        AND f.tenant_id = ${tenant.id}
      )`,
      tienePago: sql<boolean>`EXISTS(
        SELECT 1 FROM facturas
        WHERE cotizacion_origen_id = ${cotizaciones.id}
        AND tenant_id = ${tenant.id}
        AND estado_sunat = 'aceptada'
      )`,
    })
    .from(cotizaciones)
    .leftJoin(clientes, eq(clientes.id, cotizaciones.clienteId))
    .where(
      and(
        eq(cotizaciones.tenantId, tenant.id),
        gt(cotizaciones.createdAt, sql`NOW() - INTERVAL '90 days'`)
      )
    )
    .orderBy(desc(cotizaciones.createdAt))
    .limit(300);

  const cards: PipelineCard[] = rows.map((r) => {
    const cliente =
      r.clienteRazon ?? [r.clienteNombres, r.clienteApellido].filter(Boolean).join(' ') ?? '—';

    let etapa: PipelineCard['etapa'];
    if (r.tieneGuia) etapa = 'guia';
    else if (r.tienePago) etapa = 'cobrada';
    else if (r.tieneFactura) etapa = 'factura';
    else if (r.tieneOC) etapa = 'oc';
    else if (r.estado === 'aceptada' || r.estado === 'convertida') etapa = 'aceptada';
    else if (r.estado === 'enviada') etapa = 'enviada';
    else if (r.estado === 'rechazada' || r.estado === 'vencida') etapa = 'rechazada';
    else etapa = 'borrador';

    return {
      id: r.id,
      numero: r.numero ?? '—',
      cliente,
      total: parseFloat(r.total ?? '0'),
      moneda: r.moneda,
      comercial: r.creadoPorNombre ?? '—',
      dias: diasDesde(r.createdAt),
      etapa,
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-orion-fg">
            Pipeline de ventas
          </h1>
          <p className="mt-0.5 text-[12px] text-orion-fg-muted">
            Últimos 90 días · {cards.length} oportunidades
          </p>
        </div>
        <ModuleHelp
          module="pipeline"
          title="Pipeline de ventas"
          description="Vista completa del ciclo de venta: desde cotización borrador hasta guía de remisión emitida."
          tips={[
            'Cada tarjeta muestra en qué etapa está la oportunidad',
            'Una cotización avanza automáticamente cuando generas OC, factura o guía',
            'Haz clic en cualquier tarjeta para ir al detalle de la cotización',
          ]}
        />
      </div>
      <PipelineBoard cards={cards} companySlug={companySlug} />
    </div>
  );
}
