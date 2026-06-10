import 'server-only';

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema';
import { NubefactNetworkError, SunatError, SunatValidationError } from './errors';
import type {
  FacturaPayload,
  GuiaRemisionPayload,
  NotaCreditoDebitoPayload,
  NubefactErrorResponse,
  NubefactResponse,
  NubefactSuccessResponse,
} from './types';
import { buildFactura } from './builders/factura';
import { buildNotaCreditoDebito } from './builders/nota-credito-debito';
import { buildGuia } from './builders/guia';

const NUBEFACT_BASE = 'https://api.nubefact.com/api/v1';
const DEFAULT_TIMEOUT_MS = 30_000;

export interface SunatClient {
  emitirFactura(payload: FacturaPayload): Promise<NubefactSuccessResponse>;
  emitirGuia(payload: GuiaRemisionPayload): Promise<NubefactSuccessResponse>;
  emitirNotaCreditoDebito(payload: NotaCreditoDebitoPayload): Promise<NubefactSuccessResponse>;
  consultarComprobante(args: {
    tipoDocumento: string;
    serie: string;
    numero: number;
  }): Promise<NubefactResponse>;
  consultarGuia(args: {
    tipoDocumento: string;
    serie: string;
    numero: number;
  }): Promise<NubefactSuccessResponse>;
  anularComprobante(args: {
    tipoDocumento: string;
    serie: string;
    numero: number;
    motivo: string;
  }): Promise<NubefactSuccessResponse>;
}

const TIPO_SUNAT_A_NUBEFACT: Record<string, number> = {
  '01': 1,
  '03': 3,
  '07': 7,
  '08': 8,
  '09': 9,
  '31': 31,
};

// Nubefact GRE codes: 7=Remitente (SUNAT 09), 8=Transportista (SUNAT 31)
const TIPO_MAP: Record<string, number> = { '09': 7, '31': 8 };

function formatFechaDDMMYYYY(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}-${m}-${date.getFullYear()}`;
}

class NubefactHttpClient implements SunatClient {
  constructor(
    private readonly ruta: string,
    private readonly token: string,
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS
  ) {}

  private async post(body: Record<string, unknown>): Promise<NubefactSuccessResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await fetch(`${NUBEFACT_BASE}/${this.ruta}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        cache: 'no-store',
      });
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      throw new NubefactNetworkError(
        isAbort ? 'NUBEFACT: timeout de conexión' : 'NUBEFACT: error de red',
        err
      );
    } finally {
      clearTimeout(timer);
    }

    let json: NubefactResponse | null = null;
    try {
      json = (await res.json()) as NubefactResponse;
    } catch {
      // respuesta vacía o no-JSON
    }

    if (!res.ok) {
      // 5xx → transitorio (reintentable)
      if (res.status >= 500) {
        throw new NubefactNetworkError(`NUBEFACT HTTP ${res.status}`);
      }
      // 4xx → error de validación/payload
      const errBody = json as NubefactErrorResponse | null;
      throw new SunatValidationError(
        errBody?.errors ?? `NUBEFACT HTTP ${res.status}`,
        'nubefact_payload'
      );
    }

    if (!json) {
      throw new NubefactNetworkError('NUBEFACT: respuesta vacía con HTTP 2xx');
    }

    if ('errors' in json) {
      const err = json as NubefactErrorResponse;
      // código SUNAT 2105 = ya fue presentado → idempotency hit, no es error real
      if (err.codigo === 2105) {
        // Retornamos estructura mínima; el caller puede consultar para obtener CDR
        return {
          aceptada_por_sunat: true,
          sunat_description: 'Ya presentado (idempotency)',
          sunat_note: null,
          sunat_responsecode: '2105',
          enlace_del_pdf: '',
          enlace_del_xml: '',
          enlace_del_cdr: '',
          cadena_para_codigo_qr: '',
          codigo_hash: '',
          serie: body['serie'] as string,
          numero: body['numero'] as number,
          tipo_de_comprobante: body['tipo_de_comprobante'] as number,
        };
      }
      throw new SunatError(err.codigo ?? -1, err.errors, body, { transitorio: false });
    }

    return json as NubefactSuccessResponse;
  }

  emitirFactura(payload: FacturaPayload): Promise<NubefactSuccessResponse> {
    return this.post(buildFactura(payload));
  }

  emitirGuia(payload: GuiaRemisionPayload): Promise<NubefactSuccessResponse> {
    return this.post(buildGuia(payload));
  }

  emitirNotaCreditoDebito(payload: NotaCreditoDebitoPayload): Promise<NubefactSuccessResponse> {
    return this.post(buildNotaCreditoDebito(payload));
  }

  consultarComprobante(args: {
    tipoDocumento: string;
    serie: string;
    numero: number;
  }): Promise<NubefactResponse> {
    return this.post({
      operacion: 'consultar_comprobante',
      tipo_de_comprobante: TIPO_SUNAT_A_NUBEFACT[args.tipoDocumento] ?? 1,
      serie: args.serie,
      numero: args.numero,
    });
  }

  consultarGuia(args: {
    tipoDocumento: string;
    serie: string;
    numero: number;
  }): Promise<NubefactSuccessResponse> {
    return this.post({
      operacion: 'consultar_guia',
      tipo_de_comprobante: TIPO_MAP[args.tipoDocumento] ?? 7,
      serie: args.serie,
      numero: String(args.numero),
    });
  }

  anularComprobante(args: {
    tipoDocumento: string;
    serie: string;
    numero: number;
    motivo: string;
  }): Promise<NubefactSuccessResponse> {
    return this.post({
      operacion: 'generar_anulacion',
      tipo_de_comprobante: TIPO_SUNAT_A_NUBEFACT[args.tipoDocumento] ?? 1,
      serie: args.serie,
      numero: args.numero,
      fecha_de_generacion: formatFechaDDMMYYYY(new Date()),
      motivo: args.motivo,
    });
  }
}

