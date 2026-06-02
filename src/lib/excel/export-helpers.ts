import ExcelJS from 'exceljs';

export interface ExcelColumn<T> {
  header: string;
  key: keyof T & string;
  width?: number;
  format?: (value: unknown) => string | number;
}

export async function exportToExcel<T extends Record<string, unknown>>({
  sheetName,
  columns,
  rows,
}: {
  sheetName: string;
  columns: ExcelColumn<T>[];
  rows: T[];
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Orion ERP';
  const ws = wb.addWorksheet(sheetName);

  ws.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width ?? 20,
  }));

  // Encabezados en negrita
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2E8F0' },
  };

  for (const row of rows) {
    const formatted: Record<string, unknown> = {};
    for (const col of columns) {
      const raw = row[col.key];
      formatted[col.key] = col.format ? col.format(raw) : raw;
    }
    ws.addRow(formatted);
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
