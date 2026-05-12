import { z } from 'zod';

export const tiposDocumento = ['RUC', 'DNI', 'CE', 'PASAPORTE', 'OTRO'] as const;
export const tiposPersona = ['natural', 'juridica'] as const;
export const estadosCliente = ['activo', 'inactivo', 'bloqueado'] as const;
export const tiposDireccion = ['fiscal', 'entrega', 'cobranza', 'otro'] as const;

export const clienteSchema = z
  .object({
    tipoDocumento: z.enum(tiposDocumento),
    numeroDocumento: z.string().min(8).max(15),
    tipoPersona: z.enum(tiposPersona),

    // Persona jurídica
    razonSocial: z.string().min(2).max(200).optional(),

    // Persona natural
    nombres: z.string().min(2).max(100).optional(),
    apellidoPaterno: z.string().min(2).max(100).optional(),
    apellidoMaterno: z.string().max(100).optional(),

    nombreComercial: z.string().optional(),
    lineaCredito: z.coerce.number().min(0).default(0),
    plazoCredito: z.enum(['contado', '15dias', '30dias', '60dias']).default('contado'),
    listaPrecio: z.string().default('default'),

    email: z.string().email().optional().or(z.literal('')),
    telefono: z.string().max(20).optional(),

    condicionSunat: z.string().optional(),
    estadoSunat: z.string().optional(),
    ubigeoSunat: z.string().optional(),
    direccionSunat: z.string().optional(),

    canalCaptacion: z.string().max(50).optional(),
    notas: z.string().max(2000).optional(),
    tags: z.array(z.string()).default([]),
  })
  .refine(
    (d) => {
      if (d.tipoPersona === 'juridica') return !!d.razonSocial;
      return !!d.nombres && !!d.apellidoPaterno;
    },
    {
      message: 'Completa los nombres o razón social según el tipo de persona',
      path: ['nombres'],
    }
  );

export type ClienteInput = z.infer<typeof clienteSchema>;

export const direccionClienteSchema = z.object({
  tipo: z.enum(tiposDireccion).default('fiscal'),
  esPrincipal: z.boolean().default(false),
  alias: z.string().max(50).optional(),
  direccion: z.string().min(5).max(300),
  distrito: z.string().max(100).optional(),
  provincia: z.string().max(100).optional(),
  departamento: z.string().max(100).optional(),
  ubigeo: z.string().max(6).optional(),
  referencia: z.string().max(200).optional(),
});

export type DireccionClienteInput = z.infer<typeof direccionClienteSchema>;

export const contactoClienteSchema = z.object({
  nombre: z.string().min(2).max(150),
  cargo: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  telefono: z.string().max(20).optional(),
  esPrincipal: z.boolean().default(false),
});

export type ContactoClienteInput = z.infer<typeof contactoClienteSchema>;
