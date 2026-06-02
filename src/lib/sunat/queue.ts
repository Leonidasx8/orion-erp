import 'server-only';

import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import type { DocumentoSunatTipo } from '@/lib/db/schema';

/**
 * Helpers de la cola pgmq `sunat_outbox`.
 * Patrón outbox: el server action escribe el documento y encola un mensaje;
 * el worker drena la cola, llama a NUBEFACT, y actualiza el estado del documento.
 *
 * NOTA: la implementación del consumer (edge function) y del wrapper NUBEFACT
 * se completa cuando lleguen las credenciales sandbox.
 */

export interface SunatOutboxMessage {
  tenantId: string;
  documentoTipo: DocumentoSunatTipo;
  documentoId: string;
  intento: number;
  encoladoAt: string; // ISO
}

/**
 * Encola un envío a SUNAT. Idempotente por (documentoTipo, documentoId): si ya
 * hay un mensaje pendiente para el mismo documento, no se duplica.
 *
 * @returns msg_id de pgmq.send (número entero) o null si ya estaba encolado.
 */
export async function encolarEnvioSunat(
  args: Omit<SunatOutboxMessage, 'intento' | 'encoladoAt'> & { intento?: number }
): Promise<{ msgId: number | null; duplicado: boolean }> {
  const intento = args.intento ?? 1;

  // Verifica si ya hay un mensaje pendiente para este documento
  const existentes = await db.execute<{ msg_id: number }>(sql`
    SELECT msg_id FROM pgmq.q_sunat_outbox
     WHERE message->>'documentoId' = ${args.documentoId}
       AND message->>'documentoTipo' = ${args.documentoTipo}
     LIMIT 1
  `);

  if ((existentes as unknown as { length: number }).length > 0) {
    const row = (existentes as unknown as { msg_id: number }[])[0];
    return { msgId: Number(row.msg_id), duplicado: true };
  }

  const payload: SunatOutboxMessage = {
    tenantId: args.tenantId,
    documentoTipo: args.documentoTipo,
    documentoId: args.documentoId,
    intento,
    encoladoAt: new Date().toISOString(),
  };

  const result = await db.execute<{ send: number }>(sql`
    SELECT pgmq.send('sunat_outbox', ${JSON.stringify(payload)}::jsonb) AS send
  `);

  const row = (result as unknown as { send: number }[])[0];
  return { msgId: row?.send != null ? Number(row.send) : null, duplicado: false };
}

/**
 * Re-encola con backoff incremental. Llamar desde el worker tras error transitorio.
 * Backoff: 30s, 2min, 10min, 1h, 6h (max 5 intentos).
 */
const BACKOFF_SEGUNDOS = [30, 120, 600, 3600, 21600];
export const MAX_INTENTOS_SUNAT = BACKOFF_SEGUNDOS.length;

export async function reencolarConBackoff(
  args: Omit<SunatOutboxMessage, 'encoladoAt'>
): Promise<{ msgId: number | null; agotado: boolean }> {
  if (args.intento > MAX_INTENTOS_SUNAT) {
    return { msgId: null, agotado: true };
  }
  const delay = BACKOFF_SEGUNDOS[Math.min(args.intento - 1, BACKOFF_SEGUNDOS.length - 1)];

  const payload: SunatOutboxMessage = {
    ...args,
    encoladoAt: new Date().toISOString(),
  };

  const result = await db.execute<{ send: number }>(sql`
    SELECT pgmq.send('sunat_outbox', ${JSON.stringify(payload)}::jsonb, ${delay}::integer) AS send
  `);

  const row = (result as unknown as { send: number }[])[0];
  return { msgId: row?.send != null ? Number(row.send) : null, agotado: false };
}
