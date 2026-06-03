import Link from 'next/link';
import { and, eq, sql } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/require-permission';
import { userHasPermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { facturas, cotizaciones } from '@/lib/db/schema';
import { FacturasList, type FacturaRow } from '@/components/modules/facturas/FacturasList';
import { ModuleHelp } from '@/components/shared/ModuleHelp';
import { Plus } from 'lucide-react';

export const metadata = { title: 'Facturas' };

const PAGE_SIZE = 20;

const ESTADOS_VALIDOS = new Set(['pendiente', 'aceptada', 'rechazada', 'anulada']);

function formatDate(iso: string | null): string {
  if (!iso) return '—';
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

export default async function FacturasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; page?: string; clienteId?: string }>;
}) {
  const { tenant } = await requirePermission('facturas.ver');
  const canCreate = await userHasPermission('facturas.crear');
  const sp = await searchParams;
  const filtroActivo = sp.estado && ESTADOS_VALIDOS.has(sp.estado) ? sp.estado : 'todas';
  const page = Math.max(1, Number(sp.page) || 1);
  const clienteIdFilter = sp.clienteId ?? null;

  const baseConditions = [eq(facturas.tenantId, tenant.id)];
  if (filtroActivo !== 'todas') baseConditions.push(eq(facturas.estadoSunat, filtroActivo));
  if (clienteIdFilter) baseConditions.push(eq(facturas.clienteId, clienteIdFilter));
  const estadoFilter = baseConditions.length === 1 ? baseConditions[0] : and(...baseConditions);

  const [rowsRaw, [{ total }], sunatRaw] = await Promise.all([
    db
      .select({
        id: facturas.id,
        numeroCompleto: facturas.numeroCompleto,
        tipoDocumento: facturas.tipoDocumento,
        fechaEmision: facturas.fechaEmision,
        clienteRazon: facturas.clienteRazonSocialSnapshot,
        moneda: facturas.moneda,
        total: facturas.total,
        estado: facturas.estado,
        estadoSunat: facturas.estadoSunat,
        cotizacionNumero: cotizaciones.numeroCompleto,
      })
      .from(facturas)
      .leftJoin(cotizaciones, eq(cotizaciones.id, facturas.cotizacionOrigenId))
      .where(estadoFilter)
      .orderBy(sql`${facturas.createdAt} DESC`)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(facturas)
      .where(estadoFilter),
    db.execute<{ estado_sunat: string; n: string }>(sql`
      SELECT estado_sunat, COUNT(*)::text AS n
      FROM facturas
      WHERE tenant_id = ${tenant.id}
      GROUP BY estado_sunat
    `),
  ]);

  const sunatMap = Object.fromEntries(
    (sunatRaw as { estado_sunat: string; n: string }[]).map((r) => [
      r.estado_sunat,
      parseInt(r.n, 10),
    ])
  );
  const sunatCounts = {
    aceptadas: sunatMap['aceptada'] ?? 0,
    pendientes: sunatMap['pendiente'] ?? 0,
    rechazadas: sunatMap['rechazada'] ?? 0,
    anuladas: sunatMap['anulada'] ?? 0,
  };

  const rows: FacturaRow[] = rowsRaw.map((r) => ({
    id: r.id,
    numeroCompleto: r.numeroCompleto ?? '—',
    tipoDocumento: r.tipoDocumento,
    fechaEmision: formatDate(r.fechaEmision),
    clienteRazon: r.clienteRazon,
    moneda: r.moneda,
    total: r.total,
    estado: r.estado,
    estadoSunat: r.estadoSunat,
    cotizacionNumero: r.cotizacionNumero ?? null,
  }));

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-orion-fg">Facturas y Boletas</h1>
          <ModuleHelp
            module="facturas"
            title="Facturas y Boletas"
            description="Emite facturas y boletas electrónicas a SUNAT vía Nubefact. Se generan desde cotizaciones aceptadas o directamente desde aquí."
            tips={[
              'Las facturas se envían automáticamente a Nubefact cada 60 segundos',
              'Estado SUNAT: Pendiente → Aceptada (con PDF/CDR) o Rechazada (ver motivo)',
              'Para anular: usa "Generar Nota de Crédito" desde el detalle',
            ]}
          />
        </div>
        {canCreate && (
          <div className="flex items-center gap-2">
            <Link
              href={`/${tenant.slug}/facturas/nueva?tipo=03`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] font-medium text-orion-fg hover:bg-orion-bg-muted"
            >
              <Plus size={13} />
              Nueva boleta
            </Link>
            <Link
              href={`/${tenant.slug}/facturas/nueva`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-tenant-accent px-3 text-[13px] font-medium text-white hover:brightness-95"
            >
              <Plus size={13} />
              Nueva factura
            </Link>
          </div>
        )}
      </div>
      <FacturasList
        rows={rows}
        filtroActivo={filtroActivo}
        total={total ?? 0}
        page={page}
        companySlug={tenant.slug}
        sunatCounts={sunatCounts}
      />
    </div>
  );
}
