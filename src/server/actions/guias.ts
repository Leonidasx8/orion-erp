'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { guiasRemision, clientes, tenants, seriesDocumentos } from '@/lib/db/schema';
import { reservarCorrelativo } from '@/lib/sunat/reservar-correlativo';

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
        descripcion: z.string().min(1, 'Descripción requerida'),
        cantidad: z.coerce.number().positive('Cantidad debe ser positiva'),
        unidadMedida: z.string().default('NIU'),
      })
    )
    .min(1, 'Agrega al menos un ítem'),
  transportistaNombre: z.string().optional(),
  vehiculoPlaca: z.string().optional(),
  pesoBrutoTotal: z.coerce.number().min(0).optional(),
  observaciones: z.string().optional(),
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

    // Cargar datos del cliente para ubigeo de llegada
    const [cliente] = await db
      .select({ direccionSunat: clientes.direccionSunat, ubigeo: clientes.ubigeoSunat })
      .from(clientes)
      .where(and(eq(clientes.id, d.clienteId), eq(clientes.tenantId, tenant.id)));
    if (!cliente) return { success: false, error: 'Cliente no encontrado' };

    const ubigeoLlegada = cliente.ubigeo ?? '150101';

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
        motivoTraslado: d.motivoTraslado,
        modalidadTraslado: d.modalidadTraslado,
        direccionPartida,
        ubigeoPartida,
        direccionLlegada: d.direccionLlegada,
        ubigeoLlegada,
        pesoBrutoTotal: d.pesoBrutoTotal ? String(d.pesoBrutoTotal) : null,
        observaciones: d.observaciones ?? null,
        estado: 'pendiente_despacho',
        estadoSunat: 'sin_enviar',
        creadoPor: user.id,
      })
      .returning({ id: guiasRemision.id });

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
