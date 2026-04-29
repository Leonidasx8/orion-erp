# B.9 — Facturación SUNAT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` o `superpowers:executing-plans`.

**Goal:** Emisión de Facturas (tipo SUNAT '01'), Boletas ('03'), Notas de Crédito ('07') y Notas de Débito ('08') vía NUBEFACT. Reusa toda la infra de B.8 (cola pgmq, wrapper NUBEFACT, series_documentos, webhook). Detección automática del tipo (factura RUC vs boleta DNI). Anulación correcta vía NC vinculada con motivo del catálogo 10. Manejo de errores SUNAT con UX clara.

**Architecture:** Reusa `src/lib/sunat/` de B.8 + nuevos builders para factura/boleta/NC/ND. Idempotency por `(serie, numero)`. Anulación = INSERT en `notas_credito_debito` con `documento_origen_id`. Storage `documentos/{tenant_id}/facturas/{serie-numero}.{xml|pdf|cdr}`.

**Tech Stack:** mismo que B.8.

**Estimación**: 28h — 10 tareas.

**Dependencias upstream**: B.8 cerrado (cola y wrapper en producción).
**Dependencias downstream**: B.10 (CxC depende de facturas).

---

## File structure

```
supabase/migrations/
├── 0033_facturas_schema.sql
├── 0034_notas_credito_debito.sql
└── 0035_seed_series_facturacion.sql       # F001, B001, FC01, FD01

src/lib/sunat/builders/
├── build-factura.ts
├── build-boleta.ts
├── build-nota-credito.ts
└── build-nota-debito.ts

src/lib/sunat/schemas/
├── factura.schema.ts
└── nota-credito-debito.schema.ts

src/lib/db/schema/
├── facturas.ts
├── lineas-factura.ts
└── notas-credito-debito.ts

src/server/actions/
├── facturas.ts
├── facturas-anular.ts
└── notas-credito-debito.ts

src/app/api/internal/procesar-sunat/
└── route.ts                               # invocado por edge function

src/app/(app)/[companySlug]/facturas/
├── page.tsx
├── nueva/page.tsx
├── [id]/
│   ├── page.tsx
│   └── anular/page.tsx
└── notas-credito-debito/
    ├── page.tsx
    ├── nueva/page.tsx
    └── [id]/page.tsx

src/components/modules/facturas/
├── FacturasList.tsx
├── FacturaForm.tsx
├── TimelineSunat.tsx
└── AnularFacturaModal.tsx
```

---

## Task 1: Schema facturas + lineas + notas + RLS

**Estimado**: 3h
**Agente**: `schema-builder`

- [ ] **Step 1: Migrations**

