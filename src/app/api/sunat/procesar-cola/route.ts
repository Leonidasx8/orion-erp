import { NextResponse } from 'next/server';
import { sql, eq, and } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  facturas,
  lineasFactura,
  guiasRemision,
  lineasGuia,
  notasCreditoDebito,
  lineasNcNd,
  tenants,
  sunatEnviosLog,
} from '@/lib/db/schema';
import { getSunatClient } from '@/lib/sunat/client';
import { reencolarConBackoff } from '@/lib/sunat/queue';
import { esTransitorio } from '@/lib/sunat/errors';
import { numeroALetras } from '@/lib/sunat/helpers/numero-a-letras';
import type {
  FacturaPayload,
  GuiaRemisionPayload,
  NotaCreditoDebitoPayload,
} from '@/lib/sunat/types';
import type {
  TipoDocIdentidad,
  AfectacionIgv,
  MotivoTraslado,
  MotivoNotaCredito,
  MotivoNotaDebito,
} from '@/lib/sunat/catalogos';
import type { SunatOutboxMessage } from '@/lib/sunat/queue';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // segundos

/**
 * Worker SUNAT — lee un mensaje de pgmq `sunat_outbox`, llama a NUBEFACT
 * y actualiza el estado del documento en la DB.
 *
 * Auth: Authorization: Bearer <SUNAT_WORKER_SECRET>
 * Llamar vía cron (Supabase pg_cron o Vercel Cron).
 */
