import { and, eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { clientes, productos } from '@/lib/db/schema';
import { NuevaGuiaForm } from '@/components/modules/guias/NuevaGuiaForm';

export const metadata = { title: 'Nueva guía de remisión' };

export default async function NuevaGuiaPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  await requirePermission('guias.crear');
  const tenant = await getCurrentTenant();

  const [destinatariosRaw, productosRaw] = await Promise.all([
    db
      .select({
        id: clientes.id,
        razonSocial: clientes.razonSocial,
        nombres: clientes.nombres,
        apellidoPaterno: clientes.apellidoPaterno,
        direccionSunat: clientes.direccionSunat,
      })
      .from(clientes)
      .where(eq(clientes.tenantId, tenant.id)),
    db
      .select({
        id: productos.id,
        nombre: productos.nombre,
        codigo: productos.codigo,
        unidadMedida: productos.unidadMedida,
      })
      .from(productos)
      .where(
        and(
          eq(productos.tenantId, tenant.id),
          eq(productos.controlaStock, true),
          eq(productos.activo, true)
        )
      )
      .orderBy(productos.nombre),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <div className="flex items-center gap-3">
        <Link
          href={`/${companySlug}/guias`}
          className="grid h-8 w-8 place-items-center rounded-md border border-orion-border text-orion-fg-muted hover:bg-orion-bg-subtle"
        >
          <ArrowLeft size={14} />
        </Link>
        <div>
          <h1 className="text-[18px] font-semibold text-orion-fg">Nueva guía de remisión</h1>
          <p className="text-[12px] text-orion-fg-muted">
            Registra el despacho de mercadería. El documento SUNAT se genera en segundo plano.
          </p>
        </div>
      </div>

      <NuevaGuiaForm
        tenantSlug={companySlug}
        destinatarios={destinatariosRaw.map((c) => ({
          id: c.id,
          nombre:
            c.razonSocial ??
            [c.nombres, c.apellidoPaterno].filter(Boolean).join(' ') ??
            '(sin nombre)',
          direccion: c.direccionSunat ?? '',
        }))}
        productos={productosRaw}
      />
    </div>
  );
}
