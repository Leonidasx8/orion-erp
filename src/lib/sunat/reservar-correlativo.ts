import 'server-only';

import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';

/**
 * Wrapper TS para la función SQL atómica `reservar_correlativo`.
 * Incrementa y devuelve el correlativo de una serie para un tenant.
 * Es transaccional — el número reservado no se reutiliza aunque la transacción falle después.
 * NUNCA dejar huecos en correlativos (requisito SUNAT).
 */
export async function reservarCorrelativo(
  tenantId: string,
  tipoDocumento: string,
  serie: string
): Promise<number> {
  const rows = await db.execute<{ reservar_correlativo: number }>(sql`
    SELECT reservar_correlativo(${tenantId}::uuid, ${tipoDocumento}, ${serie}) AS reservar_correlativo
  `);

  const result = (rows as unknown as { reservar_correlativo: number }[])[0];
  if (!result?.reservar_correlativo) {
    throw new Error(
      `Serie ${tipoDocumento}/${serie} no configurada para este tenant. ` +
        `Insertar fila en series_documentos primero.`
    );
  }
  return result.reservar_correlativo;
}