export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  const expected = `Bearer ${process.env.SUNAT_WORKER_SECRET}`;
  if (!process.env.SUNAT_WORKER_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Leer un mensaje de la cola (visibilidad 90s)
  const rows = await db.execute<{ msg_id: number; message: SunatOutboxMessage }>(sql`
    SELECT msg_id, message FROM pgmq.read('sunat_outbox', 90, 1)
  `);

  const msgs = rows as unknown as { msg_id: number; message: SunatOutboxMessage }[];
  if (!msgs.length) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const { msg_id, message } = msgs[0];
  const { tenantId, documentoTipo, documentoId, intento } = message;

  const startMs = Date.now();
  let resultado: 'ok' | 'error_red' | 'error_sunat' | 'error_validacion' | 'idempotency_skip' =
    'ok';
  let sunatCodigo: number | null = null;
  let sunatMensaje: string | null = null;
  let requestPayload: Record<string, unknown> | null = null;
  let responsePayload: Record<string, unknown> | null = null;

  try {
    // Tenant slug para seleccionar credenciales
    const tenantRows = await db
      .select({ slug: tenants.slug })
      .from(tenants)
      .where(eq(tenants.id, tenantId));

    if (!tenantRows.length) throw new Error(`Tenant ${tenantId} no encontrado`);
    const tenantSlug = tenantRows[0].slug;
    const client = getSunatClient(tenantSlug);

    if (documentoTipo === 'factura') {
      const [factura] = await db.select().from(facturas).where(eq(facturas.id, documentoId));
      if (!factura) throw new Error(`Factura ${documentoId} no encontrada`);

      // Idempotency: si ya tiene respuesta de Nubefact, no reenviar
      if (factura.nubefactResponse && factura.estadoSunat === 'aceptada') {
        resultado = 'idempotency_skip';
        await ackMensaje(msg_id);
        return logYresponder(
          msg_id,
          tenantId,
          documentoTipo,
          documentoId,
          intento,
          resultado,
          null,
          null,
          null,
          null,
          startMs
        );
      }

      const lineas = await db
        .select()
        .from(lineasFactura)
        .where(and(eq(lineasFactura.facturaId, documentoId), eq(lineasFactura.tenantId, tenantId)));

      const moneda = factura.moneda as 'PEN' | 'USD';
      const totalNum = parseFloat(factura.total as string);

      const payload: FacturaPayload = {
        tipoDocumento: factura.tipoDocumento as '01' | '03',
        serie: factura.serie,
        numero: factura.numero,
        fechaEmision: factura.fechaEmision,
        fechaVencimiento: factura.fechaVencimiento ?? undefined,
        cliente: {
          tipoDocumento: factura.clienteTipoDocSnapshot as TipoDocIdentidad,
          numeroDocumento: factura.clienteNumeroDocSnapshot,
          razonSocial: factura.clienteRazonSocialSnapshot,
          direccion: factura.clienteDireccionSnapshot ?? undefined,
        },
        moneda,
        tipoCambio: factura.tipoCambio ? parseFloat(factura.tipoCambio as string) : undefined,
        formaPago: factura.formaPago as 'contado' | 'credito',
        cuotasCredito:
          (factura.cuotasCredito as { numero: number; fecha: string; monto: number }[] | null) ??
          undefined,
        totalGravadas: parseFloat(factura.totalGravadas as string),
        totalExoneradas: parseFloat(factura.totalExoneradas as string),
        totalInafectas: parseFloat(factura.totalInafectas as string),
        totalGratuitas: parseFloat(factura.totalGratuitas as string),
        descuentoGlobal: parseFloat(factura.descuentoGlobal as string),
        igv: parseFloat(factura.igv as string),
        total: totalNum,
        totalEnLetras: factura.totalEnLetras ?? numeroALetras(totalNum, moneda),
        observaciones: factura.observaciones ?? undefined,
        lineas: lineas
          .sort((a, b) => a.orden - b.orden)
          .map((l, i) => ({
            orden: i + 1,
            codigo: l.skuSnapshot,
            descripcion: l.descripcion,
            unidadMedida: l.unidadMedida,
            cantidad: parseFloat(l.cantidad as string),
            valorUnitario: parseFloat(l.valorUnitario as string),
            precioUnitario: parseFloat(l.precioUnitario as string),
            tipoAfectacionIgv: l.tipoAfectacionIgv as AfectacionIgv,
            porcentajeIgv: parseFloat(l.porcentajeIgv as string),
            baseImponible: parseFloat(l.totalBaseIgv as string),
            igvLinea: parseFloat(l.totalIgv as string),
            totalLinea: parseFloat(l.total as string),
            descuento: l.descuento ? parseFloat(l.descuento as string) : 0,
          })),
      };

      requestPayload = payload as unknown as Record<string, unknown>;
      const resp = await client.emitirFactura(payload);
      responsePayload = resp as unknown as Record<string, unknown>;
      sunatCodigo = resp.sunat_responsecode ? parseInt(resp.sunat_responsecode, 10) : 0;
      sunatMensaje = resp.sunat_description ?? null;

      await db
        .update(facturas)
        .set({
          estadoSunat: resp.aceptada_por_sunat ? 'aceptada' : 'rechazada',
          sunatCodigo,
          sunatMensaje,
          cdrUrl: resp.enlace_del_cdr || null,
          xmlUrl: resp.enlace_del_xml || null,
          pdfUrl: resp.enlace_del_pdf || null,
          nubefactResponse: resp as unknown as Record<string, unknown>,
          fechaEmisionSunat: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(facturas.id, documentoId));

      resultado = resp.aceptada_por_sunat ? 'ok' : 'error_sunat';
    } else if (documentoTipo === 'nota_credito_debito') {
      const [nota] = await db
        .select()
        .from(notasCreditoDebito)
        .where(eq(notasCreditoDebito.id, documentoId));
      if (!nota) throw new Error(`Nota ${documentoId} no encontrada`);

      if (nota.nubefactResponse && nota.estadoSunat === 'aceptada') {
        resultado = 'idempotency_skip';
        await ackMensaje(msg_id);
        return logYresponder(
          msg_id,
          tenantId,
          documentoTipo,
          documentoId,
          intento,
          resultado,
          null,
          null,
          null,
          null,
          startMs
        );
      }

      const lineas = await db.select().from(lineasNcNd).where(eq(lineasNcNd.ncNdId, documentoId));

      const payload: NotaCreditoDebitoPayload = {
        tipoDocumento: nota.tipoDocumento as '07' | '08',
        serie: nota.serie,
        numero: nota.numero,
        fechaEmision: nota.fechaEmision,
        documentoOrigen: {
          tipo: nota.documentoOrigenTipo as '01' | '03',
          serie: nota.documentoOrigenSerie,
          numero: nota.documentoOrigenNumero,
        },
        tipoMotivo: nota.tipoMotivo as MotivoNotaCredito | MotivoNotaDebito,
        descripcionMotivo: nota.descripcionMotivo,
        cliente: {
          tipoDocumento: nota.clienteTipoDocSnapshot as TipoDocIdentidad,
          numeroDocumento: nota.clienteNumeroDocSnapshot,
          razonSocial: nota.clienteRazonSocialSnapshot,
        },
        moneda: nota.moneda as 'PEN' | 'USD',
        tipoCambio: nota.tipoCambio ? parseFloat(nota.tipoCambio as string) : undefined,
        totalGravadas: parseFloat(nota.totalGravadas as string),
        totalExoneradas: parseFloat(nota.totalExoneradas as string),
        totalInafectas: parseFloat(nota.totalInafectas as string),
        igv: parseFloat(nota.igv as string),
        total: parseFloat(nota.total as string),
        lineas: lineas
          .sort((a, b) => a.orden - b.orden)
          .map((l, i) => ({
            orden: i + 1,
            codigo: l.skuSnapshot,
            descripcion: l.descripcion,
            unidadMedida: l.unidadMedida,
            cantidad: parseFloat(l.cantidad as string),
            valorUnitario: parseFloat(l.valorUnitario as string),
            precioUnitario: parseFloat(l.precioUnitario as string),
            tipoAfectacionIgv: l.tipoAfectacionIgv as AfectacionIgv,
            porcentajeIgv: parseFloat(l.porcentajeIgv as string),
            baseImponible: parseFloat(l.totalBaseIgv as string),
            igvLinea: parseFloat(l.totalIgv as string),
            totalLinea: parseFloat(l.total as string),
          })),
      };

      requestPayload = payload as unknown as Record<string, unknown>;
      const resp = await client.emitirNotaCreditoDebito(payload);
      responsePayload = resp as unknown as Record<string, unknown>;
      sunatCodigo = resp.sunat_responsecode ? parseInt(resp.sunat_responsecode, 10) : 0;
      sunatMensaje = resp.sunat_description ?? null;

      await db
        .update(notasCreditoDebito)
        .set({
          estadoSunat: resp.aceptada_por_sunat ? 'aceptada' : 'rechazada',
          sunatCodigo,
          sunatMensaje,
          cdrUrl: resp.enlace_del_cdr || null,
          xmlUrl: resp.enlace_del_xml || null,
          pdfUrl: resp.enlace_del_pdf || null,
          nubefactResponse: resp as unknown as Record<string, unknown>,
          fechaEmisionSunat: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(notasCreditoDebito.id, documentoId));

      resultado = resp.aceptada_por_sunat ? 'ok' : 'error_sunat';
    } else if (documentoTipo === 'guia_remision') {
      const [guia] = await db.select().from(guiasRemision).where(eq(guiasRemision.id, documentoId));
      if (!guia) throw new Error(`Guía ${documentoId} no encontrada`);

      if (guia.nubefactResponse && guia.estadoSunat === 'aceptada') {
        resultado = 'idempotency_skip';
        await ackMensaje(msg_id);
        return logYresponder(
          msg_id,
          tenantId,
          documentoTipo,
          documentoId,
          intento,
          resultado,
          null,
          null,
          null,
          null,
          startMs
        );
      }

      const lineas = await db.select().from(lineasGuia).where(eq(lineasGuia.guiaId, documentoId));

      const payload: GuiaRemisionPayload = {
        tipoDocumento: guia.tipoDocumento as '09' | '31',
        serie: guia.serie,
        numero: guia.numero,
        fechaEmision: guia.fechaEmision,
        fechaInicioTraslado: guia.fechaInicioTraslado,
        destinatario: {
          tipoDocumento: '6' as TipoDocIdentidad,
          numeroDocumento: '',
          razonSocial: '',
        },
        motivoTraslado: guia.motivoTraslado as MotivoTraslado,
        descripcionMotivo: guia.descripcionMotivo ?? undefined,
        modalidadTraslado: guia.modalidadTraslado as '01' | '02',
        pesoBrutoTotal: guia.pesoBrutoTotal ? parseFloat(guia.pesoBrutoTotal as string) : 0,
        unidadPeso: guia.unidadPeso ?? 'KGM',
        numeroBultos: guia.numeroBultos ?? 1,
        direccionPartida: guia.direccionPartida,
        ubigeoPartida: guia.ubigeoPartida,
        direccionLlegada: guia.direccionLlegada,
        ubigeoLlegada: guia.ubigeoLlegada,
        observaciones: guia.observaciones ?? undefined,
        lineas: lineas
          .sort((a, b) => a.orden - b.orden)
          .map((l, i) => ({
            orden: i + 1,
            codigo: l.skuSnapshot,
            descripcion: l.descripcion,
            unidadMedida: l.unidadMedida,
            cantidad: parseFloat(l.cantidad as string),
          })),
      };

      requestPayload = payload as unknown as Record<string, unknown>;
      const resp = await client.emitirGuia(payload);
      responsePayload = resp as unknown as Record<string, unknown>;
      sunatCodigo = resp.sunat_responsecode ? parseInt(resp.sunat_responsecode, 10) : 0;
      sunatMensaje = resp.sunat_description ?? null;

      await db
        .update(guiasRemision)
        .set({
          estadoSunat: resp.aceptada_por_sunat ? 'aceptada' : 'rechazada',
          sunatCodigo,
          sunatMensaje,
          cdrUrl: resp.enlace_del_cdr || null,
          xmlUrl: resp.enlace_del_xml || null,
          pdfUrl: resp.enlace_del_pdf || null,
          nubefactResponse: resp as unknown as Record<string, unknown>,
          fechaEmisionSunat: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(guiasRemision.id, documentoId));

      resultado = resp.aceptada_por_sunat ? 'ok' : 'error_sunat';
    }

    // ACK — eliminar mensaje de la cola
    await ackMensaje(msg_id);
  } catch (err) {
    console.error('[sunat/procesar-cola] error:', err);

    if (esTransitorio(err)) {
      resultado = 'error_red';
      // Re-encolar con backoff si no agotó intentos
      const { agotado } = await reencolarConBackoff({
        tenantId,
        documentoTipo: documentoTipo as 'factura' | 'nota_credito_debito' | 'guia_remision',
        documentoId,
        intento: intento + 1,
      });
      if (agotado) {
        // Marcar el documento como error definitivo
        await marcarErrorDefinitivo(
          documentoTipo,
          documentoId,
          'error_red: máximo de reintentos alcanzado'
        );
      }
    } else {
      resultado = 'error_sunat';
      sunatMensaje = err instanceof Error ? err.message : String(err);
      await marcarErrorDefinitivo(documentoTipo, documentoId, sunatMensaje);
    }

    // ACK igual — el mensaje ya fue re-encolado si aplica
    await ackMensaje(msg_id);
  }

  return logYresponder(
    msg_id,
    tenantId,
    documentoTipo,
    documentoId,
    intento,
    resultado,
    sunatCodigo,
    sunatMensaje,
    requestPayload,
    responsePayload,
    startMs
  );
}

async function ackMensaje(msgId: number) {
  await db.execute(sql`SELECT pgmq.delete('sunat_outbox', ${msgId})`);
}

async function marcarErrorDefinitivo(documentoTipo: string, documentoId: string, mensaje: string) {
  const set = { estadoSunat: 'error_red', sunatMensaje: mensaje, updatedAt: new Date() };
  if (documentoTipo === 'factura') {
    await db.update(facturas).set(set).where(eq(facturas.id, documentoId));
  } else if (documentoTipo === 'nota_credito_debito') {
    await db.update(notasCreditoDebito).set(set).where(eq(notasCreditoDebito.id, documentoId));
  } else if (documentoTipo === 'guia_remision') {
    await db.update(guiasRemision).set(set).where(eq(guiasRemision.id, documentoId));
  }
}

function logYresponder(
  _msgId: number,
  tenantId: string,
  documentoTipo: string,
  documentoId: string,
  intento: number,
  resultado: string,
  sunatCodigo: number | null,
  sunatMensaje: string | null,
  requestPayload: Record<string, unknown> | null,
  responsePayload: Record<string, unknown> | null,
  startMs: number
) {
  const duracionMs = Date.now() - startMs;

  // Log asíncrono — no bloquea la respuesta
  db.insert(sunatEnviosLog)
    .values({
      tenantId,
      documentoTipo,
      documentoId,
      intento,
      resultado,
      sunatCodigo,
      sunatMensaje,
      requestPayload: requestPayload as Record<string, unknown>,
      responsePayload: responsePayload as Record<string, unknown>,
      duracionMs,
    })
    .catch((e) => console.error('[sunat/procesar-cola] log error:', e));

  return NextResponse.json({ ok: true, resultado, duracionMs });
}
