import { eq } from 'drizzle-orm';
import { count } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db/client';
import {
  clientes,
  direccionesCliente,
  contactosCliente,
  cotizaciones,
  facturas,
} from '@/lib/db/schema';
import { userHasPermission } from '@/lib/auth/require-permission';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { ClienteDetail } from '@/components/modules/clientes/ClienteDetail';

export const metadata = { title: 'Detalle cliente' };

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ companySlug: string; clienteId: string }>;
}) {
  const { companySlug, clienteId } = await params;
  const tenant = await getCurrentTenant();

  const [
    canEdit,
    clienteRows,
    direccioneRows,
    contactoRows,
    cotizacionesCountRows,
    facturasCountRows,
  ] = await Promise.all([
    userHasPermission('clientes.editar'),
    db.select().from(clientes).where(eq(clientes.id, clienteId)),
    db.select().from(direccionesCliente).where(eq(direccionesCliente.clienteId, clienteId)),
    db.select().from(contactosCliente).where(eq(contactosCliente.clienteId, clienteId)),
    db.select({ count: count() }).from(cotizaciones).where(eq(cotizaciones.clienteId, clienteId)),
    db.select({ count: count() }).from(facturas).where(eq(facturas.clienteId, clienteId)),
  ]);

  const cliente = clienteRows[0];
  if (!cliente || cliente.tenantId !== tenant.id) notFound();

  const cotizacionesCount = cotizacionesCountRows[0]?.count ?? 0;
  const facturasCount = facturasCountRows[0]?.count ?? 0;

  return (
    <ClienteDetail
      cliente={cliente}
      direcciones={direccioneRows}
      contactos={contactoRows}
      companySlug={companySlug}
      canEdit={canEdit}
      cotizacionesCount={cotizacionesCount}
      facturasCount={facturasCount}
      ultimaActividad={[]}
    />
  );
}
