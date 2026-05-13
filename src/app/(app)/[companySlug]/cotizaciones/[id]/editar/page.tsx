import { and, asc, eq } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { userHasPermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { clientes, cotizacionItems, cotizaciones, productos } from '@/lib/db/schema';
import {
  CotizacionForm,
  type ClienteOption,
  type CotizacionFormInitial,
  type ProductoOption,
} from '@/components/modules/cotizaciones/CotizacionForm';

export const metadata = { title: 'Editar cotización' };

export default async function EditarCotizacionPage({
  params,
}: {
  params: Promise<{ companySlug: string; id: string }>;
}) {
  const { companySlug, id } = await params;
  const tenant = await getCurrentTenant();

  const canEdit = await userHasPermission('cotizaciones.editar');
  if (!canEdit) redirect(`/${companySlug}/cotizaciones/${id}`);

  const [row] = await db
    .select()
    .from(cotizaciones)
    .where(and(eq(cotizaciones.id, id), eq(cotizaciones.tenantId, tenant.id)))
    .limit(1);
  if (!row) notFound();
  if (row.estado !== 'borrador') redirect(`/${companySlug}/cotizaciones/${id}`);

  const [items, clientesRows, productosRows] = await Promise.all([
    db
      .select()
      .from(cotizacionItems)
      .where(eq(cotizacionItems.cotizacionId, id))
      .orderBy(asc(cotizacionItems.orden)),
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
        unidadMedida: productos.unidadMedida,
        activo: productos.activo,
      })
      .from(productos)
      .where(eq(productos.tenantId, tenant.id))
      .orderBy(asc(productos.codigo)),
  ]);

  const clientesOpt: ClienteOption[] = clientesRows.map((c) => ({
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
      unidadMedida: p.unidadMedida,
    }));

  const initial: CotizacionFormInitial = {
    id: row.id,
    clienteId: row.clienteId,
    moneda: row.moneda as 'PEN' | 'USD',
    tipoCambio: row.tipoCambio ? Number(row.tipoCambio) : null,
    fechaEmision: row.fechaEmision,
    fechaVencimiento: row.fechaVencimiento,
    descuentoGlobal: Number(row.descuentoGlobal),
    notas: row.notas,
    terminosCondiciones: row.terminosCondiciones,
    items: items.map((it) => ({
      productoId: it.productoId,
      codigo: it.codigo,
      descripcion: it.descripcion,
      unidadMedida: it.unidadMedida,
      cantidad: Number(it.cantidad),
      precioUnitario: Number(it.precioUnitario),
      descuentoPorcentaje: Number(it.descuentoPorcentaje),
      afectaIgv: it.afectaIgv,
    })),
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="font-mono text-[22px] font-semibold tracking-tight text-orion-fg">
          {row.numeroCompleto ?? 'Editar cotización'}
        </h1>
        <p className="text-[12px] text-orion-fg-muted">Edición sólo permitida en borrador.</p>
      </div>
      <CotizacionForm
        companySlug={companySlug}
        clientes={clientesOpt}
        productos={productosOpt}
        initial={initial}
      />
    </div>
  );
}
