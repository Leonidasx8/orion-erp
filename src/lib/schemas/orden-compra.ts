import { z } from 'zod';

export const lineaOrdenCompraSchema = z.object({
  productoId: z.string().uuid().optional(),
  skuSnapshot: z.string().min(1, 'SKU requerido').max(100),
  descripcion: z.string().min(1, 'Descripción requerida').max(500),
  cantidad: z.coerce.number().positive('Cantidad debe ser mayor a 0'),
  precioUnitario: z.coerce.number().nonnegative('Precio no puede ser negativo'),
  afectaIgv: z.boolean().default(true),
  orden: z.number().int().nonnegative().default(0),
});

export const ordenCompraSchema = z.object({
  proveedorId: z.string().uuid('Proveedor requerido'),
  cotizacionOrigenId: z.string().uuid().optional(),
  moneda: z.enum(['PEN', 'USD']).default('USD'),
  tipoCambio: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().positive().optional()
  ),
  fechaEmision: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  fechaEntregaEsperada: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  terminosPago: z.string().max(200).optional(),
  direccionEntrega: z.string().max(500).optional(),
  observaciones: z.string().max(2000).optional(),
  lineas: z.array(lineaOrdenCompraSchema).min(1, 'Debe tener al menos una línea'),
});
// El tipo de cambio dejó de ser obligatorio: USD es la moneda base. El campo se
// conserva (oculto en la UI) para órdenes en PEN.

export type OrdenCompraInput = z.infer<typeof ordenCompraSchema>;
export type LineaOrdenCompraInput = z.infer<typeof lineaOrdenCompraSchema>;
