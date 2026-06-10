'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import {
  facturas,
  lineasFactura,
  notasCreditoDebito,
  lineasNcNd,
  seriesDocumentos,
} from '@/lib/db/schema';
import { reservarCorrelativo } from '@/lib/sunat/reservar-correlativo';
import { encolarEnvioSunat } from '@/lib/sunat/queue';

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

export interface CrearNcInput {
  facturaId: string;
  tipoMotivo: string;
  descripcionMotivo: string;
}

export interface CrearNdInput {
  facturaId: string;
  tipoMotivo: string;
  descripcionMotivo: string;
  monto: number;
}

// ─── Nota de Crédito (07) ────────────────────────────────────────────────────
// Copia todas las líneas de la factura original (reversal total).
export async function crearNotaCredito(
  input: CrearNcInput
): Promise<ActionResult<{ ncId: string; numeroCompleto: string }>> {
  try {
    const { user, tenant } = await requirePermission('facturas.crear');

    const [factura] = await db
      .select()
      .from(facturas)
      .where(and(eq(facturas.id, input.facturaId), eq(facturas.tenantId, tenant.id)));

    if (!factura) return { success: false, error: 'Factura no encontrada' };
    if (factura.estadoSunat !== 'aceptada') {
      return { success: false, error: 'Solo se puede anular facturas aceptadas por SUNAT' };
    }

    // Buscar serie configurada para NC (07)
    const [serieRow] = await db
      .select()
      .from(seriesDocumentos)
      .where(
        and(
          eq(seriesDocumentos.tenantId, tenant.id),
          eq(seriesDocumentos.tipoDocumento, '07'),
          eq(seriesDocumentos.activa, true)
        )
      )
      .limit(1);

    if (!serieRow) {
      return {
        success: false,
        error:
          'No hay una serie activa para Nota de Crédito (07). Configura una en Configuración → Facturación.',
      };
    }

    const lineas = await db
      .select()
      .from(lineasFactura)
      .where(eq(lineasFactura.facturaId, input.facturaId));

    if (!lineas.length) return { success: false, error: 'Factura sin líneas' };

    const correlativo = await reservarCorrelativo(tenant.id, '07', serieRow.serie);
    const numeroCompleto = `${serieRow.serie}-${String(correlativo).padStart(8, '0')}`;
    const fechaEmision = new Date().toISOString().split('T')[0];

    const [nueva] = await db
      .insert(notasCreditoDebito)
      .values({
        tenantId: tenant.id,
        tipoDocumento: '07',
        serie: serieRow.serie,
        numero: correlativo,
        // numeroCompleto es GENERATED ALWAYS AS en la DB — no insertar
        fechaEmision,
        documentoOrigenTipo: factura.tipoDocumento,
        documentoOrigenSerie: factura.serie,
        documentoOrigenNumero: factura.numero,
        documentoOrigenId: factura.id,
        tipoMotivo: input.tipoMotivo,
        descripcionMotivo: input.descripcionMotivo,
        clienteId: factura.clienteId,
        clienteTipoDocSnapshot: factura.clienteTipoDocSnapshot,
        clienteNumeroDocSnapshot: factura.clienteNumeroDocSnapshot,
        clienteRazonSocialSnapshot: factura.clienteRazonSocialSnapshot,
        moneda: factura.moneda,
        tipoCambio: factura.tipoCambio,
        totalGravadas: factura.totalGravadas,
        totalExoneradas: factura.totalExoneradas,
        totalInafectas: '0',
        igv: factura.igv,
        total: factura.total,
        estado: 'emitida',
        estadoSunat: 'pendiente',
        emitidaPor: user.id,
      })
      .returning({ id: notasCreditoDebito.id });

    // Copiar líneas de la factura original
    await db.insert(lineasNcNd).values(
      lineas.map((l, i) => ({
        ncNdId: nueva.id,
        tenantId: tenant.id,
        skuSnapshot: l.skuSnapshot,
        descripcion: l.descripcion,
        cantidad: l.cantidad,
        unidadMedida: l.unidadMedida,
        valorUnitario: l.valorUnitario,
        precioUnitario: l.precioUnitario,
        tipoAfectacionIgv: l.tipoAfectacionIgv,
        porcentajeIgv: l.porcentajeIgv,
        totalBaseIgv: l.totalBaseIgv,
        totalIgv: l.totalIgv,
        total: l.total,
        orden: i,
      }))
    );

    await encolarEnvioSunat({
      tenantId: tenant.id,
      documentoTipo: 'nota_credito_debito',
      documentoId: nueva.id,
    });

    revalidatePath(`/${tenant.slug}/facturas`);
    revalidatePath(`/${tenant.slug}/facturas/${input.facturaId}`);

    return { success: true, data: { ncId: nueva.id, numeroCompleto } };
  } catch (err) {
    console.error('[nc] crearNotaCredito error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error interno' };
  }
}

