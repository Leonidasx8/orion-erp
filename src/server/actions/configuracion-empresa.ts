'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema';

const EmpresaSchema = z.object({
  razonSocial: z.string().min(2, 'Requerido'),
  ruc: z.string().regex(/^\d{11}$/, 'RUC debe tener 11 dígitos'),
  direccionFiscal: z.string().optional(),
  logoUrl: z.string().url('URL inválida').or(z.literal('')).optional(),
  web: z.string().optional(),
  telefono: z.string().optional(),
  contactoEmail: z.string().email('Email inválido').or(z.literal('')).optional(),
});

const ComercialSchema = z.object({
  comercialNombre: z.string().optional(),
  comercialCargo: z.string().optional(),
  comercialTelefono: z.string().optional(),
  bancoNombre: z.string().optional(),
  bancoCuenta: z.string().optional(),
  bancoCci: z.string().optional(),
  bancoDetraccionCuenta: z.string().optional(),
  bancoCuentaUsd: z.string().optional(),
  bancoCciUsd: z.string().optional(),
});

type AR<T = undefined> = { success: true; data: T } | { success: false; error: string };

export async function actualizarInfoEmpresa(input: z.infer<typeof EmpresaSchema>): Promise<AR> {
  try {
    const { tenant } = await requirePermission('admin.config.editar');
    const parsed = EmpresaSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
    }
    const d = parsed.data;
    await db
      .update(tenants)
      .set({
        razonSocial: d.razonSocial,
        ruc: d.ruc,
        direccionFiscal: d.direccionFiscal ?? null,
        logoUrl: d.logoUrl || null,
        web: d.web ?? null,
        telefono: d.telefono ?? null,
        contactoEmail: d.contactoEmail ?? null,
      })
      .where(eq(tenants.id, tenant.id));
    revalidatePath(`/${tenant.slug}/configuracion`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error interno' };
  }
}

export async function actualizarInfoComercial(input: z.infer<typeof ComercialSchema>): Promise<AR> {
  try {
    const { tenant } = await requirePermission('admin.config.editar');
    const parsed = ComercialSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
    }
    const d = parsed.data;
    await db
      .update(tenants)
      .set({
        comercialNombre: d.comercialNombre ?? null,
        comercialCargo: d.comercialCargo ?? null,
        comercialTelefono: d.comercialTelefono ?? null,
        bancoNombre: d.bancoNombre ?? null,
        bancoCuenta: d.bancoCuenta ?? null,
        bancoCci: d.bancoCci ?? null,
        bancoDetraccionCuenta: d.bancoDetraccionCuenta ?? null,
        bancoCuentaUsd: d.bancoCuentaUsd ?? null,
        bancoCciUsd: d.bancoCciUsd ?? null,
      })
      .where(eq(tenants.id, tenant.id));
    revalidatePath(`/${tenant.slug}/configuracion`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error interno' };
  }
}
