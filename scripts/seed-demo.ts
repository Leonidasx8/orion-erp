#!/usr/bin/env tsx
/**
 * Seed demo para presentación.
 *
 * Crea un tenant "idex" completo con:
 *   - usuario demo (lucas@orion.demo / orion-demo-2026)
 *   - 4 categorías de productos
 *   - 18 productos eléctricos (transformadores, cables, tableros, breakers)
 *   - 10 clientes (8 clientes + 2 proveedores) con RUC realistas
 *   - 9 cotizaciones en estados borrador/enviada/aprobada/rechazada/vencida/convertida
 *   - 7 órdenes de compra en estados borrador/enviada/aprobada/recibida_parcial/recibida_total/cerrada
 *
 * Idempotente: borra el tenant "idex" si existe y lo recrea desde cero.
 *
 * Uso:
 *   pnpm tsx scripts/seed-demo.ts
 *
 * Requiere Supabase local corriendo (pnpm db:start) y .env.local con
 * SUPABASE_SERVICE_ROLE_KEY + DATABASE_URL.
 */

import { sql, eq, and } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// Cargar .env.local sin depender de dotenv
try {
  const env = readFileSync('.env.local', 'utf-8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {
  /* .env.local opcional */
}

import { db } from '../src/lib/db/client';
import {
  tenants,
  tenantMembers,
  categoriasProducto,
  productos,
  clientes,
  cotizaciones,
  cotizacionItems,
  ordenesCompra,
  lineasOrdenCompra,
  roles,
  rolPermisos,
} from '../src/lib/db/schema';

// ─── Config ───────────────────────────────────────────────────────────────
const TENANT_SLUG = 'idex';
const USER_EMAIL = 'lucas@orion.demo';
const USER_PASSWORD = 'orion-demo-2026';
const USER_NAME = 'Lucas Escrivá';
const IGV = 0.18;

const log = (msg: string) => console.log(`[seed] ${msg}`);
const round2 = (n: number) => Math.round(n * 100) / 100;
const isoDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

// ─── Borrar tenant existente ──────────────────────────────────────────────
async function purgeTenant(): Promise<void> {
  const [existing] = await db.select().from(tenants).where(eq(tenants.slug, TENANT_SLUG));
  if (existing) {
    log(`Borrando tenant existente "${TENANT_SLUG}" (${existing.id})…`);
    await db.delete(tenants).where(eq(tenants.id, existing.id)); // CASCADE
  }
  // casbin no tiene FK a tenants — limpiamos manualmente todas las reglas
  // huérfanas (de runs anteriores que apuntan a tenants ya borrados).
  await db.execute(sql`TRUNCATE TABLE casbin RESTART IDENTITY`);
  log('Tabla casbin truncada');
}

// ─── Crear/reusar usuario en Supabase Auth ────────────────────────────────
async function upsertUser(): Promise<string> {
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: list } = await supa.auth.admin.listUsers();
  const existing = list.users.find((u) => u.email === USER_EMAIL);
  if (existing) {
    log(`Usuario demo ya existe (${existing.id})`);
    return existing.id;
  }

  const { data, error } = await supa.auth.admin.createUser({
    email: USER_EMAIL,
    password: USER_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: USER_NAME },
  });
  if (error) throw new Error(`No se pudo crear el usuario: ${error.message}`);
  log(`Usuario demo creado (${data.user.id})`);
  return data.user.id;
}

