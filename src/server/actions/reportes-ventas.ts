'use server';

import { db } from '@/lib/db/client';
import { sql } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/require-permission';
import { z } from 'zod';

// ─── Schema ──────────────────────────────────────────────────────────────────

const FiltrosSchema = z.object({
  desde: z.string().date(),
  hasta: z.string().date(),
  // comercialId: facturas no tiene un campo directo comercial_id ni creado_por_nombre.
  // El campo emitida_por (uuid) referencia al usuario que emitió la factura, pero no es
  // un "comercial" en sentido estricto. Se filtra por comercialId a través de clientes.comercial_id
  // haciendo JOIN con la tabla clientes cuando se provee este filtro.
  comercialId: z.string().uuid().optional(),
  clienteId: z.string().uuid().optional(),
  groupBy: z.enum(['mes', 'comercial', 'cliente', 'producto']).default('mes'),
});

export type FiltrosVentas = z.infer<typeof FiltrosSchema>;

export interface FilaReporte {
  grupo: string;
  facturas: number;
  total: number;
}

// ─── Action ──────────────────────────────────────────────────────────────────

export async function getReporteVentas(rawFiltros: FiltrosVentas): Promise<FilaReporte[]> {
  await requirePermission('reportes.ver');
  const filtros = FiltrosSchema.parse(rawFiltros);

  // Construir cláusulas WHERE opcionales
  const whereClienteId = filtros.clienteId
    ? sql`AND f.cliente_id = ${filtros.clienteId}::uuid`
    : sql``;

  // comercialId se filtra vía JOIN con clientes (clientes.comercial_id)
  // La tabla facturas no tiene columna comercial_id ni creado_por_nombre directamente.
  const whereComercialId = filtros.comercialId
    ? sql`AND c.comercial_id = ${filtros.comercialId}::uuid`
    : sql``;

  // JOIN con clientes solo si se filtra por comercialId
  const joinClientes =
    filtros.comercialId || filtros.groupBy === 'comercial'
      ? sql`LEFT JOIN clientes c ON c.id = f.cliente_id`
      : sql``;

  // La tenant_id se inyecta vía el header x-tenant-id; la leemos del contexto
  // mediante getCurrentTenant(), pero aquí usamos subquery para seguridad
  // (requirePermission ya valida sesión, getCurrentTenant extrae del header).
  const { getCurrentTenant } = await import('@/lib/auth/current-tenant');
  const tenant = await getCurrentTenant();
  const tenantId = tenant.id;

  // ─── GROUP BY dinámico ────────────────────────────────────────────────────

  let selectGrupo: ReturnType<typeof sql>;
  let groupByClause: ReturnType<typeof sql>;
  let joinLineas: ReturnType<typeof sql> = sql``;

  switch (filtros.groupBy) {
    case 'mes':
      // Formato YYYY-MM para orden cronológico natural
      selectGrupo = sql`TO_CHAR(f.fecha_emision::date, 'YYYY-MM') AS grupo`;
      groupByClause = sql`TO_CHAR(f.fecha_emision::date, 'YYYY-MM')`;
      break;

    case 'comercial':
      // Agrupa por comercial_id del cliente; muestra el uuid como grupo
      // (la UI puede resolver el nombre en el cliente si es necesario)
      // Si no hay JOIN con clientes ya incluido, añadirlo
      selectGrupo = sql`COALESCE(c.comercial_id::text, 'sin_comercial') AS grupo`;
      groupByClause = sql`COALESCE(c.comercial_id::text, 'sin_comercial')`;
      if (!filtros.comercialId) {
        // Asegurar que el JOIN esté presente aunque comercialId no filtre
        joinLineas = sql`LEFT JOIN clientes c ON c.id = f.cliente_id`;
      }
      break;

    case 'cliente':
      selectGrupo = sql`f.cliente_razon_social_snapshot AS grupo`;
      groupByClause = sql`f.cliente_razon_social_snapshot`;
      break;

    case 'producto':
      // Requiere JOIN con lineas_factura y agrupar por producto
      joinLineas = sql`JOIN lineas_factura lf ON lf.factura_id = f.id`;
      selectGrupo = sql`COALESCE(lf.descripcion, lf.sku_snapshot) AS grupo`;
      groupByClause = sql`COALESCE(lf.descripcion, lf.sku_snapshot)`;
      break;
  }

  // Cuando groupBy = 'producto', el total debe sumarse sobre lineas_factura.total
  // para no duplicar el total de la factura por cada línea.
  const selectTotal =
    filtros.groupBy === 'producto'
      ? sql`SUM(lf.total::numeric) AS total`
      : sql`SUM(f.total::numeric) AS total`;

  const selectCount =
    filtros.groupBy === 'producto'
      ? sql`COUNT(DISTINCT f.id)::int AS facturas`
      : sql`COUNT(f.id)::int AS facturas`;

  // Resolver el JOIN a usar: joinClientes toma precedencia si comercialId está activo,
  // joinLineas se aplica para 'producto' o 'comercial' sin filtro
  const joinFinal =
    filtros.comercialId || filtros.groupBy === 'comercial' ? joinClientes : joinLineas;

  const rows = await db.execute<{ grupo: string; facturas: number; total: string }>(sql`
    SELECT
      ${selectGrupo},
      ${selectCount},
      ${selectTotal}
    FROM facturas f
    ${joinFinal}
    WHERE
      f.tenant_id     = ${tenantId}::uuid
      AND f.estado_sunat = 'aceptada'
      AND f.fecha_emision >= ${filtros.desde}::date
      AND f.fecha_emision <= ${filtros.hasta}::date
      ${whereClienteId}
      ${whereComercialId}
    GROUP BY ${groupByClause}
    ORDER BY 1 ASC
  `);

  return rows.map((r) => ({
    grupo: r.grupo ?? '—',
    facturas: Number(r.facturas),
    total: parseFloat(r.total ?? '0'),
  }));
}
