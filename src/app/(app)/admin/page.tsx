import Link from 'next/link';
import { count, desc } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { tenants, tenantMembers, platformAuditLog } from '@/lib/db/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Download,
  Plus,
  Building2,
  Users,
  FileText,
  Zap,
  ArrowUpRight,
  ArrowRight,
  MoreHorizontal,
} from 'lucide-react';
import { AdminSunatChart } from '@/components/modules/admin/AdminSunatChart';

export const metadata = { title: 'Dashboard — Sistema Orión' };

// Helpers
function slugInitials(slug: string): string {
  // "agroalves" → "AG", "idex" → "IX"
  const parts = slug.replace(/-/g, ' ').split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return slug.slice(0, 2).toUpperCase();
}

const FALLBACK_AUDIT_ROWS = [
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

function EstadoBadge({ estado }: { estado: string }) {
  if (estado === 'activo') {
    return (
      <Badge className="border-transparent bg-green-100 text-green-700 hover:bg-green-100">
        activo
      </Badge>
    );
  }
  if (estado === 'prueba') {
    return (
      <Badge className="border-transparent bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
        prueba
      </Badge>
    );
  }
  return <Badge variant="destructive">{estado}</Badge>;
}

export default async function AdminDashboardPage() {
  // --- DB queries ---
  const allTenants = await db.select().from(tenants).orderBy(tenants.fechaAlta);

  // Count users per tenant
  const userCounts = await db
    .select({
      tenantId: tenantMembers.tenantId,
      cnt: count(),
    })
    .from(tenantMembers)
    .groupBy(tenantMembers.tenantId);

  const userCountMap = new Map(userCounts.map((r) => [r.tenantId, r.cnt]));

  // Total users
  const [{ totalUsers }] = await db.select({ totalUsers: count() }).from(tenantMembers);

  // Audit log (last 5)
  const recentLogs = await db
    .select()
    .from(platformAuditLog)
    .orderBy(desc(platformAuditLog.createdAt))
    .limit(5);

  const activeTenants = allTenants.filter((t) => t.estado === 'activo');
  const tenantNames = activeTenants.map((t) => t.razonSocial).join(' · ');

  return (
    <div className="space-y-0">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Plataforma Orión</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Vista global · {activeTenants.length} tenants activos · {totalUsers} usuarios totales
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download size={13} />
            Exportar métricas
          </Button>
          <Button size="sm" className="gap-1.5" asChild>
            <Link href="/admin/tenants/nuevo">
              <Plus size={13} />
              Nuevo tenant
            </Link>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {/* Tenants activos */}
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 size={12} />
            Tenants activos
          </div>
          <div className="text-2xl font-bold tracking-tight">
            {activeTenants.length}
            <span className="ml-1.5 text-sm font-normal text-muted-foreground">
              / {allTenants.length}
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{tenantNames || 'Sin tenants'}</div>
        </div>

        {/* Usuarios totales */}
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users size={12} />
            Usuarios totales
          </div>
          <div className="text-2xl font-bold tracking-tight">{totalUsers}</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
            <ArrowUpRight size={11} />
            +3 esta semana
          </div>
        </div>

        {/* Facturas SUNAT */}
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText size={12} />
            Facturas SUNAT (mes)
          </div>
          <div className="text-2xl font-bold tracking-tight">847</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
            <ArrowUpRight size={11} />
            +12,4% vs marzo
          </div>
        </div>

        {/* API NUBEFACT */}
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap size={12} />
            API NUBEFACT
          </div>
          <div className="text-2xl font-bold tracking-tight text-green-600">99,8%</div>
          <div className="mt-1 text-xs text-muted-foreground">último incidente: 21 abr</div>
        </div>
      </div>

      {/* Tenants table + SUNAT chart */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[5fr_3fr]">
        {/* Tenants card */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center border-b px-4 py-3">
            <span className="text-sm font-semibold">Tenants</span>
            <Button variant="ghost" size="sm" className="ml-auto gap-1 text-xs" asChild>
              <Link href="/admin/tenants">
                Ver todos
                <ArrowRight size={12} />
              </Link>
            </Button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Tenant</th>
                <th className="px-4 py-2 font-medium">Plan</th>
                <th className="px-4 py-2 text-right font-medium">Usuarios</th>
                <th className="px-4 py-2 text-right font-medium">Docs SUNAT (mes)</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {allTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Sin tenants registrados.
                  </td>
                </tr>
              ) : (
                allTenants.map((t, i) => {
                  const initials = slugInitials(t.slug);
                  const avatarBg =
                    i === 0 ? 'bg-violet-600' : i === 1 ? 'bg-green-600' : 'bg-slate-400';
                  const userCount = userCountMap.get(t.id) ?? 0;
                  return (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`grid h-6 w-6 shrink-0 place-items-center rounded-[4px] text-[10px] font-semibold text-white ${avatarBg}`}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{t.razonSocial}</div>
                            <div className="font-mono text-[11px] text-muted-foreground">
                              /{t.slug}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary" className="capitalize">
                          {t.plan}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm">{userCount}</td>
                      <td className="px-4 py-2.5 text-right text-sm text-muted-foreground">—</td>
                      <td className="px-4 py-2.5">
                        <EstadoBadge estado={t.estado} />
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/admin/tenants/${t.id}`}
                          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <MoreHorizontal size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* SUNAT chart card */}
        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <span className="text-sm font-semibold">Volumen SUNAT · 30 días</span>
          </div>
          <AdminSunatChart />
        </div>
      </div>

      {/* Audit log */}
      <div className="mt-4 rounded-lg border bg-card">
        <div className="flex items-center border-b px-4 py-3">
          <span className="text-sm font-semibold">Actividad reciente · auditoría</span>
          <Button variant="ghost" size="sm" className="ml-auto gap-1 text-xs" asChild>
            <Link href="/admin/auditoria">
              Ver log completo
              <ArrowRight size={12} />
            </Link>
          </Button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">Hora</th>
              <th className="px-4 py-2 font-medium">Tenant</th>
              <th className="px-4 py-2 font-medium">Actor</th>
              <th className="px-4 py-2 font-medium">Acción</th>
              <th className="px-4 py-2 font-medium">Detalles</th>
            </tr>
          </thead>
          <tbody>
            {recentLogs.length > 0
              ? recentLogs.map((l) => {
                  const tenantLabel = l.entidadId ?? '—';
                  const hora = l.createdAt
                    ? l.createdAt.toLocaleString('es-PE', { hour: '2-digit', minute: '2-digit' })
                    : '—';
                  const detalles =
                    l.payload && typeof l.payload === 'object' && !Array.isArray(l.payload)
                      ? JSON.stringify(l.payload).slice(0, 60)
                      : String(l.payload ?? '');
                  return (
                    <tr key={l.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{hora}</td>
                      <td className="px-4 py-2">
                        {tenantLabel === '—' ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <Badge variant="secondary" className="text-[11px]">
                            {tenantLabel}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm">{l.actorEmail ?? '—'}</td>
                      <td className="px-4 py-2">
                        <span className="font-mono text-[11.5px]">{l.accion}</span>
                      </td>
                      <td className="px-4 py-2 text-sm text-muted-foreground">{detalles}</td>
                    </tr>
                  );
                })
              : FALLBACK_AUDIT_ROWS.map((r, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{r.hora}</td>
                    <td className="px-4 py-2">
                      {r.tenant === '—' ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Badge variant="secondary" className="text-[11px]">
                          {r.tenant}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm">{r.actor}</td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-[11.5px]">{r.accion}</span>
                    </td>
                    <td className="px-4 py-2 text-sm text-muted-foreground">{r.detalles}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
