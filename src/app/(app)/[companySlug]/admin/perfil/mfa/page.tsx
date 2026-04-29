'use client';

import { useState } from 'react';
import { enrollMfa, verifyMfaEnroll } from '@/server/actions/mfa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function MfaSetupPage() {
  const [stage, setStage] = useState<'idle' | 'verifying' | 'enabled'>('idle');
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const start = async () => {
    setLoading(true);
    setError(null);
    const res = await enrollMfa();
    setLoading(false);
    if (!res.success) return setError(res.error);
    setQr(res.data.qr);
    setSecret(res.data.secret);
    setFactorId(res.data.factorId);
    setStage('verifying');
  };

  const verify = async () => {
    if (!factorId) return;
    setLoading(true);
    setError(null);
    const res = await verifyMfaEnroll(factorId, code);
    setLoading(false);
    if (!res.success) return setError(res.error);
    setStage('enabled');
  };

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-bold">Activar MFA</h1>

      {stage === 'idle' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Protege tu cuenta con autenticación de dos factores (TOTP). Necesitarás una app como
            Authy o Google Authenticator.
          </p>
          <Button onClick={start} disabled={loading}>
            {loading ? 'Preparando...' : 'Comenzar configuración'}
          </Button>
        </div>
      )}

      {stage === 'verifying' && (
        <div className="space-y-4">
          <p className="text-sm">
            Escanea el QR con tu app TOTP e ingresa el código de 6 dígitos para confirmar:
          </p>
          {qr && (
            <div
              className="inline-block rounded-lg border bg-white p-4"
              dangerouslySetInnerHTML={{ __html: qr }}
            />
          )}
          {secret && (
            <p className="break-all font-mono text-xs text-muted-foreground">Secret: {secret}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="code">Código de verificación</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              placeholder="123456"
            />
          </div>
          <Button onClick={verify} disabled={loading || code.length !== 6}>
            {loading ? 'Verificando...' : 'Activar MFA'}
          </Button>
        </div>
      )}

      {stage === 'enabled' && (
        <p className="text-sm font-medium text-green-600">MFA activado correctamente.</p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
