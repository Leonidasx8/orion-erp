import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { getCurrentTenant } from '@/lib/auth/current-tenant';

const ENCABEZADOS = [
  { header: 'RUC / DNI', width: 16 },
  { header: 'Razón social (empresas)', width: 38 },
  { header: 'Nombres (personas)', width: 24 },
  { header: 'Apellido paterno', width: 18 },
  { header: 'Apellido materno', width: 18 },
  { header: 'Email', width: 28 },
  { header: 'Teléfono', width: 16 },
  { header: 'Línea de crédito (USD)', width: 20 },
  { header: 'Plazo de pago (contado/15/30/60)', width: 28 },
  { header: 'Dirección fiscal', width: 40 },
  { header: 'Notas', width: 30 },
];

export async function GET() {
  try {
    await getCurrentTenant();
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const wb = new ExcelJS.Workbook();

  const ws = wb.addWorksheet('Clientes');
  ws.columns = ENCABEZADOS.map((e) => ({ header: e.header, width: e.width }));
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
  headerRow.height = 20;
  // El documento debe entrar como texto para no perder ceros a la izquierda
  ws.getColumn(1).numFmt = '@';

  const inst = wb.addWorksheet('Instrucciones');
  inst.getColumn(1).width = 110;
  const lineas = [
    'CÓMO IMPORTAR CLIENTES — Sistema Orión',
    '',
    '1. Llena la hoja "Clientes" (una fila por cliente) y guarda el archivo.',
    '2. En el sistema: Clientes → Importar → arrastra este archivo → revisa la vista previa → Confirmar.',
    '',
    'REGLAS:',
    '• RUC / DNI (obligatorio): 11 dígitos = RUC (empresa) · 8 dígitos = DNI (persona).',
    '• Empresas: llena "Razón social". Personas: llena "Nombres" y "Apellido paterno".',
    '• Línea de crédito en USD (vacío o 0 = sólo contado).',
    '• Plazo de pago: contado, 15, 30 o 60 (vacío = contado).',
    '• Si el documento ya existe en el sistema, se ACTUALIZAN sus datos (no se duplica).',
    '• Máximo 1000 filas por archivo.',
    '',
    'EJEMPLOS (no los copies a la hoja "Clientes" tal cual, son referenciales):',
    '• Empresa:  20100070970 | SUPERMERCADOS PERUANOS S.A. | (nombres vacío) | … | 50000 | 30',
    '• Persona:  46027897 | (razón social vacío) | JUAN | PEREZ | GOMEZ | jperez@mail.com | 999888777',
  ];
  for (const [i, texto] of lineas.entries()) {
    const row = inst.getRow(i + 1);
    row.getCell(1).value = texto;
    if (i === 0) row.font = { bold: true, size: 14 };
    if (texto === 'REGLAS:' || texto.startsWith('EJEMPLOS')) row.font = { bold: true };
  }

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="plantilla-clientes-orion.xlsx"',
      'Cache-Control': 'no-store',
    },
  });
}
