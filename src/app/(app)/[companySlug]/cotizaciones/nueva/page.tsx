import { and, asc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { userHasPermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { clientes, productos } from '@/lib/db/schema';
import {
  CotizacionForm,
  type ClienteOption,
  type ProductoOption,
} from '@/components/modules/cotizaciones/CotizacionForm';

export const metadata = { title: 'Nueva cotización' };

export default async function NuevaCotizacionPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const tenant = await getCurrentTenant();

  const canCreate = await userHasPermission('cotizaciones.crear');
  if (!canCreate) redirect(`/${companySlug}/cotizaciones`);

  const [clientesRows, productosRows] = await Promise.all([
    db
      .select({
        id: clientes.id,
        razonSocial: clientes.razonSocial,
        nombres: clientes.nombres,
        apellidoPaterno: clientes.apellidoPaterno,
      })
      .from(clientes)
      .where(and(eq(clientes.tenantId, tenant.id), eq(clientes.esCliente, true)))
      .orderBy(asc(clientes.razonSocial)),
    db
      .select({
        id: productos.id,
        codigo: productos.codigo,
        nombre: productos.nombre,
        precio: productos.precioUnitario,
        tieneIgv: productos.tieneIgv,
        unidadMedida: productos.unidadMedida,
        activo: productos.activo,
      })
      .from(productos)
      .where(eq(productos.tenantId, tenant.id))
      .orderBy(asc(productos.codigo)),
  ]);

  const clientesOpt: ClienteOption[] = clientesRows.map((c) => ({
    id: c.id,
    label:
      c.razonSocial ?? ([c.nombres, c.apellidoPaterno].filter(Boolean).join(' ') || 'Sin nombre'),
  }));
  const productosOpt: ProductoOption[] = productosRows
    .filter((p) => p.activo)
    .map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      precio: Number(p.precio),
      tieneIgv: p.tieneIgv,
      unidadMedida: p.unidadMedida,
    }));

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="font-mono text-[22px] font-semibold tracking-tight text-orion-fg">
          Nueva cotización
        </h1>
        <p className="text-[12px] text-orion-fg-muted">Se generará el correlativo al guardar.</p>
      </div>
      <CotizacionForm companySlug={companySlug} clientes={clientesOpt} productos={productosOpt} />
    </div>
  );
}
