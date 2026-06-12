import { ClientesImportar } from '@/components/modules/clientes/ClientesImportar';

export const metadata = { title: 'Importar clientes' };

export default async function ImportarClientesPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  return <ClientesImportar companySlug={companySlug} />;
}
