import { and, eq } from 'drizzle-orm';
import { requirePermissionPage } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { clientes, productos, seriesDocumentos } from '@/lib/db/schema';
import { FacturaForm } from '@/components/modules/facturas/FacturaForm';

export const metadata = { title: 'Nueva factura' };

export default async function FacturaNuevaPage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ tipo?: string }>;
}) {
  const [{ companySlug }, sp] = await Promise.all([params, searchParams]);
  const { tenant } = await requirePermissionPage('facturas.crear', companySlug);

  const tipoPorDefecto = sp.tipo === '03' ? '03' : '01';

  const [clientesRaw, seriesRaw, productosRaw] = await Promise.all([
    db
      .select({
        id: clientes.id,
        razonSocial: clientes.razonSocial,
        nombres: clientes.nombres,
        apellidoPaterno: clientes.apellidoPaterno,
        tipoDocumento: clientes.tipoDocumento,
        numeroDocumento: clientes.numeroDocumento,
      })
      .from(clientes)
      .where(and(eq(clientes.tenantId, tenant.id), eq(clientes.esCliente, true)))
      .orderBy(clientes.razonSocial)
      .limit(200),

    db
      .select({ tipoDocumento: seriesDocumentos.tipoDocumento, serie: seriesDocumentos.serie })
      .from(seriesDocumentos)
      .where(and(eq(seriesDocumentos.tenantId, tenant.id), eq(seriesDocumentos.activa, true))),

    db
      .select({
        id: productos.id,
        codigo: productos.codigo,
        nombre: productos.nombre,
        precioUnitario: productos.precioUnitario,
      })
      .from(productos)
      .where(eq(productos.tenantId, tenant.id))
      .orderBy(productos.nombre)
      .limit(500),
  ]);

  const clientesList = clientesRaw.map((c) => ({
    id: c.id,
    label: c.razonSocial ?? [c.nombres, c.apellidoPaterno].filter(Boolean).join(' ') ?? '—',
    tipoDocumento: c.tipoDocumento,
    numeroDocumento: c.numeroDocumento,
  }));

  const serieFactura = seriesRaw.find((s) => s.tipoDocumento === '01')?.serie ?? null;
  const serieBoleta = seriesRaw.find((s) => s.tipoDocumento === '03')?.serie ?? null;

  const productosList = productosRaw.map((p) => ({
    id: p.id,
    codigo: p.codigo ?? '',
    nombre: p.nombre,
    precioUnitario: parseFloat(p.precioUnitario ?? '0'),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      <div>
        <h1 className="text-xl font-semibold text-orion-fg">
          {tipoPorDefecto === '03' ? 'Nueva boleta' : 'Nueva factura'}
        </h1>
        <p className="mt-1 text-sm text-orion-fg-muted">
          Completa los datos y guarda para registrar el comprobante.
        </p>
      </div>
      <FacturaForm
        companySlug={companySlug}
        tipoPorDefecto={tipoPorDefecto}
        clientes={clientesList}
        serieFactura={serieFactura}
        serieBoleta={serieBoleta}
        productos={productosList}
      />
    </div>
  );
}
