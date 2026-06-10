'use server';

import { and, desc, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import {
  guiasRemision,
  lineasGuia,
  clientes,
  tenants,
  seriesDocumentos,
  productos,
  cotizaciones,
  cotizacionItems,
} from '@/lib/db/schema';
import { reservarCorrelativo } from '@/lib/sunat/reservar-correlativo';
import { encolarEnvioSunat } from '@/lib/sunat/queue';
import { registrarSalidaPorGuia } from './kardex-internal';

type AR<T = undefined> = { success: true; data: T } | { success: false; error: string };

const CrearGuiaSchema = z.object({
  clienteId: z.string().uuid('Selecciona un destinatario'),
  direccionLlegada: z.string().min(5, 'Ingresa la dirección de entrega'),
  fechaInicioTraslado: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  motivoTraslado: z.enum(['01', '02', '04', '13', '14', '18']),
  modalidadTraslado: z.enum(['01', '02']).default('02'),
  items: z
    .array(
      z.object({
        productoId: z.string().uuid().optional(),
        descripcion: z.string().min(1, 'Descripción requerida'),
        cantidad: z.coerce.number().positive('Cantidad debe ser positiva'),
        unidadMedida: z.string().default('NIU'),
      })
    )
    .min(1, 'Agrega al menos un ítem'),
  transportistaNombre: z.string().optional(),
  transportistaRuc: z.string().optional(),
  vehiculoPlaca: z.string().optional(),
  pesoBrutoTotal: z.coerce.number().min(0).optional(),
  observaciones: z.string().optional(),
  cotizacionId: z.string().uuid().optional(),
});

export type CrearGuiaInput = z.infer<typeof CrearGuiaSchema>;

export async function crearGuia(
  input: CrearGuiaInput
): Promise<AR<{ guiaId: string; numero: string }>> {
  try {
    const { user, tenant } = await requirePermission('guias.crear');

    const parsed = CrearGuiaSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
    }
    const d = parsed.data;

    // Cargar datos del tenant para campos de partida
    const [tenantRow] = await db.select().from(tenants).where(eq(tenants.id, tenant.id));
    const direccionPartida = tenantRow?.direccionFiscal ?? 'Lima, Perú';
    const ubigeoPartida = tenantRow?.ubigeo ?? '150101';

    // Cargar datos del cliente destinatario (ubigeo + snapshot para SUNAT)
    const [cliente] = await db
      .select({
        razonSocial: clientes.razonSocial,
        nombres: clientes.nombres,
        apellidoPaterno: clientes.apellidoPaterno,
        tipoDocumento: clientes.tipoDocumento,
        numeroDocumento: clientes.numeroDocumento,
        direccionSunat: clientes.direccionSunat,
        ubigeo: clientes.ubigeoSunat,
      })
      .from(clientes)
      .where(and(eq(clientes.id, d.clienteId), eq(clientes.tenantId, tenant.id)));
    if (!cliente) return { success: false, error: 'Cliente no encontrado' };

    const ubigeoLlegada = cliente.ubigeo ?? '150101';
    const destinatarioRazonSocial =
      cliente.razonSocial ??
      [cliente.nombres, cliente.apellidoPaterno].filter(Boolean).join(' ') ??
      'Sin nombre';
    const destinatarioTipoDoc = cliente.tipoDocumento ?? '6';
    const destinatarioNumDoc = cliente.numeroDocumento ?? '';

    // Serie T001 por defecto para guías
    const [serie] = await db
      .select()
      .from(seriesDocumentos)
      .where(
        and(
          eq(seriesDocumentos.tenantId, tenant.id),
          eq(seriesDocumentos.tipoDocumento, '09'),
          eq(seriesDocumentos.activa, true)
        )
      );
    const serieCode = serie?.serie ?? 'T001';

    const numero = await reservarCorrelativo(tenant.id, '09', serieCode);
    const numeroStr = `${serieCode}-${String(numero).padStart(8, '0')}`;
    const hoy = new Date().toISOString().split('T')[0];

    const [nuevaGuia] = await db
      .insert(guiasRemision)
      .values({
        tenantId: tenant.id,
        tipoDocumento: '09',
        serie: serieCode,
        numero,
        fechaEmision: hoy,
        fechaInicioTraslado: d.fechaInicioTraslado,
        destinatarioId: d.clienteId,
        destinatarioRazonSocialSnapshot: destinatarioRazonSocial,
        destinatarioNumDocSnapshot: destinatarioNumDoc,
        destinatarioTipoDocSnapshot: destinatarioTipoDoc,
        transportistaNombreSnapshot: d.transportistaNombre ?? null,
        transportistaRucSnapshot: d.transportistaRuc ?? null,
        vehiculoPlacaSnapshot: d.vehiculoPlaca ?? null,
        motivoTraslado: d.motivoTraslado,
        modalidadTraslado: d.modalidadTraslado,
        direccionPartida,
        ubigeoPartida,
        direccionLlegada: d.direccionLlegada,
        ubigeoLlegada,
        pesoBrutoTotal: d.pesoBrutoTotal ? String(d.pesoBrutoTotal) : null,
        observaciones: d.observaciones ?? null,
        cotizacionId: d.cotizacionId ?? null,
        estado: 'pendiente_despacho',
        estadoSunat: 'sin_enviar',
        creadoPor: user.id,
      })
      .returning({ id: guiasRemision.id });

    // Precarga SKUs de productos referenciados
    const productoIds = d.items.map((it) => it.productoId).filter(Boolean) as string[];
    const skuMap = new Map<string, string>();
    if (productoIds.length > 0) {
      const rows = await db
        .select({ id: productos.id, codigo: productos.codigo })
        .from(productos)
        .where(eq(productos.tenantId, tenant.id));
      rows.forEach((r) => {
        if (r.codigo) skuMap.set(r.id, r.codigo);
      });
    }

    // Insertar líneas de mercadería
    if (d.items.length > 0) {
      await db.insert(lineasGuia).values(
        d.items.map((it, i) => ({
          guiaId: nuevaGuia.id,
          tenantId: tenant.id,
          productoId: it.productoId ?? null,
          skuSnapshot: it.productoId ? (skuMap.get(it.productoId) ?? '') : '',
          descripcion: it.descripcion,
          cantidad: String(it.cantidad),
          unidadMedida: it.unidadMedida,
          orden: i,
        }))
      );
    }

    // Salida de stock por cada ítem vinculado al catálogo
    for (const it of d.items.filter((i) => i.productoId)) {
      await registrarSalidaPorGuia(db, {
        tenantId: tenant.id,
        productoId: it.productoId!,
        cantidad: it.cantidad,
        guiaId: nuevaGuia.id,
        userId: user.id,
      });
    }

    // Encolar en sunat_outbox para emisión automática a Nubefact
    await encolarEnvioSunat({
      tenantId: tenant.id,
      documentoTipo: 'guia_remision',
      documentoId: nuevaGuia.id,
    });

    revalidatePath(`/${tenant.slug}/guias`);
    return { success: true, data: { guiaId: nuevaGuia.id, numero: numeroStr } };
  } catch (err) {
    console.error('[guias] crearGuia error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error interno' };
  }
}