// ─── Crear tenant + roles base ────────────────────────────────────────────
async function createTenant(userId: string) {
  const [t] = await db
    .insert(tenants)
    .values({
      slug: TENANT_SLUG,
      razonSocial: 'GRUPO IDEX SAC',
      ruc: '20614847370',
      direccionFiscal: 'Cal. Robert Fulton 141, Urb. Santa Rosa, ATE, Lima',
      ubigeo: '150108',
      colorPrimario: '#1F5B3A',
      colorSecundario: '#2E7A4F',
      telefono: '+51 915 298 294',
      contactoEmail: 'lescriva@grupoidex.com.pe',
      bancoNombre: 'BBVA',
      bancoCuenta: '0011-0354-0100051694',
      bancoCci: '011-354-000100051694-86',
      bancoDetraccionCuenta: '00-021-157236',
      comercialNombre: 'Lucas Escrivá De Romaní',
      comercialCargo: 'Gerente General',
      comercialTelefono: '+51 915 298 294',
      plan: 'starter',
      estado: 'activo',
      createdBy: userId,
    })
    .returning();
  log(`Tenant idex creado (${t.id})`);

  await db.execute(sql`SELECT seed_roles_base_para_tenant(${t.id}::uuid, ${userId}::uuid)`);
  // Workaround: seed_roles_base crea roles con nombre capitalizado ('Superadmin'),
  // pero tenant_members.rol exige lowercase y el JOIN de casbin/sync.ts compara
  // por igualdad estricta. Normalizamos a lowercase para que el sync funcione.
  await db.execute(
    sql`UPDATE roles SET nombre = LOWER(nombre) WHERE tenant_id = ${t.id}::uuid AND es_predefinido = true`
  );
  log('Roles base + permisos sembrados (nombres normalizados a lowercase)');

  await db.insert(tenantMembers).values({
    tenantId: t.id,
    userId,
    rol: 'superadmin',
    estado: 'activo',
    invitadoPor: userId,
    joinedAt: new Date(),
  });
  log('User vinculado como superadmin');

  // El adapter casbin-pg-adapter usa la tabla `casbin` (id, ptype, rule[]),
  // NO `casbin_rule`. Insertamos en el formato correcto.
  const rolesPerms = await db
    .select({
      rolId: roles.id,
      tenantId: roles.tenantId,
      permisoCodigo: rolPermisos.permisoCodigo,
    })
    .from(rolPermisos)
    .innerJoin(roles, eq(rolPermisos.rolId, roles.id))
    .where(eq(roles.tenantId, t.id));

  for (const rp of rolesPerms) {
    const rule = JSON.stringify([rp.rolId, rp.tenantId, rp.permisoCodigo]);
    await db.execute(sql`INSERT INTO casbin (ptype, rule) VALUES ('p', ${rule}::jsonb)`);
  }

  const members = await db
    .select({
      userId: tenantMembers.userId,
      rolId: roles.id,
    })
    .from(tenantMembers)
    .innerJoin(
      roles,
      and(eq(roles.tenantId, tenantMembers.tenantId), eq(roles.nombre, tenantMembers.rol))
    )
    .where(and(eq(tenantMembers.tenantId, t.id), eq(tenantMembers.estado, 'activo')));

  for (const m of members) {
    const rule = JSON.stringify([m.userId, m.rolId, t.id]);
    await db.execute(sql`INSERT INTO casbin (ptype, rule) VALUES ('g', ${rule}::jsonb)`);
  }

  log(`Casbin: ${rolesPerms.length} policies + ${members.length} groupings`);

  return t;
}

// ─── Categorías ───────────────────────────────────────────────────────────
async function seedCategorias(tenantId: string) {
  const cats = ['Transformadores', 'Cables y conductores', 'Tableros eléctricos', 'Protecciones'];
  const rows = await db
    .insert(categoriasProducto)
    .values(cats.map((nombre) => ({ tenantId, nombre })))
    .returning();
  log(`${rows.length} categorías creadas`);
  return rows;
}

