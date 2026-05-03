import 'server-only';

import { NubefactNetworkError, SunatError, SunatValidationError } from './errors';
import type {
  FacturaPayload,
  GuiaRemisionPayload,
  NotaCreditoDebitoPayload,
  NubefactResponse,
  NubefactSuccessResponse,
} from './types';

/**
 * Wrapper NUBEFACT — interface y stub.
 *
 * Hasta que lleguen las credenciales sandbox, todas las operaciones de envío
 * lanzan SunatValidationError('credenciales_no_configuradas'). Esto fuerza
 * a que cualquier código que dependa del cliente falle limpio en lugar de
 * intentar conexiones a una URL inexistente.
 *
 * Cuando lleguen credenciales:
 *  1. Implementar `emitirFactura`, `emitirGuia`, `emitirNc`, `consultarComprobante`
 *     usando fetch contra https://api.nubefact.com/api/v1/<token>.
 *  2. Mapear errores HTTP/SUNAT a `SunatError` / `NubefactNetworkError`.
 *  3. Mantener este interface estable — los call-sites no deberían cambiar.
 */

export interface SunatClient {
  emitirFactura(payload: FacturaPayload): Promise<NubefactSuccessResponse>;
  emitirGuia(payload: GuiaRemisionPayload): Promise<NubefactSuccessResponse>;
  emitirNotaCreditoDebito(payload: NotaCreditoDebitoPayload): Promise<NubefactSuccessResponse>;
  consultarComprobante(args: {
    tipoDocumento: string;
    serie: string;
    numero: number;
  }): Promise<NubefactResponse>;
  anularComprobante(args: {
    tipoDocumento: string;
    serie: string;
    numero: number;
    motivo: string;
  }): Promise<NubefactSuccessResponse>;
}

export interface SunatClientConfig {
  baseUrl: string; // ej. 'https://api.nubefact.com/api/v1'
  token: string;
  timeoutMs?: number;
}

class SunatClientStub implements SunatClient {
  constructor(private readonly config: SunatClientConfig | null) {}

  private notImplemented(payloadIgnorado: unknown): never {
    void payloadIgnorado;
    if (!this.config) {
      throw new SunatValidationError(
        'credenciales_no_configuradas: agregar NUBEFACT_BASE_URL y NUBEFACT_TOKEN al env',
        'config'
      );
    }
    throw new SunatValidationError(
      'wrapper_no_implementado: pendiente builders XML/JSON SUNAT (post credenciales)'
    );
  }

  emitirFactura(payload: FacturaPayload): Promise<NubefactSuccessResponse> {
    return this.notImplemented(payload);
  }
  emitirGuia(payload: GuiaRemisionPayload): Promise<NubefactSuccessResponse> {
    return this.notImplemented(payload);
  }
  emitirNotaCreditoDebito(payload: NotaCreditoDebitoPayload): Promise<NubefactSuccessResponse> {
    return this.notImplemented(payload);
  }
  consultarComprobante(args: {
    tipoDocumento: string;
    serie: string;
    numero: number;
  }): Promise<NubefactResponse> {
    return this.notImplemented(args);
  }
  anularComprobante(args: {
    tipoDocumento: string;
    serie: string;
    numero: number;
    motivo: string;
  }): Promise<NubefactSuccessResponse> {
    return this.notImplemented(args);
  }
}

/**
 * Factory del cliente. Lee credenciales del env. Si no hay credenciales,
 * el cliente lanza SunatValidationError en cualquier llamada.
 *
 * Las pruebas pueden inyectar un mock implementando `SunatClient`.
 */
export function getSunatClient(): SunatClient {
  const baseUrl = process.env.NUBEFACT_BASE_URL;
  const token = process.env.NUBEFACT_TOKEN;

  if (!baseUrl || !token) {
    return new SunatClientStub(null);
  }

  return new SunatClientStub({ baseUrl, token });
}

// Re-export para conveniencia
export { NubefactNetworkError, SunatError, SunatValidationError };
