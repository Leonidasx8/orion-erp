import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db/client';
import { categoriasProducto, unidadesMedida, clientes } from '@/lib/db/schema';
import { userHasPermission } from '@/lib/auth/require-permission';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { ProductoForm } from '@/components/modules/productos/ProductoForm';
import { and, eq } from 'drizzle-orm';

export const metadata = { title: 'Nuevo producto' };

export default async function NuevoProductoPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const canCreate = await userHasPermission('productos.crear');
  if (!canCreate) notFound();

  const tenant = await getCurrentTenant();
  const [categorias, uoms, proveedoresRows] = await Promise.all([
    db.select().from(categoriasProducto).where(eq(categoriasProducto.tenantId, tenant.id)),
    db.select().from(unidadesMedida),
    db
      .select({
        id: clientes.id,
        razonSocial: clientes.razonSocial,
        nombreComercial: clientes.nombreComercial,
        nombres: clientes.nombres,
        apellidoPaterno: clientes.apellidoPaterno,
      })
      .from(clientes)
      .where(and(eq(clientes.tenantId, tenant.id), eq(clientes.esProveedor, true))),
  ]);

  const proveedores = proveedoresRows.map((p) => ({
    id: p.id,
    label:
      p.nombreComercial ??
      p.razonSocial ??
      [p.nombres, p.apellidoPaterno].filter(Boolean).join(' ') ??
      p.id,
  }));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href={`/${companySlug}/productos`} className="hover:underline">
            Productos
          </Link>{' '}
          / Nuevo
        </p>
        <h1 className="mt-1 text-2xl font-bold">Nuevo producto</h1>
      </div>
      <ProductoForm
        companySlug={companySlug}
        categorias={categorias}
        uoms={uoms}
        proveedores={proveedores}
      />
    </div>
  );
}
