'use server';

import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { kardexMovimientos, productos } from '@/lib/db/schema';
import { ajusteManualSchema, type AjusteManualInput } from '@/lib/schemas/kardex';

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

/**
 * Convierte un error de Postgres en un mensaje amigable.
 * Las excepciones que lanza registrar_movimiento_stock() vienen como
 * `error.cause.message` cuando se usa postgres.js.
 */
function pgErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const cause = (err as Error & { cause?: { message?: string } }).cause;
    return cause?.message ?? err.message;
  }
  return String(err);
}

function mensajeNegocioParaError(raw: string): string {
  if (raw.includes('stock_negativo')) return 'La operación dejaría el stock en negativo.';
  if (raw.includes('producto_not_in_tenant')) return 'El producto no pertenece a tu empresa.';
  if (raw.includes('cantidad_invalida')) return 'La cantidad debe ser mayor a 0.';
  if (raw.includes('costo_unitario_required_for_entrada'))
    return 'Se requiere costo unitario para registrar una entrada.';
  return raw;
}

/**
 * Ajuste manual de inventario. Requiere permiso sensible `inventario.ajuste_manual`.
 * Queda auditado en kardex_movimientos con el motivo y user_id.
 */
export async function ajusteManualStock(
  input: AjusteManualInput
): Promise<ActionResult<{ movimientoId: number; nuevoSaldo: number }>> {
  const parsed = ajusteManualSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { user, tenant } = await requirePermission('inventario.ajuste_manual');
  const data = parsed.data;

  // Verificar que el producto pertenece al tenant antes de invocar la función
  // (la función también lo valida, pero así devolvemos un error claro sin esperar al SP)
  const [prod] = await db
    .select({ id: productos.id })
    .from(productos)
    .where(and(eq(productos.id, data.productoId), eq(productos.tenantId, tenant.id)));
  if (!prod) return { success: false, error: 'Producto no encontrado en tu empresa.' };

  try {
    const result = await db.execute<{ id: number; saldo_post: string }>(sql`
      WITH mov AS (
        SELECT registrar_movimiento_stock(
          ${tenant.id}::uuid,
          ${data.productoId}::uuid,
          ${data.tipo}::text,
          ${data.cantidad}::numeric,
          'manual'::text,
          NULL::uuid,
          NULL::numeric,
          ${data.motivo}::text,
          ${user.id}::uuid
        ) AS m
      )
      SELECT (m).id AS id, (m).saldo_post AS saldo_post FROM mov
    `);

    const row = result[0];
    if (!row)
      return { success: false, error: 'No se obtuvo respuesta del registro de movimiento.' };

    revalidatePath(`/${tenant.slug}/inventario`);
    revalidatePath(`/${tenant.slug}/inventario/${data.productoId}`);
    return {
      success: true,
      data: { movimientoId: Number(row.id), nuevoSaldo: Number(row.saldo_post) },
    };
  } catch (err) {
    const raw = pgErrorMessage(err);
    return { success: false, error: mensajeNegocioParaError(raw) };
  }
}

/**
 * Consulta el kardex de un producto, filtrable por rango de fechas.
 * Solo lectura — la RLS del tenant ya restringe lo que ve.
 */
export async function consultarKardex(productoId: string, params?: { desde?: Date; hasta?: Date }) {
  await requirePermission('inventario.ver');

  const conditions = [eq(kardexMovimientos.productoId, productoId)];
  if (params?.desde) conditions.push(gte(kardexMovimientos.fecha, params.desde));
  if (params?.hasta) conditions.push(lte(kardexMovimientos.fecha, params.hasta));

  return db
    .select()
    .from(kardexMovimientos)
    .where(and(...conditions))
    .orderBy(desc(kardexMovimientos.fecha));
}
