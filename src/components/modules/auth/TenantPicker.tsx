'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { seleccionarEmpresa } from '@/server/actions/seleccionar-empresa';
import type { Tenant } from '@/lib/db/schema';

type Membership = { tenant: Tenant; rol: string };

export function TenantPicker({ memberships }: { memberships: Membership[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSelect(slug: string) {
    setError(null);
    startTransition(async () => {
      const result = await seleccionarEmpresa(slug);
      if (result?.error === 'no-access') {
        setError('No tienes acceso a esa empresa.');
      }
    });
  }

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-3xl">
        <h1 className="mb-6 text-center text-2xl font-bold">Selecciona tu empresa</h1>
        {error && <p className="mb-4 text-center text-sm text-destructive">{error}</p>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {memberships.map(({ tenant, rol }) => (
            <Card key={tenant.id} className="transition-colors hover:border-primary">
              <CardHeader>
                {tenant.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={tenant.logoUrl} alt="" className="mb-2 h-12 object-contain" />
                )}
                <CardTitle className="text-lg">{tenant.razonSocial}</CardTitle>
                <CardDescription>
                  {rol} · /{tenant.slug}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  disabled={pending}
                  onClick={() => handleSelect(tenant.slug)}
                >
                  Entrar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
