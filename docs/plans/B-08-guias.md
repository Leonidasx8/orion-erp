# B.8 — Guías de Remisión Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` o `superpowers:executing-plans`.

**Goal:** Emisión de Guías de Remisión Remitente (tipo SUNAT '09') y Transportista (tipo '31') vía API NUBEFACT, con cola de reintentos `pgmq`, manejo de webhook CDR, descarga de XML/PDF/CDR de Storage.

**Architecture:** Wrapper NUBEFACT (`src/lib/sunat/nubefact-client.ts`). Cola `sunat_outbox` (pgmq) consumida por Edge Function cada 30s. Idempotency por `(serie, numero)`. Webhook NUBEFACT → endpoint `/api/webhooks/nubefact` que actualiza `cdr_url`. Series y correlativos en `series_documentos` (compartido con B.9).

**Tech Stack:** pgmq, Supabase Edge Functions (Deno), Drizzle, Zod, MSW para tests.

**Estimación**: 22h — 8 tareas.

**Dependencias upstream**: B.5 (cotizaciones, opcional referencia) + B.7 (kardex registra salida) + **credenciales sandbox NUBEFACT**.
**Dependencias downstream**: B.9 (factura, reusa toda la infra).

---

## File structure

```
supabase/migrations/
├── 0028_series_documentos.sql             # compartido SUNAT
├── 0029_sunat_outbox.sql                  # pgmq queue
├── 0030_guias_schema.sql
├── 0031_transportistas_vehiculos.sql
└── 0032_catalogos_sunat_seed.sql

supabase/functions/
└── procesar-cola-sunat/                   # Edge Function
    └── index.ts

src/lib/db/schema/
├── series-documentos.ts
├── guias-remision.ts
├── lineas-guia.ts
├── transportistas.ts
└── vehiculos-transporte.ts

src/lib/sunat/
├── nubefact-client.ts                     # HTTP wrapper
├── catalogos-sunat.ts                     # constantes (catálogo 01, 06, 07, 09, 10, 12)
├── schemas/
│   ├── guia-remitente.schema.ts
│   ├── guia-transportista.schema.ts
│   └── nubefact-response.schema.ts
├── builders/
│   ├── build-guia-remitente.ts
│   └── build-guia-transportista.ts
├── parsers/
│   └── parse-cdr.ts
└── errors.ts

src/server/actions/
├── guias.ts
├── transportistas.ts
└── vehiculos.ts

src/app/api/webhooks/nubefact/
└── route.ts                               # webhook receiver

src/app/(app)/[companySlug]/guias/
├── page.tsx
├── nueva/page.tsx
├── [id]/page.tsx
└── configuracion/
    ├── transportistas/page.tsx
    └── vehiculos/page.tsx

src/components/modules/guias/
├── GuiasList.tsx
├── GuiaForm.tsx
└── EstadoSunatBadge.tsx
```

---

## Task 1: Schema guías + transportistas + vehículos + RLS

**Estimado**: 3h
**Agente**: `schema-builder`

- [ ] **Step 1: Migrations**

