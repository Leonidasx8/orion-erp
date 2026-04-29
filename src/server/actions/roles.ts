'use server';

import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/require-permission';
import { syncTenantToCasbin } from '@/lib/auth/casbin/sync';
import { db } from '@/lib/db/client';
import { roles, rolPermisos, auditPermisos } from '@/lib/db/schema';

const CrearRolSchema = z.object({
  nombre: z.string().min(2).max(50),
  descripcion: z.string().max(200).optional(),
  permisos: z.array(z.string()).min(1),
});

export async function crearRolCustom(input: z.infer<typeof CrearRolSchema>) {
  const data = CrearRolSchema.parse(input);
  const { user, tenant } = await requirePermission('admin.roles.editar');
  const hdrs = await headers();
  const ip = hdrs.get('x-forwarded-for') ?? null;

  return db.transaction(async (tx) => {
    const [rol] = await tx
      .insert(roles)
      .values({
        tenantId: tenant.id,
        nombre: data.nombre,
        esPredefinido: false,
        descripcion: data.descripcion,
        createdBy: user.id,
      })
      .returning();

    for (const codigo of data.permisos) {
      await tx.insert(rolPermisos).values({ rolId: rol.id, permisoCodigo: codigo });
    }

    await tx.insert(auditPermisos).values({
      tenantId: tenant.id,
      userId: user.id,
      accion: 'rol.creado',
      rolId: rol.id,
      detalles: { nombre: data.nombre, permisos: data.permisos },
      ipAddress: ip,
    });

    await syncTenantToCasbin(tenant.id);
    revalidatePath(`/${tenant.slug}/admin/roles`);
    return { success: true as const, data: rol };
  });
}

export async function actualizarPermisosDeRol(rolId: string, permisos: string[]) {
  const { user, tenant } = await requirePermission('admin.roles.editar');
  const hdrs = await headers();
  const ip = hdrs.get('x-forwarded-for') ?? null;

  const [rol] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, rolId), eq(roles.tenantId, tenant.id)))
    .limit(1);

  if (!rol) return { success: false as const, error: 'role-not-found' };
  if (rol.nombre === 'Superadmin' && rol.esPredefinido) {
    return { success: false as const, error: 'cannot-edit-superadmin' };
  }

  return db.transaction(async (tx) => {
    const actuales = await tx
      .select({ codigo: rolPermisos.permisoCodigo })
      .from(rolPermisos)
      .where(eq(rolPermisos.rolId, rolId));

    const actualesSet = new Set(actuales.map((p) => p.codigo));
    const nuevosSet = new Set(permisos);
    const agregados = permisos.filter((p) => !actualesSet.has(p));
    const removidos = [...actualesSet].filter((p) => !nuevosSet.has(p));

    await tx.delete(rolPermisos).where(eq(rolPermisos.rolId, rolId));
    for (const codigo of permisos) {
      await tx.insert(rolPermisos).values({ rolId, permisoCodigo: codigo });
    }

    if (agregados.length > 0) {
      await tx.insert(auditPermisos).values({
        tenantId: tenant.id,
        userId: user.id,
        accion: 'permisos.agregados',
        rolId,
        detalles: { agregados },
        ipAddress: ip,
      });
    }
    if (removidos.length > 0) {
      await tx.insert(auditPermisos).values({
        tenantId: tenant.id,
        userId: user.id,
        accion: 'permisos.removidos',
        rolId,
        detalles: { removidos },
        ipAddress: ip,
      });
    }

    await syncTenantToCasbin(tenant.id);
    revalidatePath(`/${tenant.slug}/admin/roles`);
    return { success: true as const, data: null };
  });
}
