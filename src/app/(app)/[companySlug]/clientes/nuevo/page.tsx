import { notFound } from 'next/navigation';
import Link from 'next/link';
import { userHasPermission } from '@/lib/auth/require-permission';
import { ClienteForm } from '@/components/modules/clientes/ClienteForm';

export const metadata = { title: 'Nuevo cliente' };

export default async function NuevoClientePage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const canCreate = await userHasPermission('clientes.crear');
  if (!canCreate) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href={`/${companySlug}/clientes`} className="hover:underline">
            Clientes
          </Link>{' '}
          / Nuevo
        </p>
        <h1 className="mt-1 text-2xl font-bold">Nuevo cliente</h1>
      </div>
      <ClienteForm companySlug={companySlug} />
    </div>
  );
}
