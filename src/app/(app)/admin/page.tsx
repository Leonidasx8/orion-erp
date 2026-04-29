import { count, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { tenants, platformAuditLog } from '@/lib/db/schema';

export const metadata = { title: 'Dashboard — Dignita' };

export default async function AdminDashboard() {
  const [{ activos }] = await db
    .select({ activos: count() })
    .from(tenants)
    .where(eq(tenants.estado, 'activo'));

  const [{ suspendidos }] = await db
    .select({ suspendidos: count() })
    .from(tenants)
    .where(eq(tenants.estado, 'suspendido'));

  const recentLogs = await db
    .select()
    .from(platformAuditLog)
    .orderBy(desc(platformAuditLog.createdAt))
    .limit(10);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Plataforma</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-5">
          <p className="text-sm text-muted-foreground">Tenants activos</p>
          <p className="mt-1 text-3xl font-bold">{activos}</p>
        </div>
        <div className="rounded-lg border p-5">
          <p className="text-sm text-muted-foreground">Suspendidos</p>
          <p className="mt-1 text-3xl font-bold">{suspendidos}</p>
        </div>
        <div className="rounded-lg border p-5">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="mt-1 text-3xl font-bold">{activos + suspendidos}</p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold">Actividad reciente</h2>
        <div className="divide-y rounded-lg border">
          {recentLogs.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Sin actividad registrada.
            </p>
          )}
          {recentLogs.map((l) => (
            <div key={l.id} className="flex items-baseline gap-3 px-4 py-2.5 text-sm">
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {l.createdAt?.toISOString().slice(0, 16).replace('T', ' ')}
              </span>
              <span className="font-medium">{l.actorEmail}</span>
              <span className="text-muted-foreground">{l.accion}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
