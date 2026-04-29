'use server';

import { eq, sql } from 'drizzle-orm';
import { headers } from 'next/headers';
import { db } from '@/lib/db/client';
import { tenants, tenantMembers, platformAuditLog, seriesDocumentos } from '@/lib/db/schema';
import { requirePlatformAdmin } from '@/lib/auth/platform-admin';
import { invitarUsuarioMagicLink } from '@/lib/auth/invite';
import { slugSchema, TenantWizardSchema, type TenantWizardInput } from '@/lib/schemas/tenant';

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
  const { user, platformAdmin } = await requirePlatformAdmin();

  const parsed = TenantWizardSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: 'Datos inválidos',
      fieldErrors: parsed.error.flatten(),
    };
  }

  const d = parsed.data;
  const hdrs = await headers();
  const ip = hdrs.get('x-forwarded-for') ?? hdrs.get('x-real-ip') ?? 'unknown';

  // 1. Invitar usuario fuera de la transacción (Supabase Auth es externo)
  const newUser = await invitarUsuarioMagicLink(d.adminEmail, d.adminNombre);

  // 2. Transacción atómica: tenant + series + member + audit log
  const tenant = await db.transaction(async (tx) => {
    const [t] = await tx
      .insert(tenants)
      .values({
        slug: d.slug,
        razonSocial: d.razonSocial,
        ruc: d.ruc,
        direccionFiscal: d.direccionFiscal,
        ubigeo: d.ubigeo,
        logoUrl: d.logoUrl || null,
        colorPrimario: d.colorPrimario,
        colorSecundario: d.colorSecundario,
        plan: d.plan,
        // Token almacenado en texto plano por ahora — B.2 agrega encriptación con pgcrypto
        configSunat: { ruta: d.nubefactRuta, token: d.nubefactToken },
        createdBy: user.id,
      })
      .returning();

    // Series de documentos SUNAT
    await tx.insert(seriesDocumentos).values(
      d.series.map((s) => ({
        tenantId: t.id,
        tipoDocumento: s.tipoDocumento,
        serie: s.serie,
        correlativoActual: s.correlativoInicial,
      }))
    );

    // Tenant member con rol Superadmin (rol completo lo define B.2)
    await tx.insert(tenantMembers).values({
      tenantId: t.id,
      userId: newUser.id,
      rol: 'superadmin',
      estado: 'pendiente', // se activa cuando acepta la invitación
      invitadoPor: user.id,
    });

    // Roles base: Superadmin, Comercial, Facturación + sus permisos
    await tx.execute(sql`SELECT seed_roles_base_para_tenant(${t.id}, ${user.id})`);

    // Audit log
    await tx.insert(platformAuditLog).values({
      actorId: user.id,
      actorEmail: platformAdmin.email,
      accion: 'tenant.created',
      entidad: 'tenant',
      entidadId: t.id,
      payload: {
        slug: d.slug,
        ruc: d.ruc,
        adminEmail: d.adminEmail,
        plan: d.plan,
      },
      ip,
    });

    return t;
  });

  return { ok: true as const, tenant };
}

export async function suspenderTenant(tenantId: string) {
  const { platformAdmin } = await requirePlatformAdmin();

  await db.transaction(async (tx) => {
    await tx
      .update(tenants)
      .set({ estado: 'suspendido', fechaBaja: new Date() })
      .where(eq(tenants.id, tenantId));

    await tx.insert(platformAuditLog).values({
      actorId: platformAdmin.userId,
      actorEmail: platformAdmin.email,
      accion: 'tenant.suspended',
      entidad: 'tenant',
      entidadId: tenantId,
    });
  });

  return { ok: true as const };
}
