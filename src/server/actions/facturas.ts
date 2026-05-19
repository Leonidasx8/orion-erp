'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import {
  clientes,
  facturas,
  lineasFactura,
  seriesDocumentos,
  cotizaciones,
  cotizacionItems,
} from '@/lib/db/schema';
import { crearFacturaSchema, calcularLinea, calcularTotalesFactura } from '@/lib/schemas/factura';
import type { CrearFacturaInput } from '@/lib/schemas/factura';
import { reservarCorrelativo } from '@/lib/sunat/reservar-correlativo';
import { encolarEnvioSunat } from '@/lib/sunat/queue';
import { numeroALetras } from '@/lib/sunat/helpers/numero-a-letras';

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

// ─── crearFactura ────────────────────────────────────────────────────────────

export async function crearFactura(
  input: CrearFacturaInput
): Promise<ActionResult<{ facturaId: string; numeroCompleto: string }>> {
  try {
    const { user, tenant } = await requirePermission('facturas.crear');

    const parsed = crearFacturaSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
    }

    const data = parsed.data;

    // Validar que la serie existe y está activa para el tenant
    const [serie] = await db
      .select()
      .from(seriesDocumentos)
      .where(
        and(
          eq(seriesDocumentos.tenantId, tenant.id),
          eq(seriesDocumentos.tipoDocumento, data.tipoDocumento),
          eq(seriesDocumentos.serie, data.serie),
          eq(seriesDocumentos.activa, true)
        )
      );
    if (!serie) {
      return {
        success: false,
        error: `Serie ${data.serie} no activa para ${data.tipoDocumento === '01' ? 'facturas' : 'boletas'}`,
      };
    }

    // Snapshot del cliente (SUNAT requiere datos al momento de emisión)
    const [cliente] = await db
      .select({
        id: clientes.id,
        razonSocial: clientes.razonSocial,
        nombres: clientes.nombres,
        apellidoPaterno: clientes.apellidoPaterno,
        apellidoMaterno: clientes.apellidoMaterno,
        tipoDocumento: clientes.tipoDocumento,
        numeroDocumento: clientes.numeroDocumento,
        direccion: clientes.direccionSunat,
      })
      .from(clientes)
      .where(and(eq(clientes.id, data.clienteId), eq(clientes.tenantId, tenant.id)));

    if (!cliente) return { success: false, error: 'Cliente no encontrado' };

    const nombreCompleto =
      cliente.razonSocial ??
      [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(' ');

    // Calcular totales
    const totales = calcularTotalesFactura(data.items);
    const moneda = data.moneda as 'PEN' | 'USD';

    // Reservar correlativo atómico
    const numero = await reservarCorrelativo(tenant.id, data.tipoDocumento, data.serie);
    const numeroCompleto = `${data.serie}-${String(numero).padStart(8, '0')}`;
    const totalEnLetras = numeroALetras(totales.total, moneda);

    // Insertar factura + líneas en una transacción
    let facturaId: string;

    await db.transaction(async (tx) => {
      const [nuevaFactura] = await tx
        .insert(facturas)
        .values({
          tenantId: tenant.id,
          tipoDocumento: data.tipoDocumento,
          serie: data.serie,
          numero,
          numeroCompleto,
          fechaEmision: data.fechaEmision,
          fechaVencimiento: data.fechaVencimiento,
          clienteId: data.clienteId,
          clienteTipoDocSnapshot: cliente.tipoDocumento ?? '6',
          clienteNumeroDocSnapshot: cliente.numeroDocumento ?? '',
          clienteRazonSocialSnapshot: nombreCompleto,
          clienteDireccionSnapshot: cliente.direccion,
          moneda,
          tipoCambio: data.tipoCambio ? String(data.tipoCambio) : null,
          formaPago: data.formaPago,
          totalGravadas: String(totales.totalGravadas),
          totalExoneradas: String(totales.totalExoneradas),
          totalInafectas: String(totales.totalInafectas),
          totalGratuitas: '0',
          descuentoGlobal: '0',
          igv: String(totales.igv),
          total: String(totales.total),
          totalEnLetras,
          observaciones: data.observaciones,
          cotizacionOrigenId: data.cotizacionOrigenId,
          estado: 'lista_para_emitir',
          estadoSunat: 'pendiente',
          emitidaPor: user.id,
        })
        .returning({ id: facturas.id });

      facturaId = nuevaFactura.id;

      await tx.insert(lineasFactura).values(
        data.items.map((item, i) => {
          const calc = calcularLinea(item);
          return {
            facturaId: nuevaFactura.id,
            tenantId: tenant.id,
            productoId: item.productoId,
            skuSnapshot: item.codigo,
            descripcion: item.descripcion,
            cantidad: String(item.cantidad),
            unidadMedida: item.unidadMedida,
            valorUnitario: String(calc.valorUnitario),
            precioUnitario: String(calc.precioUnitario),
            tipoAfectacionIgv: item.tipoAfectacionIgv,
            porcentajeIgv: item.tipoAfectacionIgv === '10' ? '18.00' : '0.00',
            totalBaseIgv: String(calc.baseImponible),
            totalIgv: String(calc.igvLinea),
            total: String(calc.totalLinea),
            descuento: '0',
            orden: i,
          };
        })
      );
    });

    // Encolar en pgmq para envío a NUBEFACT
    await encolarEnvioSunat({
      tenantId: tenant.id,
      documentoTipo: 'factura',
      documentoId: facturaId!,
    });

    revalidatePath(`/${tenant.slug}/facturas`);
    return { success: true, data: { facturaId: facturaId!, numeroCompleto } };
  } catch (err) {
    console.error('[facturas] crearFactura error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error interno' };
  }
}