// ─── Productos ────────────────────────────────────────────────────────────
async function seedProductos(
  tenantId: string,
  cats: { id: string; nombre: string }[],
  celsaId?: string
) {
  const catIdByName = new Map(cats.map((c) => [c.nombre, c.id]));
  const items: Array<{
    codigo: string;
    nombre: string;
    descripcion: string;
    cat: string;
    precio: number;
    costo: number;
    stockActual: number;
    proveedor?: 'celsa';
  }> = [
    {
      codigo: 'TX-4821',
      nombre: 'Transformador trifásico 50 kVA · 220V/380V',
      descripcion: 'Refrigerado en aceite, montaje exterior',
      cat: 'Transformadores',
      precio: 1240,
      costo: 980,
      stockActual: 12,
    },
    {
      codigo: 'TX-4825',
      nombre: 'Transformador trifásico 100 kVA · 220V/380V',
      descripcion: 'Refrigerado en aceite, montaje exterior',
      cat: 'Transformadores',
      precio: 2180,
      costo: 1720,
      stockActual: 5,
    },
    {
      codigo: 'TX-4830',
      nombre: 'Transformador monofásico 25 kVA · 220V',
      descripcion: 'Refrigerado en aceite',
      cat: 'Transformadores',
      precio: 720,
      costo: 560,
      stockActual: 8,
    },
    {
      codigo: 'CB-1004',
      nombre: 'Cable de cobre AWG #2 · 100m',
      descripcion: 'Aislamiento THW-2 90°C',
      cat: 'Cables y conductores',
      precio: 124.5,
      costo: 92,
      stockActual: 320,
      proveedor: 'celsa',
    },
    {
      codigo: 'CB-1006',
      nombre: 'Cable de cobre AWG #6 · 100m',
      descripcion: 'Aislamiento THW-2 90°C',
      cat: 'Cables y conductores',
      precio: 78.4,
      costo: 56,
      stockActual: 480,
      proveedor: 'celsa',
    },
    {
      codigo: 'CB-1010',
      nombre: 'Cable de cobre AWG #10 · 100m',
      descripcion: 'Aislamiento TW 60°C',
      cat: 'Cables y conductores',
      precio: 42.8,
      costo: 30,
      stockActual: 1200,
      proveedor: 'celsa',
    },
    {
      codigo: 'CB-1014',
      nombre: 'Cable de cobre AWG #14 · 100m',
      descripcion: 'Aislamiento TW 60°C',
      cat: 'Cables y conductores',
      precio: 18.2,
      costo: 12,
      stockActual: 2400,
      proveedor: 'celsa',
    },
    {
      codigo: 'CB-2400',
      nombre: 'Cable apantallado 4×2.5 mm²',
      descripcion: 'Industrial, 100m',
      cat: 'Cables y conductores',
      precio: 92,
      costo: 68,
      stockActual: 180,
      proveedor: 'celsa',
    },
    {
      codigo: 'SW-2210',
      nombre: 'Tablero de distribución modular 24 vías',
      descripcion: 'Empotrar, IP44, puerta opaca',
      cat: 'Tableros eléctricos',
      precio: 612.4,
      costo: 470,
      stockActual: 22,
    },
    {
      codigo: 'SW-2212',
      nombre: 'Tablero de distribución modular 12 vías',
      descripcion: 'Empotrar, IP44',
      cat: 'Tableros eléctricos',
      precio: 320,
      costo: 240,
      stockActual: 36,
    },
    {
      codigo: 'SW-2240',
      nombre: 'Tablero metálico de medidores 4 servicios',
      descripcion: 'Para acometida concéntrica',
      cat: 'Tableros eléctricos',
      precio: 480,
      costo: 360,
      stockActual: 14,
    },
    {
      codigo: 'BK-0042',
      nombre: 'Interruptor termomagnético 32A · 2P',
      descripcion: 'Curva C, 6kA',
      cat: 'Protecciones',
      precio: 60,
      costo: 38,
      stockActual: 240,
    },
    {
      codigo: 'BK-0063',
      nombre: 'Interruptor termomagnético 63A · 3P',
      descripcion: 'Curva C, 10kA',
      cat: 'Protecciones',
      precio: 142,
      costo: 92,
      stockActual: 80,
    },
    {
      codigo: 'BK-0125',
      nombre: 'Interruptor termomagnético 125A · 3P',
      descripcion: 'Curva C, 25kA',
      cat: 'Protecciones',
      precio: 380,
      costo: 260,
      stockActual: 36,
    },
    {
      codigo: 'DF-0030',
      nombre: 'Diferencial 30mA · 2P',
      descripcion: 'Tipo AC',
      cat: 'Protecciones',
      precio: 78,
      costo: 52,
      stockActual: 160,
    },
    {
      codigo: 'DF-0040',
      nombre: 'Diferencial 40A · 4P',
      descripcion: 'Tipo A, 30mA',
      cat: 'Protecciones',
      precio: 168,
      costo: 118,
      stockActual: 60,
    },
    {
      codigo: 'SP-1024',
      nombre: 'Supresor de transientes clase II',
      descripcion: '40kA, 3P+N',
      cat: 'Protecciones',
      precio: 220,
      costo: 158,
      stockActual: 28,
    },
    {
      codigo: 'GR-9010',
      nombre: 'Pararrayos atmosférico ESE 60μs',
      descripcion: 'Radio cobertura 79m',
      cat: 'Protecciones',
      precio: 1640,
      costo: 1180,
      stockActual: 4,
    },
  ];

  const rows = await db
    .insert(productos)
    .values(
      items.map((it) => ({
        tenantId,
        codigo: it.codigo,
        nombre: it.nombre,
        descripcion: it.descripcion,
        tipo: 'bien',
        categoriaId: catIdByName.get(it.cat) ?? null,
        unidadMedida: 'NIU',
        precioUnitario: String(it.precio),
        tieneIgv: true,
        costoUnitario: String(it.costo),
        margenMinimo: '15.00',
        controlaStock: true,
        stockActual: String(it.stockActual),
        stockMinimo: '5',
        activo: true,
        proveedorPrincipalId: it.proveedor === 'celsa' ? (celsaId ?? null) : null,
      }))
    )
    .returning();
  log(`${rows.length} productos creados`);
  return rows;
}

