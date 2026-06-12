import { z } from 'zod';

export const tiposDocumento = ['RUC', 'DNI', 'CE', 'PASAPORTE', 'OTRO'] as const;
export const tiposPersona = ['natural', 'juridica'] as const;
export const estadosCliente = ['activo', 'inactivo', 'bloqueado'] as const;
export const tiposDireccion = ['fiscal', 'entrega', 'cobranza', 'otro'] as const;

export const clienteSchema = z
  .object({
    tipoDocumento: z.enum(tiposDocumento),
    numeroDocumento: z
      .string()
      .min(8, 'El número de documento debe tener al menos 8 dígitos')
      .max(15, 'El número de documento no puede exceder 15 caracteres'),
    tipoPersona: z.enum(tiposPersona),

    // Persona jurídica — la presencia según tipoPersona se valida en los refine de abajo
    razonSocial: z.string().trim().max(200).optional(),

    // Persona natural
    nombres: z.string().trim().max(100).optional(),
    apellidoPaterno: z.string().trim().max(100).optional(),
    apellidoMaterno: z.string().max(100).optional(),

    nombreComercial: z.string().optional(),
    lineaCredito: z.coerce.number().min(0).default(0),
    plazoCredito: z
      .string()
      .refine((v) => v === 'contado' || /^\d+dias$/.test(v), 'Plazo inválido')
      .default('contado'),
    listaPrecio: z.string().default('default'),

    email: z.string().email('Email inválido').optional().or(z.literal('')),
    telefono: z.string().max(20).optional(),

    condicionSunat: z.string().optional(),
    estadoSunat: z.string().optional(),
    ubigeoSunat: z.string().optional(),
    direccionSunat: z.string().optional(),

    esCliente: z.boolean().default(true),
    esProveedor: z.boolean().default(false),

    canalCaptacion: z.string().max(50).optional(),
    notas: z.string().max(2000).optional(),
    tags: z.array(z.string()).default([]),
  })
  .refine((d) => d.tipoPersona !== 'juridica' || !!d.razonSocial, {
    message: 'Ingresa la razón social',
    path: ['razonSocial'],
  })
  .refine((d) => d.tipoPersona !== 'natural' || (!!d.nombres && !!d.apellidoPaterno), {
    message: 'Ingresa los nombres y el apellido paterno',
    path: ['nombres'],
  });

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
