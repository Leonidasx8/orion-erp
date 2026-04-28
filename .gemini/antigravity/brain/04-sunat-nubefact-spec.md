# 04 — Integración SUNAT vía NUBEFACT

> Este es el módulo más sensible del proyecto. Errores acá tienen consecuencias legales.
> Si vas a tocar este módulo, leé este archivo completo y los manuales oficiales antes.

## Decisión

**Proveedor: NUBEFACT** (PSE+OSE+ISO 27001).

- Razones en ADR 0003.
- Plan: Integración API (~S/ 70/mes por empresa).
- Endpoint base: `https://api.nubefact.com/api/v1/{token-empresa}`
- Manuales oficiales: <https://www.nubefact.com/integracion>

## Documentos a emitir

| Doc                            | Tipo SUNAT | Serie típica | Correlativo     |
| ------------------------------ | ---------- | ------------ | --------------- |
| Factura                        | 01         | F001         | autoincremental |
| Boleta                         | 03         | B001         | autoincremental |
| Nota de Crédito                | 07         | FC01 / BC01  | autoincremental |
| Nota de Débito                 | 08         | FD01 / BD01  | autoincremental |
| Guía de Remisión Remitente     | 09         | T001         | autoincremental |
| Guía de Remisión Transportista | 31         | V001         | autoincremental |

## Flujo de emisión de factura

```
1. Usuario crea factura en UI
2. Server Action valida con Zod
3. INSERT en `facturas` con estado='pendiente_envio'
4. Encolar job en `sunat_outbox` (tabla pgmq)
5. Edge Function `procesar-cola-sunat` corre cada 30s:
   a. Toma mensaje de la cola
   b. Construye payload JSON (formato Nubefact)
   c. POST a NUBEFACT con RUTA + TOKEN del tenant
   d. Si 200: guardar XML + CDR en Storage, actualizar factura.estado='aceptada_sunat'
   e. Si error: incrementar intentos, retry con backoff exponencial
   f. Si 5 intentos fallan: factura.estado='error_sunat', notificar al admin
6. Webhook NUBEFACT → cuando SUNAT confirma → actualizar factura.cdr_url
```

## Estados de un comprobante

```
borrador → pendiente_envio → enviada_sunat → aceptada_sunat
                                            ↘ rechazada_sunat
                          ↘ error_envio
aceptada_sunat → anulada (con nota de crédito vinculada)
```

## Idempotency

CRÍTICO: NUBEFACT puede haber procesado pero la respuesta llegar tarde.
Si reintentamos sin idempotency key, generamos factura duplicada (= problema con SUNAT).

Solución: el `serie + numero` ya es la idempotency key natural.
Antes de enviar, verificamos si la factura tiene `nubefact_response` guardada. Si sí, solo refrescamos el CDR sin reenviar.

## Numeración correlativa

NO usar `bigserial` global. Cada empresa tiene su correlativo por serie:

```sql
CREATE TABLE series_documentos (
  tenant_id uuid REFERENCES tenants(id),
  tipo_documento text NOT NULL,    -- '01', '03', '07', etc.
  serie text NOT NULL,             -- 'F001', 'B001', 'T001'
  correlativo_actual int NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, tipo_documento, serie)
);

-- Función atómica para reservar número
CREATE OR REPLACE FUNCTION reservar_correlativo(
  p_tenant_id uuid,
  p_tipo text,
  p_serie text
) RETURNS int LANGUAGE plpgsql AS $$
DECLARE
  v_numero int;
BEGIN
  UPDATE series_documentos
  SET correlativo_actual = correlativo_actual + 1
  WHERE tenant_id = p_tenant_id
    AND tipo_documento = p_tipo
    AND serie = p_serie
  RETURNING correlativo_actual INTO v_numero;
  RETURN v_numero;
END;
$$;
```

SUNAT detecta saltos en correlativos y los marca como sospechosos. **Nunca** dejes huecos.

## Almacenamiento legal (5 años)

Por ley peruana, los XMLs y CDRs deben conservarse 5 años.
NUBEFACT los guarda en su AWS por 5 años (incluido en el plan).
Adicionalmente, **nosotros también los descargamos** y guardamos en Supabase Storage como backup.

```
storage/sunat-archivos/
  {tenant_id}/
    {año}/
      {mes}/
        XML/{serie-numero}.xml
        CDR/{serie-numero}.zip
        PDF/{serie-numero}.pdf
```

## Anulación de comprobante

NO se borra el registro. Se emite una **Nota de Crédito** vinculada:

```
factura F001-00123  (estado=anulada, anulada_por_id=NC-FC01-00045)
       ↑
       └── nota_credito FC01-00045 (motivo=anulacion, factura_origen_id=F001-00123)
```

