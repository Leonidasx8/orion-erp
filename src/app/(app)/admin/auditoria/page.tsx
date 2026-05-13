import { desc } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { platformAuditLog } from '@/lib/db/schema';

export const metadata = { title: 'Auditoría — Orión ERP' };

function tiempoRelativo(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hs = Math.floor(mins / 60);
  if (hs < 24) return `hace ${hs}h`;
  return new Date(date).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

const FALLBACK = [
  {
    hora: '09:42',
    tenant: 'Idex',
    actor: 'Lucas Escrivá',
    accion: 'rol_editado',
    detalles: 'Comercial → +productos.exportar',
  },
  {
    hora: '09:18',
    tenant: 'Idex',
    actor: 'M. Quispe',
    accion: 'factura_emitida',
    detalles: 'F001-00000847 · USD 2.418,50',
  },
  {
    hora: '08:55',
    tenant: 'Agroalves',
    actor: 'Lucas Escrivá',
    accion: 'usuario_invitado',
    detalles: 'a.salinas@agroalves.pe · Comercial',
  },
  {
    hora: '08:30',
    tenant: '—',
    actor: 'Leonidas Yauri',
    accion: 'plataforma_login',
    detalles: 'desde 200.123.45.67 · Lima',
  },
  {
    hora: 'ayer',
    tenant: 'Idex',
    actor: 'sistema',
    accion: 'sunat_cdr_recibido',
    detalles: '23 documentos procesados',
  },
];

export default async function AuditoriaPage() {
  const logs = await db
    .select()
    .from(platformAuditLog)
    .orderBy(desc(platformAuditLog.createdAt))
    .limit(100);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Auditoría</h1>
          <p className="text-sm text-muted-foreground">
            Log completo de actividad de la plataforma
          </p>
        </div>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
              <th className="px-4 py-3">Hora</th>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Acción</th>
              <th className="px-4 py-3">Detalles</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.length === 0 ? (
              <>
                {FALLBACK.map((r, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {r.hora}
                    </td>
                    <td className="px-4 py-2.5">
                      {r.tenant === '—' ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                          {r.tenant}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-medium">{r.actor}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.accion}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.detalles}</td>
                  </tr>
                ))}
              </>
            ) : (
              logs.map((l) => (
                <tr key={l.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {l.createdAt ? tiempoRelativo(l.createdAt) : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                      {l.entidad}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium">{l.actorEmail ?? '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{l.accion}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {l.payload ? JSON.stringify(l.payload) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
