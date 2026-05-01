import { z } from 'zod';

export const ajusteManualSchema = z.object({
  productoId: z.string().uuid('Producto requerido'),
  tipo: z.enum(['ajuste_pos', 'ajuste_neg']),
  cantidad: z.coerce.number().positive('La cantidad debe ser mayor a 0'),
  motivo: z.string().min(5, 'El motivo debe tener al menos 5 caracteres').max(500),
});

export type AjusteManualInput = z.infer<typeof ajusteManualSchema>;

export const consultaKardexSchema = z.object({
  productoId: z.string().uuid(),
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
});

export type ConsultaKardexInput = z.infer<typeof consultaKardexSchema>;
