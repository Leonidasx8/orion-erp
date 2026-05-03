import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { facturas, guiasRemision, notasCreditoDebito } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

/**
 * Webhook NUBEFACT — recibe la confirmación CDR cuando SUNAT procesa el documento.
 *
 * Auth: header `Authorization: Bearer <NUBEFACT_WEBHOOK_SECRET>`.
 *
 * Body esperado (shape NUBEFACT — validar contra docs reales cuando llegue sandbox):
 * {
 *   "tipo_de_comprobante": 1 | 3 | 7 | 8 | 9 | 31,
 *   "serie": "F001",
 *   "numero": 123,
 *   "aceptada_por_sunat": true,
 *   "sunat_responsecode": "0",
 *   "sunat_description": "...",
 *   "enlace_del_pdf": "...",
 *   "enlace_del_xml": "...",
 *   "enlace_del_cdr": "..."
 * }
 *
 * Idempotente: si ya estaba marcado aceptada/rechazada por la misma respuesta,
 * solo retorna 200 sin re-aplicar.
 */

interface NubefactWebhookPayload {
  tipo_de_comprobante: number;
  serie: string;
  numero: number;
  aceptada_por_sunat: boolean;
  sunat_responsecode?: string;
  sunat_description?: string;
  sunat_note?: string | null;
  enlace_del_pdf?: string;
  enlace_del_xml?: string;
  enlace_del_cdr?: string;
}

function tipoNubefactATipoSunat(tipoNubefact: number): string | null {
  switch (tipoNubefact) {
    case 1:
      return '01'; // factura
    case 3:
      return '03'; // boleta
    case 7:
      return '07'; // NC
    case 8:
      return '08'; // ND
    case 9:
      return '09'; // guía remitente
    case 31:
      return '31'; // guía transportista
    default:
      return null;
  }
}

export async function POST(req: Request) {
  // Auth — NUBEFACT envía un header configurado por nosotros al registrar el webhook
  const authHeader = req.headers.get('authorization');
  const expected = `Bearer ${process.env.NUBEFACT_WEBHOOK_SECRET}`;
  if (!process.env.NUBEFACT_WEBHOOK_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: NubefactWebhookPayload;
  try {
    payload = (await req.json()) as NubefactWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const tipoSunat = tipoNubefactATipoSunat(payload.tipo_de_comprobante);
  if (!tipoSunat) {
    console.warn(
      '[webhook/nubefact] tipo_de_comprobante desconocido:',
      payload.tipo_de_comprobante
    );
    return NextResponse.json({ ok: true, ignored: true });
  }

  const nuevoEstadoSunat = payload.aceptada_por_sunat ? 'aceptada' : 'rechazada';
  const sunatCodigo =
    payload.sunat_responsecode != null ? Number(payload.sunat_responsecode) : null;
  const sunatMensaje = payload.sunat_description ?? payload.sunat_note ?? null;

  try {
    if (tipoSunat === '01' || tipoSunat === '03') {
      await db
        .update(facturas)
        .set({
          estadoSunat: nuevoEstadoSunat,
          sunatCodigo,
          sunatMensaje,
          cdrUrl: payload.enlace_del_cdr ?? null,
          xmlUrl: payload.enlace_del_xml ?? null,
          pdfUrl: payload.enlace_del_pdf ?? null,
          nubefactResponse: payload as unknown as Record<string, unknown>,
          fechaEmisionSunat: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(facturas.tipoDocumento, tipoSunat),
            eq(facturas.serie, payload.serie),
            eq(facturas.numero, payload.numero)
          )
        );
    } else if (tipoSunat === '07' || tipoSunat === '08') {
      await db
        .update(notasCreditoDebito)
        .set({
          estadoSunat: nuevoEstadoSunat,
          sunatCodigo,
          sunatMensaje,
          cdrUrl: payload.enlace_del_cdr ?? null,
          xmlUrl: payload.enlace_del_xml ?? null,
          pdfUrl: payload.enlace_del_pdf ?? null,
          nubefactResponse: payload as unknown as Record<string, unknown>,
          fechaEmisionSunat: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(notasCreditoDebito.tipoDocumento, tipoSunat),
            eq(notasCreditoDebito.serie, payload.serie),
            eq(notasCreditoDebito.numero, payload.numero)
          )
        );
    } else if (tipoSunat === '09' || tipoSunat === '31') {
      await db
        .update(guiasRemision)
        .set({
          estadoSunat: nuevoEstadoSunat,
          sunatCodigo,
          sunatMensaje,
          cdrUrl: payload.enlace_del_cdr ?? null,
          xmlUrl: payload.enlace_del_xml ?? null,
          pdfUrl: payload.enlace_del_pdf ?? null,
          nubefactResponse: payload as unknown as Record<string, unknown>,
          fechaEmisionSunat: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(guiasRemision.tipoDocumento, tipoSunat),
            eq(guiasRemision.serie, payload.serie),
            eq(guiasRemision.numero, payload.numero)
          )
        );
    }

    console.log(
      `[webhook/nubefact] ${tipoSunat} ${payload.serie}-${payload.numero} → ${nuevoEstadoSunat}`
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[webhook/nubefact] error procesando webhook:', err);
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 });
  }
}
