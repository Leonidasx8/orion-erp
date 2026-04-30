import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db/client';
import { productos, categoriasProducto, unidadesMedida } from '@/lib/db/schema';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { userHasPermission } from '@/lib/auth/require-permission';
import { ProductoForm } from '@/components/modules/productos/ProductoForm';

export const metadata = { title: 'Editar producto' };

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ companySlug: string; productoId: string }>;
}) {
  const { companySlug, productoId } = await params;
  const tenant = await getCurrentTenant();
  const canEdit = await userHasPermission('productos.editar');
  if (!canEdit) notFound();

  const [productoRows, categorias, uoms] = await Promise.all([
    db.select().from(productos).where(eq(productos.id, productoId)),
    db.select().from(categoriasProducto).where(eq(categoriasProducto.tenantId, tenant.id)),
    db.select().from(unidadesMedida),
  ]);

  const producto = productoRows[0];
  if (!producto || producto.tenantId !== tenant.id) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href={`/${companySlug}/productos`} className="hover:underline">
            Productos
          </Link>{' '}
          /{' '}
          <Link href={`/${companySlug}/productos/${productoId}`} className="hover:underline">
            {producto.nombre}
          </Link>{' '}
          / Editar
        </p>
        <h1 className="mt-1 text-2xl font-bold">Editar producto</h1>
      </div>
      <ProductoForm
        companySlug={companySlug}
        producto={producto}
        categorias={categorias}
        uoms={uoms}
      />
    </div>
  );
}
