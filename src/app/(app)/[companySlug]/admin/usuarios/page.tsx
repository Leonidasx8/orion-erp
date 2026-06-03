import { and, eq } from 'drizzle-orm';
import {
  Search,
  Shield,
  Check,
  AlertTriangle,
  MoreHorizontal,
  Download,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { requirePermissionPage } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { tenantMembers } from '@/lib/db/schema';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { PageHead } from '@/components/shared/PageHead';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Usuarios' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date: Date | null | string): string {
  if (!date) return '—';
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins} min`;
  const hs = Math.floor(mins / 60);
  if (hs < 24) return `hace ${hs} hora${hs > 1 ? 's' : ''}`;
  const days = Math.floor(hs / 24);
  if (days < 30) return `hace ${days} día${days > 1 ? 's' : ''}`;
  const months = Math.floor(days / 30);
  return `hace ${months} mes${months > 1 ? 'es' : ''}`;
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROL_BADGES: Record<string, string> = {
  superadmin: 'bg-tenant-accent-soft text-tenant-accent-fg',
  comercial: 'bg-orion-bg-muted text-orion-fg-muted',
  facturación: 'bg-orion-bg-muted text-orion-fg-muted',
  contabilidad: 'bg-orion-bg-muted text-orion-fg-muted',
};

const PRIVILEGED_ROLES = new Set(['superadmin', 'contabilidad']);

const ESTADO_STYLE: Record<string, string> = {
  activo: 'text-success-fg',
  invitado: 'text-warn-fg',
  inactivo: 'text-orion-fg-muted',
  suspendido: 'text-danger-fg',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function UsuariosPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  await requirePermissionPage('admin.usuarios.ver', companySlug);
  const tenant = await getCurrentTenant();

  const [members, adminClient] = await Promise.all([
    db
      .select()
      .from(tenantMembers)
      .where(and(eq(tenantMembers.tenantId, tenant.id)))
      .orderBy(tenantMembers.invitedAt),
    createServerAdminClient(),
  ]);

  // Fetch auth users to get email + metadata + MFA factors
  const {
    data: { users },
  } = await adminClient.auth.admin.listUsers({ perPage: 100 });
  const userMap = new Map(users.map((u) => [u.id, u]));

  type Row = {
    id: string;
    userId: string;
    nombre: string;
    email: string;
    initials: string;
    rol: string;
    mfa: boolean;
    ultimoAcceso: string;
    estado: string;
  };

  const rows: Row[] = members.map((m) => {
    const authUser = userMap.get(m.userId);
    const nombre =
      (authUser?.user_metadata?.nombre as string | undefined) ??
      (authUser?.user_metadata?.full_name as string | undefined) ??
      authUser?.email?.split('@')[0] ??
      'Usuario';
    const email = authUser?.email ?? m.userId.slice(0, 8) + '…';
    const hasMfa = (authUser?.factors ?? []).some(
      (f: { factor_type: string; status: string }) => f.status === 'verified'
    );
    return {
      id: m.id,
      userId: m.userId,
      nombre,
      email,
      initials: initials(nombre),
      rol: m.rol,
      mfa: hasMfa,
      ultimoAcceso: timeAgo(m.ultimoLoginAt),
      estado: m.estado,
    };
  });

  const activos = rows.filter((r) => r.estado === 'activo').length;
  const invitados = rows.filter((r) => r.estado === 'invitado').length;
  const inactivos = rows.filter((r) => r.estado !== 'activo' && r.estado !== 'invitado').length;

  return (
    <div className="space-y-5">
      <PageHead
        title={`Usuarios de ${tenant.razonSocial.split(' ')[0]}`}
        subtitle={`${activos} activos${invitados > 0 ? ` · ${invitados} invitación pendiente` : ''} · MFA obligatorio para roles privilegiados`}
        actions={
          <>
            <button className="inline-flex h-8 items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] font-medium text-orion-fg hover:bg-orion-bg-muted">
              <Download size={13} />
              Exportar
            </button>
            <Link
              href={`/${companySlug}/admin/usuarios/invitar`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-tenant-accent px-3 text-[13px] font-medium text-white hover:brightness-95"
            >
              <UserPlus size={13} />
              Invitar usuario
            </Link>
          </>
        }
      />

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-64 items-center gap-2 rounded-md border border-orion-border bg-orion-bg px-2.5">
          <Search size={13} className="shrink-0 text-orion-fg-faint" />
          <input
            placeholder="Buscar por nombre, email…"
            className="flex-1 bg-transparent text-[12px] text-orion-fg placeholder:text-orion-fg-faint focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-orion-border bg-orion-bg shadow-orion-1">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-orion-border bg-orion-bg-subtle text-left text-[10.5px] font-semibold uppercase tracking-wider text-orion-fg-muted">
              <th className="px-4 py-2.5">Usuario</th>
              <th className="px-4 py-2.5">Rol</th>
              <th className="px-4 py-2.5">MFA</th>
              <th className="px-4 py-2.5">Último acceso</th>
              <th className="px-4 py-2.5">Estado</th>
              <th className="w-8 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-orion-border">
            {rows.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-orion-bg-subtle">
                {/* Usuario */}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orion-bg-muted text-[11px] font-semibold text-orion-fg-muted">
                      {r.initials}
                    </span>
                    <div>
                      <div className="font-medium text-orion-fg">{r.nombre}</div>
                      <div className="text-[11px] text-orion-fg-faint">{r.email}</div>
                    </div>
                  </div>
                </td>

                {/* Rol */}
                <td className="px-4 py-2.5">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-medium',
                      ROL_BADGES[r.rol.toLowerCase()] ?? 'bg-orion-bg-muted text-orion-fg-muted'
                    )}
                  >
                    {PRIVILEGED_ROLES.has(r.rol.toLowerCase()) && <Shield size={10} />}
                    {r.rol}
                  </span>
                </td>

                {/* MFA */}
                <td className="px-4 py-2.5">
                  {r.estado === 'invitado' ? (
                    <span className="text-orion-fg-faint">—</span>
                  ) : r.mfa ? (
                    <span className="flex items-center gap-1 text-[11.5px] text-success-fg">
                      <Check size={12} />
                      Activo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11.5px] text-warn-fg">
                      <AlertTriangle size={12} />
                      Inactivo
                    </span>
                  )}
                </td>

                {/* Último acceso */}
                <td className="px-4 py-2.5 text-orion-fg-muted">{r.ultimoAcceso}</td>

                {/* Estado */}
                <td className="px-4 py-2.5">
                  <span
                    className={cn(
                      'text-[11.5px] font-medium',
                      ESTADO_STYLE[r.estado] ?? 'text-orion-fg-muted'
                    )}
                  >
                    {r.estado}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-2.5">
                  <button className="grid h-6 w-6 place-items-center rounded-md text-orion-fg-faint hover:bg-orion-bg-muted hover:text-orion-fg">
                    <MoreHorizontal size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="py-8 text-center text-[13px] text-orion-fg-muted">Sin usuarios.</p>
        )}

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-orion-border bg-orion-bg-subtle px-4 py-2 text-[12px] text-orion-fg-muted">
          <span>{rows.length} usuarios totales</span>
          <div className="ml-auto flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success" />
              {activos} activos
            </span>
            {invitados > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-warn" />
                {invitados} invitado{invitados > 1 ? 's' : ''}
              </span>
            )}
            {inactivos > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full border bg-orion-bg-muted" />
                {inactivos} inactivos/suspendidos
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
