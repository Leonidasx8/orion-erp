import { asc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { userHasPermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { clientes, productos } from '@/lib/db/schema';
import {
  OrdenForm,
  type ProductoOption,
  type ProveedorOption,
} from '@/components/modules/ordenes/OrdenForm';

export const metadata = { title: 'Nueva orden de compra' };

export default async function NuevaOrdenPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const tenant = await getCurrentTenant();

  const canCreate = await userHasPermission('ordenes.crear');
  if (!canCreate) redirect(`/${companySlug}/ordenes`);

  const [proveedoresRows, productosRows] = await Promise.all([
    db
      .select({
        id: clientes.id,
        razonSocial: clientes.razonSocial,
        nombres: clientes.nombres,
        apellidoPaterno: clientes.apellidoPaterno,
      })
      .from(clientes)
      .where(eq(clientes.tenantId, tenant.id))
      .orderBy(asc(clientes.razonSocial)),
    db
      .select({
        id: productos.id,
        codigo: productos.codigo,
        nombre: productos.nombre,
        precio: productos.precioUnitario,
        tieneIgv: productos.tieneIgv,
        activo: productos.activo,
      })
      .from(productos)
      .where(eq(productos.tenantId, tenant.id))
      .orderBy(asc(productos.codigo)),
  ]);

  const proveedoresOpt: ProveedorOption[] = proveedoresRows.map((c) => ({
    id: c.id,
    label:
      c.razonSocial ?? ([c.nombres, c.apellidoPaterno].filter(Boolean).join(' ') || 'Sin nombre'),
  }));
  const productosOpt: ProductoOption[] = productosRows
    .filter((p) => p.activo)
    .map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      precio: Number(p.precio),
      tieneIgv: p.tieneIgv,
    }));

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="font-mono text-[22px] font-semibold tracking-tight text-orion-fg">
          Nueva orden de compra
        </h1>
        <p className="text-[12px] text-orion-fg-muted">Se generará el correlativo al guardar.</p>
      </div>
      <OrdenForm companySlug={companySlug} proveedores={proveedoresOpt} productos={productosOpt} />
    </div>
  );
}
