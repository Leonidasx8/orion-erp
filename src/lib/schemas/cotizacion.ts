import { z } from 'zod';

export const monedasCotizacion = ['PEN', 'USD'] as const;

export const cotizacionItemSchema = z.object({
  productoId: z.string().uuid().optional(),
  codigo: z.string().max(50).optional(),
  descripcion: z.string().min(1, 'Descripción requerida').max(500),
  unidadMedida: z.string().min(1).max(10).default('NIU'),
  cantidad: z.coerce.number().positive('Cantidad debe ser mayor a 0'),
  precioUnitario: z.coerce.number().min(0, 'Precio no puede ser negativo'),
  descuentoPorcentaje: z.coerce.number().min(0).max(100).default(0),
  afectaIgv: z.boolean().default(true),
  tiempoEntregaDias: z.coerce.number().int().min(1).max(60).optional(),
});

export type CotizacionItemInput = z.infer<typeof cotizacionItemSchema>;

export const cotizacionSchema = z
  .object({
    clienteId: z.string().uuid('Selecciona un cliente'),
    moneda: z.enum(monedasCotizacion).default('USD'),
    tipoCambio: z.preprocess(
      (v) => (v === '' || v == null ? undefined : v),
      z.coerce.number().positive().optional()
    ),
    fechaEmision: z.string().min(10), // YYYY-MM-DD
    fechaVencimiento: z.string().min(10),
    descuentoGlobal: z.coerce.number().min(0).default(0),
    notas: z.string().max(2000).optional(),
    terminosCondiciones: z.string().max(5000).optional(),
    formaPago: z.string().max(300).optional(),
    tiempoEntrega: z.string().max(300).optional(),
    lugarEntrega: z.string().max(300).optional(),
    incluyeIgv: z.boolean().default(false),
    contactoClienteNombre: z.string().max(200).optional(),
    contactoClienteCargo: z.string().max(200).optional(),
    contactoClienteEmail: z.string().max(200).optional(),
    items: z.array(cotizacionItemSchema).min(1, 'La cotización debe tener al menos un ítem'),
  })
  // El tipo de cambio dejó de ser obligatorio: USD es la moneda base de venta.
  // El campo se conserva (oculto en la UI) para cotizaciones en PEN.
  .refine((d) => new Date(d.fechaVencimiento) >= new Date(d.fechaEmision), {
    message: 'Vencimiento no puede ser anterior a la emisión',
    path: ['fechaVencimiento'],
  });

export type CotizacionInput = z.infer<typeof cotizacionSchema>;

export const motivoRechazoSchema = z.object({
  motivo: z.string().min(3).max(500),
});
