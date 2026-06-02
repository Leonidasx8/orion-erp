'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { tenants, platformAuditLog } from '@/lib/db/schema';
import { requirePermission } from '@/lib/auth/require-permission';

const configSunatSchema = z.object({
  ruta: z
    .string()
    .trim()
    .min(10, 'La ruta es demasiado corta')
    .refine(
      (v) => /^[0-9a-f-]+$/i.test(v) || v.startsWith('http'),
      'La ruta debe ser el identificador de Nubefact (o la URL completa)'
    ),
  token: z.string().trim().min(20, 'El token es demasiado corto'),
});

export type ConfigSunatInput = z.infer<typeof configSunatSchema>;

type ActionResult = { success: true } | { success: false; error: string };

/**
 * Normaliza la ruta: si pegan la URL completa
 * (https://api.nubefact.com/api/v1/<id>) extrae solo el <id>.
 */
function normalizarRuta(ruta: string): string {
  const trimmed = ruta.trim().replace(/\/+$/, '');
  const match = trimmed.match(/\/api\/v1\/(.+)$/);
  return match ? match[1] : trimmed;
}

/**
 * Guarda las credenciales Nubefact (ruta + token) en `tenants.config_sunat`.
 * A partir de aquí el worker SUNAT las usa automáticamente para este tenant.
 */
export async function guardarConfigSunat(input: ConfigSunatInput): Promise<ActionResult> {
  const parsed = configSunatSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  let user, tenant;
  try {
    ({ user, tenant } = await requirePermission('admin.config.editar'));
  } catch {
    return { success: false, error: 'No tienes permiso para editar la configuración.' };
  }

  const ruta = normalizarRuta(parsed.data.ruta);
  const token = parsed.data.token;

  await db.update(tenants).set({ configSunat: { ruta, token } }).where(eq(tenants.id, tenant.id));

  await db.insert(platformAuditLog).values({
    actorId: user.id,
    actorEmail: user.email ?? null,
    accion: 'config_sunat.actualizada',
    entidad: 'tenant',
    entidadId: tenant.id,
    // No guardamos el token en el log de auditoría — solo que se cambió y la ruta.
    payload: { ruta },
  });

  revalidatePath(`/${tenant.slug}/configuracion`);
  return { success: true };
}

type PruebaResult = { success: true; mensaje: string } | { success: false; error: string };

/**
 * Prueba la conexión con Nubefact usando las credenciales dadas (sin guardarlas).
 * Hace un `consultar_comprobante` de un documento de prueba: si Nubefact responde
 * (aunque sea "no existe"), las credenciales son válidas. Si el token/ruta están
 * mal, Nubefact responde con error de autenticación.
 */
export async function probarConexionSunat(input: ConfigSunatInput): Promise<PruebaResult> {
  const parsed = configSunatSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await requirePermission('admin.config.editar');
  } catch {
    return { success: false, error: 'No tienes permiso para probar la configuración.' };
  }

  const ruta = normalizarRuta(parsed.data.ruta);
  const token = parsed.data.token;

  let res: Response;
  try {
    res = await fetch(`https://api.nubefact.com/api/v1/${ruta}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        operacion: 'consultar_comprobante',
        tipo_de_comprobante: 1,
        serie: 'F001',
        numero: 1,
      }),
      cache: 'no-store',
    });
  } catch {
    return { success: false, error: 'No se pudo conectar con Nubefact (error de red).' };
  }

  if (res.status === 401 || res.status === 403 || res.status === 404) {
    return { success: false, error: 'Ruta o token inválidos — Nubefact rechazó la autenticación.' };
  }

  let json: { errors?: string } | null = null;
  try {
    json = (await res.json()) as { errors?: string };
  } catch {
    return { success: false, error: 'Respuesta inesperada de Nubefact.' };
  }

  const err = (json?.errors ?? '').toLowerCase();
  // Errores que delatan credenciales malas
  if (/token|ruta|autoriza|no\s+existe\s+la\s+cuenta|acceso/.test(err)) {
    return { success: false, error: 'Ruta o token inválidos — verifica los datos en Nubefact.' };
  }

  // Cualquier otra respuesta (incluido "el comprobante no existe") = conexión OK
  return {
    success: true,
    mensaje: 'Conexión exitosa con Nubefact. Las credenciales son válidas.',
  };
}