```sql
-- 0033_facturas_schema.sql
CREATE TABLE facturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo_documento text NOT NULL,                  -- '01' factura | '03' boleta
  serie text NOT NULL,
  numero int NOT NULL,
  numero_completo text GENERATED ALWAYS AS (serie || '-' || lpad(numero::text, 8, '0')) STORED,
  fecha_emision date NOT NULL DEFAULT current_date,
  fecha_vencimiento date,
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  -- Snapshot del cliente (por trazabilidad — si cambia razón social, factura no muta)
  cliente_tipo_doc_snapshot text NOT NULL,
  cliente_numero_doc_snapshot text NOT NULL,
  cliente_razon_social_snapshot text NOT NULL,
  cliente_direccion_snapshot text,
  moneda text NOT NULL DEFAULT 'PEN',
  tipo_cambio numeric(10,4),
  total_gravadas numeric(14,4) NOT NULL DEFAULT 0,
  total_exoneradas numeric(14,4) NOT NULL DEFAULT 0,
  total_inafectas numeric(14,4) NOT NULL DEFAULT 0,
  total_gratuitas numeric(14,4) NOT NULL DEFAULT 0,
  descuento_global numeric(14,4) DEFAULT 0,
  igv numeric(14,4) NOT NULL DEFAULT 0,
  total numeric(14,4) NOT NULL DEFAULT 0,
  total_en_letras text,
  forma_pago text NOT NULL DEFAULT 'contado',    -- 'contado' | 'credito'
  cuotas_credito jsonb,                          -- [{numero: 1, fecha: '2026-05-01', monto: 100}, ...]
  cotizacion_origen_id uuid,
  guia_relacionada_id uuid,
  observaciones text,
  estado_sunat text NOT NULL DEFAULT 'borrador',
  cdr_url text,
  xml_url text,
  pdf_url text,
  nubefact_response jsonb,
  anulada_por_id uuid REFERENCES facturas(id),   -- self-ref a NC que la anuló (cuando aplique)
  emitida_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  UNIQUE (tenant_id, tipo_documento, serie, numero)
);
CREATE INDEX facturas_tenant_idx ON facturas(tenant_id);
CREATE INDEX facturas_estado_sunat_idx ON facturas(estado_sunat);
CREATE INDEX facturas_cliente_idx ON facturas(cliente_id);

CREATE TABLE lineas_factura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id uuid NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES productos(id),
  sku_snapshot text NOT NULL,
  descripcion text NOT NULL,
  cantidad numeric(10,2) NOT NULL CHECK (cantidad > 0),
  unidad_medida text NOT NULL DEFAULT 'NIU',
  valor_unitario numeric(14,4) NOT NULL,         -- sin IGV
  precio_unitario numeric(14,4) NOT NULL,        -- con IGV
  tipo_afectacion_igv text NOT NULL DEFAULT '10',
  porcentaje_igv numeric(5,2) NOT NULL DEFAULT 18.00,
  total_base_igv numeric(14,4) NOT NULL,
  total_igv numeric(14,4) NOT NULL,
  total numeric(14,4) NOT NULL,
  descuento numeric(14,4) DEFAULT 0,
  orden int NOT NULL DEFAULT 0
);

ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "facturas_tenant_isolation" ON facturas FOR ALL
USING (tenant_id = current_tenant_id());

ALTER TABLE lineas_factura ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lineas_via_factura" ON lineas_factura FOR ALL
USING (factura_id IN (SELECT id FROM facturas WHERE tenant_id = current_tenant_id()));

-- 0034_notas_credito_debito.sql
CREATE TABLE notas_credito_debito (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo_documento text NOT NULL,                  -- '07' NC | '08' ND
  serie text NOT NULL,                           -- 'FC01' (NC factura) | 'BC01' (NC boleta)
  numero int NOT NULL,
  numero_completo text GENERATED ALWAYS AS (serie || '-' || lpad(numero::text, 8, '0')) STORED,
  fecha_emision date NOT NULL DEFAULT current_date,
  -- Documento que se afecta (NC/ND apuntan a una factura/boleta original)
  documento_origen_tipo text NOT NULL,           -- '01' o '03'
  documento_origen_serie text NOT NULL,
  documento_origen_numero int NOT NULL,
  documento_origen_id uuid REFERENCES facturas(id),
  -- Motivo (catálogo 09 para NC, catálogo 10 para ND)
  tipo_motivo text NOT NULL,
  descripcion_motivo text NOT NULL,
  -- Cliente snapshot
  cliente_id uuid NOT NULL,
  cliente_tipo_doc_snapshot text NOT NULL,
  cliente_numero_doc_snapshot text NOT NULL,
  cliente_razon_social_snapshot text NOT NULL,
  moneda text NOT NULL,
  total numeric(14,4) NOT NULL,
  igv numeric(14,4) NOT NULL,
  estado_sunat text NOT NULL DEFAULT 'borrador',
  cdr_url text, xml_url text, pdf_url text,
  nubefact_response jsonb,
  emitida_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, tipo_documento, serie, numero)
);

CREATE TABLE lineas_nc_nd (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nc_nd_id uuid NOT NULL REFERENCES notas_credito_debito(id) ON DELETE CASCADE,
  -- mismas columnas que lineas_factura
  producto_id uuid REFERENCES productos(id),
  sku_snapshot text NOT NULL,
  descripcion text NOT NULL,
  cantidad numeric(10,2) NOT NULL,
  unidad_medida text NOT NULL DEFAULT 'NIU',
  valor_unitario numeric(14,4) NOT NULL,
  precio_unitario numeric(14,4) NOT NULL,
  tipo_afectacion_igv text NOT NULL DEFAULT '10',
  total_base_igv numeric(14,4) NOT NULL,
  total_igv numeric(14,4) NOT NULL,
  total numeric(14,4) NOT NULL,
  orden int NOT NULL DEFAULT 0
);

ALTER TABLE notas_credito_debito ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ncnd_tenant" ON notas_credito_debito FOR ALL USING (tenant_id = current_tenant_id());

ALTER TABLE lineas_nc_nd ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lineas_ncnd_via_doc" ON lineas_nc_nd FOR ALL
USING (nc_nd_id IN (SELECT id FROM notas_credito_debito WHERE tenant_id = current_tenant_id()));
```

- [ ] **Step 2: Drizzle + Zod**

(Pattern estándar; ver B.5 como referencia.)

- [ ] **Step 3: Commit**

```bash
pnpm db:migrate
git add supabase/migrations/0033_facturas_schema.sql supabase/migrations/0034_notas_credito_debito.sql src/lib/db/schema/facturas.ts src/lib/db/schema/lineas-factura.ts src/lib/db/schema/notas-credito-debito.ts
git commit -m "feat(facturas): add facturas, lineas, NC/ND schemas with RLS"
```

---

## Task 2: Wrapper NUBEFACT — builders factura/boleta/NC/ND

**Estimado**: 5h
**Agente**: `sunat-integrator`

- [ ] **Step 1: build-factura.ts**

