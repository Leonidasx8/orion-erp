import { newEnforcer, type Enforcer } from 'casbin';
import PostgresAdapter from 'casbin-pg-adapter';
import path from 'path';

let enforcer: Enforcer | null = null;
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

  if (!enforcer) {
    enforcer = await buildEnforcer();
    lastReload = now;
  }

  if (now - lastReload > RELOAD_TTL_MS) {
    await enforcer.loadPolicy();
    lastReload = now;
  }

  return enforcer;
}

export async function userCan(userId: string, tenantId: string, permiso: string): Promise<boolean> {
  const e = await getEnforcer();
  return e.enforce(userId, tenantId, permiso);
}

export async function reloadPolicy(): Promise<void> {
  if (enforcer) {
    await enforcer.loadPolicy();
    lastReload = Date.now();
  }
}
