import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { costosInventario, kardexMovimientos, productos, tenants } from '@/lib/db/schema';

const TEST_SLUG = 'kardex-test';
const PROD_CODE_PREFIX = 'KDX-';

let tenantId: string;

async function ensureTenant(): Promise<string> {
  const [existing] = await db.select().from(tenants).where(eq(tenants.slug, TEST_SLUG));
  if (existing) return existing.id;
  const [created] = await db
    .insert(tenants)
    .values({
      slug: TEST_SLUG,
      razonSocial: 'Kardex Test SAC',
      ruc: '20999999999',
    })
    .returning();
  return created.id;
}

async function crearProductoTest(opts?: { permiteStockNegativo?: boolean }): Promise<string> {
  const codigo = PROD_CODE_PREFIX + Math.random().toString(36).slice(2, 10).toUpperCase();
  const [prod] = await db
    .insert(productos)
    .values({
      tenantId,
      codigo,
      nombre: 'Producto kardex test',
      controlaStock: true,
    })
    .returning({ id: productos.id });

  if (opts?.permiteStockNegativo) {
    await db.insert(costosInventario).values({
      productoId: prod.id,
      cantidadActual: '0',
      costoPromedio: '0',
      permiteStockNegativo: true,
    });
  }

  return prod.id;
}

async function llamarRegistrar(
  productoId: string,
  tipo: 'entrada' | 'salida' | 'ajuste_pos' | 'ajuste_neg',
  cantidad: number,
  costoUnitario: number | null = null
): Promise<void> {
  await db.execute(sql`
    SELECT registrar_movimiento_stock(
      ${tenantId}::uuid,
      ${productoId}::uuid,
      ${tipo}::text,
      ${cantidad}::numeric,
      'manual'::text,
      NULL::uuid,
      ${costoUnitario}::numeric,
      'test'::text,
      NULL::uuid
    )
  `);
}

async function leerCostoInventario(productoId: string) {
  const [row] = await db
    .select()
    .from(costosInventario)
    .where(eq(costosInventario.productoId, productoId));
  return row;
}

beforeAll(async () => {
  tenantId = await ensureTenant();
});

afterEach(async () => {
  // Limpia productos KDX creados (cascade limpia kardex_movimientos y costos_inventario)
  await db.execute(
    sql`DELETE FROM productos WHERE codigo LIKE 'KDX-%' AND tenant_id = ${tenantId}::uuid`
  );
});

