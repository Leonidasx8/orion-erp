import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { clientes, productos } from '@/lib/db/schema';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { userHasPermission } from '@/lib/auth/require-permission';
import { CotizacionForm } from '@/components/modules/cotizaciones/CotizacionForm';

export const metadata = { title: 'Nueva cotización' };

export default async function NuevaCotizacionPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const canCreate = await userHasPermission('cotizaciones.crear');
  if (!canCreate) notFound();

  const tenant = await getCurrentTenant();

  const [listaClientes, listaProductos] = await Promise.all([
    db
      .select({
        id: clientes.id,
        tipoPersona: clientes.tipoPersona,
        razonSocial: clientes.razonSocial,
        nombres: clientes.nombres,
        apellidoPaterno: clientes.apellidoPaterno,
        apellidoMaterno: clientes.apellidoMaterno,
        numeroDocumento: clientes.numeroDocumento,
      })
      .from(clientes)
      .where(eq(clientes.tenantId, tenant.id))
      .orderBy(clientes.razonSocial, clientes.apellidoPaterno),
    db
      .select({
        id: productos.id,
        codigo: productos.codigo,
        nombre: productos.nombre,
        unidadMedida: productos.unidadMedida,
        precioUnitario: productos.precioUnitario,
        tieneIgv: productos.tieneIgv,
      })
      .from(productos)
      .where(eq(productos.tenantId, tenant.id))
      .orderBy(productos.nombre),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href={`/${companySlug}/cotizaciones`} className="hover:underline">
            Cotizaciones
          </Link>{' '}
          / Nueva
        </p>
        <h1 className="mt-1 text-2xl font-bold">Nueva cotización</h1>
      </div>
      <CotizacionForm
        companySlug={companySlug}
        clientes={listaClientes}
        productos={listaProductos}
      />
    </div>
  );
}
