'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema';

type ActionResult = { success: true } | { success: false; error: string };

export async function actualizarPoliticaPrecios(data: {
  margenMinimoGlobal: number;
  aprobacionMontoMaximo: number;
  igvAutomatico: boolean;
  descuentosPorLinea: boolean;
}): Promise<ActionResult> {
  try {
    const { tenant } = await requirePermission('admin.config.editar');
    await db
      .update(tenants)
      .set({
        margenMinimoGlobal: String(data.margenMinimoGlobal),
        aprobacionMontoMaximo: String(data.aprobacionMontoMaximo),
        igvAutomatico: data.igvAutomatico,
        descuentosPorLinea: data.descuentosPorLinea,
      })
      .where(eq(tenants.id, tenant.id));
    revalidatePath(`/${tenant.slug}/configuracion`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error interno' };
  }
}
