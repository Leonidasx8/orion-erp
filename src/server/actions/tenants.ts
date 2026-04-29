'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { tenants, platformAuditLog } from '@/lib/db/schema';
import { requirePlatformAdmin } from '@/lib/auth/platform-admin';
import { slugSchema, TenantWizardSchema, type TenantWizardInput } from '@/lib/schemas/tenant';
import { headers } from 'next/headers';

export async function verificarSlugDisponible(slug: string) {
  await requirePlatformAdmin();

  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) {
    return { available: false as const, error: parsed.error.issues[0].message };
  }

  const existing = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, parsed.data))
    .limit(1);

  return { available: existing.length === 0, error: null };
}

export async function crearTenant(input: TenantWizardInput) {
  const { user } = await requirePlatformAdmin();

  const parsed = TenantWizardSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: 'Datos inválidos', fieldErrors: parsed.error.flatten() };
  }

  const {
    razonSocial,
    ruc,
    slug,
    direccionFiscal,
    ubigeo,
    logoUrl,
    colorPrimario,
    colorSecundario,
    faviconUrl,
    plan,
    nubefactRuta,
    nubefactToken,
  } = parsed.data;

  const [tenant] = await db
    .insert(tenants)
    .values({
      slug,
      razonSocial,
      ruc,
      direccionFiscal,
      ubigeo,
      logoUrl: logoUrl || null,
      colorPrimario,
      colorSecundario,
      faviconUrl: faviconUrl || null,
      plan,
      configSunat: { ruta: nubefactRuta, token: nubefactToken },
      createdBy: user.id,
    })
    .returning();

  const hdrs = await headers();
  await db.insert(platformAuditLog).values({
    actorId: user.id,
    actorEmail: user.email ?? '',
    accion: 'tenant.created',
    entidad: 'tenant',
    entidadId: tenant.id,
    payload: { slug, razonSocial, plan },
    ip: hdrs.get('x-forwarded-for') ?? hdrs.get('x-real-ip') ?? null,
  });

  return { ok: true as const, tenant };
}
