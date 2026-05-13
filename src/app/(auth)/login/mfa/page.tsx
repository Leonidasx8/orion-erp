'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { verifyMfaLogin } from '@/server/actions/mfa';
import { Button } from '@/components/ui/button';
import { Shield, ChevronLeft } from 'lucide-react';

const DIGITS = 6;

export default function MfaLoginPage() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(DIGITS).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(DIGITS).fill(null));

  const code = digits.join('');
  const isComplete = code.length === DIGITS && digits.every((d) => d !== '');

  const focusAt = (index: number) => {
    const clamped = Math.max(0, Math.min(DIGITS - 1, index));
    inputRefs.current[clamped]?.focus();
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[index] !== '') {
        const next = [...digits];
        next[index] = '';
        setDigits(next);
      } else if (index > 0) {
        const next = [...digits];
        next[index - 1] = '';
        setDigits(next);
        focusAt(index - 1);
      }
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusAt(index - 1);
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusAt(index + 1);
      return;
    }

    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      const next = [...digits];
      next[index] = e.key;
      setDigits(next);
      if (index < DIGITS - 1) focusAt(index + 1);
      return;
    }

    if (e.key === 'Enter' && isComplete) {
      void submit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGITS);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i] ?? '';
    }
    setDigits(next);
    focusAt(Math.min(pasted.length, DIGITS - 1));
  };

  const submit = async () => {
    if (!isComplete) return;
    setLoading(true);
    setError(null);
    const res = await verifyMfaLogin(code);
    setLoading(false);
    if (!res.success) {
      setError(res.error ?? 'Error al verificar. Intenta de nuevo.');
      return;
    }
    router.push('/seleccionar-empresa');
  };

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
          {/* Shield icon */}
          <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Shield size={20} />
          </div>

          <h1 className="text-[20px] font-semibold tracking-[-0.01em]">
            Verificación en dos pasos
          </h1>
          <p className="mb-5 mt-1.5 text-[13px] text-muted-foreground">
            Ingresa el código de 6 dígitos generado por tu app autenticadora (Google Authenticator,
            1Password).
          </p>

          {/* OTP boxes */}
          <div className="flex justify-between gap-2">
            {digits.map((digit, i) => {
              const isFilled = digit !== '';
              const isActive = digits.slice(0, i).every((d) => d !== '') && !isFilled;

              return (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  readOnly
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  onFocus={() => focusAt(i)}
                  className={[
                    'h-14 w-12 cursor-default select-none rounded-lg border bg-background text-center font-mono text-[22px] font-semibold outline-none transition-all',
                    isFilled
                      ? 'border-primary text-foreground'
                      : isActive
                        ? 'border-primary bg-muted/30 text-muted-foreground ring-2 ring-primary/30'
                        : 'border-border bg-muted text-muted-foreground',
                  ].join(' ')}
                />
              );
            })}
          </div>

          {/* Botón Verificar */}
          <Button
            onClick={() => void submit()}
            disabled={loading || !isComplete}
            className="mt-5 w-full justify-center"
          >
            {loading ? 'Verificando...' : 'Verificar'}
          </Button>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          {/* Footer del card */}
          <div className="mt-4 flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Código expira en 0:23</span>
            <a href="#" className="text-primary hover:underline">
              Usar código de respaldo
            </a>
          </div>
        </div>

        {/* Volver */}
        <div className="mt-4 flex justify-center">
          <Link
            href="/login"
            className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={12} />
            Volver al ingreso
          </Link>
        </div>
      </div>
    </div>
  );
}