describe('registrar_movimiento_stock — concurrencia y atomicidad', () => {
  it('100 entradas paralelas producen el saldo y costo promedio correctos', async () => {
    const productoId = await crearProductoTest();

    // 100 entradas de 10 unidades @ costo 5 = +1000 stock, costo promedio 5
    await Promise.all(
      Array.from({ length: 100 }, () => llamarRegistrar(productoId, 'entrada', 10, 5))
    );

    const ci = await leerCostoInventario(productoId);
    expect(Number(ci.cantidadActual)).toBe(1000);
    expect(Number(ci.costoPromedio)).toBe(5);

    const movimientos = await db
      .select()
      .from(kardexMovimientos)
      .where(eq(kardexMovimientos.productoId, productoId));
    expect(movimientos).toHaveLength(100);
  });

  it('costo promedio se recalcula correctamente con costos diferentes', async () => {
    const productoId = await crearProductoTest();

    // Entrada 1: 100 unidades @ 10 → stock 100, costo 10
    await llamarRegistrar(productoId, 'entrada', 100, 10);
    // Entrada 2: 100 unidades @ 20 → stock 200, costo (100*10 + 100*20)/200 = 15
    await llamarRegistrar(productoId, 'entrada', 100, 20);

    const ci = await leerCostoInventario(productoId);
    expect(Number(ci.cantidadActual)).toBe(200);
    expect(Number(ci.costoPromedio)).toBe(15);
  });

  it('100 salidas paralelas con stock 50: 50 éxito + 50 fallo, saldo final 0', async () => {
    const productoId = await crearProductoTest();
    await llamarRegistrar(productoId, 'entrada', 50, 10);

    const results = await Promise.allSettled(
      Array.from({ length: 100 }, () => llamarRegistrar(productoId, 'salida', 1))
    );

    const exitos = results.filter((r) => r.status === 'fulfilled').length;
    const fallos = results.filter((r) => r.status === 'rejected').length;
    expect(exitos).toBe(50);
    expect(fallos).toBe(50);

    const ci = await leerCostoInventario(productoId);
    expect(Number(ci.cantidadActual)).toBe(0);
    // Costo promedio se preserva en salidas
    expect(Number(ci.costoPromedio)).toBe(10);
  });

  it('rechaza entrada sin costo unitario', async () => {
    const productoId = await crearProductoTest();
    await expect(llamarRegistrar(productoId, 'entrada', 10, null)).rejects.toThrow(
      /costo_unitario_required_for_entrada/
    );
  });

  it('rechaza salida que dejaría stock negativo', async () => {
    const productoId = await crearProductoTest();
    await llamarRegistrar(productoId, 'entrada', 5, 10);
    await expect(llamarRegistrar(productoId, 'salida', 10)).rejects.toThrow(/stock_negativo/);
  });

  it('permite stock negativo cuando el producto lo tiene habilitado', async () => {
    const productoId = await crearProductoTest({ permiteStockNegativo: true });
    await llamarRegistrar(productoId, 'salida', 10);
    const ci = await leerCostoInventario(productoId);
    expect(Number(ci.cantidadActual)).toBe(-10);
  });

  it('ajuste positivo y negativo: integridad del saldo', async () => {
    const productoId = await crearProductoTest();
    await llamarRegistrar(productoId, 'entrada', 100, 8);
    await llamarRegistrar(productoId, 'ajuste_neg', 10);
    await llamarRegistrar(productoId, 'ajuste_pos', 5);

    const ci = await leerCostoInventario(productoId);
    expect(Number(ci.cantidadActual)).toBe(95);
    // Costo promedio se mantiene (ajustes no lo modifican)
    expect(Number(ci.costoPromedio)).toBe(8);
  });

  it('cachés saldo_post y costo_promedio_post coinciden con la realidad post-movimiento', async () => {
    const productoId = await crearProductoTest();
    await llamarRegistrar(productoId, 'entrada', 100, 10);
    await llamarRegistrar(productoId, 'entrada', 100, 20);

    const movs = await db
      .select()
      .from(kardexMovimientos)
      .where(eq(kardexMovimientos.productoId, productoId))
      .orderBy(kardexMovimientos.id);

    expect(movs).toHaveLength(2);
    expect(Number(movs[0].saldoPost)).toBe(100);
    expect(Number(movs[0].costoPromedioPost)).toBe(10);
    expect(Number(movs[1].saldoPost)).toBe(200);
    expect(Number(movs[1].costoPromedioPost)).toBe(15);
  });

  it('rechaza producto que no pertenece al tenant', async () => {
    // Crear otro tenant y un producto suyo
    const [otroTenant] = await db
      .insert(tenants)
      .values({ slug: 'kardex-otro', razonSocial: 'Otro SAC', ruc: '20111111111' })
      .returning();
    const [otroProd] = await db
      .insert(productos)
      .values({
        tenantId: otroTenant.id,
        codigo: 'KDX-OTRO-' + Math.random().toString(36).slice(2, 6),
        nombre: 'Otro producto',
      })
      .returning({ id: productos.id });

    try {
      await expect(llamarRegistrar(otroProd.id, 'entrada', 10, 5)).rejects.toThrow(
        /producto_not_in_tenant/
      );
    } finally {
      await db.delete(tenants).where(eq(tenants.id, otroTenant.id));
    }
  });
});
