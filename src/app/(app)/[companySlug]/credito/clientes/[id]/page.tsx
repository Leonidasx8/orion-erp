import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sql, eq, and, desc, inArray } from 'drizzle-orm';
import { requirePermissionPage } from '@/lib/auth/require-permission';
import { userHasPermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { clientes, creditosCliente, facturas, pagos } from '@/lib/db/schema';
import { Money } from '@/components/shared/Money';
import { CreditoForm } from '@/components/modules/credito/CreditoForm';
import { BloqueoActions } from '@/components/modules/credito/BloqueoActions';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Detalle cliente — CxC' };

function formatDate(val: string | Date | null): string {
  if (!val) return '—';
  const d = new Date(val as string);
  if (Number.isNaN(d.getTime())) return String(val);
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

function estadoFacturaBadge(estado: string) {
  const map: Record<string, string> = {
    pagada: 'bg-success-soft text-success-fg',
    emitida: 'bg-info-soft text-info-fg',
    borrador: 'bg-orion-bg-muted text-orion-fg-muted',
    anulada: 'bg-orion-bg-muted text-orion-fg-faint',
  };
  const labels: Record<string, string> = {
    pagada: 'Pagada',
    emitida: 'Emitida',
    borrador: 'Borrador',
    anulada: 'Anulada',
  };
  const cls = map[estado] ?? 'bg-orion-bg-muted text-orion-fg-muted';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        cls
      )}
    >
      {labels[estado] ?? estado}
    </span>
  );
}