class SunatClientStub implements SunatClient {
  private fail(): never {
    throw new SunatValidationError(
      'credenciales_no_configuradas: agregar NUBEFACT_RUTA_<TENANT> y NUBEFACT_TOKEN_<TENANT> al env',
      'config'
    );
  }
  emitirFactura(): Promise<NubefactSuccessResponse> {
    return this.fail();
  }
  emitirGuia(): Promise<NubefactSuccessResponse> {
    return this.fail();
  }
  emitirNotaCreditoDebito(): Promise<NubefactSuccessResponse> {
    return this.fail();
  }
  consultarComprobante(): Promise<NubefactResponse> {
    return this.fail();
  }
  consultarGuia(): Promise<NubefactSuccessResponse> {
    return this.fail();
  }
  anularComprobante(): Promise<NubefactSuccessResponse> {
    return this.fail();
  }
}

/**
 * Crea un cliente NUBEFACT a partir de ruta + token explícitos.
 * Útil para "Probar conexión" en la UI antes de guardar las credenciales.
 */
export function crearSunatClient(ruta: string, token: string): SunatClient {
  return new NubefactHttpClient(ruta, token);
}

interface ConfigSunat {
  ruta?: string;
  token?: string;
}

/**
 * Obtiene el cliente NUBEFACT para un tenant.
 *
 * Prioridad de credenciales:
 *   1. `tenants.config_sunat` en la DB (configurado por el tenant vía UI).
 *   2. Fallback: NUBEFACT_RUTA_<SLUG> / NUBEFACT_TOKEN_<SLUG> del entorno
 *      (retrocompatibilidad; el slug se normaliza a mayúsculas con guiones → _).
 *
 * Si no hay ninguna, devuelve un stub que falla limpio.
 */
export async function getSunatClient(tenantSlug: string): Promise<SunatClient> {
  // 1. Credenciales en la DB (configuradas por el tenant)
  const [tenant] = await db
    .select({ configSunat: tenants.configSunat })
    .from(tenants)
    .where(eq(tenants.slug, tenantSlug));

  const cfg = (tenant?.configSunat ?? null) as ConfigSunat | null;
  if (cfg?.ruta && cfg?.token) {
    return new NubefactHttpClient(cfg.ruta, cfg.token);
  }

  // 2. Fallback a variables de entorno
  const key = tenantSlug.toUpperCase().replace(/-/g, '_');
  const ruta = process.env[`NUBEFACT_RUTA_${key}`];
  const token = process.env[`NUBEFACT_TOKEN_${key}`];
  if (ruta && token) {
    return new NubefactHttpClient(ruta, token);
  }

  return new SunatClientStub();
}

export { NubefactNetworkError, SunatError, SunatValidationError };
