'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Pencil, Plus, Hash, Mail, User, Check, AlertTriangle, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { eliminarContacto, cambiarEstadoCliente } from '@/server/actions/clientes';
import type { Cliente, DireccionCliente, ContactoCliente } from '@/lib/db/schema';

// ─── helpers ────────────────────────────────────────────────────────────────

function nombreDisplay(c: Cliente): string {
  if (c.tipoPersona === 'juridica') return c.razonSocial ?? '—';
  return [c.nombres, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(' ') || '—';
}

function initials(nombre: string): string {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

// ─── types ───────────────────────────────────────────────────────────────────

interface ActividadItem {
  tipo: string;
  descripcion: string;
  tiempo: string;
}

interface ClienteDetailProps {
  cliente: Cliente;
  direcciones: DireccionCliente[];
  contactos: ContactoCliente[];
  companySlug: string;
  canEdit: boolean;
  cotizacionesCount: number;
  facturasCount: number;
  ultimaActividad: ActividadItem[];
}

// ─── sub-components ──────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
      {sub !== undefined && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ContactoAvatar({ nombre }: { nombre: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {initials(nombre)}
    </span>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export function ClienteDetail({
  cliente,
  direcciones,
  contactos,
  companySlug,
  canEdit,
  cotizacionesCount,
  facturasCount,
  ultimaActividad,
}: ClienteDetailProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  const nombre = nombreDisplay(cliente);
  const sunatActivo =
    cliente.estadoSunat?.toLowerCase() === 'activo' ||
    cliente.estadoSunat?.toLowerCase() === 'habido';

  // Build the activity list — always show at least "Creado"
  const actividad: ActividadItem[] =
    ultimaActividad.length > 0
      ? ultimaActividad
      : [
          {
            tipo: 'creado',
            descripcion: 'Cliente registrado',
            tiempo: formatDate(cliente.createdAt),
          },
        ];

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: name + meta */}
        <div className="min-w-0">
          {/* Name row */}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold leading-tight">{nombre}</h1>
            <Badge
              variant={
                cliente.estado === 'activo'
                  ? 'default'
                  : cliente.estado === 'bloqueado'
                    ? 'destructive'
                    : 'secondary'
              }
            >
              {cliente.estado === 'activo'
                ? 'Activo'
                : cliente.estado === 'bloqueado'
                  ? 'Bloqueado'
                  : 'Inactivo'}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {cliente.tipoPersona === 'juridica' ? 'Persona jurídica' : 'Persona natural'}
            </Badge>
          </div>

          {/* Meta row */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {cliente.numeroDocumento && (
              <span className="flex items-center gap-1">
                <Hash className="h-3.5 w-3.5 shrink-0" />
                <span className="font-mono">
                  {cliente.tipoDocumento} {cliente.numeroDocumento}
                </span>
              </span>
            )}
            {cliente.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                {cliente.email}
              </span>
            )}
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span>
                Comercial: <span className="text-foreground/60">—</span>
              </span>
            </span>
            {cliente.estadoSunat && (
              <span className="flex items-center gap-1">
                {sunatActivo ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                )}
                <span>
                  SUNAT {cliente.estadoSunat.toLowerCase()}
                  {cliente.condicionSunat && <> · {cliente.condicionSunat.toLowerCase()}</>}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex shrink-0 items-center gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${companySlug}/clientes/${cliente.id}/editar`}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Editar
              </Link>
            </Button>
          )}
          <Button size="sm" asChild>
            <Link href={`/${companySlug}/cotizaciones/nueva?clienteId=${cliente.id}`}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Nueva cotización
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* ── KPI cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Línea de crédito" value="S/ 0.00" sub="Contado" />
        <KpiCard label="Saldo actual" value="S/ 0.00" sub="—" />
        <KpiCard label="Ventas YTD" value="S/ 0.00" sub="—" />
        <KpiCard label="Doc. por vencer" value="0" />
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="cotizaciones">Cotizaciones ({cotizacionesCount})</TabsTrigger>
          <TabsTrigger value="facturas">Facturas ({facturasCount})</TabsTrigger>
          <TabsTrigger value="credito">Crédito y pagos</TabsTrigger>
        </TabsList>

        {/* ── Tab: General ─────────────────────────────────────────────── */}
        <TabsContent value="general" className="mt-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Col 1: Datos fiscales */}
            <div className="rounded-lg border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold">Datos fiscales</h3>
              <dl className="space-y-2.5 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Razón social / Nombre</dt>
                  <dd className="mt-0.5 font-medium">{nombre}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{cliente.tipoDocumento}</dt>
                  <dd className="mt-0.5 font-mono">{cliente.numeroDocumento}</dd>
                </div>
                {cliente.estadoSunat && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Estado SUNAT</dt>
                    <dd className="mt-0.5 capitalize">{cliente.estadoSunat}</dd>
                  </div>
                )}
                {cliente.condicionSunat && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Condición SUNAT</dt>
                    <dd className="mt-0.5 capitalize">{cliente.condicionSunat}</dd>
                  </div>
                )}
                {cliente.direccionSunat && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Dirección fiscal</dt>
                    <dd className="mt-0.5 leading-snug">{cliente.direccionSunat}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-muted-foreground">Tipo operación</dt>
                  <dd className="mt-0.5">Gravada</dd>
                </div>
                {cliente.telefono && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Teléfono</dt>
                    <dd className="mt-0.5">{cliente.telefono}</dd>
                  </div>
                )}
                {cliente.canalCaptacion && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Canal captación</dt>
                    <dd className="mt-0.5 capitalize">{cliente.canalCaptacion}</dd>
                  </div>
                )}
                {cliente.notas && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Notas</dt>
                    <dd className="mt-0.5 whitespace-pre-line text-muted-foreground">
                      {cliente.notas}
                    </dd>
                  </div>
                )}
              </dl>

              {/* Estado buttons */}
              {canEdit && (
                <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
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
            </div>

            {/* Col 2: Contactos */}
            <div className="rounded-lg border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Contactos</h3>
                {canEdit && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <Link href={`/${companySlug}/clientes/${cliente.id}/contactos/nuevo`}>
                      <Plus className="h-4 w-4" />
                      <span className="sr-only">Agregar contacto</span>
                    </Link>
                  </Button>
                )}
              </div>

              {contactos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin contactos registrados.</p>
              ) : (
                <ul className="space-y-3">
                  {contactos.map((c) => (
                    <li key={c.id} className="flex items-start gap-3">
                      <ContactoAvatar nombre={c.nombre} />
                      <div className="min-w-0 flex-1 text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{c.nombre}</span>
                          {c.esPrincipal && (
                            <Badge variant="outline" className="text-[10px]">
                              Principal
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {[c.cargo, c.email].filter(Boolean).join(' · ')}
                        </p>
                        {c.telefono && (
                          <p className="text-xs text-muted-foreground">{c.telefono}</p>
                        )}
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleEliminarContacto(c.id)}
                          disabled={pending}
                        >
                          <span className="sr-only">Eliminar</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {/* Direcciones section below contacts */}
              {direcciones.length > 0 && (
                <div className="mt-5 border-t pt-4">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Direcciones
                  </h4>
                  <ul className="space-y-2 text-sm">
                    {direcciones.map((d) => (
                      <li key={d.id}>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-[10px]">
                            {d.tipo}
                          </Badge>
                          {d.esPrincipal && (
                            <Badge variant="outline" className="text-[10px]">
                              Principal
                            </Badge>
                          )}
                          {d.alias && (
                            <span className="text-xs text-muted-foreground">{d.alias}</span>
                          )}
                        </div>
                        <p className="mt-0.5 leading-snug">{d.direccion}</p>
                        {(d.distrito ?? d.provincia ?? d.departamento) && (
                          <p className="text-xs text-muted-foreground">
                            {[d.distrito, d.provincia, d.departamento].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Col 3: Actividad reciente */}
            <div className="rounded-lg border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold">Actividad reciente</h3>
              <ul className="space-y-3">
                {actividad.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug">{item.descripcion}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        {item.tiempo}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </TabsContent>

        {/* ── Tab: Cotizaciones ─────────────────────────────────────────── */}
        <TabsContent value="cotizaciones" className="mt-4">
          <div className="rounded-lg border bg-card p-6 text-center">
            <p className="mb-3 text-sm text-muted-foreground">
              {cotizacionesCount === 0
                ? 'Este cliente no tiene cotizaciones aún.'
                : `${cotizacionesCount} cotización${cotizacionesCount !== 1 ? 'es' : ''} registrada${cotizacionesCount !== 1 ? 's' : ''}.`}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${companySlug}/cotizaciones?clienteId=${cliente.id}`}>
                Ver cotizaciones
              </Link>
            </Button>
          </div>
        </TabsContent>

        {/* ── Tab: Facturas ─────────────────────────────────────────────── */}
        <TabsContent value="facturas" className="mt-4">
          <div className="rounded-lg border bg-card p-6 text-center">
            <p className="mb-3 text-sm text-muted-foreground">
              {facturasCount === 0
                ? 'Este cliente no tiene facturas aún.'
                : `${facturasCount} factura${facturasCount !== 1 ? 's' : ''} registrada${facturasCount !== 1 ? 's' : ''}.`}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${companySlug}/facturas?clienteId=${cliente.id}`}>Ver facturas</Link>
            </Button>
          </div>
        </TabsContent>

        {/* ── Tab: Crédito y pagos ──────────────────────────────────────── */}
        <TabsContent value="credito" className="mt-4">
          <div className="rounded-lg border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Módulo de crédito y pagos — próximamente.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