export default async function ClienteCxCDetallePage({
  params,
}: {
  params: Promise<{ companySlug: string; id: string }>;
}) {
  const { companySlug, id } = await params;

  // Guard: Next.js enruta "nuevo" a este [id] — redirigir antes de tocar la DB
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(id)) notFound();

  const { tenant } = await requirePermissionPage('credito.ver', companySlug);

  const [canOtorgar, canPago] = await Promise.all([
    userHasPermission('credito.otorgar'),
    userHasPermission('credito.registrar_pago'),
  ]);

  // Cliente
  const [cliente] = await db
    .select()
    .from(clientes)
    .where(and(eq(clientes.id, id), eq(clientes.tenantId, tenant.id)))
    .limit(1);

  if (!cliente) notFound();

  // Crédito actual
  const [credito] = await db
    .select()
    .from(creditosCliente)
    .where(eq(creditosCliente.clienteId, id))
    .limit(1);

  // Facturas pendientes + pagadas (últimas 20)
  const facturasRows = await db
    .select({
      id: facturas.id,
      numeroCompleto: facturas.numeroCompleto,
      fechaEmision: facturas.fechaEmision,
      fechaVencimiento: facturas.fechaVencimiento,
      moneda: facturas.moneda,
      total: facturas.total,
      estado: facturas.estado,
      estadoSunat: facturas.estadoSunat,
    })
    .from(facturas)
    .where(and(eq(facturas.clienteId, id), eq(facturas.tenantId, tenant.id)))
    .orderBy(desc(facturas.fechaEmision))
    .limit(20);

  // Suma de pagos por factura (para calcular saldo)
  const pagosSumaRaw =
    facturasRows.length > 0
      ? await db.execute<{ factura_id: string; total_pagado: string }>(sql`
          SELECT factura_id, COALESCE(SUM(monto), 0)::text AS total_pagado
          FROM pagos
          WHERE tenant_id = ${tenant.id}
            AND factura_id = ANY(${sql`ARRAY[${sql.join(
              facturasRows.map((f) => sql`${f.id}::uuid`),
              sql`, `
            )}]`})
          GROUP BY factura_id
        `)
      : [];

  const pagosPorFactura = new Map(
    (pagosSumaRaw as unknown as Array<{ factura_id: string; total_pagado: string }>).map((r) => [
      r.factura_id,
      Number(r.total_pagado),
    ])
  );

  // Historial de pagos recientes — filtrado solo a las facturas de este cliente
  const facturaIds = facturasRows.map((f) => f.id);
  const pagosHistorial =
    facturaIds.length > 0
      ? await db
          .select({
            id: pagos.id,
            facturaId: pagos.facturaId,
            monto: pagos.monto,
            moneda: pagos.moneda,
            fechaPago: pagos.fechaPago,
            metodo: pagos.metodo,
            referencia: pagos.referencia,
            createdAt: pagos.createdAt,
          })
          .from(pagos)
          .where(and(eq(pagos.tenantId, tenant.id), inArray(pagos.facturaId, facturaIds)))
          .orderBy(desc(pagos.createdAt))
          .limit(20)
      : [];

  const nombreCliente =
    cliente.tipoPersona === 'juridica'
      ? (cliente.razonSocial ?? '—')
      : [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno]
          .filter(Boolean)
          .join(' ') || '—';

  const lineaCredito = Number(credito?.lineaCredito ?? 0);
  const plazoDias = credito?.plazoDias ?? 0;
  const bloqueado = credito?.bloqueado ?? false;
  const motivoBloqueoUsd = credito?.motivoBloqueo ?? null;
  const lineaCreditoPen = Number(credito?.lineaCreditoPen ?? 0);
  const plazoDiasPen = credito?.plazoDiasPen ?? 0;
  const bloqueadoPen = credito?.bloqueadoPen ?? false;
  const motivoBloqueopPen = credito?.motivoBloqueopPen ?? null;

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb + header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <nav className="mb-1 text-xs text-orion-fg-faint">
            <Link href={`/${companySlug}/credito`} className="hover:text-orion-accent">
              Crédito y CxC
            </Link>
            {' / '}
            <span>{nombreCliente}</span>
          </nav>
          <h1 className="text-xl font-semibold text-orion-fg">{nombreCliente}</h1>
          <p className="mt-0.5 text-sm text-orion-fg-muted">
            {cliente.tipoDocumento?.toUpperCase()} {cliente.numeroDocumento}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          {canPago && facturasRows.some((f) => f.estadoSunat === 'aceptada') && (
            <Link
              href={`/${companySlug}/credito/pagos/nuevo?clienteId=${id}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-tenant-accent px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Registrar pago
            </Link>
          )}
        </div>
      </div>

      {/* Línea de crédito actual */}
      <div className="rounded-lg border border-orion-border p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-orion-fg">Línea de crédito</h2>
          {bloqueado && (
            <span className="inline-flex items-center rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger-fg">
              Cuenta bloqueada
            </span>
          )}
        </div>

        <div className="mb-5 grid grid-cols-2 gap-6">
          {/* USD */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-orion-fg-faint">
              USD — Dólares
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-orion-fg-faint">Línea aprobada</p>
                <p className="mt-0.5 text-lg font-bold text-orion-fg">
                  <Money value={lineaCredito} ccy="USD" />
                </p>
              </div>
              <div>
                <p className="text-xs text-orion-fg-faint">Plazo</p>
                <p className="mt-0.5 text-lg font-bold text-orion-fg">
                  {plazoDias === 0 ? 'Contado' : `${plazoDias} días`}
                </p>
              </div>
            </div>
          </div>
          {/* PEN */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-orion-fg-faint">
              PEN — Soles
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-orion-fg-faint">Línea aprobada</p>
                <p className="mt-0.5 text-lg font-bold text-orion-fg">
                  <Money value={lineaCreditoPen} ccy="PEN" />
                </p>
              </div>
              <div>
                <p className="text-xs text-orion-fg-faint">Plazo</p>
                <p className="mt-0.5 text-lg font-bold text-orion-fg">
                  {plazoDiasPen === 0 ? 'Contado' : `${plazoDiasPen} días`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Botones bloquear/desbloquear */}
        {canOtorgar && (
          <BloqueoActions
            clienteId={id}
            bloqueado={bloqueado}
            motivoBloqueo={motivoBloqueoUsd}
            bloqueadoPen={bloqueadoPen}
            motivoBloqueopPen={motivoBloqueopPen}
          />
        )}

        {/* Form editar crédito */}
        {canOtorgar && (
          <details className="mt-5 rounded-md border border-orion-border">
            <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-orion-fg hover:bg-orion-bg-subtle">
              {lineaCredito > 0 || lineaCreditoPen > 0
                ? 'Editar líneas de crédito'
                : 'Otorgar crédito'}
            </summary>
            <div className="border-t border-orion-border p-4">
              <CreditoForm
                clienteId={id}
                companySlug={companySlug}
                defaultValues={{
                  lineaCredito,
                  plazoDias,
                  lineaCreditoPen,
                  plazoDiasPen,
                }}
              />
            </div>
          </details>
        )}
      </div>

      {/* Facturas */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-orion-fg">Facturas</h2>
        {facturasRows.length === 0 ? (
          <p className="text-sm text-orion-fg-muted">
            No hay facturas registradas para este cliente.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-orion-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-orion-border bg-orion-bg-subtle text-left text-xs uppercase tracking-wide text-orion-fg-muted">
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Emisión</th>
                  <th className="px-4 py-3">Vencimiento</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Saldo</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orion-border">
                {facturasRows.map((f) => {
                  const totalPagado = pagosPorFactura.get(f.id) ?? 0;
                  const total = Number(f.total);
                  const saldo = Math.max(0, total - totalPagado);
                  const ccy = (f.moneda ?? 'PEN') as 'PEN' | 'USD';
                  return (
                    <tr key={f.id} className="transition-colors hover:bg-orion-bg-subtle">
                      <td className="px-4 py-3">
                        <Link
                          href={`/${companySlug}/facturas/${f.id}`}
                          className="text-orion-accent font-mono font-medium hover:underline"
                        >
                          {f.numeroCompleto ?? '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-orion-fg-muted">
                        {formatDate(f.fechaEmision)}
                      </td>
                      <td className="px-4 py-3 text-orion-fg-muted">
                        {formatDate(f.fechaVencimiento)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Money value={total} ccy={ccy} />
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3 text-right font-medium',
                          saldo > 0 ? 'text-danger-fg' : 'text-success-fg'
                        )}
                      >
                        <Money value={saldo} ccy={ccy} />
                      </td>
                      <td className="px-4 py-3">{estadoFacturaBadge(f.estado)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historial de pagos */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-orion-fg">Historial de pagos</h2>
        {pagosHistorial.length === 0 ? (
          <p className="text-sm text-orion-fg-muted">No hay pagos registrados.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-orion-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-orion-border bg-orion-bg-subtle text-left text-xs uppercase tracking-wide text-orion-fg-muted">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Método</th>
                  <th className="px-4 py-3">Referencia</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orion-border">
                {pagosHistorial.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-orion-bg-subtle">
                    <td className="px-4 py-3 text-orion-fg-muted">{formatDate(p.fechaPago)}</td>
                    <td className="px-4 py-3 capitalize text-orion-fg">{p.metodo}</td>
                    <td className="px-4 py-3 font-mono text-xs text-orion-fg-faint">
                      {p.referencia ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      <Money value={Number(p.monto)} ccy={(p.moneda ?? 'PEN') as 'PEN' | 'USD'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
