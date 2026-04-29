# ADR 0003 — SUNAT vía NUBEFACT (no APISUNAT directo)

**Estado**: Aceptado (con confirmación de Lucas pendiente en Kickoff)
**Fecha**: 2026-04-28

## Contexto

El contrato (cláusula 3.2) menciona "APISUNAT u otro equivalente" como proveedor de facturación electrónica. Hay que elegir el proveedor real para implementar.

## Decisión

**NUBEFACT** como proveedor principal. Plan B: Efact.

## Análisis comparativo

| Criterio                     | NUBEFACT                  | APISUNAT        | Efact                |
| ---------------------------- | ------------------------- | --------------- | -------------------- |
| Certificación                | PSE + OSE + ISO 27001     | Solo PSE        | PSE + OSE            |
| Costo API mensual            | S/ 70 (~USD 18)           | S/ 30           | S/ 39.90 (Plus)      |
| Almacenamiento CDR           | 5 años en AWS             | No documentado  | Incluido             |
| Homologación SUNAT requerida | NO (proveedor homologado) | NO              | NO                   |
| Certificado digital          | Provisto                  | En plan 05      | Incluido             |
| Acceso API                   | Gratis (incluido)         | Gratis          | Gratis               |
| Documentación                | Manuales JSON oficiales   | Limitada        | Buena                |
| Soporte                      | Tickets + email           | Por programador | Telefónico + Anydesk |

## Razones de la elección

1. **Triple certificación** (PSE + OSE + ISO 27001) reduce riesgo legal
2. **Documentación pública y mantenida** (manuales JSON específicos por tipo de doc)
3. **Solo 3 elementos para integrar**: RUTA, TOKEN, JSON. Diseñado para integración rápida
4. **Backup CDR 5 años en AWS** — cumple requisito SUNAT
5. **Sin homologación adicional** — ahorra 7-10 días que SUNAT exige a emisores nuevos

## Alternativas descartadas

### APISUNAT

- ❌ Solo PSE, no OSE → menor certificación
- ❌ Almacenamiento de CDR no documentado
- ✅ Más barato, pero no compensa la diferencia de certificación

### Efact

- Plan B viable si NUBEFACT rechaza la cuenta o tarda
- Plus a S/ 39.90 más barato pero con menos features
- Mantener como fallback documentado

### SDK propio (greenter, openinvoiceperu)

- ❌ Requiere homologación SUNAT (~10 días) que no tenemos
- ❌ Mantener un cliente OSE custom es trabajo continuo
- ❌ No viable para el plazo del contrato

## Confirmación necesaria

Lucas debe contratar NUBEFACT para Idex y Agroalves antes del Día 16. Si rechaza el costo o prefiere Efact, ajustamos. Cláusula 3.2 del contrato ("u otro equivalente") permite el cambio sin renegociación.

## Consecuencias

- Costo recurrente para el cliente: ~S/ 140/mes (2 empresas)
- Wrapper TypeScript en `src/lib/sunat/nubefact-client.ts`
- Cola de reintentos con `pgmq` por si NUBEFACT está caído
- Backup local de XMLs/CDRs en Supabase Storage (defensa en profundidad)
- Si NUBEFACT cierra el negocio mañana, podemos migrar a Efact con cambios localizados (todo el resto del sistema usa una interfaz interna `SunatProvider`)

## Referencias

- <https://www.nubefact.com/integracion>
- Manuales JSON oficiales: linkados desde la web NUBEFACT
- `.gemini/antigravity/brain/04-sunat-nubefact-spec.md`
