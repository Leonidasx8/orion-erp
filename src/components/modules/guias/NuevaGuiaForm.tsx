'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { crearGuia, type CrearGuiaInput } from '@/server/actions/guias';

interface Destinatario {
  id: string;
  nombre: string;
  direccion: string;
}

interface Item {
  descripcion: string;
  cantidad: number;
  unidadMedida: string;
}

interface Props {
  tenantSlug: string;
  destinatarios: Destinatario[];
}

const MOTIVOS = [
  { value: '01', label: 'Venta' },
  { value: '02', label: 'Compra' },
  { value: '04', label: 'Traslado entre establecimientos' },
  { value: '13', label: 'Otros' },
  { value: '14', label: 'Venta sujeta a confirmación' },
];

export function NuevaGuiaForm({ tenantSlug, destinatarios }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const today = new Date().toISOString().split('T')[0];

  const [clienteId, setClienteId] = useState('');
  const [direccionLlegada, setDireccionLlegada] = useState('');
  const [fechaEnvio, setFechaEnvio] = useState(today);
  const [motivo, setMotivo] = useState<CrearGuiaInput['motivoTraslado']>('01');
  const [items, setItems] = useState<Item[]>([
    { descripcion: '', cantidad: 1, unidadMedida: 'NIU' },
  ]);
  const [transportista, setTransportista] = useState('');
  const [placa, setPlaca] = useState('');
  const [observaciones, setObservaciones] = useState('');

  function handleClienteChange(id: string) {
    setClienteId(id);
    const dest = destinatarios.find((d) => d.id === id);
    if (dest?.direccion) setDireccionLlegada(dest.direccion);
  }

  function addItem() {
    setItems((prev) => [...prev, { descripcion: '', cantidad: 1, unidadMedida: 'NIU' }]);
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, field: keyof Item, value: string | number) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }

  function handleSubmit() {
    if (!clienteId) return toast.error('Selecciona un destinatario');
    if (!direccionLlegada.trim()) return toast.error('Ingresa la dirección de entrega');
    if (items.some((it) => !it.descripcion.trim()))
      return toast.error('Completa la descripción de todos los ítems');

    startTransition(async () => {
      const res = await crearGuia({
        clienteId,
        direccionLlegada,
        fechaInicioTraslado: fechaEnvio,
        motivoTraslado: motivo,
        modalidadTraslado: '02',
        items,
        transportistaNombre: transportista || undefined,
        vehiculoPlaca: placa || undefined,
        observaciones: observaciones || undefined,
      });
      if (res.success) {
        toast.success(`Guía ${res.data.numero} creada`);
        router.push(`/${tenantSlug}/guias`);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Destinatario */}
      <Card title="¿A quién va el envío?">
        <div className="space-y-3">
          <Field label="Destinatario *">
            <select
              value={clienteId}
              onChange={(e) => handleClienteChange(e.target.value)}
              className={sel}
            >
              <option value="">— Seleccionar cliente —</option>
              {destinatarios.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Dirección de entrega *">
            <input
              type="text"
              value={direccionLlegada}
              onChange={(e) => setDireccionLlegada(e.target.value)}
              placeholder="Av. Los Álamos 123, Lima"
              className={inp}
            />
          </Field>
        </div>
      </Card>

      {/* Despacho */}
      <Card title="Datos del despacho">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Fecha de envío *">
            <input
              type="date"
              value={fechaEnvio}
              onChange={(e) => setFechaEnvio(e.target.value)}
              className={inp}
            />
          </Field>
          <Field label="Motivo">
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as CrearGuiaInput['motivoTraslado'])}
              className={sel}
            >
              {MOTIVOS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Transportista / conductor">
            <input
              type="text"
              value={transportista}
              onChange={(e) => setTransportista(e.target.value)}
              placeholder="Nombre del conductor"
              className={inp}
            />
          </Field>
          <Field label="Placa del vehículo">
            <input
              type="text"
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase())}
              placeholder="ABC-123"
              className={`${inp} uppercase`}
            />
          </Field>
        </div>
      </Card>

      {/* Mercadería */}
      <Card title="Mercadería a enviar">
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={it.descripcion}
                onChange={(e) => updateItem(i, 'descripcion', e.target.value)}
                placeholder="Descripción del producto"
                className={`${inp} flex-1`}
              />
              <input
                type="number"
                value={it.cantidad}
                onChange={(e) => updateItem(i, 'cantidad', Number(e.target.value))}
                min={0.01}
                step={0.01}
                className={`${inp} w-20 text-right`}
              />
              <select
                value={it.unidadMedida}
                onChange={(e) => updateItem(i, 'unidadMedida', e.target.value)}
                className={`${sel} w-20`}
              >
                <option value="NIU">UND</option>
                <option value="KGM">KG</option>
                <option value="MTR">MT</option>
                <option value="RLL">RLL</option>
              </select>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="hover:border-danger-border grid h-9 w-9 shrink-0 place-items-center rounded-md border border-orion-border text-orion-fg-muted hover:text-danger-fg"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1.5 text-[12px] text-orion-fg-muted hover:text-orion-fg"
          >
            <Plus size={13} /> Agregar ítem
          </button>
        </div>
      </Card>

      {/* Notas */}
      <Card title="Observaciones">
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={2}
          placeholder="Instrucciones especiales para el despacho…"
          className={`${inp} w-full resize-none`}
        />
      </Card>

      <p className="text-[11px] text-orion-fg-muted">
        El documento electrónico SUNAT (T001) se generará automáticamente. Puedes emitirlo a SUNAT
        desde el detalle de la guía cuando esté lista.
      </p>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push(`/${tenantSlug}/guias`)}
          className="rounded-md border border-orion-border px-4 py-2 text-[13px] text-orion-fg hover:bg-orion-bg-subtle"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-md bg-tenant-accent px-5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Creando…' : 'Crear guía'}
        </button>
      </div>
    </div>
  );
}

const inp =
  'h-9 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] text-orion-fg placeholder:text-orion-fg-muted focus:outline-none focus:ring-2 focus:ring-orion-brand';
const sel =
  'h-9 rounded-md border border-orion-border bg-orion-bg px-2 text-[13px] text-orion-fg focus:outline-none focus:ring-2 focus:ring-orion-brand';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-orion-border bg-orion-bg p-5 shadow-orion-1">
      <h2 className="mb-4 text-[13px] font-semibold text-orion-fg">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-medium text-orion-fg-muted">{label}</label>
      {children}
    </div>
  );
}
