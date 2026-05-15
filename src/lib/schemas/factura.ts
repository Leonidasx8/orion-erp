import { z } from 'zod';

const IGV_RATE = 0.18;

export const lineaFacturaSchema = z.object({
  productoId: z.string().uuid().optional(),
  descripcion: z.string().min(1, 'Descripción requerida'),
  codigo: z.string().min(1, 'SKU requerido'),
  unidadMedida: z.string().default('NIU'),
  cantidad: z.number().positive('Cantidad debe ser positiva'),
  // precio que ve el cliente (con IGV para gravado, sin IGV para exonerado/inafecto)
  precioUnitario: z.number().positive('Precio debe ser positivo'),
  // catálogo 07 SUNAT: '10' gravado, '20' exonerado, '30' inafecto, '40' exportación
  tipoAfectacionIgv: z.enum(['10', '20', '30', '40']).default('10'),
});

export type LineaFacturaInput = z.infer<typeof lineaFacturaSchema>;

export const crearFacturaSchema = z.object({
  tipoDocumento: z.enum(['01', '03']), // '01' factura, '03' boleta
  serie: z.string().regex(/^[A-Z]\d{3}$/, 'Serie inválida, ej: F001 o B001'),
  clienteId: z.string().uuid(),
  fechaEmision: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  fechaVencimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  moneda: z.enum(['PEN', 'USD']).default('PEN'),
  tipoCambio: z.number().positive().optional(),
  formaPago: z.enum(['contado', 'credito']).default('contado'),
  observaciones: z.string().optional(),
  cotizacionOrigenId: z.string().uuid().optional(),
  items: z.array(lineaFacturaSchema).min(1, 'Debe incluir al menos un item'),
});

export type CrearFacturaInput = z.infer<typeof crearFacturaSchema>;

// ─── helpers de cálculo ─────────────────────────────────────────────────────

const round4 = (n: number) => Math.round(n * 10000) / 10000;

export interface LineaCalculada {
  valorUnitario: number; // sin IGV
  precioUnitario: number; // con IGV (= input para gravado, o igual a valorUnitario para exonerado)
  baseImponible: number; // totalBaseIgv
  igvLinea: number;
  totalLinea: number;
}

export function calcularLinea(item: LineaFacturaInput): LineaCalculada {
  const gravado = item.tipoAfectacionIgv === '10';
  const exportacion = item.tipoAfectacionIgv === '40';

  const valorUnitario = gravado
    ? round4(item.precioUnitario / (1 + IGV_RATE))
    : item.precioUnitario;
  const baseImponible = round4(valorUnitario * item.cantidad);
  const igvLinea = gravado ? round4(baseImponible * IGV_RATE) : 0;
  const totalLinea = round4(baseImponible + igvLinea);

  // Exportación: precio = valorUnitario (sin IGV, tasa 0)
  const precioConIgv = gravado ? item.precioUnitario : exportacion ? valorUnitario : valorUnitario;

  return {
    valorUnitario,
    precioUnitario: precioConIgv,
    baseImponible,
    igvLinea,
    totalLinea,
  };
}

export interface TotalesFactura {
  totalGravadas: number;
  totalExoneradas: number;
  totalInafectas: number;
  totalGratuitas: number;
  igv: number;
  total: number;
}

export function calcularTotalesFactura(items: LineaFacturaInput[]): TotalesFactura {
  let totalGravadas = 0;
  let totalExoneradas = 0;
  let totalInafectas = 0;
  let igv = 0;

  for (const item of items) {
    const { baseImponible, igvLinea } = calcularLinea(item);
    if (item.tipoAfectacionIgv === '10') {
      totalGravadas += baseImponible;
      igv += igvLinea;
    } else if (item.tipoAfectacionIgv === '20') {
      totalExoneradas += baseImponible;
    } else if (item.tipoAfectacionIgv === '30') {
      totalInafectas += baseImponible;
    }
  }

  const r2 = (n: number) => Math.round(n * 100) / 100;
  totalGravadas = r2(totalGravadas);
  totalExoneradas = r2(totalExoneradas);
  totalInafectas = r2(totalInafectas);
  igv = r2(igv);

  return {
    totalGravadas,
    totalExoneradas,
    totalInafectas,
    totalGratuitas: 0,
    igv,
    total: r2(totalGravadas + igv + totalExoneradas + totalInafectas),
  };
}
