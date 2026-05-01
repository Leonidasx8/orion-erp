import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { cotizaciones, cotizacionItems, clientes, type EstadoCotizacion } from '@/lib/db/schema';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { userHasPermission } from '@/lib/auth/require-permission';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoneda } from '@/lib/cotizaciones/calculo';
import { CotizacionAcciones } from '@/components/modules/cotizaciones/CotizacionAcciones';

const colorEstado: Record<EstadoCotizacion, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  borrador: 'outline',
  enviada: 'default',
  aceptada: 'default',
  rechazada: 'destructive',
  vencida: 'secondary',
};

function nombreCliente(c: {
  tipoPersona: string;
  razonSocial: string | null;
  nombres: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
}) {
  if (c.tipoPersona === 'juridica' && c.razonSocial) return c.razonSocial;
  return [c.nombres, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(' ');
}

export default async function CotizacionDetallePage({
  params,
}: {
  params: Promise<{ companySlug: string; id: string }>;
}) {
  const { companySlug, id } = await params;
  const tenant = await getCurrentTenant();

  const [cot] = await db
    .select()
    .from(cotizaciones)
    .where(and(eq(cotizaciones.id, id), eq(cotizaciones.tenantId, tenant.id)));

  if (!cot) notFound();

  const [items, clienteRow, permisos] = await Promise.all([
    db
      .select()
      .from(cotizacionItems)
      .where(eq(cotizacionItems.cotizacionId, id))
      .orderBy(asc(cotizacionItems.orden)),
    db.select().from(clientes).where(eq(clientes.id, cot.clienteId)).limit(1),
    Promise.all([
      userHasPermission('cotizaciones.editar'),
      userHasPermission('cotizaciones.enviar'),
      userHasPermission('cotizaciones.aceptar'),
      userHasPermission('cotizaciones.rechazar'),
      userHasPermission('cotizaciones.duplicar'),
      userHasPermission('cotizaciones.eliminar'),
    ]),
  ]);

  const cliente = clienteRow[0];
  const moneda = cot.moneda as 'PEN' | 'USD';
  const estado = cot.estado as EstadoCotizacion;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href={`/${companySlug}/cotizaciones`} className="hover:underline">
              Cotizaciones
            </Link>{' '}
            / {cot.numeroCompleto}
          </p>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="font-mono text-2xl font-bold">{cot.numeroCompleto}</h1>
            <Badge variant={colorEstado[estado]} className="capitalize">
              {estado}
            </Badge>
          </div>
        </div>
        <CotizacionAcciones
          companySlug={companySlug}
          cotizacionId={cot.id}
          estado={estado}
          permisos={{
            editar: permisos[0],
            enviar: permisos[1],
            aceptar: permisos[2],
            rechazar: permisos[3],
            duplicar: permisos[4],
            eliminar: permisos[5],
          }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              {cliente ? (
                <div className="space-y-1 text-sm">
                  <div className="font-medium">{nombreCliente(cliente)}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {cliente.tipoDocumento} · {cliente.numeroDocumento}
                  </div>
                  {cliente.email && <div className="text-muted-foreground">{cliente.email}</div>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Cliente no encontrado</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ítems</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-2">#</th>
                    <th className="py-2 pr-2">Descripción</th>
                    <th className="py-2 pr-2 text-right">Cant</th>
                    <th className="py-2 pr-2 text-right">Precio</th>
                    <th className="py-2 pr-2 text-right">Desc%</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id} className="border-b last:border-0">
                      <td className="py-2 pr-2 tabular-nums">{it.orden}</td>
                      <td className="py-2 pr-2">
                        {it.codigo && (
                          <span className="font-mono text-xs text-muted-foreground">
                            {it.codigo}{' '}
                          </span>
                        )}
                        {it.descripcion}
                        <span className="ml-1 text-xs text-muted-foreground">
                          {it.unidadMedida}
                        </span>
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">{it.cantidad}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {formatMoneda(parseFloat(it.precioUnitario), moneda)}
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {parseFloat(it.descuentoPorcentaje).toFixed(2)}%
                      </td>
                      <td className="py-2 text-right font-medium tabular-nums">
                        {formatMoneda(parseFloat(it.total), moneda)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {(cot.notas || cot.terminosCondiciones) && (
            <Card>
              <CardHeader>
                <CardTitle>Notas y términos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {cot.notas && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Notas</p>
                    <p className="whitespace-pre-line">{cot.notas}</p>
                  </div>
                )}
                {cot.terminosCondiciones && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Términos y condiciones
                    </p>
                    <p className="whitespace-pre-line">{cot.terminosCondiciones}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {estado === 'rechazada' && cot.motivoRechazo && (
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-destructive">Motivo de rechazo</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-line text-sm">{cot.motivoRechazo}</CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Emisión" value={cot.fechaEmision} />
              <Row label="Vencimiento" value={cot.fechaVencimiento} />
              <Row label="Moneda" value={moneda} />
              {moneda === 'USD' && cot.tipoCambio && (
                <Row label="Tipo cambio" value={parseFloat(cot.tipoCambio).toFixed(4)} />
              )}
              <div className="border-t pt-2" />
              <Row label="Subtotal" value={formatMoneda(parseFloat(cot.subtotal), moneda)} />
              {parseFloat(cot.totalDescuentos) > 0 && (
                <Row
                  label="Descuentos"
                  value={`− ${formatMoneda(parseFloat(cot.totalDescuentos), moneda)}`}
                  muted
                />
              )}
              <Row
                label="Base imponible"
                value={formatMoneda(parseFloat(cot.baseImponible), moneda)}
              />
              <Row label="IGV" value={formatMoneda(parseFloat(cot.igv), moneda)} />
              <div className="flex items-center justify-between border-t pt-2 font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatMoneda(parseFloat(cot.total), moneda)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trazabilidad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <div>Creada: {new Date(cot.createdAt).toLocaleString('es-PE')}</div>
              {cot.enviadaAt && (
                <div>Enviada: {new Date(cot.enviadaAt).toLocaleString('es-PE')}</div>
              )}
              {cot.aceptadaAt && (
                <div>Aceptada: {new Date(cot.aceptadaAt).toLocaleString('es-PE')}</div>
              )}
              {cot.rechazadaAt && (
                <div>Rechazada: {new Date(cot.rechazadaAt).toLocaleString('es-PE')}</div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${muted ? 'text-muted-foreground' : ''}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
