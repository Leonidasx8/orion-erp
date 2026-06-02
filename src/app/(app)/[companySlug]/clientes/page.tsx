import { eq } from 'drizzle-orm';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { userHasPermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { clientes } from '@/lib/db/schema';
import { ClientesList } from '@/components/modules/clientes/ClientesList';
import { ModuleHelp } from '@/components/shared/ModuleHelp';

export const metadata = { title: 'Clientes' };

export default async function ClientesPage() {
  const tenant = await getCurrentTenant();
  const [canCreate, rows] = await Promise.all([
    userHasPermission('clientes.crear'),
    db
      .select({
        id: clientes.id,
        tipoDocumento: clientes.tipoDocumento,
        numeroDocumento: clientes.numeroDocumento,
        tipoPersona: clientes.tipoPersona,
        razonSocial: clientes.razonSocial,
        nombres: clientes.nombres,
        apellidoPaterno: clientes.apellidoPaterno,
        apellidoMaterno: clientes.apellidoMaterno,
        email: clientes.email,
        telefono: clientes.telefono,
        estado: clientes.estado,
        lineaCredito: clientes.lineaCredito,
        plazoCredito: clientes.plazoCredito,
        updatedAt: clientes.updatedAt,
      })
      .from(clientes)
      .where(eq(clientes.tenantId, tenant.id))
      .orderBy(clientes.createdAt),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Clientes</h1>
          <ModuleHelp
            module="clientes"
            title="Clientes"
            description="Directorio de clientes B2B (RUC) y B2C (DNI). Los datos se autocompletan desde SUNAT al ingresar el número de documento."
            tips={[
              'Filtra por esCliente o esProveedor para encontrar rápido',
              'Desde el detalle puedes ver cotizaciones y facturas del cliente',
              'Agrega contactos directamente desde el detalle del cliente',
            ]}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {rows.length} cliente{rows.length !== 1 ? 's' : ''} registrado
          {rows.length !== 1 ? 's' : ''}
        </p>
      </div>
      <ClientesList clientes={rows} canCreate={canCreate} />
    </div>
  );
}
