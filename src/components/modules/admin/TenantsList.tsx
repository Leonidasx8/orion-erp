'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Tenant } from '@/lib/db/schema';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export function TenantsList({ tenants }: { tenants: Tenant[] }) {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return tenants.filter(
      (t) => t.razonSocial.toLowerCase().includes(q) || t.slug.includes(q) || t.ruc.includes(q)
    );
  }, [tenants, filter]);

  return (
    <div className="space-y-3">
      <Input
        placeholder="Buscar por razón social, slug o RUC..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="max-w-sm"
      />

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {tenants.length === 0
            ? 'Aún no hay tenants. Crea el primero.'
            : 'Sin resultados para la búsqueda.'}
        </p>
      )}

      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30 text-left text-xs font-medium text-muted-foreground">
              <th className="px-4 py-2">Razón social</th>
              <th className="px-4 py-2">Slug</th>
              <th className="px-4 py-2">RUC</th>
              <th className="px-4 py-2">Plan</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Alta</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-muted/20">
                <td className="px-4 py-2.5">
                  <Link href={`/admin/tenants/${t.id}`} className="font-medium hover:underline">
                    {t.razonSocial}
                  </Link>
                </td>
                <td className="px-4 py-2.5 font-mono text-sm text-muted-foreground">{t.slug}</td>
                <td className="px-4 py-2.5 font-mono text-sm">{t.ruc}</td>
                <td className="px-4 py-2.5">
                  <Badge variant="secondary">{t.plan}</Badge>
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant={t.estado === 'activo' ? 'default' : 'destructive'}>
                    {t.estado}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-sm text-muted-foreground">
                  {t.fechaAlta?.toISOString().slice(0, 10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
