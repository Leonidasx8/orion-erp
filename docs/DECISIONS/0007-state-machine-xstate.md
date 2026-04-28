# ADR 0007 — Máquinas de estado con xstate

**Estado**: Aceptado
**Fecha**: 2026-04-28

## Contexto

Múltiples flujos del sistema tienen estados con transiciones estrictas:

- Cotización: borrador → enviada → aprobada → convertida (o rechazada / vencida)
- Factura: borrador → pendiente_envio → enviada_sunat → aceptada (o rechazada / error)
- Guía: similar a factura
- OC: similar a cotización
- Pago de factura: pendiente → parcial → pagada (o vencida → cobranza_judicial)

Implementar esto con `if/else` y enums lleva a bugs sutiles (transiciones ilegales, estados huérfanos).

## Decisión

**xstate** para máquinas de estado complejas (más de 3 estados con transiciones condicionales).

## Razones

1. **Visualización**: cada máquina renderiza un diagrama navegable
2. **Tipos derivados**: el state es un type literal exhaustivo
3. **Guards y actions** explícitos
4. **Tests más fáciles**: testear transiciones es testear funciones puras

## Cuándo NO usar xstate

- Estados de UI simples (open/closed): useState basta
- Formularios: react-hook-form
- Server state: TanStack Query

## Ejemplo: cotización

```typescript
import { createMachine } from 'xstate';

export const cotizacionMachine = createMachine({
  id: 'cotizacion',
  initial: 'borrador',
  states: {
    borrador: {
      on: {
        ENVIAR: { target: 'enviada', guard: 'tieneLineas' },
        ELIMINAR: 'eliminada',
      },
    },
    enviada: {
      on: {
        APROBAR: 'aprobada',
        RECHAZAR: 'rechazada',
        VENCER: 'vencida', // automático por cron
      },
    },
    aprobada: {
      on: {
        CONVERTIR_A_FACTURA: 'convertida',
        CONVERTIR_A_OC: 'convertida',
      },
    },
    rechazada: { type: 'final' },
    vencida: {
      on: {
        REACTIVAR: 'enviada',
      },
    },
    convertida: { type: 'final' },
    eliminada: { type: 'final' },
  },
});
```

## Referencias

- <https://xstate.js.org/>
- `.gemini/antigravity/brain/06-modules-spec.md`
