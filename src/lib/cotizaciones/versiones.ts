import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { cotizaciones, cotizacionItems, cotizacionesVersiones } from '@/lib/db/schema';
import type { TipoEventoVersion } from '@/lib/db/schema';

// Accepts both db and a Drizzle transaction so el snapshot sea atómico con el cambio de estado.
type Executor = typeof db | Parameters<Parameters<(typeof db)['transaction']>[0]>[0];

/**
 * Guarda un snapshot inmutable (header + ítems) de la cotización en cotizaciones_versiones.
 * Llamar dentro de una transacción cuando se vaya a cambiar estado post-borrador.
 */
export async function capturarVersion(
  executor: Executor,
  cotizacionId: string,
  tenantId: string,
  creadoPor: string,
  tipoEvento: TipoEventoVersion
): Promise<void> {
  const [cotizacion] = await executor
    .select()
    .from(cotizaciones)
    .where(eq(cotizaciones.id, cotizacionId));

  if (!cotizacion) throw new Error(`cotizacion ${cotizacionId} no encontrada al capturar versión`);

  const items = await executor
    .select()
    .from(cotizacionItems)
    .where(eq(cotizacionItems.cotizacionId, cotizacionId));

  const [{ maxVersion }] = await executor
    .select({ maxVersion: sql<number>`COALESCE(MAX(version), 0)` })
    .from(cotizacionesVersiones)
    .where(eq(cotizacionesVersiones.cotizacionId, cotizacionId));

  await executor.insert(cotizacionesVersiones).values({
    tenantId,
    cotizacionId,
    version: Number(maxVersion) + 1,
    tipoEvento,
    datos: { cotizacion, items } as Record<string, unknown>,
    creadoPor,
  });
}