// ─── Nota de Débito (08) ─────────────────────────────────────────────────────
// Agrega un cargo adicional sobre la factura original.
export async function crearNotaDebito(
  input: CrearNdInput
): Promise<ActionResult<{ ndId: string; numeroCompleto: string }>> {
  try {
    const { user, tenant } = await requirePermission('facturas.crear');

    const [factura] = await db
      .select()
      .from(facturas)
      .where(and(eq(facturas.id, input.facturaId), eq(facturas.tenantId, tenant.id)));

    if (!factura) return { success: false, error: 'Factura no encontrada' };
    if (factura.estadoSunat !== 'aceptada') {
      return {
        success: false,
        error: 'Solo se puede emitir ND sobre facturas aceptadas por SUNAT',
      };
    }

    const [serieRow] = await db
      .select()
      .from(seriesDocumentos)
      .where(
        and(
          eq(seriesDocumentos.tenantId, tenant.id),
          eq(seriesDocumentos.tipoDocumento, '08'),
          eq(seriesDocumentos.activa, true)
        )
      )
      .limit(1);

    if (!serieRow) {
      return {
        success: false,
        error:
          'No hay una serie activa para Nota de Débito (08). Configura una en Configuración → Facturación.',
      };
    }

    const correlativo = await reservarCorrelativo(tenant.id, '08', serieRow.serie);
    const numeroCompleto = `${serieRow.serie}-${String(correlativo).padStart(8, '0')}`;
    const fechaEmision = new Date().toISOString().split('T')[0];

    const baseIgv = Number((input.monto / 1.18).toFixed(4));
    const igv = Number((input.monto - baseIgv).toFixed(4));

    const [nueva] = await db
      .insert(notasCreditoDebito)
      .values({
        tenantId: tenant.id,
        tipoDocumento: '08',
        serie: serieRow.serie,
        numero: correlativo,
        // numeroCompleto es GENERATED ALWAYS AS en la DB — no insertar
        fechaEmision,
        documentoOrigenTipo: factura.tipoDocumento,
        documentoOrigenSerie: factura.serie,
        documentoOrigenNumero: factura.numero,
        documentoOrigenId: factura.id,
        tipoMotivo: input.tipoMotivo,
        descripcionMotivo: input.descripcionMotivo,
        clienteId: factura.clienteId,
        clienteTipoDocSnapshot: factura.clienteTipoDocSnapshot,
        clienteNumeroDocSnapshot: factura.clienteNumeroDocSnapshot,
        clienteRazonSocialSnapshot: factura.clienteRazonSocialSnapshot,
        moneda: factura.moneda,
        tipoCambio: factura.tipoCambio,
        totalGravadas: String(baseIgv),
        totalExoneradas: '0',
        totalInafectas: '0',
        igv: String(igv),
        total: String(input.monto),
        estado: 'emitida',
        estadoSunat: 'pendiente',
        emitidaPor: user.id,
      })
      .returning({ id: notasCreditoDebito.id });

    await db.insert(lineasNcNd).values({
      ncNdId: nueva.id,
      tenantId: tenant.id,
      skuSnapshot: 'ND',
      descripcion: input.descripcionMotivo,
      cantidad: '1',
      unidadMedida: 'ZZ',
      valorUnitario: String(baseIgv),
      precioUnitario: String(input.monto),
      tipoAfectacionIgv: '10',
      totalBaseIgv: String(baseIgv),
      totalIgv: String(igv),
      total: String(input.monto),
      orden: 0,
    });

    await encolarEnvioSunat({
      tenantId: tenant.id,
      documentoTipo: 'nota_credito_debito',
      documentoId: nueva.id,
    });

    revalidatePath(`/${tenant.slug}/facturas`);
    revalidatePath(`/${tenant.slug}/facturas/${input.facturaId}`);

    return { success: true, data: { ndId: nueva.id, numeroCompleto } };
  } catch (err) {
    console.error('[nd] crearNotaDebito error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error interno' };
  }
}

// ─── Reenviar a SUNAT ────────────────────────────────────────────────────────
export async function reenviarFacturaSunat(
  facturaId: string
): Promise<ActionResult<{ encolado: boolean }>> {
  try {
    const { tenant } = await requirePermission('facturas.crear');

    const [factura] = await db
      .select({ id: facturas.id, estadoSunat: facturas.estadoSunat })
      .from(facturas)
      .where(and(eq(facturas.id, facturaId), eq(facturas.tenantId, tenant.id)));

    if (!factura) return { success: false, error: 'Factura no encontrada' };
    if (factura.estadoSunat === 'aceptada') {
      return { success: false, error: 'La factura ya está aceptada por SUNAT' };
    }

    // Reset estado para que el worker la procese
    await db
      .update(facturas)
      .set({ estadoSunat: 'pendiente', updatedAt: new Date() })
      .where(eq(facturas.id, facturaId));

    const { duplicado } = await encolarEnvioSunat({
      tenantId: tenant.id,
      documentoTipo: 'factura',
      documentoId: facturaId,
    });

    revalidatePath(`/${tenant.slug}/facturas/${facturaId}`);

    return { success: true, data: { encolado: !duplicado } };
  } catch (err) {
    console.error('[facturas] reenviarFacturaSunat error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error interno' };
  }
}
