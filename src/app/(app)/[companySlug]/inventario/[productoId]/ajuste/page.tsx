import { and, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { productos } from '@/lib/db/schema';
import { AjusteManualForm } from '@/components/modules/inventario/AjusteManualForm';

export const metadata = { title: 'Ajuste manual de inventario' };

export default async function AjustePage({
  params,
}: {
  params: Promise<{ companySlug: string; productoId: string }>;
}) {
  const { productoId, companySlug } = await params;
  const { tenant } = await requirePermission('inventario.ajuste_manual');

  if (tenant.slug !== companySlug) redirect(`/${tenant.slug}/inventario`);

  // Producto con stock actual desde la view
  const stockRows = await db.execute<{
    codigo: string;
    nombre: string;
    unidad_medida: string | null;
    stock: string;
    costo_promedio: string;
  }>(sql`
    SELECT codigo, nombre, unidad_medida, stock, costo_promedio
    FROM stock_actual
    WHERE producto_id = ${productoId} AND tenant_id = ${tenant.id}
  `);

  if (stockRows.length === 0) {
    // Product exists but no costos_inventario row yet
    const [prod] = await db
      .select({
        codigo: productos.codigo,
        nombre: productos.nombre,
        unidadMedida: productos.unidadMedida,
      })
      .from(productos)
      .where(and(eq(productos.id, productoId), eq(productos.tenantId, tenant.id)));
    if (!prod) notFound();

    return (
      <AjusteManualForm
        tenantSlug={tenant.slug}
        producto={{
          id: productoId,
          codigo: prod.codigo,
          nombre: prod.nombre,
          unidadMedida: prod.unidadMedida,
          stockActual: 0,
          costoPromedio: 0,
        }}
      />
    );
  }

  const s = stockRows[0];
  return (
    <AjusteManualForm
      tenantSlug={tenant.slug}
      producto={{
        id: productoId,
        codigo: s.codigo,
        nombre: s.nombre,
        unidadMedida: s.unidad_medida,
        stockActual: Number(s.stock),
        costoPromedio: Number(s.costo_promedio),
      }}
    />
  );
}
