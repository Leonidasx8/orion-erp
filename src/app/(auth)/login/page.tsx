'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
      <div className="grid min-h-screen place-items-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Revisa tu email</h1>
          <p className="mt-2 text-muted-foreground">Te enviamos un link a {email}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Iniciar sesión</h1>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enviarMagicLink()}
          />
        </div>
        <Button
          onClick={enviarMagicLink}
          disabled={status === 'sending' || !email}
          className="w-full"
        >
          {status === 'sending' ? 'Enviando...' : 'Enviar magic link'}
        </Button>
        {status === 'error' && (
          <p className="text-sm text-destructive">Error al enviar. Intenta de nuevo.</p>
        )}
      </div>
    </div>
  );
}
