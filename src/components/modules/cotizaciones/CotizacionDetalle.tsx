import Link from 'next/link';
import { Bell, Clock, Inbox, Pencil, Receipt } from 'lucide-react';
import { Money } from '@/components/shared/Money';
import { EstadoBadge, type Estado } from '@/components/shared/EstadoBadge';
import { CotizacionActions } from './CotizacionActions';
import { cn } from '@/lib/utils';

export type CotizacionDetalleItem = {
  id: string;
  sku: string | null;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
};

export type TimelineEvento = {
  id: string;
  tipo: 'done' | 'active' | 'error';
  titulo: string;
  meta: string;
};

export type CotizacionDetalleData = {
  id: string;
  numero: string;
  estado: Estado;
  cliente: string;
  comercial: string;
  fechaEmisionDisplay: string;
  fechaVencimientoDisplay: string | null;
  vencimientoTag?: string; // "vence en 1 día", "vencida hace 5 días", etc.
  moneda: 'PEN' | 'USD' | string;
  tipoCambio: number | null;
  items: CotizacionDetalleItem[];
  totales: {
    subtotal: number;
    igv: number;
    total: number;
  };
  terminos: {
    pago: string;
    entrega: string;
    validez: string;
    observaciones: string | null;
  };
  timeline: TimelineEvento[];
  permissions: {
    enviar: boolean;
    aprobar: boolean;
    rechazar: boolean;
    duplicar: boolean;
    reenviar: boolean;
  };
};

export function CotizacionDetalle({
  data,
  tenantSlug,
}: {
  data: CotizacionDetalleData;
  tenantSlug: string;
}) {
  const conversionesDisponibles = data.estado === 'aceptada';
  const esEditable = data.estado === 'borrador';

  return (
    <>
      {/* Header con título + acciones */}
      <div className="mb-4 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="m-0 font-mono text-[22px] font-semibold tracking-tight text-orion-fg">
              {data.numero}
            </h1>
            <EstadoBadge estado={data.estado} />
            {data.vencimientoTag && (
              <span className="inline-flex h-[22px] items-center gap-1 rounded-sm bg-orion-bg-muted px-2 text-[11px] text-orion-fg-muted">
                <Clock size={11} />
                {data.vencimientoTag}
              </span>
            )}
          </div>
          <div className="mt-1 text-[12px] text-orion-fg-muted">
            {data.cliente} · emitida {data.fechaEmisionDisplay} ·{' '}
            <Money value={data.totales.total} ccy={data.moneda} dp={2} /> · {data.items.length}{' '}
            items · {data.comercial}
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {esEditable && (
            <Link
              href={`/${tenantSlug}/cotizaciones/${data.id}/editar`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] font-medium text-orion-fg hover:bg-orion-bg-muted"
            >
              <Pencil size={13} />
              Editar
            </Link>
          )}
          <CotizacionActions
            cotizacionId={data.id}
            estado={data.estado}
            tenantSlug={tenantSlug}
            permissions={data.permissions}
          />
        </div>
      </div>

      <div className="grid grid-cols-[3fr_2fr] gap-4">
        {/* Izquierda: líneas + términos */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHead>
              <CardTitle>Líneas · {data.items.length} items</CardTitle>
              {!esEditable && (
                <span className="ml-auto text-[11.5px] text-orion-fg-muted">
                  Solo lectura · cotización {labelLowercase(data.estado)}
                </span>
              )}
            </CardHead>
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr>
                  <Th>SKU</Th>
                  <Th>Descripción</Th>
                  <Th align="right">Cant.</Th>
                  <Th align="right">Precio</Th>
                  <Th align="right">Subtotal</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it) => (
                  <tr key={it.id} className="border-b border-orion-border last:border-0">
                    <Td className="font-mono text-[11.5px]">{it.sku ?? '—'}</Td>
                    <Td className="max-w-[280px] truncate">{it.descripcion}</Td>
                    <Td align="right">{it.cantidad.toLocaleString('en-US')}</Td>
                    <Td align="right">
                      <Money value={it.precioUnitario} ccy={data.moneda} dp={4} />
                    </Td>
                    <Td align="right">
                      <Money value={it.subtotal} ccy={data.moneda} dp={2} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card>
            <CardHead>
              <CardTitle>Términos</CardTitle>
            </CardHead>
            <div className="grid grid-cols-2 gap-3 p-4 text-[12.5px]">
              <TerminoField label="Pago" value={data.terminos.pago} />
              <TerminoField label="Entrega" value={data.terminos.entrega} />
              <TerminoField
                label="Moneda"
                value={`${data.moneda}${data.tipoCambio ? ` · TC S/ ${data.tipoCambio.toFixed(4)}` : ''}`}
              />
              <TerminoField label="Validez" value={data.terminos.validez} />
              {data.terminos.observaciones && (
                <div className="col-span-2">
                  <div className="text-[11px] text-orion-fg-muted">Observaciones</div>
                  <div>{data.terminos.observaciones}</div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Derecha: totales + timeline + conversiones */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHead>
              <CardTitle>Totales</CardTitle>
            </CardHead>
            <div className="flex flex-col gap-2 p-4 text-[12.5px]">
              <div className="flex items-center">
                <span className="text-orion-fg-muted">Subtotal</span>
                <span className="ml-auto tabular-nums">
                  <Money value={data.totales.subtotal} ccy={data.moneda} dp={2} />
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-orion-fg-muted">IGV 18%</span>
                <span className="ml-auto tabular-nums">
                  <Money value={data.totales.igv} ccy={data.moneda} dp={2} />
                </span>
              </div>
              <div className="my-1 h-px bg-orion-border" />
              <div className="flex items-center">
                <span className="text-[13px] font-semibold text-orion-fg">Total</span>
                <span className="ml-auto text-[20px] font-semibold tabular-nums text-orion-fg">
                  <Money value={data.totales.total} ccy={data.moneda} dp={2} />
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHead>
              <CardTitle>Línea de tiempo</CardTitle>
            </CardHead>
            <div className="p-4">
              <Timeline items={data.timeline} />
            </div>
            {data.estado === 'enviada' && (
              <div className="border-t border-orion-border bg-orion-bg-subtle px-4 py-3">
                <button
                  type="button"
                  className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-orion-fg-muted hover:bg-orion-bg-muted hover:text-orion-fg"
                >
                  <Bell size={12} />
                  Enviar recordatorio
                </button>
              </div>
            )}
          </Card>

          <Card>
            <CardHead>
              <CardTitle>Conversiones disponibles</CardTitle>
            </CardHead>
            <div className="flex flex-col gap-2 p-4">
              <ConversionItem
                icon={<Receipt size={16} />}
                titulo="Convertir a factura"
                disponible={conversionesDisponibles}
                hint={conversionesDisponibles ? undefined : 'Disponible cuando esté aceptada'}
              />
              <ConversionItem
                icon={<Inbox size={16} />}
                titulo="Convertir a orden de compra"
                disponible={conversionesDisponibles}
                hint={conversionesDisponibles ? undefined : 'Disponible cuando esté aceptada'}
              />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

/* === Subcomponentes locales === */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-orion-border bg-orion-bg shadow-orion-1">
      {children}
    </div>
  );
}
function CardHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-orion-border px-4 py-3.5">
      {children}
    </div>
  );
}
function CardTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[14px] font-semibold text-orion-fg">{children}</div>;
}
function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <th
      className={cn(
        'border-b border-orion-border bg-orion-bg-subtle px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-orion-fg-muted',
        align === 'right' ? 'text-right' : 'text-left'
      )}
    >
      {children}
    </th>
  );
}
function Td({
  children,
  align,
  className,
}: {
  children: React.ReactNode;
  align?: 'right';
  className?: string;
}) {
  return (
    <td
      className={cn(
        'h-8 px-3 align-middle text-orion-fg',
        align === 'right' ? 'text-right tabular-nums' : '',
        className
      )}
    >
      {children}
    </td>
  );
}
function TerminoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-orion-fg-muted">{label}</div>
      <div className="text-orion-fg">{value}</div>
    </div>
  );
}
function ConversionItem({
  icon,
  titulo,
  disponible,
  hint,
}: {
  icon: React.ReactNode;
  titulo: string;
  disponible: boolean;
  hint?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border border-orion-border p-2.5',
        disponible
          ? 'cursor-pointer hover:border-tenant-accent hover:bg-tenant-accent-soft'
          : 'opacity-50'
      )}
    >
      <span className="text-orion-fg-muted">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-medium text-orion-fg">{titulo}</div>
        {hint && <div className="text-[11px] text-orion-fg-muted">{hint}</div>}
      </div>
    </div>
  );
}

