import { and, eq, sql } from 'drizzle-orm';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { userHasPermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { cotizaciones, clientes, cotizacionItems } from '@/lib/db/schema';
import {
  CotizacionesList,
  type CotizacionRow,
} from '@/components/modules/cotizaciones/CotizacionesList';
import type { Estado } from '@/components/shared/EstadoBadge';

export const metadata = { title: 'Cotizaciones' };

const PAGE_SIZE = 20;

const ESTADO_FILTROS = new Set<Estado>([
  'borrador',
  'enviada',
  'aprobada',
  'rechazada',
  'vencida',
  'convertida',
]);

export default async function CotizacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; page?: string }>;
}) {
  const tenant = await getCurrentTenant();
  const sp = await searchParams;
  const filtroActivo = (
    sp.estado && ESTADO_FILTROS.has(sp.estado as Estado) ? (sp.estado as Estado) : 'todas'
  ) as 'todas' | Estado;
  const page = Math.max(1, Number(sp.page) || 1);

  const where =
    filtroActivo === 'todas'
      ? eq(cotizaciones.tenantId, tenant.id)
      : and(eq(cotizaciones.tenantId, tenant.id), eq(cotizaciones.estado, filtroActivo));

  const [canCreate, rowsRaw, countsRaw] = await Promise.all([
    userHasPermission('cotizaciones.crear'),
    db
      .select({
        id: cotizaciones.id,
        numero: cotizaciones.numeroCompleto,
        clienteRazon: clientes.razonSocial,
        clienteNombres: clientes.nombres,
        clienteApellidoPaterno: clientes.apellidoPaterno,
        estado: cotizaciones.estado,
        fechaEmision: cotizaciones.fechaEmision,
        fechaVencimiento: cotizaciones.fechaVencimiento,
        total: cotizaciones.total,
        moneda: cotizaciones.moneda,
        items: sql<number>`(SELECT COUNT(*)::int FROM ${cotizacionItems} WHERE ${cotizacionItems.cotizacionId} = ${cotizaciones.id})`,
      })
      .from(cotizaciones)
      .leftJoin(clientes, eq(clientes.id, cotizaciones.clienteId))
      .where(where)
      .orderBy(sql`${cotizaciones.createdAt} DESC`)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({
        estado: cotizaciones.estado,
        n: sql<number>`COUNT(*)::int`,
        totalUsd: sql<number>`COALESCE(SUM(CASE WHEN ${cotizaciones.moneda} = 'USD' THEN ${cotizaciones.total} ELSE 0 END), 0)::numeric`,
      })
      .from(cotizaciones)
      .where(eq(cotizaciones.tenantId, tenant.id))
      .groupBy(cotizaciones.estado),
  ]);

  const counts = {
    total: 0,
    borrador: 0,
    enviada: 0,
    aprobada: 0,
    rechazada: 0,
    vencida: 0,
    convertida: 0,
  };
  let pipelineUsd = 0;
  for (const c of countsRaw) {
    counts.total += c.n;
    if (c.estado in counts) {
      counts[c.estado as keyof typeof counts] = c.n;
    }
    if (c.estado === 'borrador' || c.estado === 'enviada') {
      pipelineUsd += Number(c.totalUsd);
    }
  }

  const rows: CotizacionRow[] = rowsRaw.map((r) => ({
    id: r.id,
    numero: r.numero ?? '—',
    cliente: clienteDisplay(r),
    estado: r.estado as Estado,
    fechaEmision: formatDate(r.fechaEmision) ?? '—',
    fechaVencimiento: formatDate(r.fechaVencimiento),
    items: r.items ?? 0,
    total: Number(r.total),
    moneda: r.moneda,
    comercial: '—', // TODO: join con tenant_members o auditoría cuando esté disponible
  }));

  return (
    <CotizacionesList
      tenantSlug={tenant.slug}
      rows={rows}
      counts={counts}
      pipelineUsd={pipelineUsd}
      canCreate={canCreate}
      filtroActivo={filtroActivo}
      page={page}
      pageSize={PAGE_SIZE}
    />
  );
}

function clienteDisplay(r: {
  clienteRazon: string | null;
  clienteNombres: string | null;
  clienteApellidoPaterno: string | null;
}): string {
  if (r.clienteRazon) return r.clienteRazon;
  return [r.clienteNombres, r.clienteApellidoPaterno].filter(Boolean).join(' ') || '—';
}

function formatDate(iso: string | null): string | null {
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
  return `${d.getDate()} ${meses[d.getMonth()]}`;
}
