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

export function ClienteForm({ companySlug, cliente }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [tipoDoc, setTipoDoc] = useState<'RUC' | 'DNI' | string>(cliente?.tipoDocumento ?? 'RUC');

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
          tags: [],
        },
  });

  const tipoPersona = watch('tipoPersona');

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
      {/* Tipo documento + autocomplete */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Tipo de documento</Label>
          <Select
            defaultValue={tipoDoc}
            onValueChange={(v) => {
              setTipoDoc(v);
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

        {tipoDoc === 'RUC' || tipoDoc === 'DNI' ? (
          <DocAutocomplete tipo={tipoDoc as 'RUC' | 'DNI'} onResultado={onResultadoSunat} />
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="numero-doc">Número de documento</Label>
            <Input id="numero-doc" {...register('numeroDocumento')} className="font-mono" />
            {errors.numeroDocumento && (
              <p className="text-xs text-destructive">{errors.numeroDocumento.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Tipo persona */}
      <div className="space-y-1.5">
        <Label>Tipo de persona</Label>
        <Select
          value={tipoPersona}
          onValueChange={(v) => setValue('tipoPersona', v as ClienteInput['tipoPersona'])}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="juridica">Persona jurídica</SelectItem>
            <SelectItem value="natural">Persona natural</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Nombre según tipo persona */}
      {tipoPersona === 'juridica' ? (
        <div className="space-y-1.5">
          <Label htmlFor="razon-social">Razón social</Label>
          <Input id="razon-social" {...register('razonSocial')} />
          {errors.razonSocial && (
            <p className="text-xs text-destructive">{errors.razonSocial.message}</p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="nombres">Nombres</Label>
            <Input id="nombres" {...register('nombres')} />
            {errors.nombres && <p className="text-xs text-destructive">{errors.nombres.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apellido-p">Apellido paterno</Label>
            <Input id="apellido-p" {...register('apellidoPaterno')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apellido-m">Apellido materno</Label>
            <Input id="apellido-m" {...register('apellidoMaterno')} />
          </div>
        </div>
      )}

      {/* Contacto */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input id="telefono" {...register('telefono')} />
        </div>
      </div>

      {/* SUNAT (read-only si viene de autocomplete) */}
      {watch('condicionSunat') && (
        <div className="rounded-lg bg-muted/40 p-4 text-sm">
          <p className="mb-2 font-medium text-muted-foreground">Datos SUNAT</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <span>
              Condición: <strong>{watch('condicionSunat')}</strong>
            </span>
            <span>
              Estado: <strong>{watch('estadoSunat')}</strong>
            </span>
            {watch('direccionSunat') && (
              <span className="col-span-2">Dirección: {watch('direccionSunat')}</span>
            )}
          </div>
        </div>
      )}

      {/* Extras */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="canal">Canal de captación</Label>
          <Input id="canal" {...register('canalCaptacion')} placeholder="referido, web, visita…" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notas">Notas</Label>
        <Textarea id="notas" {...register('notas')} rows={3} />
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando…' : cliente ? 'Guardar cambios' : 'Crear cliente'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${companySlug}/clientes`)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
