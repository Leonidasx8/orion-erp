import { and, asc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { userHasPermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { clientes, cotizacionItems, cotizaciones } from '@/lib/db/schema';
import {
  CotizacionDetalle,
  type CotizacionDetalleData,
  type TimelineEvento,
} from '@/components/modules/cotizaciones/CotizacionDetalle';
import type { Estado } from '@/components/shared/EstadoBadge';

export const metadata = { title: 'Cotización' };

export default async function CotizacionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await getCurrentTenant();

  const [row] = await db
    .select({
      id: cotizaciones.id,
      numero: cotizaciones.numeroCompleto,
      estado: cotizaciones.estado,
      moneda: cotizaciones.moneda,
      tipoCambio: cotizaciones.tipoCambio,
      fechaEmision: cotizaciones.fechaEmision,
      fechaVencimiento: cotizaciones.fechaVencimiento,
      subtotal: cotizaciones.subtotal,
      igv: cotizaciones.igv,
      total: cotizaciones.total,
      notas: cotizaciones.notas,
      terminosCondiciones: cotizaciones.terminosCondiciones,
      enviadaAt: cotizaciones.enviadaAt,
      aceptadaAt: cotizaciones.aceptadaAt,
      rechazadaAt: cotizaciones.rechazadaAt,
      motivoRechazo: cotizaciones.motivoRechazo,
      createdAt: cotizaciones.createdAt,
      creadoPorNombre: cotizaciones.creadoPorNombre,
      formaPago: cotizaciones.formaPago,
      tiempoEntrega: cotizaciones.tiempoEntrega,
      lugarEntrega: cotizaciones.lugarEntrega,
      clienteRazon: clientes.razonSocial,
      clienteNombres: clientes.nombres,
      clienteApellidoPaterno: clientes.apellidoPaterno,
    })
    .from(cotizaciones)
    .leftJoin(clientes, eq(clientes.id, cotizaciones.clienteId))
    .where(and(eq(cotizaciones.id, id), eq(cotizaciones.tenantId, tenant.id)))
    .limit(1);

  if (!row) notFound();

  const [items, canEnviar, canAprobar, canRechazar, canDuplicar, canReenviar] = await Promise.all([
    db
      .select({
        id: cotizacionItems.id,
        codigo: cotizacionItems.codigo,
        descripcion: cotizacionItems.descripcion,
        cantidad: cotizacionItems.cantidad,
        precioUnitario: cotizacionItems.precioUnitario,
        subtotal: cotizacionItems.subtotal,
      })
      .from(cotizacionItems)
      .where(eq(cotizacionItems.cotizacionId, id))
      .orderBy(asc(cotizacionItems.orden)),
    userHasPermission('cotizaciones.enviar'),
    userHasPermission('cotizaciones.aprobar'),
    userHasPermission('cotizaciones.rechazar'),
    userHasPermission('cotizaciones.crear'),
    userHasPermission('cotizaciones.enviar'),
  ]);

  const data: CotizacionDetalleData = {
    id: row.id,
    numero: row.numero ?? '—',
    estado: row.estado as Estado,
    cliente: clienteDisplay(row),
    comercial: row.creadoPorNombre ?? '—',
    fechaEmisionDisplay: formatDateLong(row.fechaEmision) ?? '—',
    fechaVencimientoDisplay: formatDateLong(row.fechaVencimiento),
    vencimientoTag: vencimientoTag(row.fechaVencimiento, row.estado as Estado),
    moneda: row.moneda,
    tipoCambio: row.tipoCambio ? Number(row.tipoCambio) : null,
    items: items.map((it) => ({
      id: it.id,
      sku: it.codigo,
      descripcion: it.descripcion,
      cantidad: Number(it.cantidad),
      precioUnitario: Number(it.precioUnitario),
      subtotal: Number(it.subtotal),
    })),
    totales: {
      subtotal: Number(row.subtotal),
      igv: Number(row.igv),
      total: Number(row.total),
    },
    terminos: {
      pago: row.formaPago ?? '—',
      entrega: [row.tiempoEntrega, row.lugarEntrega].filter(Boolean).join(' · ') || '—',
      validez: row.fechaVencimiento ? `Hasta ${formatDateLong(row.fechaVencimiento)}` : '—',
      observaciones: row.notas,
    },
    timeline: buildTimeline(row),
    permissions: {
      enviar: canEnviar,
      aprobar: canAprobar,
      rechazar: canRechazar,
      duplicar: canDuplicar,
      reenviar: canReenviar && row.estado === 'enviada',
    },
  };

  return <CotizacionDetalle data={data} tenantSlug={tenant.slug} />;
}

function clienteDisplay(r: {
  clienteRazon: string | null;
  clienteNombres: string | null;
  clienteApellidoPaterno: string | null;
}): string {
  if (r.clienteRazon) return r.clienteRazon;
  return [r.clienteNombres, r.clienteApellidoPaterno].filter(Boolean).join(' ') || '—';
}

function formatDateLong(iso: string | null): string | null {
  if (!iso) return null;
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

function vencimientoTag(iso: string | null, estado: Estado): string | undefined {
  if (!iso) return undefined;
  if (
    estado === 'aprobada' ||
    estado === 'convertida' ||
    estado === 'pagada' ||
    estado === 'anulada'
  ) {
    return undefined;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)
    return `vencida hace ${Math.abs(diffDays)} día${Math.abs(diffDays) === 1 ? '' : 's'}`;
  if (diffDays === 0) return 'vence hoy';
  if (diffDays === 1) return 'vence en 1 día';
  if (diffDays <= 7) return `vence en ${diffDays} días`;
  return undefined;
}

function buildTimeline(row: {
  estado: string;
  createdAt: Date;
  enviadaAt: Date | null;
  aceptadaAt: Date | null;
  rechazadaAt: Date | null;
  motivoRechazo: string | null;
}): TimelineEvento[] {
  const events: TimelineEvento[] = [];

  events.push({
    id: 'creada',
    tipo: 'done',
    titulo: 'Cotización creada',
    meta: formatDateTime(row.createdAt),
  });

  if (row.enviadaAt) {
    events.push({
      id: 'enviada',
      tipo: row.estado === 'enviada' ? 'active' : 'done',
      titulo: 'Enviada al cliente',
      meta: formatDateTime(row.enviadaAt),
    });
  }

  if (row.aceptadaAt) {
    events.push({
      id: 'aprobada',
      tipo: 'done',
      titulo: 'Aprobada por el cliente',
      meta: formatDateTime(row.aceptadaAt),
    });
  }

  if (row.rechazadaAt) {
    events.push({
      id: 'rechazada',
      tipo: 'error',
      titulo: 'Rechazada',
      meta: row.motivoRechazo
        ? `${formatDateTime(row.rechazadaAt)} · ${row.motivoRechazo}`
        : formatDateTime(row.rechazadaAt),
    });
  }

  if (row.estado === 'borrador') {
    events.push({
      id: 'pendiente-envio',
      tipo: 'active',
      titulo: 'Pendiente de envío',
      meta: 'En borrador',
    });
  }

  return events;
}

function formatDateTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return String(d);
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
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${date.getDate()} ${meses[date.getMonth()]} ${date.getFullYear()} · ${hh}:${mm}`;
}