function Timeline({ items }: { items: TimelineEvento[] }) {
  return (
    <div className="relative">
      {items.map((it, i) => {
        const isLast = i === items.length - 1;
        const dotClass =
          it.tipo === 'done'
            ? 'bg-success border-success'
            : it.tipo === 'active'
              ? 'bg-tenant-accent-soft border-tenant-accent'
              : 'bg-danger border-danger';
        return (
          <div key={it.id} className={cn('relative pl-7', isLast ? 'pb-0' : 'pb-4')}>
            {!isLast && (
              <span className="absolute bottom-[-4px] left-[9px] top-[18px] w-px bg-orion-border" />
            )}
            <span
              className={cn(
                'absolute left-1 top-1 grid h-3 w-3 place-items-center rounded-full border-2',
                dotClass
              )}
            />
            <div className="text-[13px] font-medium text-orion-fg">{it.titulo}</div>
            <div className="mt-0.5 text-[11.5px] text-orion-fg-muted">{it.meta}</div>
          </div>
        );
      })}
    </div>
  );
}

function labelLowercase(estado: Estado): string {
  const map: Record<Estado, string> = {
    borrador: 'borrador',
    enviada: 'enviada',
    pendiente: 'pendiente',
    aprobada: 'aprobada',
    aceptada: 'aceptada SUNAT',
    pagada: 'pagada',
    rechazada: 'rechazada',
    vencida: 'vencida',
    recibida_parcial: 'recibida parcial',
    recibida_total: 'recibida total',
    cerrada: 'cerrada',
    anulada: 'anulada',
    convertida: 'convertida',
  };
  return map[estado];
}
