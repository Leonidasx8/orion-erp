import { describe, it, expect } from 'vitest';
import {
  SunatError,
  NubefactNetworkError,
  IdempotencySkipError,
  SunatValidationError,
  esTransitorio,
} from './errors';

describe('SunatError', () => {
  it('por default no es transitorio', () => {
    const err = new SunatError(2001, 'rechazo SUNAT');
    expect(err.transitorio).toBe(false);
    expect(err.sunatCodigo).toBe(2001);
  });

  it('puede marcarse como transitorio explícitamente', () => {
    const err = new SunatError(99, 'timeout temporal', undefined, { transitorio: true });
    expect(err.transitorio).toBe(true);
  });
});

describe('NubefactNetworkError', () => {
  it('siempre es transitorio', () => {
    const err = new NubefactNetworkError('ECONNREFUSED');
    expect(err.transitorio).toBe(true);
  });
});

describe('IdempotencySkipError', () => {
  it('no es transitorio (no se reintenta)', () => {
    const err = new IdempotencySkipError({ existing: 'response' });
    expect(err.transitorio).toBe(false);
    expect(err.existingResponse).toEqual({ existing: 'response' });
  });
});

describe('SunatValidationError', () => {
  it('no es transitorio (es definitivo)', () => {
    const err = new SunatValidationError('falta el RUC del cliente', 'cliente.ruc');
    expect(err.transitorio).toBe(false);
    expect(err.campo).toBe('cliente.ruc');
  });
});

describe('esTransitorio', () => {
  it('true para SunatError marcado transitorio', () => {
    expect(esTransitorio(new SunatError(99, 'temp', undefined, { transitorio: true }))).toBe(true);
  });

  it('true para NubefactNetworkError', () => {
    expect(esTransitorio(new NubefactNetworkError('ECONNRESET'))).toBe(true);
  });

  it('false para SunatError no transitorio', () => {
    expect(esTransitorio(new SunatError(2001, 'rechazo'))).toBe(false);
  });

  it('false para SunatValidationError', () => {
    expect(esTransitorio(new SunatValidationError('campo inválido'))).toBe(false);
  });

  it('false para IdempotencySkipError', () => {
    expect(esTransitorio(new IdempotencySkipError({}))).toBe(false);
  });

  it('false para errores genéricos no relacionados', () => {
    expect(esTransitorio(new Error('algo'))).toBe(false);
  });

  it('false para valores no-error', () => {
    expect(esTransitorio('string')).toBe(false);
    expect(esTransitorio(null)).toBe(false);
    expect(esTransitorio(undefined)).toBe(false);
  });
});
