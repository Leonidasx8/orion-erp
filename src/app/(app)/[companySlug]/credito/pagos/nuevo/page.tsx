import Link from 'next/link'; // noqa
import { sql, eq, and } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { facturas } from '@/lib/db/schema';
import { PagoForm, type FacturaPendienteOption } from '@/components/modules/credito/PagoForm';

export const metadata = { title: 'Registrar pago' };

export default async function PagoNuevoPage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ clienteId?: string; facturaId?: string }>;
}) {
  const [{ companySlug }, sp] = await Promise.all([params, searchParams]);
  const { tenant } = await requirePermission('credito.registrar_pago');

  const clienteId = sp.clienteId ?? null;
  const defaultFacturaId = sp.facturaId ?? undefined;

  // Facturas aceptadas por SUNAT del cliente (o del tenant si no hay clienteId)
  const conditions = [eq(facturas.tenantId, tenant.id), eq(facturas.estadoSunat, 'aceptada')];
  if (clienteId) {
    conditions.push(eq(facturas.clienteId, clienteId));
  }

  const facturasRaw = await db
    .select({
      id: facturas.id,
      numeroCompleto: facturas.numeroCompleto,
      moneda: facturas.moneda,
      total: facturas.total,
    })
    .from(facturas)
    .where(and(...conditions))
    .orderBy(sql`${facturas.fechaEmision} DESC`)
    .limit(50);

  // Calcular saldo pendiente por factura
  const facturasIds = facturasRaw.map((f) => f.id);

  let pagosSuma: Array<{ factura_id: string; total_pagado: string }> = [];
  if (facturasIds.length > 0) {
    const result = await db.execute<{ factura_id: string; total_pagado: string }>(sql`
      SELECT factura_id, COALESCE(SUM(monto), 0)::text AS total_pagado
      FROM pagos
      WHERE tenant_id = ${tenant.id}
        AND factura_id = ANY(${sql`ARRAY[${sql.join(
          facturasIds.map((fid) => sql`${fid}::uuid`),
          sql`, `
        )}]`})
      GROUP BY factura_id
    `);
    pagosSuma = result as unknown as Array<{ factura_id: string; total_pagado: string }>;
  }

  const pagosPorFactura = new Map(pagosSuma.map((r) => [r.factura_id, Number(r.total_pagado)]));

  // Filtrar solo las que tienen saldo pendiente
  const facturasPendientes: FacturaPendienteOption[] = facturasRaw
    .map((f) => {
      const total = Number(f.total);
      const pagado = pagosPorFactura.get(f.id) ?? 0;
      const saldoPendiente = Math.max(0, total - pagado);
      return {
        id: f.id,
        numeroCompleto: f.numeroCompleto ?? '—',
        moneda: f.moneda ?? 'PEN',
        saldoPendiente,
      };
    })
    .filter((f) => f.saldoPendiente > 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Breadcrumb */}
      <div>
        <nav className="mb-1 text-xs text-orion-fg-faint">
          <Link href={`/${companySlug}/credito`} className="hover:text-orion-accent">
            Crédito y CxC
          </Link>
          {clienteId && (
            <>
              {' / '}
              <Link
                href={`/${companySlug}/credito/clientes/${clienteId}`}
                className="hover:text-orion-accent"
              >
                Cliente
              </Link>
            </>
          )}
          {' / '}
          <span>Registrar pago</span>
        </nav>
        <h1 className="text-xl font-semibold text-orion-fg">Registrar pago</h1>
        <p className="mt-0.5 text-sm text-orion-fg-muted">
          Aplica el pago a una factura aceptada por SUNAT
        </p>
      </div>

      {/* Form */}
      <div className="max-w-lg rounded-lg border border-orion-border p-6">
        <PagoForm
          facturas={facturasPendientes}
          companySlug={companySlug}
          defaultFacturaId={defaultFacturaId}
        />
      </div>
    </div>
  );
}
