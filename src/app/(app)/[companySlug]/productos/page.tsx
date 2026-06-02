import { eq } from 'drizzle-orm';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { userHasPermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { productos, categoriasProducto, unidadesMedida } from '@/lib/db/schema';
import { ProductosList } from '@/components/modules/productos/ProductosList';
import { ModuleHelp } from '@/components/shared/ModuleHelp';

export const metadata = { title: 'Productos' };

export default async function ProductosPage() {
  const tenant = await getCurrentTenant();

  const [canCreate, rows, categorias, uoms] = await Promise.all([
    userHasPermission('productos.crear'),
    db
      .select({
        id: productos.id,
        codigo: productos.codigo,
        nombre: productos.nombre,
        tipo: productos.tipo,
        unidadMedida: productos.unidadMedida,
        precioUnitario: productos.precioUnitario,
        tieneIgv: productos.tieneIgv,
        controlaStock: productos.controlaStock,
        stockActual: productos.stockActual,
        activo: productos.activo,
        categoriaId: productos.categoriaId,
        imagenUrl: productos.imagenUrl,
      })
      .from(productos)
      .where(eq(productos.tenantId, tenant.id))
      .orderBy(productos.nombre),
    db.select().from(categoriasProducto).where(eq(categoriasProducto.tenantId, tenant.id)),
    db.select().from(unidadesMedida),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Productos</h1>
          <ModuleHelp
            module="productos"
            title="Productos"
            description="Catálogo de productos con precios, costos y control de stock. Actualiza precios en masa con historial de cambios."
            tips={[
              'Usa "Actualizar precios" para aplicar incrementos a toda una familia',
              'El margen mínimo bloquea cotizaciones por debajo del umbral configurado',
              'El tab "Precios" en el detalle muestra el historial completo de cambios',
            ]}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {rows.length} producto{rows.length !== 1 ? 's' : ''} en el catálogo
        </p>
      </div>
      <ProductosList productos={rows} categorias={categorias} uoms={uoms} canCreate={canCreate} />
    </div>
  );
}
