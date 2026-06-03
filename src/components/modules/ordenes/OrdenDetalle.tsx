'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Copy, FileText, PackageCheck, Pencil, Send, X } from 'lucide-react';
import { Money } from '@/components/shared/Money';
import { EstadoBadge, type Estado } from '@/components/shared/EstadoBadge';
import {
  aprobarOrden,
  cerrarOrden,
  enviarOrden,
  recibirParcial,
} from '@/server/actions/ordenes-compra';
import { cn } from '@/lib/utils';

export type OrdenDetalleLinea = {
  id: string;
  sku: string;
  descripcion: string;
  cantidad: number;
  cantidadRecibida: number;
  precioUnitario: number;
  subtotal: number;
};

export type OrdenDetalleData = {
  id: string;
  numero: string;
  estado: Estado;
  proveedor: string;
  comprador: string;
  fechaEmisionDisplay: string;
  fechaEntregaDisplay: string | null;
  moneda: 'PEN' | 'USD' | string;
  tipoCambio: number | null;
  lineas: OrdenDetalleLinea[];
  totales: { subtotal: number; igv: number; total: number };
  terminos: { pago: string; entrega: string; observaciones: string | null };
  permissions: {
    enviar: boolean;
    aprobar: boolean;
    recibir: boolean;
    cerrar: boolean;
    editar: boolean;
  };
};