## Wrapper TypeScript

Vive en `src/lib/sunat/`:

```
src/lib/sunat/
├── nubefact-client.ts           Cliente HTTP con auth, retry, error handling
├── schemas/
│   ├── factura.schema.ts        Zod schema del payload + tipos
│   ├── boleta.schema.ts
│   ├── nota-credito.schema.ts
│   ├── guia-remision.schema.ts
│   └── catalogos-sunat.ts       Catálogos oficiales (tipo doc, monedas, unidades)
├── builders/
│   ├── build-factura.ts         Convierte modelo interno → JSON Nubefact
│   ├── build-boleta.ts
│   ├── build-nota-credito.ts
│   └── build-guia.ts
├── parsers/
│   └── parse-cdr.ts             Lee CDR XML para extraer info útil
└── errors.ts                    Clases de error SUNAT (con códigos)
```

## Códigos SUNAT importantes

| Código | Significado                           | Acción                           |
| ------ | ------------------------------------- | -------------------------------- |
| 0      | Aceptada                              | OK                               |
| 2017   | RUC del receptor no existe            | Validar RUC antes de enviar      |
| 2105   | Documento ya fue presentado           | Idempotency: traer estado actual |
| 2335   | Ubigeo inválido                       | Validar dirección del receptor   |
| 4243   | Detalle del comprobante inconsistente | Recalcular totales               |

## Catálogos SUNAT

Hardcodeados en `src/lib/sunat/schemas/catalogos-sunat.ts`. Importar de `erickorlando/openinvoiceperu` como referencia.

- **Catálogo 01** — Tipo de documento (01=Factura, 03=Boleta, 07=NC, 08=ND, 09=Guía remitente, 31=Guía transportista)
- **Catálogo 02** — Monedas (PEN, USD, EUR)
- **Catálogo 03** — Unidad de medida (NIU=Unidad, KGM=Kilogramo, MTR=Metro)
- **Catálogo 06** — Tipo de documento de identidad (1=DNI, 6=RUC, 4=CE, 7=Pasaporte)
- **Catálogo 07** — Tipo de afectación IGV (10=Gravado, 20=Exonerado, 30=Inafecto, 40=Exportación)
- **Catálogo 09** — Motivos de traslado de guía (01=Venta, 02=Compra, 04=Traslado entre estab., 13=Otros)
- **Catálogo 10** — Tipo de nota de crédito (01=Anulación, 02=Anulación por error en RUC, 06=Devolución por ítem, 07=Devolución total)
- **Catálogo 12** — Tipo de motivo de nota de débito (01=Intereses por mora, 02=Aumento en el valor, 03=Penalidades)

## Ejemplo de payload Nubefact (factura)

```json
{
  "operacion": "generar_comprobante",
  "tipo_de_comprobante": 1,
  "serie": "F001",
  "numero": 123,
  "sunat_transaction": 1,
  "cliente_tipo_de_documento": 6,
  "cliente_numero_de_documento": "20614847370",
  "cliente_denominacion": "GRUPO IDEX SAC",
  "cliente_direccion": "AV LARCO 1234 - MIRAFLORES - LIMA",
  "cliente_email": "contacto@grupoidex.com",
  "fecha_de_emision": "01-05-2026",
  "moneda": 1,
  "tipo_de_cambio": "",
  "porcentaje_de_igv": 18.0,
  "total_gravada": 100.0,
  "total_igv": 18.0,
  "total": 118.0,
  "items": [
    {
      "unidad_de_medida": "NIU",
      "codigo": "TER-50AWG-1/4",
      "descripcion": "Terminal compresión 1 hueco 50 AWG agujero 1/4",
      "cantidad": 10,
      "valor_unitario": 10.0,
      "precio_unitario": 11.8,
      "tipo_de_igv": 1,
      "total_base_igv": 100.0,
      "porcentaje_igv": 18.0,
      "total_igv": 18.0,
      "total": 118.0
    }
  ]
}
```

## Tests

- Mockear NUBEFACT con MSW (Mock Service Worker) en tests
- Snapshot tests del payload generado para detectar cambios accidentales
- E2E: emitir factura real al ambiente sandbox de NUBEFACT (si lo tienen) o usar fixtures

## Repos de referencia

- **Manuales JSON oficiales NUBEFACT**: la verdad absoluta del payload
- **`giansalex/lycet`**: modelo de datos de comprobantes (PHP, solo schema)
- **`erickorlando/openinvoiceperu`**: catálogos SUNAT (C#, traducir a TS)
- **`JoaoHenriqueBarbosa/FinOpenPOS`**: patrón "fiscal module separado del core" (Brasil, idea aplicable)
- **`tembo-io/pgmq`**: cola Postgres para reintentos
