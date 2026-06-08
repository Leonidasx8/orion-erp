'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clienteSchema, type ClienteInput, tiposDocumento } from '@/lib/schemas/cliente';
import { crearCliente, actualizarCliente } from '@/server/actions/clientes';
import { DocAutocomplete } from './DocAutocomplete';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DatosSunat } from '@/lib/sunat/consultar-documento';
import type { Cliente } from '@/lib/db/schema';

interface Props {
  companySlug: string;
  cliente?: Cliente;
}

// Hardcoded list for now — will come from API in a future iteration
const COMERCIALES = [
  { id: '00000000-0000-0000-0000-000000000001', nombre: 'Ana Quispe' },
  { id: '00000000-0000-0000-0000-000000000002', nombre: 'Carlos Mamani' },
  { id: '00000000-0000-0000-0000-000000000003', nombre: 'Rosa Condori' },
];

const PLAZOS_PAGO = [
  { value: 'contado', label: 'Contado' },
  { value: '15dias', label: '15 días' },
  { value: '30dias', label: '30 días' },
  { value: '60dias', label: '60 días' },
] as const;

export function ClienteForm({ companySlug, cliente }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [tipoDoc, setTipoDoc] = useState<string>(cliente?.tipoDocumento ?? 'RUC');
  const [autocompletado, setAutocompletado] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClienteInput>({
    resolver: zodResolver(clienteSchema) as Resolver<ClienteInput>,
    defaultValues: cliente
      ? {
          tipoDocumento: cliente.tipoDocumento as ClienteInput['tipoDocumento'],
          numeroDocumento: cliente.numeroDocumento,
          tipoPersona: cliente.tipoPersona as ClienteInput['tipoPersona'],
          razonSocial: cliente.razonSocial ?? undefined,
          nombres: cliente.nombres ?? undefined,
          apellidoPaterno: cliente.apellidoPaterno ?? undefined,
          apellidoMaterno: cliente.apellidoMaterno ?? undefined,
          nombreComercial:
            (cliente as Cliente & { nombreComercial?: string }).nombreComercial ?? undefined,
          lineaCredito: Number((cliente as Cliente & { lineaCredito?: string }).lineaCredito ?? 0),
          plazoCredito: ((cliente as Cliente & { plazoCredito?: string }).plazoCredito ??
            'contado') as ClienteInput['plazoCredito'],
          listaPrecio: (cliente as Cliente & { listaPrecio?: string }).listaPrecio ?? 'default',
          email: cliente.email ?? '',
          telefono: cliente.telefono ?? '',
          condicionSunat: cliente.condicionSunat ?? undefined,
          estadoSunat: cliente.estadoSunat ?? undefined,
          direccionSunat: cliente.direccionSunat ?? undefined,
          canalCaptacion: cliente.canalCaptacion ?? undefined,
          notas: cliente.notas ?? undefined,
          tags: cliente.tags ?? [],
        }
      : {
          tipoDocumento: 'RUC',
          tipoPersona: 'juridica',
          lineaCredito: 0,
          plazoCredito: 'contado',
          listaPrecio: 'default',
          tags: [],
        },
  });

  const tipoPersona = watch('tipoPersona');
  const condicionSunat = watch('condicionSunat');
  const estadoSunat = watch('estadoSunat');
  const direccionSunat = watch('direccionSunat');
  const razonSocial = watch('razonSocial');

  const onResultadoSunat = (data: DatosSunat) => {
    setValue('numeroDocumento', data.numeroDocumento);
    if (data.tipoDocumento === 'RUC') {
      setValue('tipoPersona', 'juridica');
      setValue('razonSocial', data.razonSocial);
      setValue('condicionSunat', data.condicion);
      setValue('estadoSunat', data.estado);
      setValue('direccionSunat', data.direccion ?? undefined);
    } else {
      setValue('tipoPersona', 'natural');
      setValue('nombres', data.nombres);
      setValue('apellidoPaterno', data.apellidoPaterno);
      setValue('apellidoMaterno', data.apellidoMaterno);
    }
    setAutocompletado(true);
  };

  const onSubmit = (data: ClienteInput): void => {
    setServerError(null);
    startTransition(async () => {
      const res = cliente ? await actualizarCliente(cliente.id, data) : await crearCliente(data);

      if (!res.success) {
        setServerError(res.error);
        return;
      }

      if (!cliente && res.success) {
        router.push(
          `/${companySlug}/clientes/${(res as { success: true; data: { id: string } }).data.id}`
        );
      } else {
        router.push(`/${companySlug}/clientes`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* ── Acciones (cabecera) ── */}
      <div className="flex items-center justify-end gap-3">
        {serverError && <p className="mr-auto text-sm text-destructive">{serverError}</p>}
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${companySlug}/clientes`)}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando…' : cliente ? 'Guardar cambios' : 'Guardar cliente'}
        </Button>
      </div>

      {/* ── Card 1: Identificación SUNAT ── */}
      <div className="space-y-5 rounded-lg border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Identificación SUNAT
        </h2>

        {/* Row 1: Tipo doc | Número | Estado SUNAT */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Col 1: Tipo de documento */}
          <div className="space-y-1.5">
            <Label>Tipo de documento</Label>
            <Select
              defaultValue={tipoDoc}
              onValueChange={(v) => {
                setTipoDoc(v);
                setAutocompletado(false);
                setValue('tipoDocumento', v as ClienteInput['tipoDocumento']);
                if (v === 'RUC') setValue('tipoPersona', 'juridica');
                else setValue('tipoPersona', 'natural');
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tiposDocumento.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Col 2: Número */}
          {tipoDoc === 'RUC' || tipoDoc === 'DNI' ? (
            <DocAutocomplete
              tipo={tipoDoc as 'RUC' | 'DNI'}
              onResultado={onResultadoSunat}
              onNumeroChange={(n) => {
                setValue('numeroDocumento', n);
                setAutocompletado(false);
              }}
            />
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="numero-doc">Número de documento</Label>
              <Input id="numero-doc" {...register('numeroDocumento')} className="font-mono" />
              {errors.numeroDocumento && (
                <p className="text-xs text-destructive">{errors.numeroDocumento.message}</p>
              )}
            </div>
          )}

          {/* Col 3: Estado SUNAT */}
          <div className="space-y-1.5">
            <Label>Estado SUNAT</Label>
            <div className="flex h-10 items-center">
              {condicionSunat ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      estadoSunat?.toUpperCase() === 'ACTIVO' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                  />
                  {condicionSunat} · {estadoSunat}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Razón social (full width, green if autocompletado) */}
        {tipoPersona === 'juridica' ? (
          <div className="space-y-1.5">
            <Label htmlFor="razon-social">Razón social</Label>
            <Input
              id="razon-social"
              {...register('razonSocial')}
              className={
                autocompletado && razonSocial
                  ? 'border-green-500 bg-green-50 text-green-900 focus-visible:ring-green-400'
                  : ''
              }
            />
            {errors.razonSocial && (
              <p className="text-xs text-destructive">{errors.razonSocial.message}</p>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="nombres">Nombres</Label>
              <Input
                id="nombres"
                {...register('nombres')}
                className={autocompletado ? 'border-green-500 bg-green-50' : ''}
              />
              {errors.nombres && (
                <p className="text-xs text-destructive">{errors.nombres.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apellido-p">Apellido paterno</Label>
              <Input
                id="apellido-p"
                {...register('apellidoPaterno')}
                className={autocompletado ? 'border-green-500 bg-green-50' : ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apellido-m">Apellido materno</Label>
              <Input id="apellido-m" {...register('apellidoMaterno')} />
            </div>
          </div>
        )}

        {/* Row 3: Nombre comercial | Tipo de cliente (2 cols) */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="nombre-comercial">Nombre comercial</Label>
            <Input
              id="nombre-comercial"
              {...register('nombreComercial')}
              placeholder="Nombre con el que opera el negocio"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de persona</Label>
            <Select
              value={tipoPersona}
              onValueChange={(v) => setValue('tipoPersona', v as ClienteInput['tipoPersona'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="juridica">Persona jurídica</SelectItem>
                <SelectItem value="natural">Persona natural</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 4: Dirección fiscal (full width) */}
        {direccionSunat && (
          <div className="space-y-1.5">
            <Label htmlFor="direccion-fiscal">Dirección fiscal</Label>
            <Input
              id="direccion-fiscal"
              {...register('direccionSunat')}
              readOnly={autocompletado}
              className={autocompletado ? 'bg-muted/40 text-muted-foreground' : ''}
            />
          </div>
        )}
      </div>

      {/* ── Card 2: Contacto y comerciales ── */}
      <div className="space-y-5 rounded-lg border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Contacto y comerciales
        </h2>

        {/* Row 1: Email | Teléfono | Comercial asignado */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="contacto@empresa.com"
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" {...register('telefono')} placeholder="+51 9xx xxx xxx" />
          </div>
          <div className="space-y-1.5">
            <Label>Comercial asignado</Label>
            <Select defaultValue="sin-asignar">
              <SelectTrigger>
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sin-asignar">Sin asignar</SelectItem>
                {COMERCIALES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Línea de crédito | Plazo de pago | Lista de precios */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="linea-credito">Línea de crédito (USD)</Label>
            <Input
              id="linea-credito"
              type="number"
              min={0}
              step={0.01}
              {...register('lineaCredito')}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">0 = sólo contado</p>
            {errors.lineaCredito && (
              <p className="text-xs text-destructive">{errors.lineaCredito.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Plazo de pago</Label>
            <Select
              defaultValue={
                cliente
                  ? ((cliente as Cliente & { plazoCredito?: string }).plazoCredito ?? 'contado')
                  : 'contado'
              }
              onValueChange={(v) => setValue('plazoCredito', v as ClienteInput['plazoCredito'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAZOS_PAGO.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notas */}
        <div className="space-y-1.5">
          <Label htmlFor="notas">Notas internas</Label>
          <Textarea
            id="notas"
            {...register('notas')}
            rows={3}
            placeholder="Observaciones, acuerdos especiales…"
          />
        </div>
      </div>
    </form>
  );
}
