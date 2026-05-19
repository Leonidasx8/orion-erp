'use server';

import { and, eq, inArray, sql } from 'drizzle-orm';
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
import { z } from 'zod';

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

const actualizarPreciosMasivoSchema = z.object({
  productoIds: z.array(z.string().uuid()).min(1, 'Selecciona al menos un producto'),
  campo: z.enum(['precio', 'costo']),
  modo: z.enum(['porcentaje', 'fijo']),
  valor: z.number().finite(),
  razon: z.string().min(3, 'La razón es obligatoria (mín. 3 caracteres)'),
});

export type ActualizarPreciosMasivoInput = z.infer<typeof actualizarPreciosMasivoSchema>;

export async function actualizarPreciosMasivo(
  input: ActualizarPreciosMasivoInput
): Promise<ActionResult<{ actualizados: number }>> {
  const parsed = actualizarPreciosMasivoSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { user, tenant } = await requirePermission('productos.editar');
  const { productoIds, campo, modo, valor, razon } = parsed.data;

  const rows = await db
    .select({
      id: productos.id,
      precioUnitario: productos.precioUnitario,
      costoUnitario: productos.costoUnitario,
    })
    .from(productos)
    .where(and(eq(productos.tenantId, tenant.id), inArray(productos.id, productoIds)));

  if (rows.length === 0) return { success: false, error: 'No se encontraron productos' };

  const nombreUsuario =
    (user.user_metadata?.full_name as string | undefined) ?? user.email ?? 'Usuario';

  let actualizados = 0;

  for (const row of rows) {
    const campoActual = campo === 'precio' ? row.precioUnitario : row.costoUnitario;
    const valorActual = campoActual != null ? Number(campoActual) : null;
    if (valorActual == null) continue;

    const valorNuevo =
      modo === 'porcentaje' ? Math.round(valorActual * (1 + valor / 100) * 10000) / 10000 : valor;

    if (Math.abs(valorNuevo - valorActual) < 0.0001) continue;

    const precioAnterior = Number(row.precioUnitario ?? 0);
    const costoAnterior = row.costoUnitario != null ? Number(row.costoUnitario) : null;

    const updateSet =
      campo === 'precio'
        ? { precioUnitario: String(valorNuevo), updatedAt: new Date() }
        : { costoUnitario: String(valorNuevo), updatedAt: new Date() };

    await db
      .update(productos)
      .set(updateSet)
      .where(and(eq(productos.id, row.id), eq(productos.tenantId, tenant.id)));

    const precioNuevo = campo === 'precio' ? valorNuevo : precioAnterior;
    const costoNuevo = campo === 'costo' ? valorNuevo : costoAnterior;

    await db.insert(historialPrecios).values({
      tenantId: tenant.id,
      productoId: row.id,
      precioAnterior: String(precioAnterior),
      precioNuevo: String(precioNuevo),
      costoAnterior: costoAnterior != null ? String(costoAnterior) : null,
      costoNuevo: costoNuevo != null ? String(costoNuevo) : null,
      razon,
      creadoPor: user.id,
      creadoPorNombre: nombreUsuario,
    });

    actualizados++;
  }

  revalidatePath(`/${tenant.slug}/productos`);
  return { success: true, data: { actualizados } };
}

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
