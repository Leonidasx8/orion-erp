'use server';

import { and, eq, gte, lte, desc } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { historialPrecios, productos } from '@/lib/db/schema';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { requirePermission } from '@/lib/auth/require-permission';

export interface FilaPrecio {
  fecha: string;
  comercial: string;
  sku: string;
  producto: string;
  precioAnterior: number;
  precioNuevo: number;
  variacionPct: number;
  razon: string;
}

export async function reportePrecios(args: {
  desde: string;
  hasta: string;
  comercial?: string;
}): Promise<FilaPrecio[]> {
  await requirePermission('reportes.ver');
  const tenant = await getCurrentTenant();

  const rows = await db
    .select({
      fecha: historialPrecios.createdAt,
      comercial: historialPrecios.creadoPorNombre,
      sku: productos.codigo,
      producto: productos.nombre,
      precioAnterior: historialPrecios.precioAnterior,
      precioNuevo: historialPrecios.precioNuevo,
      razon: historialPrecios.razon,
    })
    .from(historialPrecios)
    .innerJoin(productos, eq(productos.id, historialPrecios.productoId))
    .where(
      and(
        eq(historialPrecios.tenantId, tenant.id),
        gte(historialPrecios.createdAt, new Date(args.desde)),
        lte(historialPrecios.createdAt, new Date(args.hasta + 'T23:59:59'))
      )
    )
    .orderBy(desc(historialPrecios.createdAt));

  return rows
    .filter((r) => !args.comercial || r.comercial === args.comercial)
    .map((r) => {
      const ant = parseFloat((r.precioAnterior as string) ?? '0');
      const nue = parseFloat((r.precioNuevo as string) ?? '0');
      return {
        fecha: (r.fecha as Date).toISOString().slice(0, 16).replace('T', ' '),
        comercial: r.comercial ?? '—',
        sku: r.sku ?? '',
        producto: r.producto ?? '',
        precioAnterior: ant,
        precioNuevo: nue,
        variacionPct: ant > 0 ? ((nue - ant) / ant) * 100 : 0,
        razon: r.razon ?? '',
      };
    });
}
