'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { productos, categoriasProducto, historialPrecios } from '@/lib/db/schema';
import {
  productoSchema,
  categoriaProductoSchema,
  type ProductoInput,
  type CategoriaProductoInput,
} from '@/lib/schemas/producto';

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

export async function crearProducto(input: ProductoInput): Promise<ActionResult<{ id: string }>> {
  const parsed = productoSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { user, tenant } = await requirePermission('productos.crear');
  const data = parsed.data;

  const existing = await db
    .select({ id: productos.id })
    .from(productos)
    .where(and(eq(productos.tenantId, tenant.id), eq(productos.codigo, data.codigo)));

  if (existing.length > 0) return { success: false, error: 'Ya existe un producto con ese código' };

  const [row] = await db
    .insert(productos)
    .values({
      ...data,
      tenantId: tenant.id,
      createdBy: user.id,
      precioUnitario: String(data.precioUnitario),
      costoUnitario: data.costoUnitario != null ? String(data.costoUnitario) : null,
      stockMinimo: data.stockMinimo != null ? String(data.stockMinimo) : null,
      proveedorPrincipalId: data.proveedorPrincipalId ?? null,
    })
    .returning({ id: productos.id });

  revalidatePath(`/${tenant.slug}/productos`);
  return { success: true, data: { id: row.id } };
}

export async function actualizarProducto(
  productoId: string,
  input: ProductoInput
): Promise<ActionResult> {
  const parsed = productoSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { tenant } = await requirePermission('productos.editar');
  const data = parsed.data;

  const codigoConflicto = await db
    .select({ id: productos.id })
    .from(productos)
    .where(
      and(
        eq(productos.tenantId, tenant.id),
        eq(productos.codigo, data.codigo),
        sql`${productos.id} != ${productoId}`
      )
    );

  if (codigoConflicto.length > 0)
    return { success: false, error: 'Ese código ya lo usa otro producto' };

  // Leer precio/costo actuales para comparar y guardar historial si cambian
  const [actual] = await db
    .select({
      precioUnitario: productos.precioUnitario,
      costoUnitario: productos.costoUnitario,
      createdBy: productos.createdBy,
    })
    .from(productos)
    .where(and(eq(productos.id, productoId), eq(productos.tenantId, tenant.id)));

  const { user } = await requirePermission('productos.editar');
  const precioAnterior = Number(actual?.precioUnitario ?? 0);
  const precioNuevo = data.precioUnitario;
  const costoAnterior = actual?.costoUnitario != null ? Number(actual.costoUnitario) : null;
  const costoNuevo = data.costoUnitario ?? null;
  const precioChanged = precioAnterior !== precioNuevo;
  const costoChanged = costoAnterior !== costoNuevo;

  await db
    .update(productos)
    .set({
      ...data,
      updatedAt: new Date(),
      precioUnitario: String(data.precioUnitario),
      costoUnitario: data.costoUnitario != null ? String(data.costoUnitario) : null,
      stockMinimo: data.stockMinimo != null ? String(data.stockMinimo) : null,
      proveedorPrincipalId: data.proveedorPrincipalId ?? null,
    })
    .where(and(eq(productos.id, productoId), eq(productos.tenantId, tenant.id)));

  if (precioChanged || costoChanged) {
    const nombreUsuario =
      (user.user_metadata?.full_name as string | undefined) ?? user.email ?? 'Usuario';
    await db.insert(historialPrecios).values({
      tenantId: tenant.id,
      productoId,
      precioAnterior: String(precioAnterior),
      precioNuevo: String(precioNuevo),
      costoAnterior: costoAnterior != null ? String(costoAnterior) : null,
      costoNuevo: costoNuevo != null ? String(costoNuevo) : null,
      creadoPor: user.id,
      creadoPorNombre: nombreUsuario,
    });
  }

  revalidatePath(`/${tenant.slug}/productos`);
  revalidatePath(`/${tenant.slug}/productos/${productoId}`);
  return { success: true, data: undefined };
}

export async function toggleActivoProducto(productoId: string): Promise<ActionResult> {
  const { tenant } = await requirePermission('productos.editar');

  const [actual] = await db
    .select({ activo: productos.activo })
    .from(productos)
    .where(and(eq(productos.id, productoId), eq(productos.tenantId, tenant.id)));

  if (!actual) return { success: false, error: 'Producto no encontrado' };

  await db
    .update(productos)
    .set({ activo: !actual.activo, updatedAt: new Date() })
    .where(and(eq(productos.id, productoId), eq(productos.tenantId, tenant.id)));

  revalidatePath(`/${tenant.slug}/productos`);
  revalidatePath(`/${tenant.slug}/productos/${productoId}`);
  return { success: true, data: undefined };
}

export async function crearCategoria(
  input: CategoriaProductoInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = categoriaProductoSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { tenant } = await requirePermission('productos.crear');

  const [row] = await db
    .insert(categoriasProducto)
    .values({ ...parsed.data, tenantId: tenant.id })
    .returning({ id: categoriasProducto.id });

  revalidatePath(`/${tenant.slug}/productos`);
  return { success: true, data: { id: row.id } };
}