// ─── Clientes (incluye proveedores) ───────────────────────────────────────
async function seedClientes(tenantId: string) {
  const items: Array<{
    razon: string;
    ruc: string;
    email: string;
    telefono: string;
    esCliente: boolean;
    esProveedor: boolean;
    tags: string[];
  }> = [
    {
      razon: 'TECNOLOGÍA INDUSTRIAL SAC',
      ruc: '20512345678',
      email: 'compras@tecnoindustrial.pe',
      telefono: '+51 1 4521234',
      esCliente: true,
      esProveedor: false,
      tags: ['top'],
    },
    {
      razon: 'ELECTROANDES SA',
      ruc: '20486754321',
      email: 'logistica@electroandes.pe',
      telefono: '+51 1 2114455',
      esCliente: true,
      esProveedor: false,
      tags: ['top'],
    },
    {
      razon: 'GRUPO MINERA CERRO VERDE',
      ruc: '20109876543',
      email: 'procurement@cerroverde.pe',
      telefono: '+51 54 271200',
      esCliente: true,
      esProveedor: false,
      tags: ['minería', 'top'],
    },
    {
      razon: 'CONSTRUCTORA SUR EIRL',
      ruc: '20598765432',
      email: 'admin@constructorasur.pe',
      telefono: '+51 1 5559876',
      esCliente: true,
      esProveedor: false,
      tags: ['construcción'],
    },
    {
      razon: 'ELECTROMECÁNICA INDUSTRIAL SAC',
      ruc: '20445566778',
      email: 'ventas@elecmec.pe',
      telefono: '+51 1 4467788',
      esCliente: true,
      esProveedor: false,
      tags: [],
    },
    {
      razon: 'TÉCNICA Y SERVICIOS SUR EIRL',
      ruc: '20334455667',
      email: 'servicios@tysur.pe',
      telefono: '+51 54 778899',
      esCliente: true,
      esProveedor: false,
      tags: [],
    },
    {
      razon: 'INVERSIONES MARTÍNEZ',
      ruc: '20223344556',
      email: 'ana@martinez.pe',
      telefono: '+51 1 3322111',
      esCliente: true,
      esProveedor: false,
      tags: [],
    },
    {
      razon: 'MUNICIPALIDAD DE LURÍN',
      ruc: '20131369478',
      email: 'contrataciones@munilurin.pe',
      telefono: '+51 1 4301234',
      esCliente: true,
      esProveedor: false,
      tags: ['gobierno'],
    },
    {
      razon: 'CELSA SAC',
      ruc: '20887766554',
      email: 'ventas@celsa.pe',
      telefono: '+51 1 7654321',
      esCliente: false,
      esProveedor: true,
      tags: ['proveedor', 'principal'],
    },
    {
      razon: 'TRANSFORMADORES DEL PERÚ SAC',
      ruc: '20998877665',
      email: 'ventas@transfperu.pe',
      telefono: '+51 1 8765432',
      esCliente: false,
      esProveedor: true,
      tags: ['proveedor'],
    },
  ];

  const rows = await db
    .insert(clientes)
    .values(
      items.map((c) => ({
        tenantId,
        tipoDocumento: 'RUC',
        numeroDocumento: c.ruc,
        tipoPersona: 'juridica',
        razonSocial: c.razon,
        email: c.email,
        telefono: c.telefono,
        condicionSunat: 'HABIDO',
        estadoSunat: 'ACTIVO',
        esCliente: c.esCliente,
        esProveedor: c.esProveedor,
        tags: c.tags,
        estado: 'activo',
      }))
    )
    .returning();
  log(`${rows.length} clientes creados (${rows.filter((c) => c.esProveedor).length} proveedores)`);
  return rows;
}

