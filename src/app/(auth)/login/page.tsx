'use client';

import { useState } from 'react';
import Image from 'next/image';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, ArrowRight, Shield, MailCheck } from 'lucide-react';

type Mode = 'password' | 'magic';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = () =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

  const ingresarConPassword = async () => {
    if (!email || !password) return;
    setStatus('sending');
    setErrorMsg(null);
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
      return;
    }
    // El callback resuelve destino (admin / picker / tenant)
    window.location.href = '/login/callback';
  };

  const enviarMagicLink = async () => {
    if (!email) return;
    setStatus('sending');
    setErrorMsg(null);
    const { error } = await supabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/login/callback` },
    });
    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
      return;
    }
    setStatus('sent');
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
          <Image
            src="/orion-logo.png"
            alt="Orión"
            width={36}
            height={36}
            priority
            className="h-9 w-9"
          />
          <span className="text-[18px] font-semibold tracking-[-0.01em]">Sistema Orión</span>
        </div>

        {/* Card */}
        <div className="rounded-xl border bg-card p-7 shadow-sm">
          <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Ingresar</h1>
          <p className="mb-5 mt-1.5 text-[13px] text-muted-foreground">
            {mode === 'password'
              ? 'Accede con tu correo corporativo y contraseña.'
              : 'Te enviamos un enlace mágico al correo. Sin contraseñas.'}
          </p>

          {/* Email */}
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
                className="pl-8"
              />
            </div>
          </div>

          {/* Password — solo en modo password */}
          {mode === 'password' && (
            <div className="mt-3 space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                  <Lock size={13} />
                </span>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && ingresarConPassword()}
                  className="pl-8"
                />
              </div>
            </div>
          )}

          {/* CTA */}
          <Button
            onClick={mode === 'password' ? ingresarConPassword : enviarMagicLink}
            disabled={status === 'sending' || !email || (mode === 'password' && !password)}
            className="mt-4 flex w-full items-center justify-center gap-2"
          >
            {status === 'sending'
              ? 'Ingresando...'
              : mode === 'password'
                ? 'Ingresar'
                : 'Enviar enlace mágico'}
            {status !== 'sending' && <ArrowRight size={14} />}
          </Button>

          {status === 'error' && (
            <p className="mt-3 text-sm text-destructive">
              {errorMsg ?? 'Error al ingresar. Verifica tus datos.'}
            </p>
          )}

          {/* Divider */}
          <div className="my-5 border-t" />

          {/* Switch modo */}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'password' ? 'magic' : 'password');
              setStatus('idle');
              setErrorMsg(null);
            }}
            className="block w-full text-center text-[12px] text-muted-foreground hover:text-primary"
          >
            {mode === 'password'
              ? '¿Sin contraseña? Recibe un enlace mágico al correo'
              : '¿Tienes contraseña? Ingresar con email + contraseña'}
          </button>

          {/* Footer del card */}
          <div className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground">
            <Shield size={13} />
            <span>Conexión segura · MFA requerido para Admin</span>
          </div>
        </div>

        {/* Texto debajo */}
        <p className="mt-4 text-center text-[11.5px] text-muted-foreground">
          ¿Problemas para ingresar? Contacta a{' '}
          <span className="text-primary">soporte@orion.app</span>
        </p>
      </div>
    </div>
  );
}
