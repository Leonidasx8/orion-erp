'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  eliminarDireccion,
  eliminarContacto,
  cambiarEstadoCliente,
} from '@/server/actions/clientes';
import type { Cliente, DireccionCliente, ContactoCliente } from '@/lib/db/schema';

function nombreDisplay(c: Cliente) {
  if (c.tipoPersona === 'juridica') return c.razonSocial ?? '—';
  return [c.nombres, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(' ') || '—';
}

export function ClienteDetail({
  cliente,
  direcciones,
  contactos,
  companySlug,
  canEdit,
}: {
  cliente: Cliente;
  direcciones: DireccionCliente[];
  contactos: ContactoCliente[];
  companySlug: string;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleEliminarDireccion = (id: string) => {
    startTransition(async () => {
      const res = await eliminarDireccion(cliente.id, id);
      if (!res.success) setError(res.error);
    });
  };

  const handleEliminarContacto = (id: string) => {
    startTransition(async () => {
      const res = await eliminarContacto(cliente.id, id);
      if (!res.success) setError(res.error);
    });
  };

  const handleCambiarEstado = (estado: 'activo' | 'inactivo' | 'bloqueado') => {
    startTransition(async () => {
      const res = await cambiarEstadoCliente(cliente.id, estado);
      if (!res.success) setError(res.error);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href={`/${companySlug}/clientes`} className="hover:underline">
              Clientes
            </Link>{' '}
            / {nombreDisplay(cliente)}
          </p>
          <h1 className="mt-1 text-2xl font-bold">{nombreDisplay(cliente)}</h1>
          <p className="mt-0.5 font-mono text-sm text-muted-foreground">
            {cliente.tipoDocumento} {cliente.numeroDocumento}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              cliente.estado === 'activo'
                ? 'default'
                : cliente.estado === 'bloqueado'
                  ? 'destructive'
                  : 'secondary'
            }
          >
            {cliente.estado}
          </Badge>
          {canEdit && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${companySlug}/clientes/${cliente.id}/editar`}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Editar
              </Link>
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Tabs defaultValue="datos">
        <TabsList>
          <TabsTrigger value="datos">Datos</TabsTrigger>
          <TabsTrigger value="direcciones">Direcciones ({direcciones.length})</TabsTrigger>
          <TabsTrigger value="contactos">Contactos ({contactos.length})</TabsTrigger>
        </TabsList>

        {/* Datos */}
        <TabsContent value="datos" className="mt-4 rounded-lg border p-5">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Tipo persona</dt>
              <dd className="capitalize">{cliente.tipoPersona}</dd>
            </div>
            {cliente.email && (
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd>{cliente.email}</dd>
              </div>
            )}
            {cliente.telefono && (
              <div>
                <dt className="text-muted-foreground">Teléfono</dt>
                <dd>{cliente.telefono}</dd>
              </div>
            )}
            {cliente.condicionSunat && (
              <div>
                <dt className="text-muted-foreground">Condición SUNAT</dt>
                <dd>{cliente.condicionSunat}</dd>
              </div>
            )}
            {cliente.estadoSunat && (
              <div>
                <dt className="text-muted-foreground">Estado SUNAT</dt>
                <dd>{cliente.estadoSunat}</dd>
              </div>
            )}
            {cliente.direccionSunat && (
              <div className="col-span-2">
                <dt className="text-muted-foreground">Dirección fiscal (SUNAT)</dt>
                <dd>{cliente.direccionSunat}</dd>
              </div>
            )}
            {cliente.canalCaptacion && (
              <div>
                <dt className="text-muted-foreground">Canal captación</dt>
                <dd>{cliente.canalCaptacion}</dd>
              </div>
            )}
            {cliente.notas && (
              <div className="col-span-2">
                <dt className="text-muted-foreground">Notas</dt>
                <dd className="whitespace-pre-line">{cliente.notas}</dd>
              </div>
            )}
          </dl>

          {canEdit && (
            <div className="mt-6 flex gap-2 border-t pt-4">
              {cliente.estado !== 'activo' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCambiarEstado('activo')}
                  disabled={pending}
                >
                  Activar
                </Button>
              )}
              {cliente.estado === 'activo' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCambiarEstado('inactivo')}
                  disabled={pending}
                >
                  Desactivar
                </Button>
              )}
              {cliente.estado !== 'bloqueado' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleCambiarEstado('bloqueado')}
                  disabled={pending}
                >
                  Bloquear
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        {/* Direcciones */}
        <TabsContent value="direcciones" className="mt-4 space-y-3">
          {canEdit && (
            <Button size="sm" asChild>
              <Link href={`/${companySlug}/clientes/${cliente.id}/direcciones/nueva`}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Agregar dirección
              </Link>
            </Button>
          )}
          {direcciones.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin direcciones registradas.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {direcciones.map((d) => (
                <li key={d.id} className="flex items-start justify-between px-4 py-3 text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{d.tipo}</Badge>
                      {d.esPrincipal && <Badge variant="outline">Principal</Badge>}
                      {d.alias && <span className="text-muted-foreground">{d.alias}</span>}
                    </div>
                    <p className="mt-1">{d.direccion}</p>
                    {(d.distrito || d.provincia || d.departamento) && (
                      <p className="text-muted-foreground">
                        {[d.distrito, d.provincia, d.departamento].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleEliminarDireccion(d.id)}
                      disabled={pending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* Contactos */}
        <TabsContent value="contactos" className="mt-4 space-y-3">
          {canEdit && (
            <Button size="sm" asChild>
              <Link href={`/${companySlug}/clientes/${cliente.id}/contactos/nuevo`}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Agregar contacto
              </Link>
            </Button>
          )}
          {contactos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin contactos registrados.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {contactos.map((c) => (
                <li key={c.id} className="flex items-start justify-between px-4 py-3 text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.nombre}</span>
                      {c.esPrincipal && <Badge variant="outline">Principal</Badge>}
                      {c.cargo && <span className="text-muted-foreground">{c.cargo}</span>}
                    </div>
                    <div className="mt-0.5 flex gap-4 text-muted-foreground">
                      {c.email && <span>{c.email}</span>}
                      {c.telefono && <span>{c.telefono}</span>}
                    </div>
                  </div>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleEliminarContacto(c.id)}
                      disabled={pending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