// ─── Cotizaciones ─────────────────────────────────────────────────────────
type ProductoRow = { id: string; codigo: string; nombre: string; precioUnitario: string };
type ClienteRow = { id: string; razonSocial: string | null; esProveedor: boolean };

async function seedCotizaciones(
  tenantId: string,
  userId: string,
  prods: ProductoRow[],
  cls: ClienteRow[]
) {
  const clientesOnly = cls.filter((c) => !c.esProveedor);
  const escenarios: Array<{
    estado: string;
    cliente: ClienteRow;
    items: Array<{ producto: ProductoRow; cantidad: number }>;
    fechaEmisionOffset: number;
    fechaVencimientoOffset: number;
    moneda: 'PEN' | 'USD';
    enviadaAt?: Date;
    aceptadaAt?: Date;
    rechazadaAt?: Date;
    motivoRechazo?: string;
  }> = [
    {
      estado: 'borrador',
      cliente: clientesOnly[1],
      moneda: 'USD',
      items: [
        { producto: prods[8], cantidad: 4 },
        { producto: prods[11], cantidad: 12 },
      ],
      fechaEmisionOffset: 0,
      fechaVencimientoOffset: 7,
    },
    {
      estado: 'enviada',
      cliente: clientesOnly[0],
      moneda: 'USD',
      items: [
        { producto: prods[0], cantidad: 2 },
        { producto: prods[3], cantidad: 4 },
        { producto: prods[8], cantidad: 1 },
      ],
      fechaEmisionOffset: -3,
      fechaVencimientoOffset: 4,
      enviadaAt: new Date(Date.now() - 3 * 86400_000),
    },
    {
      estado: 'enviada',
      cliente: clientesOnly[3],
      moneda: 'USD',
      items: [
        { producto: prods[2], cantidad: 1 },
        { producto: prods[6], cantidad: 8 },
      ],
      fechaEmisionOffset: -2,
      fechaVencimientoOffset: 5,
      enviadaAt: new Date(Date.now() - 2 * 86400_000),
    },
    {
      estado: 'enviada',
      cliente: clientesOnly[4],
      moneda: 'USD',
      items: [
        { producto: prods[10], cantidad: 3 },
        { producto: prods[14], cantidad: 24 },
      ],
      fechaEmisionOffset: -1,
      fechaVencimientoOffset: 6,
      enviadaAt: new Date(Date.now() - 86400_000),
    },
    {
      estado: 'aceptada',
      cliente: clientesOnly[2],
      moneda: 'USD',
      items: [
        { producto: prods[1], cantidad: 4 },
        { producto: prods[8], cantidad: 6 },
        { producto: prods[11], cantidad: 30 },
        { producto: prods[15], cantidad: 12 },
      ],
      fechaEmisionOffset: -7,
      fechaVencimientoOffset: 7,
      enviadaAt: new Date(Date.now() - 7 * 86400_000),
      aceptadaAt: new Date(Date.now() - 4 * 86400_000),
    },
    {
      estado: 'rechazada',
      cliente: clientesOnly[5],
      moneda: 'USD',
      items: [{ producto: prods[3], cantidad: 6 }],
      fechaEmisionOffset: -10,
      fechaVencimientoOffset: -3,
      enviadaAt: new Date(Date.now() - 10 * 86400_000),
      rechazadaAt: new Date(Date.now() - 6 * 86400_000),
      motivoRechazo: 'Precio fuera de presupuesto',
    },
    {
      estado: 'vencida',
      cliente: clientesOnly[6],
      moneda: 'USD',
      items: [{ producto: prods[12], cantidad: 2 }],
      fechaEmisionOffset: -25,
      fechaVencimientoOffset: -10,
      enviadaAt: new Date(Date.now() - 25 * 86400_000),
    },
    {
      estado: 'aceptada',
      cliente: clientesOnly[2],
      moneda: 'USD',
      items: [
        { producto: prods[0], cantidad: 8 },
        { producto: prods[3], cantidad: 16 },
        { producto: prods[8], cantidad: 4 },
        { producto: prods[12], cantidad: 8 },
        { producto: prods[16], cantidad: 6 },
      ],
      fechaEmisionOffset: -30,
      fechaVencimientoOffset: -15,
      enviadaAt: new Date(Date.now() - 30 * 86400_000),
      aceptadaAt: new Date(Date.now() - 25 * 86400_000),
    },
    {
      estado: 'aceptada',
      cliente: clientesOnly[1],
      moneda: 'USD',
      items: [
        { producto: prods[4], cantidad: 14 },
        { producto: prods[9], cantidad: 6 },
      ],
      fechaEmisionOffset: -35,
      fechaVencimientoOffset: -20,
      enviadaAt: new Date(Date.now() - 35 * 86400_000),
      aceptadaAt: new Date(Date.now() - 30 * 86400_000),
    },
  ];

  let created = 0;
  for (const e of escenarios) {
    const [{ siguiente }] = await db.execute<{ siguiente: number }>(
      sql`SELECT siguiente_numero_cotizacion(${tenantId}::uuid) AS siguiente`
    );
    const correlativo = Number(siguiente);

    let subtotal = 0;
    let igv = 0;
    const itemsRows = e.items.map((it, idx) => {
      const precio = Number(it.producto.precioUnitario);
      const sub = it.cantidad * precio;
      const igvLinea = sub * IGV;
      subtotal += sub;
      igv += igvLinea;
      return {
        orden: idx + 1,
        productoId: it.producto.id,
        codigo: it.producto.codigo,
        descripcion: it.producto.nombre,
        unidadMedida: 'NIU',
        cantidad: String(it.cantidad),
        precioUnitario: String(precio),
        descuentoPorcentaje: '0',
        descuentoMonto: '0',
        afectaIgv: true,
        subtotal: String(round2(sub)),
        igv: String(round2(igvLinea)),
        total: String(round2(sub + igvLinea)),
      };
    });

    const [cot] = await db
      .insert(cotizaciones)
      .values({
        tenantId,
        numeroCorrelativo: correlativo,
        clienteId: e.cliente.id,
        moneda: e.moneda,
        tipoCambio: e.moneda === 'USD' ? '3.7850' : null,
        fechaEmision: isoDate(e.fechaEmisionOffset),
        fechaVencimiento: isoDate(e.fechaVencimientoOffset),
        estado: e.estado,
        subtotal: String(round2(subtotal)),
        baseImponible: String(round2(subtotal)),
        igv: String(round2(igv)),
        total: String(round2(subtotal + igv)),
        enviadaAt: e.enviadaAt ?? null,
        aceptadaAt: e.aceptadaAt ?? null,
        rechazadaAt: e.rechazadaAt ?? null,
        motivoRechazo: e.motivoRechazo ?? null,
        creadoPor: userId,
      })
      .returning();

    await db
      .insert(cotizacionItems)
      .values(itemsRows.map((r) => ({ ...r, cotizacionId: cot.id, tenantId })));
    created++;
  }
  log(`${created} cotizaciones creadas`);
}

