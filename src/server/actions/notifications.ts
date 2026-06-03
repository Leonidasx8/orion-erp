'use server';

import { sql } from 'drizzle-orm';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { db } from '@/lib/db/client';
import { cotizaciones, facturas, ordenesCompra } from '@/lib/db/schema';

export type Notificacion = {
  id: string;
  tipo: 'cxc_vencida' | 'factura_error' | 'oc_pendiente' | 'cotizacion_vencida';
  titulo: string;
  detalle: string;
  urgente: boolean;
  href: string;
};

export async function cargarNotificaciones(): Promise<Notificacion[]> {
  const tenant = await getCurrentTenant();
  const notifs: Notificacion[] = [];

  const [cxcRows, facturaRows, ocRows, cotRows] = await Promise.all([
    // CxC vencida (clientes con saldo vencido)
    db.execute<{ nombre_cliente: string; saldo_vencido: string; cliente_id: string }>(sql`
      SELECT nombre_cliente, saldo_vencido::text, cliente_id::text
      FROM cuentas_por_cobrar
      WHERE tenant_id = ${tenant.id}
        AND saldo_vencido > 0
      ORDER BY saldo_vencido DESC
      LIMIT 5
    `),

    // Facturas con error SUNAT
    db
      .select({
        id: facturas.id,
        numeroCompleto: facturas.numeroCompleto,
        estadoSunat: facturas.estadoSunat,
        clienteRazon: facturas.clienteRazonSocialSnapshot,
      })
      .from(facturas)
      .where(
        sql`${facturas.tenantId} = ${tenant.id}
          AND ${facturas.estadoSunat} IN ('error_red', 'rechazada')`
      )
      .limit(5),

    // OCs en borrador (sin enviar al proveedor)
    db
      .select({
        id: ordenesCompra.id,
        numero: ordenesCompra.numero,
        estado: ordenesCompra.estado,
      })
      .from(ordenesCompra)
      .where(
        sql`${ordenesCompra.tenantId} = ${tenant.id}
          AND ${ordenesCompra.estado} IN ('borrador', 'enviada')`
      )
      .limit(5),

    // Cotizaciones vencidas
    db
      .select({
        id: cotizaciones.id,
        numeroCompleto: cotizaciones.numeroCompleto,
        creadoPorNombre: cotizaciones.creadoPorNombre,
      })
      .from(cotizaciones)
      .where(
        sql`${cotizaciones.tenantId} = ${tenant.id}
          AND ${cotizaciones.estado} = 'vencida'`
      )
      .limit(5),
  ]);

  // CxC vencidas
  for (const r of cxcRows) {
    notifs.push({
      id: `cxc-${r.cliente_id}`,
      tipo: 'cxc_vencida',
      titulo: 'Crédito vencido',
      detalle: `${r.nombre_cliente} · S/ ${parseFloat(r.saldo_vencido).toLocaleString('es-PE', { minimumFractionDigits: 2 })} vencido`,
      urgente: true,
      href: `/${tenant.slug}/credito`,
    });
  }

  // Facturas con error
  for (const r of facturaRows) {
    notifs.push({
      id: `factura-${r.id}`,
      tipo: 'factura_error',
      titulo: r.estadoSunat === 'rechazada' ? 'Factura rechazada SUNAT' : 'Error al enviar a SUNAT',
      detalle: `${r.numeroCompleto ?? '?'} · ${r.clienteRazon}`,
      urgente: r.estadoSunat === 'rechazada',
      href: `/${tenant.slug}/facturas/${r.id}`,
    });
  }

  // OCs pendientes
  for (const r of ocRows) {
    const label =
      r.estado === 'borrador' ? 'OC sin enviar al proveedor' : 'OC esperando aprobación';
    notifs.push({
      id: `oc-${r.id}`,
      tipo: 'oc_pendiente',
      titulo: label,
      detalle: r.numero,
      urgente: false,
      href: `/${tenant.slug}/ordenes/${r.id}`,
    });
  }

  // Cotizaciones vencidas
  for (const r of cotRows) {
    notifs.push({
      id: `cot-${r.id}`,
      tipo: 'cotizacion_vencida',
      titulo: 'Cotización vencida',
      detalle: `${r.numeroCompleto ?? '?'} · ${r.creadoPorNombre ?? '—'}`,
      urgente: false,
      href: `/${tenant.slug}/cotizaciones/${r.id}`,
    });
  }

  // Urgentes primero
  return notifs.sort((a, b) => (b.urgente ? 1 : 0) - (a.urgente ? 1 : 0)).slice(0, 15);
}
