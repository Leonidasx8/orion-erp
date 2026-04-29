import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db/client';
import { tenants, tenantMembers, seriesDocumentos } from '@/lib/db/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Detalle tenant — Dignita' };

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [t] = await db.select().from(tenants).where(eq(tenants.id, id));
  if (!t) notFound();

  const [members, series] = await Promise.all([
    db.select().from(tenantMembers).where(eq(tenantMembers.tenantId, id)),
    db.select().from(seriesDocumentos).where(eq(seriesDocumentos.tenantId, id)),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/admin/tenants" className="hover:underline">
              Tenants
            </Link>{' '}
            / {t.slug}
          </p>
          <h1 className="mt-1 text-2xl font-bold">{t.razonSocial}</h1>
        </div>
        <Badge variant={t.estado === 'activo' ? 'default' : 'destructive'}>{t.estado}</Badge>
      </div>

      {/* Datos principales */}
      <div className="rounded-lg border p-5">
        <h2 className="mb-4 text-sm font-semibold">Datos fiscales</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">RUC</dt>
            <dd className="font-mono">{t.ruc}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Slug</dt>
            <dd className="font-mono">/{t.slug}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Dirección</dt>
            <dd>{t.direccionFiscal ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Plan</dt>
            <dd>{t.plan}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Alta</dt>
            <dd>{t.fechaAlta?.toISOString().slice(0, 10)}</dd>
          </div>
        </dl>
      </div>

      {/* Series SUNAT */}
      <div className="rounded-lg border p-5">
        <h2 className="mb-4 text-sm font-semibold">Series de documentos</h2>
        {series.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin series configuradas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2">Tipo</th>
                <th className="pb-2">Serie</th>
                <th className="pb-2">Correlativo actual</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {series.map((s) => (
                <tr key={s.id}>
                  <td className="py-2">{s.tipoDocumento}</td>
                  <td className="py-2 font-mono">{s.serie}</td>
                  <td className="py-2 font-mono">{s.correlativoActual}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Miembros */}
      <div className="rounded-lg border p-5">
        <h2 className="mb-4 text-sm font-semibold">Miembros ({members.length})</h2>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin miembros.</p>
        ) : (
          <ul className="divide-y text-sm">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2">
                <span className="font-mono text-xs text-muted-foreground">{m.userId}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{m.rol}</Badge>
                  <Badge variant={m.activo ? 'default' : 'outline'}>
                    {m.activo ? 'activo' : 'pendiente'}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href="/admin/tenants">Volver</Link>
        </Button>
      </div>
    </div>
  );
}
