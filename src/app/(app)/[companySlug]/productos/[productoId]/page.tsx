import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db/client';
import { productos, categoriasProducto, unidadesMedida } from '@/lib/db/schema';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { userHasPermission } from '@/lib/auth/require-permission';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Detalle producto' };

function formatPrecio(valor: string | null) {
  if (!valor) return '—';
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(
    parseFloat(valor)
  );
}

export default async function ProductoDetailPage({
  params,
}: {
  params: Promise<{ companySlug: string; productoId: string }>;
}) {
  const { companySlug, productoId } = await params;
  const tenant = await getCurrentTenant();

  const [canEdit, productoRows, categorias, uoms] = await Promise.all([
    userHasPermission('productos.editar'),
    db.select().from(productos).where(eq(productos.id, productoId)),
    db.select().from(categoriasProducto).where(eq(categoriasProducto.tenantId, tenant.id)),
    db.select().from(unidadesMedida),
  ]);

  const producto = productoRows[0];
  if (!producto || producto.tenantId !== tenant.id) notFound();

  const categoria = categorias.find((c) => c.id === producto.categoriaId);
  const uom = uoms.find((u) => u.codigo === producto.unidadMedida);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href={`/${companySlug}/productos`} className="hover:underline">
              Productos
            </Link>{' '}
            / {producto.nombre}
          </p>
          <h1 className="mt-1 text-2xl font-bold">{producto.nombre}</h1>
          <p className="mt-0.5 font-mono text-sm text-muted-foreground">{producto.codigo}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={producto.activo ? 'default' : 'secondary'}>
            {producto.activo ? 'activo' : 'inactivo'}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {producto.tipo}
          </Badge>
          {canEdit && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${companySlug}/productos/${productoId}/editar`}>Editar</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border p-5">
        <h2 className="mb-4 text-sm font-semibold">Datos generales</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          {producto.descripcion && (
            <div className="col-span-2">
              <dt className="text-muted-foreground">Descripción</dt>
              <dd>{producto.descripcion}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">Categoría</dt>
            <dd>{categoria?.nombre ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Unidad de medida</dt>
            <dd>
              {uom ? `${uom.descripcion} (${uom.simbolo ?? uom.codigo})` : producto.unidadMedida}
            </dd>
          </div>
          {producto.codigoSunat && (
            <div>
              <dt className="text-muted-foreground">Código SUNAT</dt>
              <dd className="font-mono">{producto.codigoSunat}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="rounded-lg border p-5">
        <h2 className="mb-4 text-sm font-semibold">Precios</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Precio unitario</dt>
            <dd className="font-medium tabular-nums">{formatPrecio(producto.precioUnitario)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">IGV</dt>
            <dd>{producto.tieneIgv ? 'Afecto (18%)' : 'Inafecto / exonerado'}</dd>
          </div>
          {producto.costoUnitario && (
            <div>
              <dt className="text-muted-foreground">Costo unitario</dt>
              <dd className="tabular-nums">{formatPrecio(producto.costoUnitario)}</dd>
            </div>
          )}
        </dl>
      </div>

      {producto.tipo === 'bien' && (
        <div className="rounded-lg border p-5">
          <h2 className="mb-4 text-sm font-semibold">Inventario</h2>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Controla stock</dt>
              <dd>{producto.controlaStock ? 'Sí' : 'No'}</dd>
            </div>
            {producto.controlaStock && (
              <>
                <div>
                  <dt className="text-muted-foreground">Stock actual</dt>
                  <dd className="font-medium tabular-nums">{producto.stockActual}</dd>
                </div>
                {producto.stockMinimo && (
                  <div>
                    <dt className="text-muted-foreground">Stock mínimo</dt>
                    <dd className="tabular-nums">{producto.stockMinimo}</dd>
                  </div>
                )}
              </>
            )}
          </dl>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href={`/${companySlug}/productos`}>Volver</Link>
        </Button>
      </div>
    </div>
  );
}
