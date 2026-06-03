'use server';

import { and, eq, ilike, or } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { clientes, cotizaciones, productos } from '@/lib/db/schema';

export type SearchResult = {
  tipo: 'cliente' | 'producto' | 'cotizacion';
  id: string;
  titulo: string;
  subtitulo: string;
  href: string;
};

export async function buscarGlobal(q: string): Promise<SearchResult[]> {
  const trimmed = q?.trim() ?? '';
  if (trimmed.length < 2) return [];

  const { tenant } = await requirePermission('cotizaciones.ver');
  const slug = tenant.slug;
  const like = `%${trimmed}%`;

  const [clienteRows, productoRows, cotizRows] = await Promise.all([
    db
      .select({
        id: clientes.id,
        razonSocial: clientes.razonSocial,
        tipoDocumento: clientes.tipoDocumento,
        numeroDocumento: clientes.numeroDocumento,
        esCliente: clientes.esCliente,
      })
      .from(clientes)
      .where(
        and(
          eq(clientes.tenantId, tenant.id),
          eq(clientes.esCliente, true),
          or(ilike(clientes.razonSocial, like), ilike(clientes.numeroDocumento, like))
        )
      )
      .limit(5),

    db
      .select({ id: productos.id, nombre: productos.nombre, codigo: productos.codigo })
      .from(productos)
      .where(
        and(
          eq(productos.tenantId, tenant.id),
          or(ilike(productos.nombre, like), ilike(productos.codigo, like))
        )
      )
      .limit(5),

    db
      .select({
        id: cotizaciones.id,
        numero: cotizaciones.numeroCompleto,
        estado: cotizaciones.estado,
        total: cotizaciones.total,
      })
      .from(cotizaciones)
      .where(and(eq(cotizaciones.tenantId, tenant.id), ilike(cotizaciones.numeroCompleto, like)))
      .limit(5),
  ]);

  return [
    ...clienteRows.map((c) => ({
      tipo: 'cliente' as const,
      id: c.id,
      titulo: c.razonSocial ?? c.numeroDocumento,
      subtitulo: `${c.tipoDocumento} ${c.numeroDocumento}`,
      href: `/${slug}/clientes/${c.id}`,
    })),
    ...productoRows.map((p) => ({
      tipo: 'producto' as const,
      id: p.id,
      titulo: p.nombre,
      subtitulo: p.codigo ?? '',
      href: `/${slug}/productos/${p.id}`,
    })),
    ...cotizRows.map((c) => ({
      tipo: 'cotizacion' as const,
      id: c.id,
      titulo: c.numero ?? c.id.slice(0, 8),
      subtitulo: `${c.estado} · S/ ${parseFloat(c.total ?? '0').toFixed(2)}`,
      href: `/${slug}/cotizaciones/${c.id}`,
    })),
  ];
}
