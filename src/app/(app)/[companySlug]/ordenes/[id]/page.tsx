import { and, asc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { userHasPermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { clientes, lineasOrdenCompra, ordenesCompra } from '@/lib/db/schema';
import { OrdenDetalle, type OrdenDetalleData } from '@/components/modules/ordenes/OrdenDetalle';
import type { Estado } from '@/components/shared/EstadoBadge';

export const metadata = { title: 'Orden de compra' };

export default async function OrdenDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await getCurrentTenant();

  const [row] = await db
    .select({
      id: ordenesCompra.id,
      numero: ordenesCompra.numero,
      estado: ordenesCompra.estado,
      moneda: ordenesCompra.moneda,
      tipoCambio: ordenesCompra.tipoCambio,
      fechaEmision: ordenesCompra.fechaEmision,
      fechaEntrega: ordenesCompra.fechaEntregaEsperada,
      subtotal: ordenesCompra.subtotal,
      igv: ordenesCompra.igv,
      total: ordenesCompra.total,
      terminosPago: ordenesCompra.terminosPago,
      direccionEntrega: ordenesCompra.direccionEntrega,
      observaciones: ordenesCompra.observaciones,
      compradorNombre: ordenesCompra.compradorNombre,
      proveedorRazon: clientes.razonSocial,
      proveedorNombres: clientes.nombres,
      proveedorApellido: clientes.apellidoPaterno,
    })
    .from(ordenesCompra)
    .leftJoin(clientes, eq(clientes.id, ordenesCompra.proveedorId))
    .where(and(eq(ordenesCompra.id, id), eq(ordenesCompra.tenantId, tenant.id)))
    .limit(1);

  if (!row) notFound();

  const [lineas, canEnviar, canAprobar, canRecibir] = await Promise.all([
    db
      .select({
        id: lineasOrdenCompra.id,
        sku: lineasOrdenCompra.skuSnapshot,
        descripcion: lineasOrdenCompra.descripcion,
        cantidad: lineasOrdenCompra.cantidad,
        cantidadRecibida: lineasOrdenCompra.cantidadRecibida,
        precioUnitario: lineasOrdenCompra.precioUnitario,
        subtotal: lineasOrdenCompra.subtotal,
      })
      .from(lineasOrdenCompra)
      .where(eq(lineasOrdenCompra.ordenId, id))
      .orderBy(asc(lineasOrdenCompra.orden)),
    userHasPermission('ordenes.enviar'),
    userHasPermission('ordenes.aprobar'),
    userHasPermission('ordenes.recibir'),
  ]);

  const data: OrdenDetalleData = {
    id: row.id,
    numero: row.numero,
    estado: row.estado as Estado,
    proveedor: proveedorDisplay(row),
    comprador: row.compradorNombre ?? '—',
    fechaEmisionDisplay: formatDateLong(row.fechaEmision) ?? '—',
    fechaEntregaDisplay: formatDateLong(row.fechaEntrega),
    moneda: row.moneda,
    tipoCambio: row.tipoCambio ? Number(row.tipoCambio) : null,
    lineas: lineas.map((l) => ({
      id: l.id,
      sku: l.sku,
      descripcion: l.descripcion,
      cantidad: Number(l.cantidad),
      cantidadRecibida: Number(l.cantidadRecibida),
      precioUnitario: Number(l.precioUnitario),
      subtotal: Number(l.subtotal),
    })),
    totales: {
      subtotal: Number(row.subtotal),
      igv: Number(row.igv),
      total: Number(row.total),
    },
    terminos: {
      pago: row.terminosPago ?? '—',
      entrega: row.direccionEntrega ?? '—',
      observaciones: row.observaciones,
    },
    permissions: {
      enviar: canEnviar,
      aprobar: canAprobar,
      recibir: canRecibir,
      cerrar: canAprobar,
      editar: false, // TODO: backend de actualizarOrdenCompra pendiente
    },
  };

  return <OrdenDetalle data={data} tenantSlug={tenant.slug} />;
}

function proveedorDisplay(r: {
  proveedorRazon: string | null;
  proveedorNombres: string | null;
  proveedorApellido: string | null;
}): string {
  if (r.proveedorRazon) return r.proveedorRazon;
  return [r.proveedorNombres, r.proveedorApellido].filter(Boolean).join(' ') || '—';
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