```sql
-- 0030_guias_schema.sql
CREATE TABLE guias_remision (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo_documento text NOT NULL,                  -- '09' remitente | '31' transportista
  serie text NOT NULL,                           -- 'T001' o 'V001'
  numero int NOT NULL,
  numero_completo text GENERATED ALWAYS AS (serie || '-' || lpad(numero::text, 8, '0')) STORED,
  fecha_emision date NOT NULL DEFAULT current_date,
  fecha_inicio_traslado date NOT NULL,
  remitente_id uuid REFERENCES clientes(id),     -- emisor (puede ser el tenant mismo o un cliente)
  destinatario_id uuid REFERENCES clientes(id),  -- a quien se envía
  transportista_id uuid REFERENCES transportistas(id),
  vehiculo_id uuid REFERENCES vehiculos_transporte(id),
  motivo_traslado text NOT NULL,                 -- catálogo 09: '01'/'02'/'04'/'13'
  descripcion_motivo text,
  modalidad_traslado text NOT NULL,              -- '01' transporte público / '02' privado
  peso_bruto_total numeric(10,2),
  unidad_peso text DEFAULT 'KGM',
  numero_bultos int,
  direccion_partida text NOT NULL,
  ubigeo_partida text NOT NULL,
  direccion_llegada text NOT NULL,
  ubigeo_llegada text NOT NULL,
  estado_sunat text NOT NULL DEFAULT 'borrador', -- borrador | pendiente_envio | enviada | aceptada | rechazada | error_envio | anulada
  cdr_url text,
  xml_url text,
  pdf_url text,
  nubefact_response jsonb,
  observaciones text,
  factura_relacionada_id uuid,                   -- FK a facturas (si aplica)
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  UNIQUE (tenant_id, tipo_documento, serie, numero)
);
CREATE INDEX guias_tenant_idx ON guias_remision(tenant_id);
CREATE INDEX guias_estado_sunat_idx ON guias_remision(estado_sunat);

CREATE TABLE lineas_guia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guia_id uuid NOT NULL REFERENCES guias_remision(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES productos(id),
  sku_snapshot text NOT NULL,
  descripcion text NOT NULL,
  cantidad numeric(10,2) NOT NULL CHECK (cantidad > 0),
  unidad_medida text NOT NULL DEFAULT 'NIU',
  orden int NOT NULL DEFAULT 0
);

ALTER TABLE guias_remision ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guias_tenant_isolation" ON guias_remision FOR ALL
USING (tenant_id = current_tenant_id());

ALTER TABLE lineas_guia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lineas_guia_via_guia" ON lineas_guia FOR ALL
USING (guia_id IN (SELECT id FROM guias_remision WHERE tenant_id = current_tenant_id()));

-- 0031_transportistas_vehiculos.sql
CREATE TABLE transportistas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ruc text NOT NULL,
  razon_social text NOT NULL,
  nombre_comercial text,
  numero_mtc text,                               -- registro Ministerio de Transporte
  estado text DEFAULT 'activo',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, ruc)
);

CREATE TABLE vehiculos_transporte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transportista_id uuid REFERENCES transportistas(id),
  placa text NOT NULL,
  marca text,
  modelo text,
  capacidad_kg numeric(10,2),
  configuracion_vehicular text,                  -- T1S2, T2S3, etc.
  estado text DEFAULT 'activo',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, placa)
);

ALTER TABLE transportistas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transp_tenant" ON transportistas FOR ALL USING (tenant_id = current_tenant_id());

ALTER TABLE vehiculos_transporte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "veh_tenant" ON vehiculos_transporte FOR ALL USING (tenant_id = current_tenant_id());
```

- [ ] **Step 2: Drizzle schemas + Zod (estándar)**

- [ ] **Step 3: Commit**

```bash
pnpm db:migrate
git add supabase/migrations/0030_guias_schema.sql supabase/migrations/0031_transportistas_vehiculos.sql src/lib/db/schema/guias-remision.ts src/lib/db/schema/lineas-guia.ts src/lib/db/schema/transportistas.ts src/lib/db/schema/vehiculos-transporte.ts
git commit -m "feat(guias): add guias_remision, transportistas, vehiculos schemas"
```

---

## Task 2: Schema `series_documentos` + `reservar_correlativo()`

**Estimado**: 2h
**Agente**: `schema-builder`

- [ ] **Step 1: Migration**

```sql
-- 0028_series_documentos.sql
CREATE TABLE series_documentos (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo_documento text NOT NULL,                  -- catálogo 01
  serie text NOT NULL,                           -- 'F001', 'B001', 'T001', 'V001'
  correlativo_actual int NOT NULL DEFAULT 0,
  activa boolean NOT NULL DEFAULT true,
  PRIMARY KEY (tenant_id, tipo_documento, serie)
);

CREATE OR REPLACE FUNCTION reservar_correlativo(
  p_tenant_id uuid,
  p_tipo_documento text,
  p_serie text
) RETURNS int LANGUAGE plpgsql AS $$
DECLARE v_n int;
BEGIN
  UPDATE series_documentos
  SET correlativo_actual = correlativo_actual + 1
  WHERE tenant_id = p_tenant_id
    AND tipo_documento = p_tipo_documento
    AND serie = p_serie
    AND activa = true
  RETURNING correlativo_actual INTO v_n;

  IF v_n IS NULL THEN
    RAISE EXCEPTION 'serie_no_encontrada: tenant=% tipo=% serie=%', p_tenant_id, p_tipo_documento, p_serie;
  END IF;

  RETURN v_n;
END;
$$;

GRANT EXECUTE ON FUNCTION reservar_correlativo(uuid, text, text) TO authenticated;

-- RLS
ALTER TABLE series_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "series_tenant" ON series_documentos FOR SELECT USING (tenant_id = current_tenant_id());
```

