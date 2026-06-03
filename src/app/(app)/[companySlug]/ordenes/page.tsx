import { and, eq, inArray, sql } from 'drizzle-orm';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { userHasPermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { clientes, lineasOrdenCompra, ordenesCompra } from '@/lib/db/schema';
import { OrdenesList, type OrdenRow } from '@/components/modules/ordenes/OrdenesList';
import type { Estado } from '@/components/shared/EstadoBadge';

export const metadata = { title: 'Compras a Proveedores' };

const PAGE_SIZE = 20;

const ESTADO_FILTROS = new Set<Estado>([
  'borrador',
  'enviada',
  'aprobada',
  'recibida_parcial',
  'recibida_total',
  'cerrada',
]);

export default async function OrdenesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; page?: string }>;
}) {
  const tenant = await getCurrentTenant();
  const sp = await searchParams;
  const rawEstado = sp.estado ?? '';
  const filtroActivo: 'todas' | Estado | 'pendiente_recepcion' =
    rawEstado === 'pendiente_recepcion'
      ? 'pendiente_recepcion'
      : rawEstado && ESTADO_FILTROS.has(rawEstado as Estado)
        ? (rawEstado as Estado)
        : 'todas';
  const page = Math.max(1, Number(sp.page) || 1);

  const where =
    filtroActivo === 'pendiente_recepcion'
      ? and(
          eq(ordenesCompra.tenantId, tenant.id),
          inArray(ordenesCompra.estado, ['aprobada', 'recibida_parcial'])
        )
      : filtroActivo === 'todas'
        ? eq(ordenesCompra.tenantId, tenant.id)
        : and(eq(ordenesCompra.tenantId, tenant.id), eq(ordenesCompra.estado, filtroActivo));

  const [canCreate, rowsRaw, countsRaw] = await Promise.all([
    userHasPermission('ordenes.crear'),
    db
      .select({
        id: ordenesCompra.id,
        numero: ordenesCompra.numero,
        proveedorRazon: clientes.razonSocial,
        proveedorNombres: clientes.nombres,
        proveedorApellido: clientes.apellidoPaterno,
        estado: ordenesCompra.estado,
        fechaEmision: ordenesCompra.fechaEmision,
        fechaEntrega: ordenesCompra.fechaEntregaEsperada,
        total: ordenesCompra.total,
        moneda: ordenesCompra.moneda,
        lineas: sql<number>`(SELECT COUNT(*)::int FROM ${lineasOrdenCompra} WHERE ${lineasOrdenCompra.ordenId} = ${ordenesCompra.id})`,
        cantidad: sql<number>`(SELECT COALESCE(SUM(${lineasOrdenCompra.cantidad}), 0) FROM ${lineasOrdenCompra} WHERE ${lineasOrdenCompra.ordenId} = ${ordenesCompra.id})`,
        recibida: sql<number>`(SELECT COALESCE(SUM(${lineasOrdenCompra.cantidadRecibida}), 0) FROM ${lineasOrdenCompra} WHERE ${lineasOrdenCompra.ordenId} = ${ordenesCompra.id})`,
        compradorNombre: ordenesCompra.compradorNombre,
      })
      .from(ordenesCompra)
      .leftJoin(clientes, eq(clientes.id, ordenesCompra.proveedorId))
      .where(where)
      .orderBy(sql`${ordenesCompra.createdAt} DESC`)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({
        estado: ordenesCompra.estado,
        n: sql<number>`COUNT(*)::int`,
        totalUsd: sql<number>`COALESCE(SUM(CASE WHEN ${ordenesCompra.moneda} = 'USD' THEN ${ordenesCompra.total} ELSE 0 END), 0)::numeric`,
      })
      .from(ordenesCompra)
      .where(eq(ordenesCompra.tenantId, tenant.id))
      .groupBy(ordenesCompra.estado),
  ]);

  const counts = {
    total: 0,
    borrador: 0,
    enviada: 0,
    aprobada: 0,
    recibida_parcial: 0,
    recibida_total: 0,
    cerrada: 0,
  };
  let pendienteUsd = 0;
  for (const c of countsRaw) {
    counts.total += c.n;
    if (c.estado in counts) {
      counts[c.estado as keyof typeof counts] = c.n;
    }
    if (c.estado === 'enviada' || c.estado === 'aprobada' || c.estado === 'recibida_parcial') {
      pendienteUsd += Number(c.totalUsd);
    }
  }

  const rows: OrdenRow[] = rowsRaw.map((r) => {
    const cant = Number(r.cantidad) || 0;
    const recib = Number(r.recibida) || 0;
    return {
      id: r.id,
      numero: r.numero,
      proveedor: proveedorDisplay(r),
      estado: r.estado as Estado,
      fechaEmision: formatDate(r.fechaEmision) ?? '—',
      fechaEntrega: formatDate(r.fechaEntrega),
      lineas: r.lineas ?? 0,
      total: Number(r.total),
      moneda: r.moneda,
      recibidoPct: cant > 0 ? (recib / cant) * 100 : 0,
      compradorNombre: r.compradorNombre ?? '—',
    };
  });

  return (
    <OrdenesList
      tenantSlug={tenant.slug}
      rows={rows}
      counts={counts}
      pendienteUsd={pendienteUsd}
      canCreate={canCreate}
      filtroActivo={filtroActivo}
      page={page}
      pageSize={PAGE_SIZE}
    />
  );
}

function proveedorDisplay(r: {
  proveedorRazon: string | null;
  proveedorNombres: string | null;
  proveedorApellido: string | null;
}): string {
  if (r.proveedorRazon) return r.proveedorRazon;
  return [r.proveedorNombres, r.proveedorApellido].filter(Boolean).join(' ') || '—';
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
