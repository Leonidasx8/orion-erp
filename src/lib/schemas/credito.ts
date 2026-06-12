import { z } from 'zod';

export const OtorgarCreditoSchema = z.object({
  clienteId: z.string().uuid(),
  lineaCredito: z.number().nonnegative(),
  plazoDias: z.number().int().min(0).max(180),
  lineaCreditoPen: z.number().nonnegative().default(0),
  plazoDiasPen: z.number().int().min(0).max(180).default(0),
});

export const PagoSchema = z.object({
  facturaId: z.string().uuid(),
  monto: z.coerce.number().positive(),
  moneda: z.enum(['PEN', 'USD']),
  tipoCambioAplicado: z.coerce.number().positive().optional(),
  fechaPago: z.string().date(),
  metodo: z.enum(['transferencia', 'efectivo', 'cheque', 'tarjeta', 'otro']),
  referencia: z.string().max(100).optional(),
  observaciones: z.string().max(500).optional(),
});

export type OtorgarCreditoInput = z.infer<typeof OtorgarCreditoSchema>;
export type PagoInput = z.infer<typeof PagoSchema>;
