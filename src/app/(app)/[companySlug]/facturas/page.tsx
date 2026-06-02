import { and, eq, sql } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { facturas } from '@/lib/db/schema';
import { FacturasList, type FacturaRow } from '@/components/modules/facturas/FacturasList';
import { ModuleHelp } from '@/components/shared/ModuleHelp';

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
  const sp = await searchParams;
  const filtroActivo = sp.estado && ESTADOS_VALIDOS.has(sp.estado) ? sp.estado : 'todas';
  const page = Math.max(1, Number(sp.page) || 1);
  const clienteIdFilter = sp.clienteId ?? null;

  const baseConditions = [eq(facturas.tenantId, tenant.id)];
  if (filtroActivo !== 'todas') baseConditions.push(eq(facturas.estadoSunat, filtroActivo));
  if (clienteIdFilter) baseConditions.push(eq(facturas.clienteId, clienteIdFilter));
  const estadoFilter = baseConditions.length === 1 ? baseConditions[0] : and(...baseConditions);

  const [rowsRaw, [{ total }]] = await Promise.all([
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
      })
      .from(facturas)
      .where(estadoFilter)
      .orderBy(sql`${facturas.createdAt} DESC`)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(facturas)
      .where(estadoFilter),
  ]);

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
      </div>
      <FacturasList
        rows={rows}
        filtroActivo={filtroActivo}
        total={total ?? 0}
        page={page}
        companySlug={tenant.slug}
      />
    </div>
  );
}
