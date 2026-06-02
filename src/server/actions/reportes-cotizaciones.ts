'use server';

import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { cotizaciones } from '@/lib/db/schema';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { requirePermission } from '@/lib/auth/require-permission';

export interface FilaReporteCot {
  comercial: string;
  total: number;
  borrador: number;
  enviada: number;
  aceptada: number;
  rechazada: number;
  vencida: number;
  convertida: number;
  montoTotal: number;
  montoAceptado: number;
}

export async function reporteCotizaciones(args: {
  desde: string;
  hasta: string;
  comercial?: string;
  estado?: string;
}): Promise<FilaReporteCot[]> {
  await requirePermission('reportes.ver');
  const tenant = await getCurrentTenant();

  const rows = await db
    .select()
    .from(cotizaciones)
    .where(
      and(
        eq(cotizaciones.tenantId, tenant.id),
        gte(cotizaciones.createdAt, new Date(args.desde)),
        lte(cotizaciones.createdAt, new Date(args.hasta + 'T23:59:59'))
      )
    );

  const map = new Map<string, FilaReporteCot>();
  for (const c of rows) {
    if (args.comercial && c.creadoPorNombre !== args.comercial) continue;
    if (args.estado && c.estado !== args.estado) continue;

    const key = c.creadoPorNombre ?? '—';
    const f: FilaReporteCot = map.get(key) ?? {
      comercial: key,
      total: 0,
      borrador: 0,
      enviada: 0,
      aceptada: 0,
      rechazada: 0,
      vencida: 0,
      convertida: 0,
      montoTotal: 0,
      montoAceptado: 0,
    };

    f.total++;
    const est = c.estado as string;
    if (est === 'borrador') f.borrador++;
    else if (est === 'enviada') f.enviada++;
    else if (est === 'aceptada') f.aceptada++;
    else if (est === 'rechazada') f.rechazada++;
    else if (est === 'vencida') f.vencida++;
    else if (est === 'convertida') f.convertida++;

    const monto = parseFloat((c.total as string) ?? '0');
    f.montoTotal += monto;
    if (est === 'aceptada' || est === 'convertida') f.montoAceptado += monto;

    map.set(key, f);
  }

  return [...map.values()].sort((a, b) => b.montoTotal - a.montoTotal);
}
