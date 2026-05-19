import { z } from 'zod';

export const tiposProducto = ['bien', 'servicio'] as const;

export const productoSchema = z.object({
  codigo: z.string().min(1).max(50),
  nombre: z.string().min(2).max(200),
  descripcion: z.string().max(1000).optional(),
  tipo: z.enum(tiposProducto),
  categoriaId: z.string().uuid().optional(),
  unidadMedida: z.string().min(1).max(10),

  precioUnitario: z.coerce.number().min(0),
  tieneIgv: z.boolean().default(true),
  costoUnitario: z.coerce.number().min(0).optional(),

  controlaStock: z.boolean().default(false),
  stockMinimo: z.coerce.number().min(0).optional(),

  codigoSunat: z.string().max(30).optional(),
  activo: z.boolean().default(true),
  proveedorPrincipalId: z.string().uuid().optional().nullable(),
});

export type ProductoInput = z.infer<typeof productoSchema>;

export const categoriaProductoSchema = z.object({
  nombre: z.string().min(2).max(100),
  padreId: z.string().uuid().optional(),
});

export type CategoriaProductoInput = z.infer<typeof categoriaProductoSchema>;