export async function marcarDespachada(guiaId: string): Promise<AR> {
  try {
    const { tenant } = await requirePermission('guias.crear');
    await db
      .update(guiasRemision)
      .set({ estado: 'en_camino', updatedAt: new Date() })
      .where(and(eq(guiasRemision.id, guiaId), eq(guiasRemision.tenantId, tenant.id)));
    revalidatePath(`/${tenant.slug}/guias`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error interno' };
  }
}

export async function marcarEntregada(guiaId: string): Promise<AR> {
  try {
    const { tenant } = await requirePermission('guias.crear');
    await db
      .update(guiasRemision)
      .set({ estado: 'entregado', updatedAt: new Date() })
      .where(and(eq(guiasRemision.id, guiaId), eq(guiasRemision.tenantId, tenant.id)));
    revalidatePath(`/${tenant.slug}/guias`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error interno' };
  }
}

export async function reenviarGuiaSunat(
  guiaId: string
): Promise<{ success: true; data: { encolado: boolean } } | { success: false; error: string }> {
  try {
    const { tenant } = await requirePermission('guias.crear');

    const [guia] = await db
      .select({ id: guiasRemision.id, estadoSunat: guiasRemision.estadoSunat })
      .from(guiasRemision)
      .where(and(eq(guiasRemision.id, guiaId), eq(guiasRemision.tenantId, tenant.id)));

    if (!guia) return { success: false, error: 'Guía no encontrada' };
    if (guia.estadoSunat === 'aceptada') {
      return { success: false, error: 'La guía ya está aceptada por SUNAT' };
    }

    await db
      .update(guiasRemision)
      .set({ estadoSunat: 'pendiente', updatedAt: new Date() })
      .where(eq(guiasRemision.id, guiaId));

    const { duplicado } = await encolarEnvioSunat({
      tenantId: tenant.id,
      documentoTipo: 'guia_remision',
      documentoId: guiaId,
    });

    revalidatePath(`/${tenant.slug}/guias`);
    revalidatePath(`/${tenant.slug}/guias/${guiaId}`);

    return { success: true, data: { encolado: !duplicado } };
  } catch (err) {
    console.error('[guias] reenviarGuiaSunat error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error interno' };
  }
}

export type CotizacionParaGuia = {
  id: string;
  numeroCompleto: string;
  fechaEmision: string;
  clienteNombre: string;
  clienteId: string;
  total: string;
  moneda: string;
  items: {
    productoId: string | null;
    codigo: string | null;
    descripcion: string;
    cantidad: string;
    unidadMedida: string;
  }[];
};

export async function getCotizacionesParaGuia(): Promise<CotizacionParaGuia[]> {
  const { tenant } = await requirePermission('guias.crear');

  const rows = await db
    .select({
      id: cotizaciones.id,
      numeroCompleto: cotizaciones.numeroCompleto,
      fechaEmision: cotizaciones.fechaEmision,
      total: cotizaciones.total,
      moneda: cotizaciones.moneda,
      clienteId: cotizaciones.clienteId,
      clienteNombre: clientes.razonSocial,
      clienteNombres: clientes.nombres,
      clienteApellido: clientes.apellidoPaterno,
    })
    .from(cotizaciones)
    .innerJoin(clientes, eq(cotizaciones.clienteId, clientes.id))
    .where(
      and(
        eq(cotizaciones.tenantId, tenant.id),
        inArray(cotizaciones.estado, ['enviada', 'aceptada'])
      )
    )
    .orderBy(desc(cotizaciones.createdAt))
    .limit(50);

  if (rows.length === 0) return [];

  const cotIds = rows.map((r) => r.id);
  const itemRows = await db
    .select({
      cotizacionId: cotizacionItems.cotizacionId,
      productoId: cotizacionItems.productoId,
      codigo: cotizacionItems.codigo,
      descripcion: cotizacionItems.descripcion,
      cantidad: cotizacionItems.cantidad,
      unidadMedida: cotizacionItems.unidadMedida,
      orden: cotizacionItems.orden,
    })
    .from(cotizacionItems)
    .where(inArray(cotizacionItems.cotizacionId, cotIds))
    .orderBy(cotizacionItems.orden);

  const itemsByCot = new Map<string, typeof itemRows>();
  for (const it of itemRows) {
    const arr = itemsByCot.get(it.cotizacionId) ?? [];
    arr.push(it);
    itemsByCot.set(it.cotizacionId, arr);
  }

  return rows.map((r) => ({
    id: r.id,
    numeroCompleto: r.numeroCompleto ?? '',
    fechaEmision: r.fechaEmision,
    clienteId: r.clienteId,
    clienteNombre:
      r.clienteNombre ??
      [r.clienteNombres, r.clienteApellido].filter(Boolean).join(' ') ??
      'Cliente',
    total: r.total,
    moneda: r.moneda,
    items: (itemsByCot.get(r.id) ?? []).map((it) => ({
      productoId: it.productoId ?? null,
      codigo: it.codigo ?? null,
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      unidadMedida: it.unidadMedida,
    })),
  }));
}
