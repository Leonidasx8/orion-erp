import { newEnforcer, type Enforcer } from 'casbin';
import PostgresAdapter from 'casbin-pg-adapter';
import path from 'path';

let enforcer: Enforcer | null = null;
let initPromise: Promise<Enforcer> | null = null;
let lastReload = 0;
const RELOAD_TTL_MS = 30_000;

async function buildEnforcer(): Promise<Enforcer> {
  const adapter = await PostgresAdapter.newAdapter({
    connectionString: process.env.DATABASE_URL!,
  });

  return newEnforcer(path.join(process.cwd(), 'src/lib/auth/casbin/model.conf'), adapter);
}

export async function getEnforcer(): Promise<Enforcer> {
  const now = Date.now();

  if (enforcer) {
    if (now - lastReload > RELOAD_TTL_MS) {
      await enforcer.loadPolicy();
      lastReload = now;
    }
    return enforcer;
  }

  // Mutex: si otra request ya está inicializando, esperar a esa promesa.
  // Sin esto, múltiples Server Components paralelos disparan migrations
  // concurrentes en casbin-pg-adapter y todas fallan con "Another migration
  // is already running".
  if (!initPromise) {
    initPromise = buildEnforcer()
      .then((e) => {
        enforcer = e;
        lastReload = Date.now();
        return e;
      })
      .catch((err) => {
        initPromise = null; // permitir reintento en la siguiente request
        throw err;
      });
  }
  return initPromise;
}

/**
 * Verifica permiso vía SQL directo. Más confiable que pasar por el enforcer
 * de casbin que tiene problemas de race en el init del adapter durante dev.
 *
 * Lee la tabla `casbin` (jsonb rule) que el adapter mantiene sincronizada.
 * Equivalente al matcher: g(user, rol, tenant) && p(rol, tenant, permiso).
 */
export async function userCan(userId: string, tenantId: string, permiso: string): Promise<boolean> {
  const { db } = await import('@/lib/db/client');
  const { sql } = await import('drizzle-orm');
  const result = await db.execute<{ allowed: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1
      FROM casbin g
      JOIN casbin p ON p.rule->>0 = g.rule->>1
      WHERE g.ptype = 'g'
        AND p.ptype = 'p'
        AND g.rule->>0 = ${userId}
        AND g.rule->>2 = ${tenantId}
        AND p.rule->>1 = ${tenantId}
        AND p.rule->>2 = ${permiso}
    ) AS allowed
  `);
  // drizzle-orm postgres-js execute devuelve el array directo
  const rows = result as unknown as Array<{ allowed: boolean }>;
  return rows[0]?.allowed === true;
}

export async function reloadPolicy(): Promise<void> {
  if (enforcer) {
    await enforcer.loadPolicy();
    lastReload = Date.now();
  }
}