```typescript
// src/lib/sunat/builders/build-factura.ts
import type { Factura, LineaFactura, Cliente } from '@/lib/db/schema';

export type NubefactPayloadFactura = {
  operacion: 'generar_comprobante';
  tipo_de_comprobante: 1 | 2; // 1 factura, 2 boleta
  serie: string;
  numero: number;
  sunat_transaction: 1; // 1 = venta interna
  cliente_tipo_de_documento: number; // 1 DNI, 6 RUC
  cliente_numero_de_documento: string;
  cliente_denominacion: string;
  cliente_direccion?: string;
  cliente_email?: string;
  fecha_de_emision: string; // 'DD-MM-YYYY'
  fecha_de_vencimiento?: string;
  moneda: 1 | 2; // 1 PEN, 2 USD
  tipo_de_cambio?: string;
  porcentaje_de_igv: 18.0;
  total_gravada: number;
  total_exonerada?: number;
  total_inafecta?: number;
  total_igv: number;
  total: number;
  forma_de_pago?: 'contado' | 'credito';
  cuotas?: Array<{ numero: number; fecha_de_pago: string; monto: number }>;
  observaciones?: string;
  documento_que_se_modifica_tipo?: number; // para NC/ND
  documento_que_se_modifica_serie?: string;
  documento_que_se_modifica_numero?: number;
  tipo_de_nota_de_credito?: number; // catálogo 09
  items: Array<{
    unidad_de_medida: string;
    codigo: string;
    descripcion: string;
    cantidad: number;
    valor_unitario: number;
    precio_unitario: number;
    tipo_de_igv: number; // 1=gravado, 2=exonerado, etc.
    total_base_igv: number;
    porcentaje_igv: number;
    total_igv: number;
    total: number;
  }>;
};

export function buildFactura(input: {
  factura: Factura;
  cliente: Cliente;
  lineas: LineaFactura[];
}): NubefactPayloadFactura {
  const { factura, cliente, lineas } = input;
  const isFactura = factura.tipoDocumento === '01';

  return {
    operacion: 'generar_comprobante',
    tipo_de_comprobante: isFactura ? 1 : 2,
    serie: factura.serie,
    numero: factura.numero,
    sunat_transaction: 1,
    cliente_tipo_de_documento: parseInt(cliente.tipoDocumento),
    cliente_numero_de_documento: cliente.numeroDocumento,
    cliente_denominacion: cliente.razonSocial,
    cliente_direccion: cliente.direccionFiscal ?? undefined,
    cliente_email: cliente.email ?? undefined,
    fecha_de_emision: formatSunatDate(factura.fechaEmision),
    fecha_de_vencimiento: factura.fechaVencimiento
      ? formatSunatDate(factura.fechaVencimiento)
      : undefined,
    moneda: factura.moneda === 'PEN' ? 1 : 2,
    tipo_de_cambio: factura.tipoCambio?.toString(),
    porcentaje_de_igv: 18.0,
    total_gravada: Number(factura.totalGravadas),
    total_exonerada: Number(factura.totalExoneradas),
    total_inafecta: Number(factura.totalInafectas),
    total_igv: Number(factura.igv),
    total: Number(factura.total),
    forma_de_pago: factura.formaPago as any,
    cuotas: factura.cuotasCredito as any,
    observaciones: factura.observaciones ?? undefined,
    items: lineas.map((l) => ({
      unidad_de_medida: l.unidadMedida,
      codigo: l.skuSnapshot,
      descripcion: l.descripcion,
      cantidad: Number(l.cantidad),
      valor_unitario: Number(l.valorUnitario),
      precio_unitario: Number(l.precioUnitario),
      tipo_de_igv: tipoAfectacionToTipoDeIgv(l.tipoAfectacionIgv),
      total_base_igv: Number(l.totalBaseIgv),
      porcentaje_igv: Number(l.porcentajeIgv),
      total_igv: Number(l.totalIgv),
      total: Number(l.total),
    })),
  };
}

function tipoAfectacionToTipoDeIgv(afectacion: string): number {
  // Mapeo catálogo 07 → tipo NUBEFACT
  return { '10': 1, '20': 7, '30': 8, '40': 9 }[afectacion] ?? 1;
}

function formatSunatDate(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return `${String(date.getUTCDate()).padStart(2, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${date.getUTCFullYear()}`;
}
```

- [ ] **Step 2: build-nota-credito.ts**

Similar a build-factura pero con `tipo_de_comprobante: 3`, agregando `documento_que_se_modifica_*` y `tipo_de_nota_de_credito` (catálogo 09 SUNAT).

- [ ] **Step 3: Tests con MSW**

```typescript
it('build-factura genera payload válido para Nubefact', () => {
  const payload = buildFactura(/* ... */);
  expect(payload.tipo_de_comprobante).toBe(1);
  expect(payload.items[0]).toMatchObject({
    valor_unitario: expect.any(Number),
    precio_unitario: expect.any(Number),
  });
});
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/sunat/builders/build-factura.ts src/lib/sunat/builders/build-boleta.ts src/lib/sunat/builders/build-nota-credito.ts src/lib/sunat/builders/build-nota-debito.ts tests/unit/sunat/builders/
git commit -m "feat(sunat): add factura, boleta, NC, ND builders for NUBEFACT"
```

---

## Task 3: Catálogos SUNAT como constantes tipadas

**Estimado**: 2h
**Agente**: `sunat-integrator`

- [ ] **Step 1: Expandir `catalogos-sunat.ts`**

```typescript
// src/lib/sunat/catalogos-sunat.ts (extender el de B.8)

export const TIPO_AFECTACION_IGV = {
  GRAVADO: '10',
  GRAVADO_RETIRO: '11',
  // ... 12, 13, 14, 15, 16, 17
  EXONERADO: '20',
  INAFECTO: '30',
  EXPORTACION: '40',
} as const;

export const TIPO_NOTA_CREDITO = {
  ANULACION: '01',
  ANULACION_POR_ERROR_RUC: '02',
  CORRECCION_DESCRIPCION: '03',
  DESCUENTO_GLOBAL: '04',
  DESCUENTO_POR_ITEM: '05',
  DEVOLUCION_TOTAL: '06',
  DEVOLUCION_POR_ITEM: '07',
  BONIFICACION: '08',
  DISMINUCION_VALOR: '09',
  OTROS: '13',
} as const;

export const TIPO_NOTA_DEBITO = {
  INTERESES_POR_MORA: '01',
  AUMENTO_VALOR: '02',
  PENALIDADES: '03',
  AMPLIACION_PRESTACION_SERVICIOS: '11',
} as const;

// Códigos de error SUNAT que mapeamos a UX
export const ERROR_SUNAT_CODES: Record<number, { message: string; recoverable: boolean }> = {
  2017: { message: 'RUC del receptor no existe', recoverable: false },
  2105: { message: 'Documento ya fue presentado', recoverable: true },
  2335: { message: 'Ubigeo inválido', recoverable: false },
  4243: {
    message: 'Detalle del comprobante inconsistente, recalcular totales',
    recoverable: false,
  },
  // ... más códigos
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/sunat/catalogos-sunat.ts
git commit -m "feat(sunat): expand catalogs and SUNAT error code mapping"
```

---

## Task 4: Server Actions emitir/anular/reenviar + idempotency

**Estimado**: 3h
**Agente**: `sunat-integrator`

- [ ] **Step 1: emitirFactura**

```typescript
// src/server/actions/facturas.ts
'use server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import { facturas, lineasFactura, clientes, productos } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { encolarEnvioSunat } from '@/lib/sunat/queue';
import { registrarSalidaPorFactura } from './kardex-internal';
import { revalidatePath } from 'next/cache';

const FacturaSchema = z.object({
  tipoDocumento: z.enum(['01', '03']),
  clienteId: z.string().uuid(),
  fechaEmision: z.string().date(),
  fechaVencimiento: z.string().date().optional(),
  moneda: z.enum(['PEN', 'USD']),
  tipoCambio: z.coerce.number().positive().optional(),
  formaPago: z.enum(['contado', 'credito']),
  cuotasCredito: z
    .array(
      z.object({
        numero: z.number().int(),
        fechaPago: z.string().date(),
        monto: z.coerce.number().positive(),
      })
    )
    .optional(),
  observaciones: z.string().max(2000).optional(),
  cotizacionOrigenId: z.string().uuid().optional(),
  guiaRelacionadaId: z.string().uuid().optional(),
  lineas: z
    .array(
      z.object({
        productoId: z.string().uuid().nullable(),
        skuSnapshot: z.string(),
        descripcion: z.string().min(2),
        cantidad: z.coerce.number().positive(),
        unidadMedida: z.string().default('NIU'),
        valorUnitario: z.coerce.number().nonnegative(),
        tipoAfectacionIgv: z.enum(['10', '20', '30', '40']).default('10'),
      })
    )
    .min(1),
});

export async function emitirFactura(input: z.infer<typeof FacturaSchema>) {
  const data = FacturaSchema.parse(input);
  const { user, tenant } = await requirePermission('facturas.emitir');

  // Determinar serie según tipo (lookup en series_documentos)
  const serie = data.tipoDocumento === '01' ? 'F001' : 'B001';

  // Cargar cliente para snapshot
  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, data.clienteId));
  if (!cliente) return { success: false as const, error: 'cliente_not_found' };

  // Calcular totales por línea
  const lineasCalc = data.lineas.map((l) => {
    const baseIgv = l.cantidad * l.valorUnitario;
    const igv = l.tipoAfectacionIgv === '10' ? baseIgv * 0.18 : 0;
    const precioUnitarioConIgv = l.valorUnitario * (l.tipoAfectacionIgv === '10' ? 1.18 : 1);
    return {
      ...l,
      precioUnitario: precioUnitarioConIgv,
      totalBaseIgv: baseIgv,
      totalIgv: igv,
      total: baseIgv + igv,
    };
  });
  const totalGravadas = lineasCalc
    .filter((l) => l.tipoAfectacionIgv === '10')
    .reduce((s, l) => s + l.totalBaseIgv, 0);
  const totalExoneradas = lineasCalc
    .filter((l) => l.tipoAfectacionIgv === '20')
    .reduce((s, l) => s + l.totalBaseIgv, 0);
  const totalInafectas = lineasCalc
    .filter((l) => l.tipoAfectacionIgv === '30')
    .reduce((s, l) => s + l.totalBaseIgv, 0);
  const totalIgv = lineasCalc.reduce((s, l) => s + l.totalIgv, 0);
  const total = totalGravadas + totalExoneradas + totalInafectas + totalIgv;

  return db.transaction(async (tx) => {
    // Reservar correlativo
    const numeroResult = await tx.execute(
      sql`SELECT reservar_correlativo(${tenant.id}, ${data.tipoDocumento}, ${serie}) AS n`
    );
    const numero = Number(numeroResult.rows[0].n);

    const [f] = await tx
      .insert(facturas)
      .values({
        tenantId: tenant.id,
        tipoDocumento: data.tipoDocumento,
        serie,
        numero,
        fechaEmision: data.fechaEmision,
        fechaVencimiento: data.fechaVencimiento,
        clienteId: data.clienteId,
        clienteTipoDocSnapshot: cliente.tipoDocumento,
        clienteNumeroDocSnapshot: cliente.numeroDocumento,
        clienteRazonSocialSnapshot: cliente.razonSocial,
        clienteDireccionSnapshot: cliente.direccionFiscal,
        moneda: data.moneda,
        tipoCambio: data.tipoCambio?.toString(),
        totalGravadas: totalGravadas.toFixed(4),
        totalExoneradas: totalExoneradas.toFixed(4),
        totalInafectas: totalInafectas.toFixed(4),
        igv: totalIgv.toFixed(4),
        total: total.toFixed(4),
        formaPago: data.formaPago,
        cuotasCredito: data.cuotasCredito ?? null,
        cotizacionOrigenId: data.cotizacionOrigenId,
        guiaRelacionadaId: data.guiaRelacionadaId,
        observaciones: data.observaciones,
        estadoSunat: 'pendiente_envio',
        emitidaPor: user.id,
      })
      .returning();

    for (const [idx, l] of lineasCalc.entries()) {
      await tx.insert(lineasFactura).values({
        facturaId: f.id,
        productoId: l.productoId,
        skuSnapshot: l.skuSnapshot,
        descripcion: l.descripcion,
        cantidad: l.cantidad.toString(),
        unidadMedida: l.unidadMedida,
        valorUnitario: l.valorUnitario.toString(),
        precioUnitario: l.precioUnitario.toString(),
        tipoAfectacionIgv: l.tipoAfectacionIgv,
        totalBaseIgv: l.totalBaseIgv.toFixed(4),
        totalIgv: l.totalIgv.toFixed(4),
        total: l.total.toFixed(4),
        orden: idx,
      });

      // Registrar salida en kardex (solo si producto_id no null)
      if (l.productoId) {
        await registrarSalidaPorFactura(tenant.id, l.productoId, l.cantidad, f.id, user.id);
      }
    }

    // Encolar envío SUNAT
    await encolarEnvioSunat({
      tenantId: tenant.id,
      documentoTipo: 'factura',
      documentoId: f.id,
      payloadJson: { intento: 0 },
    });

    revalidatePath(`/${tenant.slug}/facturas`);
    return { success: true as const, data: f };
  });
}

export async function reenviarSunat(facturaId: string) {
  await requirePermission('facturas.reenviar_sunat');
  const { tenant } = await requirePermission('facturas.reenviar_sunat');
  const [f] = await db.select().from(facturas).where(eq(facturas.id, facturaId));
  if (!f) return { success: false as const, error: 'not_found' };
  // Idempotency: si ya tiene nubefact_response, NO reenviar
  if (f.nubefactResponse && f.estadoSunat === 'aceptada') {
    return { success: false as const, error: 'already_accepted' };
  }
  await encolarEnvioSunat({
    tenantId: tenant.id,
    documentoTipo: 'factura',
    documentoId: f.id,
    payloadJson: { intento: 0 },
  });
  return { success: true as const, data: null };
}
```

- [ ] **Step 2: Endpoint interno `/api/internal/procesar-sunat`**

```typescript
// src/app/api/internal/procesar-sunat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { facturas, lineasFactura, clientes, tenants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { buildFactura } from '@/lib/sunat/builders/build-factura';
import { postNubefact } from '@/lib/sunat/nubefact-client';
import { SunatError, IdempotencySkipError } from '@/lib/sunat/errors';
import { uploadCdrXmlPdf } from '@/lib/sunat/storage';

export async function POST(req: NextRequest) {
  if (req.headers.get('x-internal-token') !== process.env.INTERNAL_TOKEN) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { tenantId, documentoTipo, documentoId } = await req.json();

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  if (!tenant) return NextResponse.json({ error: 'tenant_not_found' }, { status: 404 });

  if (documentoTipo === 'factura') {
    const [f] = await db.select().from(facturas).where(eq(facturas.id, documentoId));
    if (f.estadoSunat === 'aceptada') {
      return NextResponse.json({ status: 'already_accepted' }, { status: 409 });
    }
    const [cliente] = await db.select().from(clientes).where(eq(clientes.id, f.clienteId));
    const lineas = await db.select().from(lineasFactura).where(eq(lineasFactura.facturaId, f.id));
    const payload = buildFactura({ factura: f, cliente, lineas });

    try {
      const response = await postNubefact(tenant, payload);
      // Descargar XML+PDF+CDR a Storage
      const urls = await uploadCdrXmlPdf(tenant.id, f.numeroCompleto!, response);
      await db
        .update(facturas)
        .set({
          estadoSunat: 'aceptada',
          nubefactResponse: response,
          cdrUrl: urls.cdr,
          xmlUrl: urls.xml,
          pdfUrl: urls.pdf,
        })
        .where(eq(facturas.id, f.id));
      return NextResponse.json({ ok: true });
    } catch (e) {
      if (e instanceof IdempotencySkipError) {
        await db
          .update(facturas)
          .set({
            estadoSunat: 'aceptada',
            nubefactResponse: e.existingResponse,
          })
          .where(eq(facturas.id, f.id));
        return NextResponse.json({ status: 'idempotent' }, { status: 409 });
      }
      if (e instanceof SunatError) {
        await db
          .update(facturas)
          .set({
            estadoSunat: 'rechazada',
            nubefactResponse: { error: e.message, code: e.sunatCode },
          })
          .where(eq(facturas.id, f.id));
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      // Error de red u otro: dejar para retry
      return NextResponse.json({ error: 'transient' }, { status: 503 });
    }
  }

  // ... análogo para 'guia', 'nota_credito', etc.
}
```

- [ ] **Step 3: Commit**

```bash
git add src/server/actions/facturas.ts src/app/api/internal/procesar-sunat/
git commit -m "feat(facturas): add factura issuance with kardex integration and SUNAT queue"
```

---

## Task 5: Idempotency check pre-envío

**Estimado**: 1h
**Agente**: `sunat-integrator`

Ya cubierto por:

- DB UNIQUE constraint en `(tenant_id, tipo, serie, numero)`
- Check en `reenviarSunat` antes de encolar
- IdempotencySkipError en `postNubefact` si SUNAT responde 2105

Solo agregar test:

- [ ] **Step 1: Test idempotency**

```typescript
// tests/integration/sunat/idempotency.test.ts
it('emitir misma factura 2 veces no genera duplicado', async () => {
  const f1 = await emitirFactura({
    /* ... */
  });
  const f2 = await emitirFactura({
    /* mismo input */
  });
  // El segundo debe usar correlativo siguiente, no el mismo
  expect(f1.data.numero).not.toBe(f2.data.numero);
});

it('reenviar factura ya aceptada retorna error', async () => {
  // ... después de envío y CDR recibido
  const res = await reenviarSunat(facturaId);
  expect(res.success).toBe(false);
  expect(res.error).toBe('already_accepted');
});
```

- [ ] **Step 2: Commit**

```bash
git add tests/integration/sunat/idempotency.test.ts
git commit -m "test(sunat): add idempotency tests for factura issuance"
```

---

## Task 6: Form factura/boleta con líneas, totales, IGV

**Estimado**: 4h
**Agente**: `frontend-developer`

- [ ] **Step 1: FacturaForm**

```typescript
// src/components/modules/facturas/FacturaForm.tsx
'use client';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LineasTable } from '@/components/shared/documento-comercial/LineasTable';
import { TotalesPanel } from '@/components/shared/documento-comercial/TotalesPanel';
import { ClienteSelect } from '@/components/modules/cotizaciones/ClienteSelect';
import { emitirFactura } from '@/server/actions/facturas';

export function FacturaForm({ initialFromCotizacion }: { initialFromCotizacion?: any }) {
  const form = useForm({ /* ... defaults derivados de initialFromCotizacion si vienen */ });

  // ... Watch tipoDoc para validar cliente
  // ... cuotas si formaPago == 'credito'

  const onSubmit = async (data) => {
    const res = await emitirFactura(data);
    if (res.success) router.push(`/${slug}/facturas/${res.data.id}`);
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <FormField name="tipoDocumento" component={SelectFacturaBoleta} />
          <ClienteSelect name="clienteId" />
          <FormField name="formaPago" component={SelectContadoCredito} />
          {form.watch('formaPago') === 'credito' && <CuotasFieldArray />}
          <LineasTable />
        </div>
        <div className="space-y-4">
          <TotalesPanel withIgv />
          <FormField name="observaciones" .../>
          <Button type="submit">Emitir</Button>
        </div>
      </form>
    </FormProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/modules/facturas/ src/app/\(app\)/\[companySlug\]/facturas/nueva/
git commit -m "feat(facturas): add factura form with credit cuotas"
```

---

## Task 7: Detección automática tipo (factura RUC / boleta DNI)

**Estimado**: 1h
**Agente**: `frontend-developer`

- [ ] **Step 1: Lógica en FacturaForm**

```typescript
// Cuando se selecciona cliente, detectar tipo según documento
const cliente = form.watch('clienteId');
useEffect(() => {
  if (!cliente) return;
  fetchCliente(cliente).then((c) => {
    if (c.tipoDocumento === '6') form.setValue('tipoDocumento', '01'); // RUC → factura
    if (c.tipoDocumento === '1') form.setValue('tipoDocumento', '03'); // DNI → boleta
  });
}, [cliente]);
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(facturas): auto-detect factura vs boleta based on cliente doc type"
```

---

## Task 8: Listado + filtros (tipo, estado, cliente, fecha)

**Estimado**: 3h
**Agente**: `frontend-developer`

- [ ] **Step 1: FacturasList con filtros**

```typescript
// src/components/modules/facturas/FacturasList.tsx
// TanStack Table con:
// - Filtro tipo (factura/boleta)
// - Filtro estadoSunat (pendiente, aceptada, rechazada)
// - Filtro cliente (combobox)
// - Filtro fecha (date range)
// - Columna numeroCompleto, cliente, total, estado, fecha
// - Click row → /[id]
```

- [ ] **Step 2: Commit**

```bash
git add src/components/modules/facturas/FacturasList.tsx src/app/\(app\)/\[companySlug\]/facturas/page.tsx
git commit -m "feat(facturas): add list with multi-criteria filters"
```

---

## Task 9: Anulación: form motivo → emisión NC vinculada

**Estimado**: 3h
**Agente**: `sunat-integrator` + `frontend-developer`

- [ ] **Step 1: Server Action `anularFactura`**

```typescript
// src/server/actions/facturas-anular.ts
'use server';
import { TIPO_NOTA_CREDITO } from '@/lib/sunat/catalogos-sunat';
import { reversarMovimiento } from './kardex-internal';

const AnularSchema = z.object({
  facturaId: z.string().uuid(),
  motivoCodigo: z.enum(['01', '02', '06', '07']), // anulación, error RUC, devolución, etc.
  descripcionMotivo: z.string().min(10),
});

export async function anularFactura(input: z.infer<typeof AnularSchema>) {
  const data = AnularSchema.parse(input);
  const { user, tenant } = await requirePermission('facturas.anular');

  return db.transaction(async (tx) => {
    const [f] = await tx.select().from(facturas).where(eq(facturas.id, data.facturaId));
    if (!f || f.estadoSunat !== 'aceptada') {
      return { success: false as const, error: 'not_acceptable' };
    }

    const lineas = await tx.select().from(lineasFactura).where(eq(lineasFactura.facturaId, f.id));

    // Reservar correlativo NC
    const serieNc = f.tipoDocumento === '01' ? 'FC01' : 'BC01';
    const numeroNc = await tx.execute(
      sql`SELECT reservar_correlativo(${tenant.id}, '07', ${serieNc}) AS n`
    );

    // INSERT NC
    const [nc] = await tx
      .insert(notasCreditoDebito)
      .values({
        tenantId: tenant.id,
        tipoDocumento: '07',
        serie: serieNc,
        numero: Number(numeroNc.rows[0].n),
        documentoOrigenTipo: f.tipoDocumento,
        documentoOrigenSerie: f.serie,
        documentoOrigenNumero: f.numero,
        documentoOrigenId: f.id,
        tipoMotivo: data.motivoCodigo,
        descripcionMotivo: data.descripcionMotivo,
        clienteId: f.clienteId,
        clienteTipoDocSnapshot: f.clienteTipoDocSnapshot,
        clienteNumeroDocSnapshot: f.clienteNumeroDocSnapshot,
        clienteRazonSocialSnapshot: f.clienteRazonSocialSnapshot,
        moneda: f.moneda,
        total: f.total,
        igv: f.igv,
        estadoSunat: 'pendiente_envio',
        emitidaPor: user.id,
      })
      .returning();

    // Copiar líneas
    for (const l of lineas) {
      await tx.insert(lineasNcNd).values({
        ncNdId: nc.id,
        productoId: l.productoId,
        skuSnapshot: l.skuSnapshot,
        descripcion: l.descripcion,
        cantidad: l.cantidad,
        unidadMedida: l.unidadMedida,
        valorUnitario: l.valorUnitario,
        precioUnitario: l.precioUnitario,
        tipoAfectacionIgv: l.tipoAfectacionIgv,
        totalBaseIgv: l.totalBaseIgv,
        totalIgv: l.totalIgv,
        total: l.total,
        orden: l.orden,
      });
    }

    // Marcar factura como anulada (UPDATE estado_sunat='anulada' + anulada_por_id=nc.id)
    await tx
      .update(facturas)
      .set({
        estadoSunat: 'anulada',
        anuladaPorId: nc.id,
      })
      .where(eq(facturas.id, f.id));

    // Reversar movimientos de kardex (si era anulación total)
    if (data.motivoCodigo === '01' || data.motivoCodigo === '02') {
      const movs = await db.execute(sql`
        SELECT id FROM kardex_movimientos WHERE origen_tipo = 'factura' AND origen_id = ${f.id}
      `);
      for (const m of movs.rows) {
        await reversarMovimiento(tenant.id, Number(m.id), user.id);
      }
    }

    // Encolar envío NC a SUNAT
    await encolarEnvioSunat({
      tenantId: tenant.id,
      documentoTipo: 'nota_credito',
      documentoId: nc.id,
      payloadJson: { intento: 0 },
    });

    revalidatePath(`/${tenant.slug}/facturas/${f.id}`);
    return { success: true as const, data: { ncId: nc.id, numero: nc.numeroCompleto } };
  });
}
```

- [ ] **Step 2: AnularFacturaModal UI**

```typescript
// src/components/modules/facturas/AnularFacturaModal.tsx
'use client';
// Dialog con select motivo (catálogo 09/10) + textarea descripción
// Confirm: anularFactura action → toast con número NC generada
```

- [ ] **Step 3: Commit**

```bash
git add src/server/actions/facturas-anular.ts src/components/modules/facturas/AnularFacturaModal.tsx src/app/\(app\)/\[companySlug\]/facturas/\[id\]/anular/
git commit -m "feat(facturas): add anulacion via NC with kardex reversal"
```

---

## Task 10: Descarga PDF/XML/CDR de Storage

**Estimado**: 2h
**Agente**: `backend-developer`

- [ ] **Step 1: Helper de upload**

```typescript
// src/lib/sunat/storage.ts
import { createAdminClient } from '@/lib/supabase/admin';

export async function uploadCdrXmlPdf(tenantId: string, numeroCompleto: string, response: any) {
  const supabase = createAdminClient();
  const basePath = `${tenantId}/facturas/${numeroCompleto}`;
  const urls: Record<string, string> = {};

  if (response.cdr_zip_base64) {
    const buf = Buffer.from(response.cdr_zip_base64, 'base64');
    const { data } = await supabase.storage
      .from('documentos')
      .upload(`${basePath}/cdr.zip`, buf, { upsert: true });
    urls.cdr = supabase.storage
      .from('documentos')
      .getPublicUrl(`${basePath}/cdr.zip`).data.publicUrl;
  }
  if (response.xml_zip_base64) {
    const buf = Buffer.from(response.xml_zip_base64, 'base64');
    await supabase.storage
      .from('documentos')
      .upload(`${basePath}/factura.xml`, buf, { upsert: true });
    urls.xml = supabase.storage
      .from('documentos')
      .getPublicUrl(`${basePath}/factura.xml`).data.publicUrl;
  }
  if (response.pdf_zip_base64) {
    const buf = Buffer.from(response.pdf_zip_base64, 'base64');
    await supabase.storage
      .from('documentos')
      .upload(`${basePath}/factura.pdf`, buf, { upsert: true });
    urls.pdf = supabase.storage
      .from('documentos')
      .getPublicUrl(`${basePath}/factura.pdf`).data.publicUrl;
  }
  return urls;
}
```

- [ ] **Step 2: Botones de descarga en detalle factura**

```typescript
// En src/app/(app)/[companySlug]/facturas/[id]/page.tsx
{f.pdfUrl && <Button asChild><a href={f.pdfUrl} target="_blank">Descargar PDF</a></Button>}
{f.xmlUrl && <Button asChild><a href={f.xmlUrl} target="_blank">XML</a></Button>}
{f.cdrUrl && <Button asChild><a href={f.cdrUrl} target="_blank">CDR</a></Button>}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/sunat/storage.ts src/app/\(app\)/\[companySlug\]/facturas/\[id\]/page.tsx
git commit -m "feat(facturas): upload SUNAT artifacts to Storage and expose download buttons"
```

---

## Done criteria

- [ ] Factura emitida correctamente al sandbox NUBEFACT, CDR recibido vía webhook.
- [ ] Anulación emite NC con motivo "01 — Anulación", queda en DB con vínculo bidireccional.
- [ ] Tests con MSW cubren los 5 códigos SUNAT más comunes (2017, 2105, 2335, 4243, OK).
- [ ] Anular factura reversa los movimientos de kardex.
- [ ] Cliente bloqueado por crédito (B.10) NO permite emitir factura a crédito.
- [ ] Descarga PDF/XML/CDR funcional desde detalle.

## Notas

- **Boleta a consumidor final con DNI 00000000**: SUNAT lo permite. Validar que el form lo acepte.
- **Forma pago crédito**: requiere `cuotas[]` con número, fecha, monto. La suma de cuotas debe igualar el total.
- **NC parcial** (devolución por ítem): no anula la factura, solo emite NC con el subset de líneas devueltas. Implementar después del MVP.
- **Performance del cron**: cada 30s puede saturar si hay muchos retries. Considerar adaptive scheduling.
