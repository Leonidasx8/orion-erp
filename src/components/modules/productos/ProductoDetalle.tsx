'use client';

import Link from 'next/link';
import { Copy, Pencil, Shield, AlertTriangle, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  Producto,
  CategoriaProducto,
  UnidadMedida,
  HistorialPrecio,
} from '@/lib/db/schema/productos';

interface Props {
  producto: Producto;
  categoria: CategoriaProducto | undefined;
  uom: UnidadMedida | undefined;
  companySlug: string;
  canEdit: boolean;
  historialPrecios?: HistorialPrecio[];
}

function formatPrecio(valor: string | null | undefined): string {
  if (!valor) return '—';
  const n = parseFloat(valor);
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD' }).format(n);
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

function calcMargen(precio: string | null | undefined, costo: string | null | undefined): string {
  if (!precio || !costo) return '—';
  const p = parseFloat(precio);
  const c = parseFloat(costo);
  if (isNaN(p) || isNaN(c) || c === 0) return '—';
  return (((p - c) / c) * 100).toFixed(1);
}

export function ProductoDetalle({
  producto,
  categoria,
  uom,
  companySlug,
  canEdit,
  historialPrecios = [],
}: Props) {
  const stockActual = producto.stockActual ? parseFloat(producto.stockActual) : 0;
  const stockMinimo = producto.stockMinimo ? parseFloat(producto.stockMinimo) : 0;
  const hasStockWarning =
    producto.controlaStock && producto.stockMinimo !== null && stockActual < stockMinimo;

  const uomDisplay = uom
    ? `${uom.descripcion} (${uom.simbolo ?? uom.codigo})`
    : producto.unidadMedida;

  const margenActual = calcMargen(producto.precioUnitario, producto.costoUnitario);
  const margenMinimo = producto.margenMinimo ? parseFloat(producto.margenMinimo).toFixed(1) : '—';

  return (
    <div className="max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <p className="text-sm text-muted-foreground">
        <Link href={`/${companySlug}/productos`} className="hover:underline">
          Productos
        </Link>{' '}
        / {producto.nombre}
      </p>

      {/* Header */}
      <div className="flex items-start gap-4">
        {/* Image */}
        {producto.imagenUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={producto.imagenUrl}
            alt={producto.nombre}
            className="h-20 w-20 flex-shrink-0 rounded-lg border bg-muted object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg border bg-muted font-mono text-xs text-muted-foreground">
            img
          </div>
        )}

        {/* Info block */}
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs text-primary">{producto.codigo}</p>
          <h1 className="mt-0.5 text-2xl font-bold leading-tight">{producto.nombre}</h1>

          {/* Badge row */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={producto.activo ? 'default' : 'secondary'} className="gap-1">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${producto.activo ? 'bg-green-400' : 'bg-muted-foreground'}`}
              />
              {producto.activo ? 'Activo' : 'Inactivo'}
            </Badge>

            {categoria && <Badge variant="outline">Familia: {categoria.nombre}</Badge>}

            <Badge variant="outline" className="capitalize">
              {producto.tipo}
            </Badge>

            {producto.tieneIgv && <Badge variant="outline">600V</Badge>}

            {hasStockWarning && (
              <Badge
                variant="outline"
                className="gap-1 border-orange-400 bg-orange-50 text-orange-600"
              >
                <AlertTriangle className="h-3 w-3" />
                Stock {stockActual} de {stockMinimo}
              </Badge>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${companySlug}/productos/nuevo?duplicar=${producto.id}`}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Duplicar
            </Link>
          </Button>
          {canEdit && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${companySlug}/productos/${producto.id}/editar`}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Editar
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="datos">
        <TabsList>
          <TabsTrigger value="datos">Datos generales</TabsTrigger>
          <TabsTrigger value="precios">Precios e historial</TabsTrigger>
          <TabsTrigger value="kardex">Kardex</TabsTrigger>
          <TabsTrigger value="ventas">Ventas</TabsTrigger>
        </TabsList>

        {/* Tab: Datos generales */}
        <TabsContent value="datos" className="mt-4 space-y-4">
          <div className="rounded-lg border p-5">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div>
                <dt className="mb-0.5 text-muted-foreground">Familia</dt>
                <dd className="font-medium">{categoria?.nombre ?? '—'}</dd>
              </div>

              <div>
                <dt className="mb-0.5 text-muted-foreground">Código SUNAT</dt>
                <dd className="font-mono">{producto.codigoSunat ?? '—'}</dd>
              </div>

              <div>
                <dt className="mb-0.5 text-muted-foreground">Tipo</dt>
                <dd className="capitalize">{producto.tipo}</dd>
              </div>

              <div>
                <dt className="mb-0.5 text-muted-foreground">Unidad de medida</dt>
                <dd>{uomDisplay}</dd>
              </div>

              <div>
                <dt className="mb-0.5 text-muted-foreground">IGV</dt>
                <dd>{producto.tieneIgv ? 'Afecto 18%' : 'Inafecto'}</dd>
              </div>

              <div>
                <dt className="mb-0.5 text-muted-foreground">Margen mínimo</dt>
                <dd>{producto.margenMinimo ? `${margenMinimo}%` : '—'}</dd>
              </div>
            </dl>

            {producto.descripcion && (
              <div className="mt-4 border-t pt-4 text-sm">
                <dt className="mb-1 text-muted-foreground">Descripción</dt>
                <dd className="leading-relaxed text-foreground">{producto.descripcion}</dd>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab: Precios e historial */}
        <TabsContent value="precios" className="mt-4">
          <div className="grid grid-cols-5 gap-4">
            {/* Left: Precios vigentes (3fr) */}
            <div className="col-span-3 rounded-lg border p-5">
              <h2 className="mb-4 text-sm font-semibold">Precios vigentes</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left font-normal text-muted-foreground">TIPO</th>
                    <th className="pb-2 text-left font-normal text-muted-foreground">MONEDA</th>
                    <th className="pb-2 text-right font-normal text-muted-foreground">PRECIO</th>
                    <th className="pb-2 pl-4 text-left font-normal text-muted-foreground">
                      VIGENTE DESDE
                    </th>
                    <th className="pb-2 pl-4 text-left font-normal text-muted-foreground">HASTA</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Compra row */}
                  {producto.costoUnitario && (
                    <tr className="border-b last:border-0">
                      <td className="py-2.5">
                        <Badge
                          variant="outline"
                          className="gap-1 border-amber-400 bg-amber-50 text-amber-700"
                        >
                          <Shield className="h-3 w-3" />
                          Compra
                        </Badge>
                      </td>
                      <td className="py-2.5 text-muted-foreground">USD</td>
                      <td className="py-2.5 text-right font-medium tabular-nums">
                        {formatPrecio(producto.costoUnitario)}
                      </td>
                      <td className="py-2.5 pl-4 text-muted-foreground">—</td>
                      <td className="py-2.5 pl-4 text-muted-foreground">—</td>
                    </tr>
                  )}
                  {/* Venta sugerido row */}
                  <tr className="border-b last:border-0">
                    <td className="py-2.5">
                      <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700">
                        Venta sugerido
                      </Badge>
                    </td>
                    <td className="py-2.5 text-muted-foreground">USD</td>
                    <td className="py-2.5 text-right font-medium tabular-nums">
                      {formatPrecio(producto.precioUnitario)}
                    </td>
                    <td className="py-2.5 pl-4 text-muted-foreground">—</td>
                    <td className="py-2.5 pl-4 text-muted-foreground">—</td>
                  </tr>
                </tbody>
              </table>

              <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                Margen actual:{' '}
                <span className="font-medium text-foreground">
                  {margenActual !== '—' ? `${margenActual}%` : '—'}
                </span>
                {' · '}
                margen mínimo configurado:{' '}
                <span className="font-medium text-foreground">
                  {producto.margenMinimo ? `${margenMinimo}%` : '—'}
                </span>
              </p>
            </div>

            {/* Right: Histórico (2fr) */}
            <div className="col-span-2 rounded-lg border p-5">
              <h2 className="mb-4 text-sm font-semibold">Historial de cambios de precio</h2>
              {historialPrecios.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Sin cambios registrados aún. Los cambios de precio se guardan automáticamente al
                  editar el producto.
                </p>
              ) : (
                <div className="space-y-0 divide-y text-[12px]">
                  {historialPrecios.map((h) => {
                    const pAntes = Number(h.precioAnterior);
                    const pDespues = Number(h.precioNuevo);
                    const diff = pDespues - pAntes;
                    const pct = pAntes !== 0 ? ((diff / pAntes) * 100).toFixed(1) : null;
                    return (
                      <div key={h.id} className="flex items-start gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-muted-foreground">
                              {formatPrecio(h.precioAnterior)}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-semibold text-foreground">
                              {formatPrecio(h.precioNuevo)}
                            </span>
                            {pct !== null && (
                              <span className={diff >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {diff >= 0 ? '+' : ''}
                                {pct}%
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            {h.creadoPorNombre ?? 'Usuario'} · {formatDate(h.createdAt)}
                          </div>
                          {h.razon && (
                            <div className="mt-0.5 italic text-muted-foreground">{h.razon}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab: Kardex */}
        <TabsContent value="kardex" className="mt-4">
          <div className="space-y-4 rounded-lg border p-5">
            <h2 className="text-sm font-semibold">Movimientos de inventario</h2>

            <dl className="grid max-w-sm grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <dt className="mb-0.5 text-muted-foreground">Stock actual</dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {producto.stockActual ?? '0'}
                </dd>
              </div>
              {producto.stockMinimo && (
                <div>
                  <dt className="mb-0.5 text-muted-foreground">Stock mínimo</dt>
                  <dd className="text-lg font-semibold tabular-nums">{producto.stockMinimo}</dd>
                </div>
              )}
            </dl>

            <Button variant="outline" asChild>
              <Link href={`/${companySlug}/inventario/${producto.id}`}>
                Ver kardex completo
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </TabsContent>

        {/* Tab: Ventas */}
        <TabsContent value="ventas" className="mt-4">
          <div className="rounded-lg border p-5 py-12 text-center">
            <p className="text-sm text-muted-foreground">Historial de ventas — próximamente</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