- [ ] **Step 2: Test concurrencia (100 reserves no producen huecos)**

```typescript
it('reservar_correlativo es atómico', async () => {
  // Setear correlativo en 0
  await db.execute(
    sql`INSERT INTO series_documentos (tenant_id, tipo_documento, serie, correlativo_actual) VALUES (${tenantId}, '09', 'T001', 0) ON CONFLICT DO NOTHING`
  );
  const results = await Promise.all(
    Array.from({ length: 100 }, () =>
      db.execute(sql`SELECT reservar_correlativo(${tenantId}, '09', 'T001') AS n`)
    )
  );
  const numeros = results.map((r) => Number(r.rows[0].n)).sort((a, b) => a - b);
  expect(numeros).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
});
```

- [ ] **Step 3: Commit**

```bash
pnpm db:migrate && pnpm test:integration tests/integration/sunat/series.test.ts
git add supabase/migrations/0028_series_documentos.sql tests/integration/sunat/series.test.ts
git commit -m "feat(sunat): add series_documentos with atomic reservar_correlativo"
```

---

## Task 3: Schema `sunat_outbox` (pgmq queue)

**Estimado**: 2h
**Agente**: `schema-builder`

- [ ] **Step 1: Migration**

```sql
-- 0029_sunat_outbox.sql
SELECT pgmq.create('sunat_outbox');

-- Tabla auxiliar para tracking de intentos
CREATE TABLE sunat_envios_log (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  documento_tipo text NOT NULL,                  -- 'guia_remitente', 'factura', etc.
  documento_id uuid NOT NULL,
  intento int NOT NULL,
  resultado text NOT NULL,                       -- 'ok' | 'error_red' | 'error_sunat' | 'idempotency_skip'
  sunat_codigo int,
  sunat_mensaje text,
  payload_snapshot jsonb,
  ejecutado_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sunat_envios_log_doc_idx ON sunat_envios_log(documento_tipo, documento_id, intento);
```

- [ ] **Step 2: Helper para encolar**

```typescript
// src/lib/sunat/queue.ts
import 'server-only';
import { db } from '@/lib/db/client';
import { sql } from 'drizzle-orm';

export async function encolarEnvioSunat(payload: {
  tenantId: string;
  documentoTipo: string;
  documentoId: string;
  payloadJson: any;
}) {
  return db.execute(sql`
    SELECT * FROM pgmq.send('sunat_outbox', ${JSON.stringify(payload)}::jsonb)
  `);
}
```

- [ ] **Step 3: Commit**

```bash
pnpm db:migrate
git add supabase/migrations/0029_sunat_outbox.sql src/lib/sunat/queue.ts
git commit -m "feat(sunat): add pgmq queue and envios_log for retry"
```

---

## Task 4: Wrapper NUBEFACT (builder + sender de guías)

**Estimado**: 4h
**Agente**: `sunat-integrator`

- [ ] **Step 1: Catálogos + errors**

```typescript
// src/lib/sunat/catalogos-sunat.ts
export const TIPO_DOCUMENTO = {
  FACTURA: '01',
  BOLETA: '03',
  NOTA_CREDITO: '07',
  NOTA_DEBITO: '08',
  GUIA_REMITENTE: '09',
  GUIA_TRANSPORTISTA: '31',
} as const;

export const MOTIVO_TRASLADO = {
  VENTA: '01',
  COMPRA: '02',
  TRASLADO_ENTRE_ESTAB: '04',
  EXPORTACION: '05',
  IMPORTACION: '06',
  OTROS: '13',
} as const;

export const MODALIDAD_TRASLADO = {
  TRANSPORTE_PUBLICO: '01',
  TRANSPORTE_PRIVADO: '02',
} as const;

export const TIPO_DOC_IDENTIDAD = {
  DNI: '1',
  CARNET_EXTRANJERIA: '4',
  RUC: '6',
  PASAPORTE: '7',
} as const;

// src/lib/sunat/errors.ts
export class SunatError extends Error {
  constructor(
    public sunatCode: number,
    message: string,
    public payload?: any
  ) {
    super(message);
    this.name = 'SunatError';
  }
}
export class IdempotencySkipError extends Error {
  constructor(public existingResponse: any) {
    super('Idempotency: documento ya procesado por NUBEFACT');
    this.name = 'IdempotencySkipError';
  }
}
```