export function OrdenDetalle({ data, tenantSlug }: { data: OrdenDetalleData; tenantSlug: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showRecepcion, setShowRecepcion] = useState(false);

  const puedeEnviar = data.estado === 'borrador' && data.permissions.enviar;
  const puedeAprobar = data.estado === 'enviada' && data.permissions.aprobar;
  const puedeRecibir =
    (data.estado === 'aprobada' || data.estado === 'recibida_parcial') && data.permissions.recibir;
  const puedeCerrar = data.estado === 'recibida_total' && data.permissions.cerrar;
  const esEditable = data.estado === 'borrador';

  const totalPedido = data.lineas.reduce((acc, l) => acc + l.cantidad, 0);
  const totalRecibido = data.lineas.reduce((acc, l) => acc + l.cantidadRecibida, 0);
  const recibidoPct = totalPedido === 0 ? 0 : (totalRecibido / totalPedido) * 100;

  const handleAccion = (
    fn: () => Promise<{ success: true; data?: unknown } | { success: false; error: string }>,
    msgOk: string
  ) => {
    setFeedback(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.success) {
        setFeedback(`Error: ${r.error}`);
        return;
      }
      setFeedback(msgOk);
      router.refresh();
    });
  };

  return (
    <>
      <OrdenStepper estado={data.estado} />
      <BannerSiguientePaso
        estado={data.estado}
        puedeEnviar={puedeEnviar}
        puedeRecibir={puedeRecibir}
        puedeCerrar={puedeCerrar}
        onEnviar={() => handleAccion(() => enviarOrden(data.id), 'Orden enviada')}
        onRecibir={() => setShowRecepcion(true)}
        onCerrar={() => handleAccion(() => cerrarOrden(data.id), 'Orden cerrada')}
        pending={pending}
      />
      <div className="mb-4 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="m-0 font-mono text-[22px] font-semibold tracking-tight text-orion-fg">
              {data.numero}
            </h1>
            <EstadoBadge estado={data.estado} />
          </div>
          <div className="mt-1 text-[12px] text-orion-fg-muted">
            {data.proveedor} · emitida {data.fechaEmisionDisplay} ·{' '}
            <Money value={data.totales.total} ccy={data.moneda} dp={2} /> · {data.lineas.length}{' '}
            líneas · {data.comprador}
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <DetalleBtn icon={<FileText size={13} />} label="PDF" />
          {esEditable && data.permissions.editar && (
            <Link
              href={`/${tenantSlug}/ordenes/${data.id}/editar`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] font-medium text-orion-fg hover:bg-orion-bg-muted"
            >
              <Pencil size={13} />
              Editar
            </Link>
          )}
          <DetalleBtn icon={<Copy size={13} />} label="Duplicar" />
          {puedeEnviar && (
            <button
              type="button"
              disabled={pending}
              onClick={() => handleAccion(() => enviarOrden(data.id), 'Orden enviada')}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] font-medium text-orion-fg hover:bg-orion-bg-muted disabled:opacity-60"
            >
              <Send size={13} />
              Enviar
            </button>
          )}
          {puedeAprobar && (
            <button
              type="button"
              disabled={pending}
              onClick={() => handleAccion(() => aprobarOrden(data.id), 'Orden aprobada')}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-tenant-accent px-3 text-[13px] font-medium text-white hover:brightness-95 disabled:opacity-60"
            >
              <Check size={13} />
              Aprobar
            </button>
          )}
          {puedeRecibir && (
            <button
              type="button"
              onClick={() => setShowRecepcion(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-tenant-accent px-3 text-[13px] font-medium text-white hover:brightness-95"
            >
              <PackageCheck size={13} />
              Registrar recepción
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={cn(
            'mb-4 rounded-md border px-3 py-2 text-[12.5px]',
            feedback.startsWith('Error')
              ? 'border-danger bg-danger-soft text-danger-fg'
              : 'border-success bg-success-soft text-success-fg'
          )}
        >
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHead>
              <CardTitle>Líneas · {data.lineas.length} items</CardTitle>
              <span className="ml-auto text-[11.5px] text-orion-fg-muted">
                {totalRecibido.toLocaleString('en-US')} / {totalPedido.toLocaleString('en-US')}{' '}
                recibido · {Math.round(recibidoPct)}%
              </span>
            </CardHead>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr>
                    <Th>SKU</Th>
                    <Th>Descripción</Th>
                    <Th align="right">Pedido</Th>
                    <Th align="right">Recibido</Th>
                    <Th align="right">Pendiente</Th>
                    <Th align="right">Precio</Th>
                    <Th align="right">Subtotal</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.lineas.map((l) => {
                    const pendiente = l.cantidad - l.cantidadRecibida;
                    return (
                      <tr key={l.id} className="border-b border-orion-border last:border-0">
                        <Td className="font-mono text-[11.5px]">{l.sku}</Td>
                        <Td className="max-w-[280px] truncate">{l.descripcion}</Td>
                        <Td align="right">{l.cantidad.toLocaleString('en-US')}</Td>
                        <Td align="right">{l.cantidadRecibida.toLocaleString('en-US')}</Td>
                        <Td
                          align="right"
                          className={cn(pendiente > 0 ? 'text-warn-fg' : 'text-success-fg')}
                        >
                          {pendiente.toLocaleString('en-US')}
                        </Td>
                        <Td align="right">
                          <Money value={l.precioUnitario} ccy={data.moneda} dp={4} />
                        </Td>
                        <Td align="right">
                          <Money value={l.subtotal} ccy={data.moneda} dp={2} />
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHead>
              <CardTitle>Términos</CardTitle>
            </CardHead>
            <div className="grid grid-cols-2 gap-3 p-4 text-[12.5px]">
              <Termino label="Pago" value={data.terminos.pago} />
              <Termino label="Entrega" value={data.terminos.entrega} />
              <Termino
                label="Moneda"
                value={`${data.moneda}${data.tipoCambio ? ` · TC S/ ${data.tipoCambio.toFixed(4)}` : ''}`}
              />
              <Termino label="Fecha entrega esperada" value={data.fechaEntregaDisplay ?? '—'} />
              {data.terminos.observaciones && (
                <div className="col-span-2">
                  <div className="text-[11px] text-orion-fg-muted">Observaciones</div>
                  <div>{data.terminos.observaciones}</div>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHead>
              <CardTitle>Totales</CardTitle>
            </CardHead>
            <div className="flex flex-col gap-2 p-4 text-[12.5px]">
              <Row label="Subtotal">
                <Money value={data.totales.subtotal} ccy={data.moneda} dp={2} />
              </Row>
              <Row label="IGV 18%">
                <Money value={data.totales.igv} ccy={data.moneda} dp={2} />
              </Row>
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
              <CardTitle>Avance de recepción</CardTitle>
            </CardHead>
            <div className="flex flex-col gap-3 p-4 text-[12.5px]">
              <div className="h-2 overflow-hidden rounded-full bg-orion-bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    recibidoPct >= 100 ? 'bg-success' : 'bg-warn'
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, recibidoPct))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-orion-fg-muted">
                <span>{Math.round(recibidoPct)}% recibido</span>
                <span>
                  {totalRecibido.toLocaleString('en-US')} / {totalPedido.toLocaleString('en-US')}{' '}
                  unidades
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {showRecepcion && (
        <RecepcionModal
          ordenId={data.id}
          lineas={data.lineas}
          moneda={data.moneda}
          onClose={() => setShowRecepcion(false)}
          onSuccess={() => {
            setShowRecepcion(false);
            setFeedback('Recepción registrada');
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function RecepcionModal({
  ordenId,
  lineas,
  moneda,
  onClose,
  onSuccess,
}: {
  ordenId: string;
  lineas: OrdenDetalleLinea[];
  moneda: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [recepciones, setRecepciones] = useState<Record<string, number>>(() =>
    Object.fromEntries(lineas.map((l) => [l.id, 0]))
  );

  const setVal = (id: string, n: number) => {
    setRecepciones((prev) => ({ ...prev, [id]: Math.max(0, n) }));
  };

  const submit = () => {
    const payload = Object.entries(recepciones)
      .filter(([, n]) => n > 0)
      .map(([lineaId, cantidadRecibida]) => ({ lineaId, cantidadRecibida }));
    if (payload.length === 0) {
      setError('Indica al menos una cantidad');
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await recibirParcial(ordenId, payload);
      if (!r.success) {
        setError(r.error);
        return;
      }
      onSuccess();
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-lg border border-orion-border bg-orion-bg shadow-orion-2">
        <div className="flex items-center gap-3 border-b border-orion-border px-4 py-3">
          <h2 className="text-[15px] font-semibold text-orion-fg">Registrar recepción</h2>
          <button
            type="button"
            onClick={() => {
              const all: Record<string, number> = {};
              for (const l of lineas) all[l.id] = l.cantidad - l.cantidadRecibida;
              setRecepciones(all);
            }}
            className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-md border border-orion-border px-2.5 text-[12px] font-medium text-orion-fg hover:bg-orion-bg-muted"
          >
            Recibir todo
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-md text-orion-fg-muted hover:bg-orion-bg-muted hover:text-orion-fg"
          >
            <X size={14} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead className="sticky top-0 bg-orion-bg">
              <tr>
                <Th>SKU</Th>
                <Th>Descripción</Th>
                <Th align="right">Pedido</Th>
                <Th align="right">Ya recibido</Th>
                <Th align="right">Pendiente</Th>
                <Th align="right">Recibir ahora</Th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((l) => {
                const pendiente = l.cantidad - l.cantidadRecibida;
                const valor = recepciones[l.id] ?? 0;
                return (
                  <tr key={l.id} className="border-b border-orion-border last:border-0">
                    <Td className="font-mono text-[11.5px]">{l.sku}</Td>
                    <Td className="max-w-[260px] truncate">{l.descripcion}</Td>
                    <Td align="right">{l.cantidad}</Td>
                    <Td align="right">{l.cantidadRecibida}</Td>
                    <Td align="right" className="text-warn-fg">
                      {pendiente}
                    </Td>
                    <Td align="right" className="w-[110px]">
                      <input
                        type="number"
                        min={0}
                        max={pendiente}
                        step="0.01"
                        value={valor}
                        onChange={(e) => setVal(l.id, Number(e.target.value) || 0)}
                        disabled={pendiente === 0}
                        className="focus:ring-tenant-accent/30 block w-full rounded-md border border-orion-border bg-orion-bg px-2 py-1 text-right text-[12.5px] tabular-nums text-orion-fg focus:border-tenant-accent focus:outline-none focus:ring-2 disabled:bg-orion-bg-subtle"
                      />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {error && (
          <div className="border-t border-orion-border bg-danger-soft px-4 py-2 text-[12.5px] text-danger-fg">
            {error}
          </div>
        )}
        <div className="flex items-center gap-2 border-t border-orion-border px-4 py-3">
          <span className="text-[11.5px] text-orion-fg-muted">
            Moneda: {moneda} · {Object.values(recepciones).filter((n) => n > 0).length} líneas
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] font-medium text-orion-fg hover:bg-orion-bg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={submit}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-tenant-accent px-3 text-[13px] font-medium text-white hover:brightness-95 disabled:opacity-60"
          >
            {pending ? 'Guardando…' : 'Confirmar recepción'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetalleBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      disabled
      title="Próximamente"
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] font-medium text-orion-fg hover:bg-orion-bg-muted disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}
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
function Th({ children, align }: { children?: React.ReactNode; align?: 'right' }) {
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
  children?: React.ReactNode;
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
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center">
      <span className="text-orion-fg-muted">{label}</span>
      <span className="ml-auto tabular-nums text-orion-fg">{children}</span>
    </div>
  );
}
function Termino({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-orion-fg-muted">{label}</div>
      <div className="text-orion-fg">{value}</div>
    </div>
  );
}

const STEPPER_STEPS = ['Borrador', 'Enviada', 'Aprobada', 'Recibir', 'Cerrada'];
const STEPPER_INDEX: Partial<Record<Estado, number>> = {
  borrador: 0,
  enviada: 1,
  aprobada: 2,
  recibida_parcial: 3,
  recibida_total: 3,
  cerrada: 4,
};

function OrdenStepper({ estado }: { estado: Estado }) {
  const current = STEPPER_INDEX[estado];
  if (current === undefined) return null;
  return (
    <div className="mb-5 flex items-center">
      {STEPPER_STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold',
                  done
                    ? 'bg-success text-white'
                    : active
                      ? 'bg-tenant-accent text-white'
                      : 'bg-orion-bg-muted text-orion-fg-faint'
                )}
              >
                {done ? <Check size={11} /> : i + 1}
              </div>
              <span
                className={cn(
                  'whitespace-nowrap text-[10.5px]',
                  active ? 'font-semibold text-orion-fg' : 'text-orion-fg-muted'
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPPER_STEPS.length - 1 && (
              <div
                className={cn('mb-4 h-px flex-1', i < current ? 'bg-success' : 'bg-orion-border')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function BannerSiguientePaso({
  estado,
  puedeEnviar,
  puedeRecibir,
  puedeCerrar,
  onEnviar,
  onRecibir,
  onCerrar,
  pending,
}: {
  estado: Estado;
  puedeEnviar: boolean;
  puedeRecibir: boolean;
  puedeCerrar: boolean;
  onEnviar: () => void;
  onRecibir: () => void;
  onCerrar: () => void;
  pending: boolean;
}) {
  type BannerConfig = {
    colorClass: string;
    mensaje: string;
    boton?: { label: string; onClick: () => void; show: boolean };
  };

  const cfg: BannerConfig | null = (() => {
    switch (estado) {
      case 'borrador':
        return {
          colorClass: 'border-orion-border bg-orion-bg-muted text-orion-fg-muted',
          mensaje: 'Siguiente: enviar la OC al proveedor para su aprobación.',
          boton: { label: 'Enviar', onClick: onEnviar, show: puedeEnviar },
        };
      case 'enviada':
        return {
          colorClass: 'border-info-border bg-info-soft text-info-fg',
          mensaje: 'Esperando aprobación. Una vez aprobada podrás registrar la recepción.',
        };
      case 'aprobada':
        return {
          colorClass: 'border-warn-border bg-warn-soft text-warn-fg',
          mensaje:
            'Siguiente: registrar la recepción cuando llegue la mercadería. El stock se actualizará automáticamente.',
          boton: { label: 'Registrar recepción', onClick: onRecibir, show: puedeRecibir },
        };
      case 'recibida_parcial':
        return {
          colorClass: 'border-warn-border bg-warn-soft text-warn-fg',
          mensaje: 'Recepción parcial registrada. Registra el resto cuando llegue.',
          boton: { label: 'Registrar recepción', onClick: onRecibir, show: puedeRecibir },
        };
      case 'recibida_total':
        return {
          colorClass: 'border-success-border bg-success-soft text-success-fg',
          mensaje: 'Toda la mercadería fue recibida. Puedes cerrar la OC.',
          boton: { label: 'Cerrar OC', onClick: onCerrar, show: puedeCerrar },
        };
      case 'cerrada':
        return null;
      default:
        return null;
    }
  })();

  if (!cfg) return null;

  return (
    <div
      className={cn(
        'mb-5 flex items-center gap-3 rounded-lg border px-4 py-3 text-[13px]',
        cfg.colorClass
      )}
    >
      <span className="flex-1">{cfg.mensaje}</span>
      {cfg.boton?.show && (
        <button
          type="button"
          disabled={pending}
          onClick={cfg.boton.onClick}
          className="border-current/20 bg-current/10 hover:bg-current/20 inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-3 text-[12px] font-medium disabled:opacity-60"
        >
          {cfg.boton.label}
        </button>
      )}
    </div>
  );
}
