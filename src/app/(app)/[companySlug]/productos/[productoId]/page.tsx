import { desc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db/client';
import { productos, categoriasProducto, unidadesMedida, historialPrecios } from '@/lib/db/schema';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { userHasPermission } from '@/lib/auth/require-permission';
import { ProductoDetalle } from '@/components/modules/productos/ProductoDetalle';

export const metadata = { title: 'Detalle producto' };

export default async function ProductoDetailPage({
  params,
}: {
  params: Promise<{ companySlug: string; productoId: string }>;
}) {
  const { companySlug, productoId } = await params;
  const tenant = await getCurrentTenant();

  const [canEdit, productoRows, categorias, uoms, historial] = await Promise.all([
    userHasPermission('productos.editar'),
    db.select().from(productos).where(eq(productos.id, productoId)),
    db.select().from(categoriasProducto).where(eq(categoriasProducto.tenantId, tenant.id)),
    db.select().from(unidadesMedida),
    db
      .select()
      .from(historialPrecios)
      .where(eq(historialPrecios.productoId, productoId))
      .orderBy(desc(historialPrecios.createdAt))
      .limit(50),
  ]);

  const producto = productoRows[0];
  if (!producto || producto.tenantId !== tenant.id) notFound();

  const categoria = categorias.find((c) => c.id === producto.categoriaId);
  const uom = uoms.find((u) => u.codigo === producto.unidadMedida);

  return (
    <ProductoDetalle
      producto={producto}
      categoria={categoria}
      uom={uom}
      companySlug={companySlug}
      canEdit={canEdit}
      historialPrecios={historial}
    />
  );
}
