/**
 * Validación pura de margen mínimo de un ítem de cotización contra un producto.
 * Separada del server action para hacerla testeable sin DB.
 *
 * Regla de negocio:
 *   margen% = (precioUnitario - costoUnitario) / costoUnitario * 100
 *   debe ser >= margenMinimo del producto.
 *
 * Casos en que la validación se omite (retorna ok):
 *   - El producto no tiene margenMinimo definido (null/undefined).
 *   - El producto no tiene costoUnitario (no podemos calcular margen).
 *   - El costoUnitario es 0 o negativo (división por cero / dato inválido).
 */

export interface ProductoParaMargen {
  nombre: string;
  costoUnitario: string | null | undefined; // numeric viene como string desde Drizzle
  margenMinimo: string | null | undefined;
}

export type ResultadoValidacionMargen =
  | { ok: true }
  | { ok: false; error: string; margenCalculado: number; margenMinimo: number };

export function validarMargenItem(
  precioUnitario: number,
  producto: ProductoParaMargen
): ResultadoValidacionMargen {
  if (producto.margenMinimo == null || producto.costoUnitario == null) return { ok: true };

  const costo = Number(producto.costoUnitario);
  if (!Number.isFinite(costo) || costo <= 0) return { ok: true };

  const minimo = Number(producto.margenMinimo);
  if (!Number.isFinite(minimo)) return { ok: true };

  const margen = ((precioUnitario - costo) / costo) * 100;

  if (margen < minimo) {
    return {
      ok: false,
      error: `Margen ${margen.toFixed(1)}% menor al mínimo ${minimo}% para "${producto.nombre}"`,
      margenCalculado: margen,
      margenMinimo: minimo,
    };
  }

  return { ok: true };
}
