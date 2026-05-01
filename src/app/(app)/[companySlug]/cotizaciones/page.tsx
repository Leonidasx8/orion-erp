import { and, desc, eq } from 'drizzle-orm';

import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { userHasPermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { cotizaciones, clientes, type EstadoCotizacion } from '@/lib/db/schema';
import {
  CotizacionesList,
  type CotizacionRow,
} from '@/components/modules/cotizaciones/CotizacionesList';

export const metadata = { title: 'Cotizaciones' };

export default async function CotizacionesPage() {
  const tenant = await getCurrentTenant();

  const [canCreate, rows] = await Promise.all([
    userHasPermission('cotizaciones.crear'),
    db
      .select({
        id: cotizaciones.id,
        numeroCompleto: cotizaciones.numeroCompleto,
        estado: cotizaciones.estado,
        fechaEmision: cotizaciones.fechaEmision,
        fechaVencimiento: cotizaciones.fechaVencimiento,
        moneda: cotizaciones.moneda,
        total: cotizaciones.total,
        clienteId: cotizaciones.clienteId,
        clienteRazon: clientes.razonSocial,
        clienteNombres: clientes.nombres,
        clienteApellidoP: clientes.apellidoPaterno,
        clienteApellidoM: clientes.apellidoMaterno,
        clienteTipoPersona: clientes.tipoPersona,
        clienteDocumento: clientes.numeroDocumento,
      })
      .from(cotizaciones)
      .leftJoin(
        clientes,
        and(eq(clientes.id, cotizaciones.clienteId), eq(clientes.tenantId, tenant.id))
      )
      .where(eq(cotizaciones.tenantId, tenant.id))
      .orderBy(desc(cotizaciones.fechaEmision), desc(cotizaciones.numeroCorrelativo)),
  ]);

  const data: CotizacionRow[] = rows.map((r) => {
    const nombre =
      r.clienteTipoPersona === 'juridica' && r.clienteRazon
        ? r.clienteRazon
        : [r.clienteNombres, r.clienteApellidoP, r.clienteApellidoM].filter(Boolean).join(' ') ||
          'Sin cliente';
    return {
      id: r.id,
      numeroCompleto: r.numeroCompleto,
      estado: r.estado as EstadoCotizacion,
      fechaEmision: r.fechaEmision,
      fechaVencimiento: r.fechaVencimiento,
      moneda: r.moneda as 'PEN' | 'USD',
      total: r.total,
      clienteNombre: nombre,
      clienteDocumento: r.clienteDocumento ?? '',
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cotizaciones</h1>
        <p className="text-sm text-muted-foreground">
          {data.length} cotización{data.length !== 1 ? 'es' : ''}
        </p>
      </div>
      <CotizacionesList rows={data} canCreate={canCreate} />
    </div>
  );
}
