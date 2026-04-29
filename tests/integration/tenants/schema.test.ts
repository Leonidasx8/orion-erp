import { describe, it, expect, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema';

const validTenant = {
  slug: 'idex-test',
  razonSocial: 'Grupo Idex SAC',
  ruc: '20614847370',
};

// postgres.js envuelve el error de Postgres en error.cause
function pgConstraint(err: unknown): string {
  if (err instanceof Error) {
    const cause = (err as Error & { cause?: Error & { constraint_name?: string } }).cause;
    return cause?.constraint_name ?? cause?.message ?? err.message;
  }
  return String(err);
}

afterEach(async () => {
  await db.delete(tenants).where(eq(tenants.slug, validTenant.slug));
});

describe('tenants schema constraints', () => {
  it('acepta un tenant válido y genera UUID', async () => {
    const [t] = await db.insert(tenants).values(validTenant).returning();
    expect(t.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(t.slug).toBe(validTenant.slug);
    expect(t.plan).toBe('starter');
    expect(t.estado).toBe('activo');
    expect(t.colorPrimario).toBe('#0070f3');
  });

  it('rechaza slug con mayúsculas (constraint slug_format)', async () => {
    await expect(db.insert(tenants).values({ ...validTenant, slug: 'IDEX' })).rejects.toSatisfy(
      (err) => /slug_format/.test(pgConstraint(err))
    );
  });

  it('rechaza slug con espacios', async () => {
    await expect(db.insert(tenants).values({ ...validTenant, slug: 'id ex' })).rejects.toSatisfy(
      (err) => /slug_format/.test(pgConstraint(err))
    );
  });

  it('rechaza RUC que no empieza con 10 o 20', async () => {
    await expect(
      db.insert(tenants).values({ ...validTenant, ruc: '30614847370' })
    ).rejects.toSatisfy((err) => /ruc_format/.test(pgConstraint(err)));
  });

  it('rechaza RUC con longitud incorrecta', async () => {
    await expect(
      db.insert(tenants).values({ ...validTenant, ruc: '2061484737' })
    ).rejects.toSatisfy((err) => /ruc_format/.test(pgConstraint(err)));
  });

  it('rechaza plan no permitido (constraint plan_values)', async () => {
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db.insert(tenants).values({ ...validTenant, plan: 'free' } as any)
    ).rejects.toSatisfy((err) => /plan_values/.test(pgConstraint(err)));
  });

  it('rechaza slug duplicado (unique constraint)', async () => {
    await db.insert(tenants).values(validTenant);
    await expect(
      db.insert(tenants).values({ ...validTenant, ruc: '20000000001' })
    ).rejects.toSatisfy((err) => /unique|tenants_slug_key/i.test(pgConstraint(err)));
  });
});
