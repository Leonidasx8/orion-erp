'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowRight, Shield, MailCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const enviarMagicLink = async () => {
    if (!email) return;
    setStatus('sending');
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/login/callback` },
    });
    setStatus(error ? 'error' : 'sent');
  };

  if (status === 'sent') {
    return (
      <div className="grid min-h-screen place-items-center p-4">
        <div className="text-center">
          <MailCheck className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h2 className="text-xl font-semibold tracking-tight">Revisa tu correo</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enviamos un enlace a <span className="font-medium text-foreground">{email}</span>.
            Válido por 10 minutos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo + nombre */}
        <div className="mb-6 flex items-center justify-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/orion-logo.png" alt="Orión" className="h-9 w-9" />
          <span className="text-[18px] font-semibold tracking-[-0.01em]">Sistema Orión</span>
        </div>

        {/* Card */}
        <div className="rounded-xl border bg-card p-7 shadow-sm">
          <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Ingresar</h1>
          <p className="mb-5 mt-1.5 text-[13px] text-muted-foreground">
            Te enviamos un enlace mágico al correo. No usamos contraseñas.
          </p>

          {/* Campo email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium">
              Correo corporativo
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                <Mail size={13} />
              </span>
              <Input
                id="email"
                type="email"
                placeholder="tu@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && enviarMagicLink()}
                className="pl-8"
              />
            </div>
          </div>

          {/* Botón */}
          <Button
            onClick={enviarMagicLink}
            disabled={status === 'sending' || !email}
            className="mt-4 flex w-full items-center justify-center gap-2"
          >
            {status === 'sending' ? 'Enviando...' : 'Enviar enlace mágico'}
            {status !== 'sending' && <ArrowRight size={14} />}
          </Button>

          {status === 'error' && (
            <p className="mt-3 text-sm text-destructive">Error al enviar. Intenta de nuevo.</p>
          )}

          {/* Divider */}
          <div className="my-5 border-t" />

          {/* Footer del card */}
          <div className="flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground">
            <Shield size={13} />
            <span>Conexión segura · MFA requerido para Superadmin</span>
          </div>
        </div>

        {/* Texto debajo del card */}
        <p className="mt-4 text-center text-[11.5px] text-muted-foreground">
          ¿Problemas para ingresar? Contacta a{' '}
          <span className="text-primary">soporte@orion.app</span>
        </p>
      </div>
    </div>
  );
}
