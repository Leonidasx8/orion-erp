import { and, eq } from 'drizzle-orm';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { userHasPermission } from '@/lib/auth/require-permission';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/client';
import { productos, categoriasProducto, clientes } from '@/lib/db/schema';
import { ActualizarPreciosForm } from '@/components/modules/productos/ActualizarPreciosForm';

export const metadata = { title: 'Actualizar precios' };

export default async function ActualizarPreciosPage({
  params,
}: {
  params: { companySlug: string };
}) {
  const canEdit = await userHasPermission('productos.editar');
  if (!canEdit) redirect(`/${params.companySlug}/productos`);

  const tenant = await getCurrentTenant();

  const [rows, categorias, proveedores] = await Promise.all([
    db
      .select({
        id: productos.id,
        codigo: productos.codigo,
        nombre: productos.nombre,
        categoriaId: productos.categoriaId,
        proveedorPrincipalId: productos.proveedorPrincipalId,
        precioUnitario: productos.precioUnitario,
        costoUnitario: productos.costoUnitario,
      })
      .from(productos)
      .where(eq(productos.tenantId, tenant.id))
      .orderBy(productos.nombre),
    db
      .select({ id: categoriasProducto.id, nombre: categoriasProducto.nombre })
      .from(categoriasProducto)
      .where(eq(categoriasProducto.tenantId, tenant.id))
      .orderBy(categoriasProducto.nombre),
    db
      .select({ id: clientes.id, razonSocial: clientes.razonSocial })
      .from(clientes)
      .where(and(eq(clientes.tenantId, tenant.id), eq(clientes.esProveedor, true)))
      .orderBy(clientes.razonSocial),
  ]);

  const proveedoresMapped = proveedores.map((p) => ({
    id: p.id,
    label: p.razonSocial ?? p.id,
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <a href={`/${params.companySlug}/productos`} className="hover:underline">
            Productos
          </a>{' '}
          / Actualizar precios
        </p>
        <h1 className="mt-1 text-2xl font-bold">Actualizar precios</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Filtra por familia o proveedor, ajusta por porcentaje o precio fijo, y guarda el historial
          de cambios.
        </p>
      </div>
      <ActualizarPreciosForm
        productos={rows}
        categorias={categorias}
        proveedores={proveedoresMapped}
        companySlug={params.companySlug}
      />
    </div>
  );
}