// ─── Órdenes de compra ────────────────────────────────────────────────────
async function seedOrdenes(tenantId: string, prods: ProductoRow[], cls: ClienteRow[]) {
  const provs = cls.filter((c) => c.esProveedor);
  const escenarios: Array<{
    estado: string;
    proveedor: ClienteRow;
    items: Array<{ producto: ProductoRow; cantidad: number; recibida: number; precio: number }>;
    fechaEmisionOffset: number;
    fechaEntregaOffset: number;
    enviadaAt?: Date;
    aprobadaAt?: Date;
    recibidaCompletaAt?: Date;
  }> = [
    {
      estado: 'borrador',
      proveedor: provs[1],
      items: [{ producto: prods[2], cantidad: 3, recibida: 0, precio: 580 }],
      fechaEmisionOffset: 0,
      fechaEntregaOffset: 14,
    },
    {
      estado: 'enviada',
      proveedor: provs[0],
      items: [
        { producto: prods[3], cantidad: 20, recibida: 0, precio: 92 },
        { producto: prods[11], cantidad: 60, recibida: 0, precio: 38 },
      ],
      fechaEmisionOffset: -2,
      fechaEntregaOffset: 12,
      enviadaAt: new Date(Date.now() - 2 * 86400_000),
    },
    {
      estado: 'aprobada',
      proveedor: provs[1],
      items: [{ producto: prods[1], cantidad: 4, recibida: 0, precio: 1720 }],
      fechaEmisionOffset: -5,
      fechaEntregaOffset: 9,
      enviadaAt: new Date(Date.now() - 5 * 86400_000),
      aprobadaAt: new Date(Date.now() - 4 * 86400_000),
    },
    {
      estado: 'recibida_parcial',
      proveedor: provs[0],
      items: [
        { producto: prods[0], cantidad: 4, recibida: 4, precio: 980 },
        { producto: prods[3], cantidad: 20, recibida: 12, precio: 92 },
        { producto: prods[8], cantidad: 6, recibida: 0, precio: 470 },
        { producto: prods[11], cantidad: 30, recibida: 12, precio: 38 },
      ],
      fechaEmisionOffset: -10,
      fechaEntregaOffset: 4,
      enviadaAt: new Date(Date.now() - 10 * 86400_000),
      aprobadaAt: new Date(Date.now() - 9 * 86400_000),
    },
    {
      estado: 'recibida_total',
      proveedor: provs[0],
      items: [
        { producto: prods[5], cantidad: 24, recibida: 24, precio: 30 },
        { producto: prods[6], cantidad: 30, recibida: 30, precio: 12 },
      ],
      fechaEmisionOffset: -18,
      fechaEntregaOffset: -3,
      enviadaAt: new Date(Date.now() - 18 * 86400_000),
      aprobadaAt: new Date(Date.now() - 17 * 86400_000),
      recibidaCompletaAt: new Date(Date.now() - 3 * 86400_000),
    },
    {
      estado: 'recibida_total',
      proveedor: provs[1],
      items: [{ producto: prods[2], cantidad: 8, recibida: 8, precio: 560 }],
      fechaEmisionOffset: -20,
      fechaEntregaOffset: -6,
      enviadaAt: new Date(Date.now() - 20 * 86400_000),
      aprobadaAt: new Date(Date.now() - 19 * 86400_000),
      recibidaCompletaAt: new Date(Date.now() - 6 * 86400_000),
    },
    {
      estado: 'cerrada',
      proveedor: provs[0],
      items: [
        { producto: prods[1], cantidad: 6, recibida: 6, precio: 1720 },
        { producto: prods[3], cantidad: 40, recibida: 40, precio: 92 },
        { producto: prods[15], cantidad: 12, recibida: 12, precio: 118 },
      ],
      fechaEmisionOffset: -45,
      fechaEntregaOffset: -30,
      enviadaAt: new Date(Date.now() - 45 * 86400_000),
      aprobadaAt: new Date(Date.now() - 44 * 86400_000),
      recibidaCompletaAt: new Date(Date.now() - 30 * 86400_000),
    },
  ];

  let created = 0;
  for (let i = 0; i < escenarios.length; i++) {
    const e = escenarios[i];
    const numero = `OC-2026-${String(i + 1).padStart(5, '0')}`;
    let subtotal = 0;
    let igv = 0;
    const itemsRows = e.items.map((it, idx) => {
      const sub = it.cantidad * it.precio;
      const igvLinea = sub * IGV;
      subtotal += sub;
      igv += igvLinea;
      return {
        orden: idx,
        productoId: it.producto.id,
        skuSnapshot: it.producto.codigo,
        descripcion: it.producto.nombre,
        cantidad: String(it.cantidad),
        cantidadRecibida: String(it.recibida),
        precioUnitario: String(it.precio),
        afectaIgv: true,
        subtotal: String(round2(sub)),
        igv: String(round2(igvLinea)),
        total: String(round2(sub + igvLinea)),
      };
    });

    const [oc] = await db
      .insert(ordenesCompra)
      .values({
        tenantId,
        numero,
        proveedorId: e.proveedor.id,
        moneda: 'USD',
        tipoCambio: '3.7850',
        fechaEmision: isoDate(e.fechaEmisionOffset),
        fechaEntregaEsperada: isoDate(e.fechaEntregaOffset),
        estado: e.estado,
        subtotal: String(round2(subtotal)),
        igv: String(round2(igv)),
        total: String(round2(subtotal + igv)),
        terminosPago: '50% adelanto · 50% contra entrega',
        direccionEntrega: 'Almacén Lurín — Av. Industrial 1024',
        observaciones: 'Coordinar con almacén con 24h de anticipación.',
        fechaEnvio: e.enviadaAt ?? null,
        fechaAprobacion: e.aprobadaAt ?? null,
        fechaRecepcionCompleta: e.recibidaCompletaAt ?? null,
      })
      .returning();

    await db
      .insert(lineasOrdenCompra)
      .values(itemsRows.map((r) => ({ ...r, ordenId: oc.id, tenantId })));
    created++;
  }

  // Sincronizar el correlativo para que nuevas órdenes no colisionen
  await db.execute(sql`
    INSERT INTO correlativos_orden_compra (tenant_id, ano, ultimo_correlativo)
    VALUES (${tenantId}::uuid, ${new Date().getFullYear()}, ${escenarios.length})
    ON CONFLICT (tenant_id, ano) DO UPDATE SET ultimo_correlativo = EXCLUDED.ultimo_correlativo
  `);

  log(`${created} órdenes de compra creadas`);
}