- [ ] **Step 2: Builder de payload guía remitente**

```typescript
// src/lib/sunat/builders/build-guia-remitente.ts
import type {
  GuiaRemision,
  LineaGuia,
  Cliente,
  Transportista,
  VehiculoTransporte,
} from '@/lib/db/schema';
import { TIPO_DOCUMENTO, MODALIDAD_TRASLADO } from '../catalogos-sunat';

export type NubefactPayloadGuia = {
  operacion: 'generar_guia';
  tipo_de_comprobante: number; // 9
  serie: string;
  numero: number;
  cliente_tipo_de_documento: number;
  cliente_numero_de_documento: string;
  cliente_denominacion: string;
  cliente_direccion: string;
  fecha_de_emision: string; // 'DD-MM-YYYY'
  fecha_de_inicio_de_traslado: string;
  motivo_de_traslado: string;
  descripcion_del_motivo_de_traslado?: string;
  peso_bruto_total: number;
  unidad_de_medida_peso_bruto: string;
  numero_de_bultos: number;
  modalidad_de_traslado: string;
  transportista_documento_tipo?: number;
  transportista_documento_numero?: string;
  transportista_denominacion?: string;
  conductor_documento_tipo?: number;
  conductor_documento_numero?: string;
  conductor_denominacion?: string;
  conductor_nombre?: string;
  conductor_apellidos?: string;
  conductor_numero_licencia?: string;
  vehiculo_marca?: string;
  vehiculo_placa?: string;
  numero_de_certificado_de_inscripcion?: string;
  punto_de_partida_ubigeo: string;
  punto_de_partida_direccion: string;
  punto_de_llegada_ubigeo: string;
  punto_de_llegada_direccion: string;
  items: Array<{
    unidad_de_medida: string;
    codigo: string;
    descripcion: string;
    cantidad: number;
  }>;
};

export function buildGuiaRemitente(input: {
  guia: GuiaRemision;
  destinatario: Cliente;
  lineas: LineaGuia[];
  transportista?: Transportista;
  vehiculo?: VehiculoTransporte;
}): NubefactPayloadGuia {
  const { guia, destinatario, lineas, transportista, vehiculo } = input;
  const formatDate = (d: string | Date) => {
    const date = typeof d === 'string' ? new Date(d) : d;
    return `${String(date.getUTCDate()).padStart(2, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${date.getUTCFullYear()}`;
  };

  return {
    operacion: 'generar_guia',
    tipo_de_comprobante: 9,
    serie: guia.serie,
    numero: guia.numero,
    cliente_tipo_de_documento: parseInt(destinatario.tipoDocumento),
    cliente_numero_de_documento: destinatario.numeroDocumento,
    cliente_denominacion: destinatario.razonSocial,
    cliente_direccion: destinatario.direccionFiscal ?? '',
    fecha_de_emision: formatDate(guia.fechaEmision),
    fecha_de_inicio_de_traslado: formatDate(guia.fechaInicioTraslado),
    motivo_de_traslado: guia.motivoTraslado,
    descripcion_del_motivo_de_traslado: guia.descripcionMotivo ?? undefined,
    peso_bruto_total: Number(guia.pesoBrutoTotal ?? 0),
    unidad_de_medida_peso_bruto: guia.unidadPeso ?? 'KGM',
    numero_de_bultos: guia.numeroBultos ?? 0,
    modalidad_de_traslado: guia.modalidadTraslado,
    transportista_documento_tipo: transportista ? 6 : undefined,
    transportista_documento_numero: transportista?.ruc,
    transportista_denominacion: transportista?.razonSocial,
    vehiculo_placa: vehiculo?.placa,
    punto_de_partida_ubigeo: guia.ubigeoPartida,
    punto_de_partida_direccion: guia.direccionPartida,
    punto_de_llegada_ubigeo: guia.ubigeoLlegada,
    punto_de_llegada_direccion: guia.direccionLlegada,
    items: lineas.map((l) => ({
      unidad_de_medida: l.unidadMedida ?? 'NIU',
      codigo: l.skuSnapshot,
      descripcion: l.descripcion,
      cantidad: Number(l.cantidad),
    })),
  };
}
```

- [ ] **Step 3: nubefact-client (HTTP)**

```typescript
// src/lib/sunat/nubefact-client.ts
import 'server-only';
import { decrypt } from '@/lib/crypto';
import { SunatError, IdempotencySkipError } from './errors';
import type { Tenant } from '@/lib/db/schema';

export async function postNubefact(tenant: Tenant, payload: any): Promise<any> {
  const config = tenant.configSunat as { ruta: string; token: string };
  const tokenDecrypted = decrypt(config.token);

  const res = await fetch(config.ruta, {
    method: 'POST',
    headers: {
      Authorization: `Token token="${tokenDecrypted}"`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (json.errors) {
    // Códigos SUNAT en json.codigo o json.errors[0].codigo
    const code = json.codigo ?? json.errors?.[0]?.codigo ?? 0;
    const msg = json.errors === '' ? json.errors : JSON.stringify(json.errors);

    if (code === 2105) {
      // Documento ya presentado: NO reintentar, marcar como aceptado
      throw new IdempotencySkipError(json);
    }
    throw new SunatError(code, msg, json);
  }

  return json;
}
```

- [ ] **Step 4: Schema response**

```typescript
// src/lib/sunat/schemas/nubefact-response.schema.ts
import { z } from 'zod';

export const NubefactSuccessSchema = z.object({
  aceptada_por_sunat: z.boolean(),
  sunat_description: z.string(),
  sunat_note: z.string(),
  sunat_responsecode: z.string(),
  sunat_soap_error: z.string().optional(),
  pdf_zip_base64: z.string().optional(),
  xml_zip_base64: z.string().optional(),
  cdr_zip_base64: z.string().optional(),
  enlace: z.string().optional(),
  enlace_del_pdf: z.string().optional(),
  enlace_del_xml: z.string().optional(),
  enlace_del_cdr: z.string().optional(),
});

export type NubefactSuccess = z.infer<typeof NubefactSuccessSchema>;
```

- [ ] **Step 5: Test con MSW**

```typescript
// tests/unit/sunat/builder.test.ts
it('build-guia-remitente produce payload completo', () => {
  const payload = buildGuiaRemitente({
    guia: { serie: 'T001', numero: 1 /* ... */ } as any,
    destinatario: {
      /* ... */
    } as any,
    lineas: [
      {
        skuSnapshot: 'TER-50',
        descripcion: 'Terminal',
        cantidad: '10',
        unidadMedida: 'NIU',
      } as any,
    ],
  });
  expect(payload.tipo_de_comprobante).toBe(9);
  expect(payload.items).toHaveLength(1);
});

// tests/integration/sunat/nubefact-mock.test.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.post('https://api.nubefact.com/api/v1/test', () => {
    return HttpResponse.json({
      aceptada_por_sunat: true,
      sunat_description: 'La Guia de Remision T001-1, ha sido aceptada',
      sunat_note: '',
      sunat_responsecode: '0',
      enlace_del_pdf: 'https://demo.nubefact.com/cpe/pdf/abc.pdf',
      enlace_del_xml: 'https://demo.nubefact.com/cpe/xml/abc.xml',
      enlace_del_cdr: 'https://demo.nubefact.com/cpe/cdr/abc.zip',
    });
  })
);

it('postNubefact retorna respuesta válida', async () => {
  const res = await postNubefact(mockTenant, {});
  expect(res.aceptada_por_sunat).toBe(true);
});
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/sunat/ tests/unit/sunat/ tests/integration/sunat/
git commit -m "feat(sunat): add NUBEFACT client, builders, and schemas with MSW tests"
```

---

## Task 5: Edge Function `procesar-cola-sunat`

**Estimado**: 3h
**Agente**: `sunat-integrator`

- [ ] **Step 1: Edge Function**

```typescript
// supabase/functions/procesar-cola-sunat/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Deno } from '...';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const MAX_INTENTOS = 5;
const BACKOFF_BASE_MS = 30_000;

Deno.serve(async () => {
  // Leer hasta 10 mensajes de la cola
  const { data: msgs } = await supabase.rpc('pgmq_read', {
    queue_name: 'sunat_outbox',
    vt: 60,
    qty: 10,
  });

  for (const msg of msgs ?? []) {
    const payload = msg.message;
    try {
      // Llamar al endpoint propio /api/internal/procesar-sunat con auth interna
      const res = await fetch(`${Deno.env.get('APP_URL')}/api/internal/procesar-sunat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': Deno.env.get('INTERNAL_TOKEN')!,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Eliminar mensaje de la cola
        await supabase.rpc('pgmq_delete', { queue_name: 'sunat_outbox', msg_id: msg.msg_id });
      } else if (res.status === 409) {
        // Idempotency skip
        await supabase.rpc('pgmq_delete', { queue_name: 'sunat_outbox', msg_id: msg.msg_id });
      } else {
        // Error: incrementar visibility timeout (backoff exponencial)
        const intento = (payload.intento ?? 0) + 1;
        if (intento >= MAX_INTENTOS) {
          // Mover a DLQ o marcar definitivamente
          await supabase.from('sunat_envios_log').insert({
            tenant_id: payload.tenantId,
            documento_tipo: payload.documentoTipo,
            documento_id: payload.documentoId,
            intento,
            resultado: 'error_max_intentos',
          });
          await supabase.rpc('pgmq_delete', { queue_name: 'sunat_outbox', msg_id: msg.msg_id });
        } else {
          // Visibility timeout: backoff exponencial
          const vt = (BACKOFF_BASE_MS * Math.pow(2, intento)) / 1000;
          await supabase.rpc('pgmq_set_vt', { queue_name: 'sunat_outbox', msg_id: msg.msg_id, vt });
        }
      }
    } catch (err) {
      console.error(err);
    }
  }
  return new Response('ok');
});
```

- [ ] **Step 2: Schedule cron cada 30s**

```sql
SELECT cron.schedule(
  'procesar-sunat',
  '*/30 * * * * *',  -- cada 30s (requires pg_cron 1.5+)
  $$SELECT net.http_post(
    url := 'https://<project>.supabase.co/functions/v1/procesar-cola-sunat',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.cron_token'))
  )$$
);
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/procesar-cola-sunat/
git commit -m "feat(sunat): add edge function to process retry queue with exponential backoff"
```

---

## Task 6: Webhook NUBEFACT (CDR confirmation)

**Estimado**: 2h
**Agente**: `sunat-integrator`

- [ ] **Step 1: Endpoint webhook**

```typescript
// src/app/api/webhooks/nubefact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { guiasRemision } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  // NUBEFACT envía un secret en header (configurar en Nubefact dashboard)
  const secret = req.headers.get('x-nubefact-secret');
  if (secret !== process.env.NUBEFACT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  // body: { tipo_de_comprobante, serie, numero, enlace_del_cdr, sunat_responsecode }

  // Buscar el documento por (tipo, serie, numero) — necesitamos el tenant también
  // Si NUBEFACT no manda tenant, hay que tener un mapping ruc-emisor → tenant_id
  const { tipo_de_comprobante, serie, numero, enlace_del_cdr } = body;

  if (tipo_de_comprobante === 9 || tipo_de_comprobante === 31) {
    await db
      .update(guiasRemision)
      .set({
        cdrUrl: enlace_del_cdr,
        estadoSunat: 'aceptada',
        updatedAt: new Date(),
      })
      .where(and(eq(guiasRemision.serie, serie), eq(guiasRemision.numero, numero)));
  }

  // (Caso facturas se maneja en B.9)

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/webhooks/nubefact/
git commit -m "feat(sunat): add NUBEFACT webhook for CDR confirmation"
```

---

## Task 7: UI form guía + listado + estado SUNAT

**Estimado**: 4h
**Agente**: `frontend-developer`

- [ ] **Step 1: GuiaForm**

Form con: tipo (remitente/transportista), destinatario (combobox cliente), motivo traslado (catálogo 09 select), modalidad, fecha inicio, partida (dirección + ubigeo), llegada (dirección + ubigeo), peso, bultos, transportista (si modalidad=público), vehículo, líneas (LineasTable reusada de B.5/B.6).

- [ ] **Step 2: Server Action `emitirGuia`**

```typescript
// src/server/actions/guias.ts
'use server';
export async function emitirGuia(input: GuiaInput) {
  const { user, tenant } = await requirePermission('guias.crear');
  const data = GuiaSchema.parse(input);

  return db.transaction(async (tx) => {
    // Reservar correlativo
    const numero = await tx.execute(
      sql`SELECT reservar_correlativo(${tenant.id}, ${data.tipoDocumento}, ${data.serie}) AS n`
    );
    // Insertar guía
    const [g] = await tx
      .insert(guiasRemision)
      .values({
        /* ... */
      })
      .returning();
    // Insertar líneas
    for (const l of data.lineas)
      await tx.insert(lineasGuia).values({
        /* ... */
      });
    // Encolar envío SUNAT
    await encolarEnvioSunat({
      tenantId: tenant.id,
      documentoTipo: 'guia',
      documentoId: g.id,
      payloadJson: {},
    });
    revalidatePath(`/${tenant.slug}/guias`);
    return { success: true as const, data: g };
  });
}

export async function reintentarEnvioSunat(guiaId: string) {
  await requirePermission('facturas.reenviar_sunat');
  const [g] = await db.select().from(guiasRemision).where(eq(guiasRemision.id, guiaId));
  // Encolar de nuevo
  await encolarEnvioSunat({
    /* ... */
  });
  return { success: true as const, data: null };
}
```

- [ ] **Step 3: GuiasList con badge de estado SUNAT**

```typescript
// src/components/modules/guias/EstadoSunatBadge.tsx
const STATES = {
  borrador: { label: 'Borrador', variant: 'secondary' },
  pendiente_envio: { label: 'En cola', variant: 'outline' },
  enviada: { label: 'Enviada', variant: 'default' },
  aceptada: { label: 'Aceptada SUNAT', variant: 'default' }, // verde
  rechazada: { label: 'Rechazada', variant: 'destructive' },
  error_envio: { label: 'Error', variant: 'destructive' },
  anulada: { label: 'Anulada', variant: 'secondary' },
};
```

- [ ] **Step 4: Commit**

```bash
git add src/components/modules/guias/ src/app/\(app\)/\[companySlug\]/guias/ src/server/actions/guias.ts
git commit -m "feat(guias): add UI for guia issuance, list, and retry"
```

---

## Task 8: UI configuración transportistas y vehículos

**Estimado**: 2h
**Agente**: `frontend-developer`

- [ ] **Step 1: CRUD transportistas + vehiculos** (pattern estándar, formularios + tabla)

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/\[companySlug\]/guias/configuracion/ src/server/actions/transportistas.ts src/server/actions/vehiculos.ts
git commit -m "feat(guias): add transportistas and vehiculos configuration"
```

---

## Done criteria

- [ ] Guía emitida correctamente al sandbox NUBEFACT, CDR recibido vía webhook.
- [ ] Reintento manual desde UI funciona y NO duplica.
- [ ] Test E2E: emitir guía + simular fallo NUBEFACT (MSW) + retry automático con backoff.
- [ ] Idempotency: 2 envíos del mismo (serie+numero) → segundo retorna existente sin POST.
- [ ] 100 guías concurrentes con `reservar_correlativo` → 100 números únicos sin huecos.

## Notas

- **Sandbox NUBEFACT**: bloqueante. Sin esto, todo se prueba con MSW. Riesgo de divergencia.
- **Catálogo 09 (motivo traslado)**: 4 valores principales. Si SUNAT agrega códigos, actualizar `MOTIVO_TRASLADO` en `catalogos-sunat.ts`.
- **CDR storage**: NUBEFACT guarda 5 años. Nosotros descargamos como backup (ver `04-sunat-nubefact-spec.md` líneas 100-108).
- **Tenant resolución en webhook**: el webhook viene desde NUBEFACT sin saber qué tenant es. Resolución por (tipo+serie+numero) que es único en plataforma porque cada tenant tiene su propia config NUBEFACT (token diferente).
