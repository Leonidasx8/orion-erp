import { ProductosImportar } from '@/components/modules/productos/ProductosImportar';

export const metadata = { title: 'Importar productos' };

export default async function ImportarProductosPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  return <ProductosImportar companySlug={companySlug} />;
}
