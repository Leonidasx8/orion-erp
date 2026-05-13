'use client';

import { useState, useTransition } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { seleccionarEmpresa } from '@/server/actions/seleccionar-empresa';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Users, Clock, CheckCircle } from 'lucide-react';
import type { Tenant } from '@/lib/db/schema';
import type { User } from '@supabase/supabase-js';

type Membership = { tenant: Tenant; rol: string };

function getInitials(slug: string): string {
  return slug.slice(0, 2).toUpperCase();
}

function getUserName(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  if (meta?.full_name && typeof meta.full_name === 'string')
    return meta.full_name.split(' ')[0] ?? '';
  if (meta?.name && typeof meta.name === 'string') return meta.name.split(' ')[0] ?? '';
  if (user.email) return user.email.split('@')[0] ?? '';
  return 'tú';
}

export function TenantPicker({ memberships, user }: { memberships: Membership[]; user: User }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>(memberships[0]?.tenant.slug ?? '');
  const [remember, setRemember] = useState(true);

  function handleSelect(slug: string) {
    setSelected(slug);
    setError(null);
    startTransition(async () => {
      const result = await seleccionarEmpresa(slug);
      if (result?.error === 'no-access') {
        setError('No tienes acceso a esa empresa.');
      }
    });
  }

  async function handleSignOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  const nombre = getUserName(user);
  const n = memberships.length;

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-[720px]">
        {/* Logo + nombre */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/orion-logo.png" alt="Orión" className="h-9 w-9" />
          <span className="text-[18px] font-semibold tracking-[-0.01em]">Sistema Orión</span>
        </div>

        {/* Saludo */}
        <div className="mb-6 text-center">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Hola, {nombre} 👋</h1>
          <p className="mt-1.5 text-[14px] text-muted-foreground">
            Tienes acceso a {n} {n === 1 ? 'empresa' : 'empresas'}. ¿Con cuál quieres trabajar hoy?
          </p>
        </div>

        {error && <p className="mb-4 text-center text-sm text-destructive">{error}</p>}

        {/* Grid de tarjetas */}
        <div className="grid grid-cols-2 gap-4">
          {memberships.map(({ tenant, rol }) => {
            const isActive = tenant.slug === selected;
            return (
              <div
                key={tenant.id}
                onClick={() => !pending && handleSelect(tenant.slug)}
                className={[
                  'cursor-pointer rounded-xl border p-5 transition-all',
                  isActive
                    ? 'border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.2)]'
                    : 'border-border shadow-sm hover:border-primary/50',
                  pending ? 'cursor-wait opacity-60' : '',
                ].join(' ')}
              >
                {/* Header de la tarjeta */}
                <div className="flex items-center">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-[18px] font-bold text-white">
                    {getInitials(tenant.slug)}
                  </div>
                  <div className="ml-3 min-w-0">
                    <div className="text-[16px] font-semibold leading-tight">
                      {tenant.razonSocial.split(' ')[0]}
                    </div>
                    <div className="truncate text-[12px] text-muted-foreground">
                      {tenant.razonSocial}
                    </div>
                  </div>
                  {isActive && <CheckCircle size={18} className="ml-auto shrink-0 text-primary" />}
                </div>

                {/* Footer de la tarjeta */}
                <div className="mt-4 flex items-center gap-4 text-[12px]">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Shield size={12} />
                    <span>{rol}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users size={12} />
                    <span>usuarios</span>
                  </div>
                  <div className="ml-auto flex items-center gap-1 text-muted-foreground/70">
                    <Clock size={12} />
                    <span>—</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-center gap-4 text-[12px]">
          <label className="flex cursor-pointer items-center gap-1.5 text-muted-foreground">
            <Checkbox
              checked={remember}
              onCheckedChange={(checked) => setRemember(checked === true)}
              className="h-3.5 w-3.5"
            />
            <span>Recordar mi última empresa</span>
          </label>
          <span className="text-muted-foreground/50">·</span>
          <button
            onClick={() => void handleSignOut()}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
