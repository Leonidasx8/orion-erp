'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Truck, PackageOpen } from 'lucide-react';
import { toast } from 'sonner';
import { crearGuia, type CrearGuiaInput } from '@/server/actions/guias';

interface Destinatario {
  id: string;
  nombre: string;
  direccion: string;
}

interface ProductoCatalogo {
  id: string;
  nombre: string;
  codigo: string;
  unidadMedida: string;
}

interface Item {
  productoId?: string;
  descripcion: string;
  cantidad: number;
  unidadMedida: string;
}

interface Props {
  tenantSlug: string;
  destinatarios: Destinatario[];
  productos: ProductoCatalogo[];
}

const MOTIVOS = [
  { value: '01', label: 'Venta' },
  { value: '02', label: 'Compra' },
  { value: '04', label: 'Traslado entre establecimientos' },
  { value: '13', label: 'Otros' },
  { value: '14', label: 'Venta sujeta a confirmación' },
];

export function NuevaGuiaForm({ tenantSlug, destinatarios, productos }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const today = new Date().toISOString().split('T')[0];

  const [caso, setCaso] = useState<'idex_envia' | 'cliente_recoge'>('idex_envia');
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

  function handleProductoSelect(i: number, productoId: string) {
    if (!productoId) {
      setItems((prev) =>
        prev.map((it, idx) =>
          idx === i ? { ...it, productoId: undefined, descripcion: '', unidadMedida: 'NIU' } : it
        )
      );
      return;
    }
    const p = productos.find((p) => p.id === productoId);
    if (!p) return;
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === i
          ? { ...it, productoId: p.id, descripcion: p.nombre, unidadMedida: p.unidadMedida }
          : it
      )
    );
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
    if (caso === 'idex_envia' && !transportista.trim())
      return toast.error('Ingresa el nombre del transportista');

    startTransition(async () => {
      const res = await crearGuia({
        clienteId,
        direccionLlegada,
        fechaInicioTraslado: fechaEnvio,
        motivoTraslado: motivo,
        modalidadTraslado: caso === 'idex_envia' ? '01' : '02',
        items,
        transportistaNombre: caso === 'idex_envia' ? transportista || undefined : undefined,
        vehiculoPlaca: caso === 'idex_envia' ? placa || undefined : undefined,
        observaciones:
          caso === 'cliente_recoge'
            ? ['El cliente retira la mercadería en almacén', observaciones]
                .filter(Boolean)
                .join('. ')
            : observaciones || undefined,
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
      {/* Tipo de despacho */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setCaso('idex_envia')}
          className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
            caso === 'idex_envia'
              ? 'bg-tenant-accent/5 border-tenant-accent ring-1 ring-tenant-accent'
              : 'border-orion-border hover:bg-orion-bg-subtle'
          }`}
        >
          <Truck
            size={20}
            className={caso === 'idex_envia' ? 'text-tenant-accent' : 'text-orion-fg-muted'}
          />
          <div>
            <p className="text-[13px] font-semibold text-orion-fg">Idex lo lleva</p>
            <p className="text-[11px] text-orion-fg-muted">Nosotros despachamos</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setCaso('cliente_recoge')}
          className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
            caso === 'cliente_recoge'
              ? 'bg-tenant-accent/5 border-tenant-accent ring-1 ring-tenant-accent'
              : 'border-orion-border hover:bg-orion-bg-subtle'
          }`}
        >
          <PackageOpen
            size={20}
            className={caso === 'cliente_recoge' ? 'text-tenant-accent' : 'text-orion-fg-muted'}
          />
          <div>
            <p className="text-[13px] font-semibold text-orion-fg">Cliente recoge</p>
            <p className="text-[11px] text-orion-fg-muted">Retira en almacén</p>
          </div>
        </button>
      </div>

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
              placeholder={
                caso === 'cliente_recoge'
                  ? 'Dirección del almacén de Idex'
                  : 'Av. Los Álamos 123, Lima'
              }
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
          {caso === 'idex_envia' && (
            <>
              <Field label="Transportista / conductor *">
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
            </>
          )}
        </div>
      </Card>

      {/* Mercadería */}
      <Card title="Mercadería a enviar">
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="space-y-1.5 rounded-lg border border-orion-border p-3">
              <div className="flex items-center gap-2">
                <select
                  value={it.productoId ?? ''}
                  onChange={(e) => handleProductoSelect(i, e.target.value)}
                  className={`${sel} flex-1`}
                >
                  <option value="">— Descripción libre —</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.codigo} · {p.nombre}
                    </option>
                  ))}
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
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={it.descripcion}
                  onChange={(e) => updateItem(i, 'descripcion', e.target.value)}
                  placeholder="Descripción del producto"
                  className={`${inp} flex-1`}
                  readOnly={!!it.productoId}
                />
                <input
                  type="number"
                  value={it.cantidad}
                  onChange={(e) => updateItem(i, 'cantidad', Number(e.target.value))}
                  min={0.01}
                  step={0.01}
                  className={`${inp} w-24 text-right`}
                />
                <select
                  value={it.unidadMedida}
                  onChange={(e) => updateItem(i, 'unidadMedida', e.target.value)}
                  className={`${sel} w-24`}
                >
                  <option value="NIU">UND</option>
                  <option value="KGM">KG</option>
                  <option value="MTR">MT</option>
                  <option value="RLL">RLL</option>
                  <option value="KTM">KM</option>
                </select>
              </div>
              {it.productoId && (
                <p className="text-[11px] text-orion-fg-muted">
                  ✓ Vinculado al catálogo — descuenta stock al guardar
                </p>
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
          placeholder={
            caso === 'cliente_recoge'
              ? 'Instrucciones de retiro…'
              : 'Instrucciones especiales para el despacho…'
          }
          className={`${inp} w-full resize-none`}
        />
      </Card>

      <p className="text-[11px] text-orion-fg-muted">
        El documento electrónico SUNAT (T001) se generará automáticamente.
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
