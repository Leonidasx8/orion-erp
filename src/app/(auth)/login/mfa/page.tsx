'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { verifyMfaLogin } from '@/server/actions/mfa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function MfaLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(null);
    const res = await verifyMfaLogin(code);
    setLoading(false);
    if (!res.success) return setError(res.error);
    router.push('/seleccionar-empresa');
  };

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Verificación MFA</h1>
        <p className="text-sm text-muted-foreground">
          Ingresa el código de 6 dígitos de tu app TOTP.
        </p>
        <div className="space-y-2">
          <Label htmlFor="code">Código</Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            placeholder="123456"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        <Button onClick={submit} disabled={loading || code.length !== 6} className="w-full">
          {loading ? 'Verificando...' : 'Verificar'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