// ─── anularFactura ────────────────────────────────────────────────────────────

export async function anularFactura(facturaId: string, motivo: string): Promise<ActionResult> {
  try {
    const { tenant } = await requirePermission('facturas.anular');

    const [factura] = await db
      .select({ id: facturas.id, estadoSunat: facturas.estadoSunat })
      .from(facturas)
      .where(and(eq(facturas.id, facturaId), eq(facturas.tenantId, tenant.id)));

    if (!factura) return { success: false, error: 'Factura no encontrada' };
    if (factura.estadoSunat === 'anulada') return { success: false, error: 'Ya anulada' };

    await db
      .update(facturas)
      .set({
        estado: 'anulada',
        estadoSunat: 'anulada',
        observaciones: motivo,
        updatedAt: new Date(),
      })
      .where(eq(facturas.id, facturaId));

    revalidatePath(`/${tenant.slug}/facturas`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error interno' };
  }
}

// ─── convertirCotizacionAFactura ─────────────────────────────────────────────

export async function convertirCotizacionAFactura(
  cotizacionId: string,
  opcionesOverride?: Pick<CrearFacturaInput, 'tipoDocumento' | 'serie'>
): Promise<ActionResult<{ facturaId: string; numeroCompleto: string }>> {
  try {
    const { tenant } = await requirePermission('facturas.crear');

    const [cot] = await db
      .select()
      .from(cotizaciones)
      .where(and(eq(cotizaciones.id, cotizacionId), eq(cotizaciones.tenantId, tenant.id)));

    if (!cot) return { success: false, error: 'Cotización no encontrada' };
    if (cot.estado !== 'aceptada') {
      return { success: false, error: 'Solo se puede facturar cotizaciones aceptadas' };
    }

    const items = await db
      .select()
      .from(cotizacionItems)
      .where(eq(cotizacionItems.cotizacionId, cotizacionId));

    if (!items.length) return { success: false, error: 'Cotización sin ítems' };

    const tipoDocumento = opcionesOverride?.tipoDocumento ?? '01';
    const serie = opcionesOverride?.serie ?? (tipoDocumento === '01' ? 'F001' : 'B001');

    const input: CrearFacturaInput = {
      tipoDocumento,
      serie,
      clienteId: cot.clienteId,
      fechaEmision: new Date().toISOString().split('T')[0],
      moneda: cot.moneda as 'PEN' | 'USD',
      tipoCambio: cot.tipoCambio ? Number(cot.tipoCambio) : undefined,
      formaPago: 'contado',
      cotizacionOrigenId: cotizacionId,
      items: items.map((it) => ({
        productoId: it.productoId ?? undefined,
        descripcion: it.descripcion ?? '',
        codigo: it.codigo ?? '',
        unidadMedida: it.unidadMedida ?? 'NIU',
        cantidad: Number(it.cantidad),
        precioUnitario: Number(it.precioUnitario),
        tipoAfectacionIgv: '10' as const,
      })),
    };

    const result = await crearFactura(input);

    if (result.success) {
      // Marcar cotización como convertida
      await db
        .update(cotizaciones)
        .set({ estado: 'convertida', updatedAt: new Date() })
        .where(eq(cotizaciones.id, cotizacionId));
    }

    return result;
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error interno' };
  }
}
