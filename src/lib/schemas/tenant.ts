import { z } from 'zod';

export const slugSchema = z
  .string()
  .min(2, { message: 'Mínimo 2 caracteres' })
  .max(30, { message: 'Máximo 30 caracteres' })
  .regex(/^[a-z0-9-]+$/, { message: 'Solo minúsculas, números y guiones' });

export const rucSchema = z
  .string()
  .length(11, { message: 'RUC debe tener 11 dígitos' })
  .regex(/^(10|20)/, { message: 'RUC debe empezar con 10 o 20' });

export const TenantStep1Schema = z.object({
  razonSocial: z.string().min(3, 'Mínimo 3 caracteres').max(150),
  ruc: rucSchema,
  slug: slugSchema,
  direccionFiscal: z.string().min(5, 'Mínimo 5 caracteres').max(200),
  ubigeo: z
    .string()
    .regex(/^[0-9]{6}$/, { message: 'Ubigeo de 6 dígitos' })
    .optional(),
});

export const TenantStep2Schema = z.object({
  logoUrl: z.string().optional(),
  colorPrimario: z.string().regex(/^#[0-9a-fA-F]{6}$/, { message: 'Color hexadecimal inválido' }),
  colorSecundario: z.string().regex(/^#[0-9a-fA-F]{6}$/, { message: 'Color hexadecimal inválido' }),
  faviconUrl: z.string().optional(),
});

export const TenantStep3Schema = z.object({
  adminEmail: z.string().email({ message: 'Email inválido' }),
  adminNombre: z.string().min(2, 'Mínimo 2 caracteres').max(100),
});

export const TenantStep4Schema = z.object({
  series: z
    .array(
      z.object({
        tipoDocumento: z.enum(['01', '03', '07', '08', '09', '31']),
        serie: z.string().regex(/^[FBT][0-9]{3}$/, { message: 'Ej: F001, B001, T001' }),
        correlativoInicial: z.number().int().nonnegative(),
      })
    )
    .min(1, 'Debe agregar al menos una serie'),
  nubefactRuta: z.string().url({ message: 'URL de API NUBEFACT inválida' }),
  nubefactToken: z.string().min(20, { message: 'Token inválido' }),
});

export const TenantStep5Schema = z.object({
  plan: z.enum(['starter', 'pro', 'enterprise']),
});

export const TenantWizardSchema = TenantStep1Schema.merge(TenantStep2Schema)
  .merge(TenantStep3Schema)
  .merge(TenantStep4Schema)
  .merge(TenantStep5Schema);

export type TenantStep1Input = z.infer<typeof TenantStep1Schema>;
export type TenantStep2Input = z.infer<typeof TenantStep2Schema>;
export type TenantStep3Input = z.infer<typeof TenantStep3Schema>;
export type TenantStep4Input = z.infer<typeof TenantStep4Schema>;
export type TenantStep5Input = z.infer<typeof TenantStep5Schema>;
export type TenantWizardInput = z.infer<typeof TenantWizardSchema>;
