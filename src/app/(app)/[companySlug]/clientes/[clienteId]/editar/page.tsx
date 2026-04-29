import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db/client';
import { clientes } from '@/lib/db/schema';
import { userHasPermission } from '@/lib/auth/require-permission';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { ClienteForm } from '@/components/modules/clientes/ClienteForm';

export const metadata = { title: 'Editar cliente' };

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ companySlug: string; clienteId: string }>;
}) {
  const { companySlug, clienteId } = await params;
  const tenant = await getCurrentTenant();
  const canEdit = await userHasPermission('clientes.editar');
  if (!canEdit) notFound();

  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, clienteId));
  if (!cliente || cliente.tenantId !== tenant.id) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href={`/${companySlug}/clientes`} className="hover:underline">
            Clientes
          </Link>{' '}
          /{' '}
          <Link href={`/${companySlug}/clientes/${clienteId}`} className="hover:underline">
            {cliente.razonSocial ??
              [cliente.nombres, cliente.apellidoPaterno].filter(Boolean).join(' ')}
          </Link>{' '}
          / Editar
        </p>
        <h1 className="mt-1 text-2xl font-bold">Editar cliente</h1>
      </div>
      <ClienteForm companySlug={companySlug} cliente={cliente} />
    </div>
  );
}
