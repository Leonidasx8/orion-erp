import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import {
  cotizaciones,
  cotizacionItems,
  clientes,
  productos,
  type EstadoCotizacion,
} from '@/lib/db/schema';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { userHasPermission } from '@/lib/auth/require-permission';
import { CotizacionForm } from '@/components/modules/cotizaciones/CotizacionForm';

export const metadata = { title: 'Editar cotización' };

export default async function EditarCotizacionPage({
  params,
}: {
  params: Promise<{ companySlug: string; id: string }>;
}) {
  const { companySlug, id } = await params;
  const canEdit = await userHasPermission('cotizaciones.editar');
  if (!canEdit) notFound();

  const tenant = await getCurrentTenant();

  const [cot] = await db
    .select()
    .from(cotizaciones)
    .where(and(eq(cotizaciones.id, id), eq(cotizaciones.tenantId, tenant.id)));
  if (!cot) notFound();

  const estado = cot.estado as EstadoCotizacion;
  if (estado !== 'borrador') {
    redirect(`/${companySlug}/cotizaciones/${id}`);
  }

  const [items, listaClientes, listaProductos] = await Promise.all([
    db
      .select()
      .from(cotizacionItems)
      .where(eq(cotizacionItems.cotizacionId, id))
      .orderBy(asc(cotizacionItems.orden)),
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
          /{' '}
          <Link href={`/${companySlug}/cotizaciones/${id}`} className="hover:underline">
            {cot.numeroCompleto}
          </Link>{' '}
          / Editar
        </p>
        <h1 className="mt-1 text-2xl font-bold">Editar cotización</h1>
      </div>
      <CotizacionForm
        companySlug={companySlug}
        clientes={listaClientes}
        productos={listaProductos}
        cotizacion={cot}
        items={items}
      />
    </div>
  );
}
