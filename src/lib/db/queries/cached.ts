import { unstable_cache } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { unidadesMedida, categoriasProducto } from '@/lib/db/schema';

/** Unidades de medida — tabla global de referencia, cambia muy raramente. 1h TTL. */
export const getUnidadesMedida = unstable_cache(
  async () => db.select().from(unidadesMedida),
  ['uoms-global'],
  { revalidate: 3600, tags: ['uoms'] }
);

/** Categorías de producto por tenant. 60s TTL — se invalida al crear/editar categorías. */
export const getCategoriasByTenant = unstable_cache(
  async (tenantId: string) =>
    db.select().from(categoriasProducto).where(eq(categoriasProducto.tenantId, tenantId)),
  ['categorias-tenant'],
  { revalidate: 60, tags: ['categorias'] }
);
