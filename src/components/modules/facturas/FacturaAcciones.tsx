'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { FileMinus, FilePlus, RefreshCw, Truck, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  crearNotaCredito,
  crearNotaDebito,
  reenviarFacturaSunat,
} from '@/server/actions/notas-credito-debito';

const MOTIVOS_NC = [
  { codigo: '01', label: 'Anulación de la operación' },
  { codigo: '06', label: 'Devolución total' },
  { codigo: '03', label: 'Corrección por error en la descripción' },
  { codigo: '04', label: 'Descuento global' },
  { codigo: '07', label: 'Devolución por ítem' },
];

const MOTIVOS_ND = [
  { codigo: '02', label: 'Aumento en el valor' },
  { codigo: '01', label: 'Intereses por mora' },
  { codigo: '03', label: 'Penalidades / otros conceptos' },
];

interface Props {
  facturaId: string;
  estadoSunat: string;
  moneda: string;
  companySlug: string;
}

type Modal = 'nc' | 'nd' | null;

export function FacturaAcciones({ facturaId, estadoSunat, moneda, companySlug }: Props) {
  const [modal, setModal] = useState<Modal>(null);
  const [pending, startTransition] = useTransition();

  const isAceptada = estadoSunat === 'aceptada';
  const isError = estadoSunat === 'error' || estadoSunat === 'sin_enviar';

  function handleReenviar() {
    startTransition(async () => {
      const res = await reenviarFacturaSunat(facturaId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Factura enviada a cola de SUNAT. El worker la procesará en ~30s.');
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isAceptada && (
        <>
          <button
            type="button"
            onClick={() => setModal('nc')}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] font-medium text-orion-fg hover:bg-orion-bg-muted"
          >
            <FileMinus size={13} />
            Nota de crédito
          </button>
          <button
            type="button"
            onClick={() => setModal('nd')}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] font-medium text-orion-fg hover:bg-orion-bg-muted"
          >
            <FilePlus size={13} />
            Nota de débito
          </button>
          <Link
            href={`/${companySlug}/guias/nueva`}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] font-medium text-orion-fg hover:bg-orion-bg-muted"
          >
            <Truck size={13} />
            Generar guía
          </Link>
        </>
      )}
      {isError && (
        <button
          type="button"
          disabled={pending}
          onClick={handleReenviar}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] font-medium text-orion-fg hover:bg-orion-bg-muted disabled:opacity-60"
        >
          <RefreshCw size={13} className={pending ? 'animate-spin' : ''} />
          Reenviar a SUNAT
        </button>
      )}

      {modal && (
        <ModalNota
          tipo={modal}
          facturaId={facturaId}
          moneda={moneda}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function ModalNota({
  tipo,
  facturaId,
  moneda,
  onClose,
}: {
  tipo: 'nc' | 'nd';
  facturaId: string;
  moneda: string;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [motivoCodigo, setMotivoCodigo] = useState(tipo === 'nc' ? '01' : '02');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');

  const motivos = tipo === 'nc' ? MOTIVOS_NC : MOTIVOS_ND;
  const titulo = tipo === 'nc' ? 'Nota de crédito' : 'Nota de débito';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!descripcion.trim()) {
      toast.error('Ingresa una descripción del motivo');
      return;
    }
    if (tipo === 'nd' && (!monto || Number(monto) <= 0)) {
      toast.error('Ingresa el monto a cargar');
      return;
    }

    startTransition(async () => {
      let res;
      if (tipo === 'nc') {
        res = await crearNotaCredito({
          facturaId,
          tipoMotivo: motivoCodigo,
          descripcionMotivo: descripcion.trim(),
        });
      } else {
        res = await crearNotaDebito({
          facturaId,
          tipoMotivo: motivoCodigo,
          descripcionMotivo: descripcion.trim(),
          monto: Number(monto),
        });
      }

      if (!res.success) {
        toast.error(res.error);
        return;
      }

      const datos = res.data as { ncId?: string; ndId?: string; numeroCompleto: string };
      toast.success(`${titulo} ${datos.numeroCompleto} emitida — pendiente de SUNAT`);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-orion-border bg-orion-bg shadow-xl">
        <div className="flex items-center justify-between border-b border-orion-border px-5 py-4">
          <h2 className="text-[15px] font-semibold text-orion-fg">Emitir {titulo}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-orion-fg-muted hover:text-orion-fg"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-orion-fg">
              Motivo <span className="text-danger-fg">*</span>
            </label>
            <select
              value={motivoCodigo}
              onChange={(e) => setMotivoCodigo(e.target.value)}
              className="h-9 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] text-orion-fg focus:outline-none focus:ring-1 focus:ring-tenant-accent"
            >
              {motivos.map((m) => (
                <option key={m.codigo} value={m.codigo}>
                  {m.codigo} — {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-orion-fg">
              Descripción <span className="text-danger-fg">*</span>
            </label>
            <textarea
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Detalla el motivo de la nota..."
              className="resize-none rounded-md border border-orion-border bg-orion-bg px-3 py-2 text-[13px] text-orion-fg placeholder:text-orion-fg-faint focus:outline-none focus:ring-1 focus:ring-tenant-accent"
            />
          </div>

          {tipo === 'nd' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-orion-fg">
                Monto a cobrar ({moneda}) <span className="text-danger-fg">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className="h-9 rounded-md border border-orion-border bg-orion-bg px-3 font-mono text-[13px] text-orion-fg focus:outline-none focus:ring-1 focus:ring-tenant-accent"
              />
              <span className="text-[11px] text-orion-fg-muted">Monto total incluyendo IGV</span>
            </div>
          )}

          {tipo === 'nc' && (
            <p className="rounded-md bg-orion-bg-subtle px-3 py-2 text-[12px] text-orion-fg-muted">
              Se creará una NC que anula el mismo monto de la factura original — SUNAT no fija plazo
              para anular vía NC (la baja directa sin NC solo aplica dentro de los 7 días). El
              comprobante se enviará a SUNAT en segundo plano.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="inline-flex h-9 items-center rounded-md border border-orion-border px-4 text-[13px] font-medium text-orion-fg hover:bg-orion-bg-muted disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-tenant-accent px-4 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {pending ? 'Procesando…' : `Emitir ${titulo}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