// ─── Kardex inicial ────────────────────────────────────────────────────────
async function seedKardex(
  tenantId: string,
  prods: { id: string; stockActual: string | null; costoUnitario: string | null }[]
) {
  let created = 0;
  for (const p of prods) {
    const stock = Number(p.stockActual ?? 0);
    const costo = Number(p.costoUnitario ?? 0);
    if (stock <= 0) continue;
    await db.execute(sql`
      SELECT registrar_movimiento_stock(
        ${tenantId}::uuid,
        ${p.id}::uuid,
        'entrada',
        ${stock}::numeric,
        'manual',
        NULL,
        ${costo > 0 ? costo : 1}::numeric,
        'Stock inicial demo',
        NULL
      )
    `);
    created++;
  }
  log(`${created} movimientos kardex iniciales creados`);
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
  log('Iniciando seed demo…');
  log(`DATABASE_URL: ${process.env.DATABASE_URL?.replace(/:[^@]+@/, ':***@')}`);

  await purgeTenant();
  const userId = await upsertUser();
  const tenant = await createTenant(userId);
  const cats = await seedCategorias(tenant.id);
  const cls = await seedClientes(tenant.id);
  const celsaId = cls.find((c) => c.razonSocial === 'CELSA SAC')?.id;
  const prods = await seedProductos(tenant.id, cats, celsaId);
  await seedCotizaciones(tenant.id, userId, prods, cls);
  await seedOrdenes(tenant.id, prods, cls);
  await seedKardex(tenant.id, prods);

  log('');
  log('=== Seed completo ===');
  log(`Tenant:    ${tenant.razonSocial} (${tenant.slug})`);
  log(`URL local: http://localhost:3000/${tenant.slug}`);
  log(`Login:     ${USER_EMAIL} / ${USER_PASSWORD}`);
  log('');
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] FATAL', err);
  process.exit(1);
});
