/**
 * Errores tipados del módulo SUNAT/NUBEFACT.
 * Permiten al consumidor de la cola distinguir errores transitorios (reintentables)
 * de definitivos (descarte + alerta).
 */

export class SunatError extends Error {
  readonly name = 'SunatError';
  readonly transitorio: boolean;

  constructor(
    public readonly sunatCodigo: number,
    message: string,
    public readonly payload?: unknown,
    opts?: { transitorio?: boolean }
  ) {
    super(message);
    // Por convención: códigos 0–999 son aceptación/rechazo; 1000–1999 advertencias;
    // 2000+ rechazos definitivos. Los errores de red (sin código SUNAT) son transitorios.
    this.transitorio = opts?.transitorio ?? false;
  }
}

export class NubefactNetworkError extends Error {
  readonly name = 'NubefactNetworkError';
  readonly transitorio = true;

  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
  }
}

export class IdempotencySkipError extends Error {
  readonly name = 'IdempotencySkipError';
  readonly transitorio = false;

  constructor(public readonly existingResponse: unknown) {
    super('Documento ya fue procesado por NUBEFACT (idempotency hit)');
  }
}

export class SunatValidationError extends Error {
  readonly name = 'SunatValidationError';
  readonly transitorio = false;

  constructor(
    message: string,
    public readonly campo?: string
  ) {
    super(message);
  }
}

export function esTransitorio(err: unknown): boolean {
  return (err instanceof SunatError && err.transitorio) || err instanceof NubefactNetworkError;
}
