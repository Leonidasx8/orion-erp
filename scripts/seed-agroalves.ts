import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql, eq, and } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';

const AGROALVES_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const LUCAS_ID = '2f687e12-2f63-47ee-afc8-4d9f0d9e9b42';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });
const { roles, rolPermisos, tenantMembers } = schema;

async function main() {
  await db.execute(
    sql`SELECT seed_roles_base_para_tenant(${AGROALVES_ID}::uuid, ${LUCAS_ID}::uuid)`
  );
  await db.execute(
    sql`UPDATE roles SET nombre = LOWER(nombre) WHERE tenant_id = ${AGROALVES_ID}::uuid AND es_predefinido = true`
  );
  console.log('Roles base creados para Agroalves');

  await db.execute(sql`
    INSERT INTO tenant_members (tenant_id, user_id, rol, estado, invitado_por, joined_at)
    VALUES (${AGROALVES_ID}::uuid, ${LUCAS_ID}::uuid, 'superadmin', 'activo', ${LUCAS_ID}::uuid, NOW())
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET rol = 'superadmin', estado = 'activo'
  `);

  const rolesPerms = await db
    .select({ rolId: roles.id, tenantId: roles.tenantId, permisoCodigo: rolPermisos.permisoCodigo })
    .from(rolPermisos)
    .innerJoin(roles, eq(rolPermisos.rolId, roles.id))
    .where(eq(roles.tenantId, AGROALVES_ID));

  for (const rp of rolesPerms) {
    const rule = JSON.stringify([rp.rolId, rp.tenantId, rp.permisoCodigo]);
    await db.execute(sql`INSERT INTO casbin (ptype, rule) VALUES ('p', ${rule}::jsonb)`);
  }
  console.log(`${rolesPerms.length} p-policies inserted`);

  const members = await db
    .select({ userId: tenantMembers.userId, rolId: roles.id })
    .from(tenantMembers)
    .innerJoin(
      roles,
      and(eq(roles.tenantId, tenantMembers.tenantId), eq(roles.nombre, tenantMembers.rol))
    )
    .where(and(eq(tenantMembers.tenantId, AGROALVES_ID), eq(tenantMembers.estado, 'activo')));

  for (const m of members) {
    const rule = JSON.stringify([m.userId, m.rolId, AGROALVES_ID]);
    await db.execute(sql`INSERT INTO casbin (ptype, rule) VALUES ('g', ${rule}::jsonb)`);
  }
  console.log(`${members.length} g-groupings inserted`);

  await client.end();
  console.log('Agroalves Casbin seed done ✓');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
