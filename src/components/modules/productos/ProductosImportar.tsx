'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Check,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RowStatus = 'ok' | 'warning' | 'error';

interface PreviewRow {
  index: number;
  sku: string;
  descripcion: string;
  familia: string;
  calibre: string;
  precioCompra: string;
  precioVenta: string;
  status: RowStatus;
  message: string;
}

type FilterMode = 'all' | 'errors';

// ---------------------------------------------------------------------------
// Constants — mock preview data
// ---------------------------------------------------------------------------

const MOCK_ROWS: PreviewRow[] = [
  {
    index: 1,
    sku: 'ACE-001',
    descripcion: 'Aceite de motor 5W-30 1L',
    familia: 'Lubricantes',
    calibre: '—',
    precioCompra: 'S/ 32.00',
    precioVenta: 'S/ 45.00',
    status: 'ok',
    message: '',
  },
  {
    index: 2,
    sku: 'FIL-023',
    descripcion: 'Filtro de aire universal',
    familia: 'Filtros',
    calibre: 'Universal',
    precioCompra: 'S/ 18.50',
    precioVenta: 'S/ 28.00',
    status: 'ok',
    message: '',
  },
  {
    index: 3,
    sku: 'BAT-12V',
    descripcion: 'Batería 12V 60Ah',
    familia: 'Eléctricos',
    calibre: '60Ah',
    precioCompra: 'S/ 210.00',
    precioVenta: 'S/ 299.00',
    status: 'ok',
    message: '',
  },
  {
    index: 4,
    sku: 'LLA-R15',
    descripcion: 'Llanta radial 195/65 R15',
    familia: '',
    calibre: 'R15',
    precioCompra: 'S/ 180.00',
    precioVenta: 'S/ 245.00',
    status: 'warning',
    message: "Familia vacía · se asignará 'Sin clasificar'",
  },
  {
    index: 5,
    sku: 'AMO-500',
    descripcion: 'Amortiguador delantero',
    familia: 'Suspensión',
    calibre: '—',
    precioCompra: 'S/ 85.00',
    precioVenta: 'S/ 112.00',
    status: 'warning',
    message: 'Margen 15,3% > recomendado, verificar',
  },
  {
    index: 6,
    sku: 'PAR-220',
    descripcion: 'Pastillas de freno delantera',
    familia: '',
    calibre: '220mm',
    precioCompra: 'S/ 55.00',
    precioVenta: 'S/ 78.00',
    status: 'warning',
    message: "Familia vacía · se asignará 'Sin clasificar'",
  },
  {
    index: 7,
    sku: '',
    descripcion: 'Correa de distribución',
    familia: 'Motor',
    calibre: '—',
    precioCompra: 'S/ 42.00',
    precioVenta: 'S/ 62.00',
    status: 'error',
    message: 'SKU obligatorio',
  },
  {
    index: 8,
    sku: 'ACE-001',
    descripcion: 'Aceite de motor 10W-40 1L',
    familia: 'Lubricantes',
    calibre: '—',
    precioCompra: 'S/ 28.00',
    precioVenta: 'S/ 40.00',
    status: 'error',
    message: 'SKU duplicado en fila 11',
  },
  {
    index: 9,
    sku: 'BUJ-NGK',
    descripcion: 'Bujía NGK estándar',
    familia: 'Encendido',
    calibre: '—',
    precioCompra: 'S/ 0.00',
    precioVenta: 'S/ 12.00',
    status: 'error',
    message: 'Precio compra = 0',
  },
];

const TOTAL_ROWS = 47;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StepIndicatorProps {
  current: number;
}

function StepIndicator({ current }: StepIndicatorProps) {
  const steps = [
    { num: 1, label: 'Subir archivo' },
    { num: 2, label: 'Vista previa' },
    { num: 3, label: 'Confirmar' },
  ];

  return (
    <div className="flex items-center gap-2 text-sm">
      {steps.map((step, i) => {
        const done = step.num < current;
        const active = step.num === current;
        return (
          <div key={step.num} className="flex items-center gap-2">
            {i > 0 && <div className={`h-px w-8 ${done || active ? 'bg-primary' : 'bg-border'}`} />}
            <div className="flex items-center gap-1.5">
              {done ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              ) : active ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {step.num}
                </span>
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-muted-foreground text-xs text-muted-foreground">
                  {step.num}
                </span>
              )}
              <span
                className={
                  active
                    ? 'font-semibold text-foreground'
                    : done
                      ? 'text-primary'
                      : 'text-muted-foreground'
                }
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row status cell
// ---------------------------------------------------------------------------

function StatusCell({ row }: { row: PreviewRow }) {
  if (row.status === 'ok') {
    return (
      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <Check className="h-4 w-4" />
        <span className="text-xs font-medium">OK</span>
      </span>
    );
  }
  if (row.status === 'warning') {
    return (
      <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="text-xs">{row.message}</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-destructive">
      <X className="h-4 w-4 shrink-0" />
      <span className="text-xs">{row.message}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

interface Step1Props {
  companySlug: string;
  onNext: (fileName: string) => void;
}

function Step1({ companySlug, onNext }: Step1Props) {
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setFileName(file.name);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={[
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-8 py-16 transition-colors',
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/30',
        ].join(' ')}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <FileSpreadsheet className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground">Arrastra tu archivo Excel aquí</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            o{' '}
            <span className="text-primary underline underline-offset-2">
              haz clic para seleccionar
            </span>
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Formatos aceptados: .xlsx, .xls, .csv</p>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {/* Selected file */}
      {fileName && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3">
          <FileSpreadsheet className="h-4 w-4 shrink-0 text-primary" />
          <span className="flex-1 truncate text-sm font-medium">{fileName}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setFileName('');
              if (inputRef.current) inputRef.current.value = '';
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${companySlug}/productos`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Volver al catálogo
          </Link>
        </Button>
        <Button onClick={() => onNext(fileName)} disabled={!fileName}>
          Siguiente
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface Step2Props {
  fileName: string;
  onBack: () => void;
  onConfirm: () => void;
}

function Step2({ fileName, onBack, onConfirm }: Step2Props) {
  const [filter, setFilter] = useState<FilterMode>('all');

  const okCount = MOCK_ROWS.filter((r) => r.status === 'ok').length;
  const warnCount = MOCK_ROWS.filter((r) => r.status === 'warning').length;
  const errorCount = MOCK_ROWS.filter((r) => r.status === 'error').length;

  const visibleRows =
    filter === 'errors'
      ? MOCK_ROWS.filter((r) => r.status === 'error' || r.status === 'warning')
      : MOCK_ROWS;

  const hasErrors = errorCount > 0;

  function rowBg(status: RowStatus) {
    if (status === 'error') return 'bg-red-50 dark:bg-red-950/20';
    if (status === 'warning') return 'bg-amber-50 dark:bg-amber-950/20';
    return '';
  }

  return (
    <div className="space-y-4">
      {/* File info bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border bg-muted/30 px-4 py-2.5 text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          {fileName}
        </span>
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {okCount} OK
        </span>
        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          {warnCount} advertencia{warnCount !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1 text-destructive">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
          {errorCount} error{errorCount !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* Preview table */}
      <div className="overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-10 px-3 py-2.5 text-left font-medium text-muted-foreground">#</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">SKU</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  DESCRIPCIÓN
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">FAMILIA</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">CALIBRE</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                  P. COMPRA
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                  P. VENTA
                </th>
                <th className="min-w-[180px] px-3 py-2.5 text-left font-medium text-muted-foreground">
                  ESTADO
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleRows.map((row) => (
                <tr key={row.index} className={rowBg(row.status)}>
                  <td className="px-3 py-2.5 text-muted-foreground">{row.index}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {row.sku || <span className="italic text-muted-foreground">(vacío)</span>}
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2.5">{row.descripcion}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {row.familia || <span className="italic text-muted-foreground/60">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{row.calibre}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.precioCompra}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.precioVenta}</td>
                  <td className="px-3 py-2.5">
                    <StatusCell row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
          <span>
            Filas 1–{MOCK_ROWS.length} de {TOTAL_ROWS} · {errorCount + warnCount} con problemas
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant={filter === 'errors' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 text-xs"
              onClick={() => setFilter('errors')}
            >
              Solo errores
            </Button>
            <Button
              variant={filter === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 text-xs"
              onClick={() => setFilter('all')}
            >
              Mostrar todas
            </Button>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {hasErrors && (
        <Alert variant="destructive" className="border-red-300 bg-red-50 dark:bg-red-950/30">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-semibold">{errorCount} errores impiden la importación</span>
            {' — '}
            Corrige los errores en el archivo y vuelve a subirlo, o edita las filas inline antes de
            continuar.
          </AlertDescription>
        </Alert>
      )}

      {/* Bottom actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Subir otro archivo
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Download className="mr-1.5 h-4 w-4" />
            Descargar reporte de errores
          </Button>
          <Button onClick={onConfirm} disabled={hasErrors}>
            Confirmar import ({TOTAL_ROWS - errorCount})
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface Step3Props {
  companySlug: string;
  importedCount: number;
  warningCount: number;
}

function Step3({ companySlug, importedCount, warningCount }: Step3Props) {
  return (
    <div className="flex flex-col items-center gap-6 py-12 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
        <Check className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-foreground">Importación completada</h2>
        <p className="text-muted-foreground">
          {importedCount} producto{importedCount !== 1 ? 's' : ''} importado
          {importedCount !== 1 ? 's' : ''}
          {warningCount > 0 && (
            <>
              {' · '}
              {warningCount} advertencia{warningCount !== 1 ? 's' : ''} ignorada
              {warningCount !== 1 ? 's' : ''}
            </>
          )}
        </p>
      </div>
      <Button asChild size="lg">
        <Link href={`/${companySlug}/productos`}>
          Ver catálogo
          <ChevronRight className="ml-1.5 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ProductosImportarProps {
  companySlug: string;
}

const STEP_LABELS: Record<number, string> = {
  1: 'Selecciona el archivo a importar',
  2: 'Revisa los datos antes de confirmar',
  3: 'Importación finalizada',
};

export function ProductosImportar({ companySlug }: ProductosImportarProps) {
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState('');

  const errorCount = MOCK_ROWS.filter((r) => r.status === 'error').length;
  const warnCount = MOCK_ROWS.filter((r) => r.status === 'warning').length;
  const importedCount = TOTAL_ROWS - errorCount;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href={`/${companySlug}/productos`} className="hover:underline">
            Productos
          </Link>{' '}
          / Importar
        </p>
        <h1 className="mt-1 text-2xl font-bold">Importar productos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paso {step} de 3 · {STEP_LABELS[step]}
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} />

      {/* Step content */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        {step === 1 && (
          <Step1
            companySlug={companySlug}
            onNext={(name) => {
              setFileName(name);
              setStep(2);
            }}
          />
        )}
        {step === 2 && (
          <Step2 fileName={fileName} onBack={() => setStep(1)} onConfirm={() => setStep(3)} />
        )}
        {step === 3 && (
          <Step3 companySlug={companySlug} importedCount={importedCount} warningCount={warnCount} />
        )}
      </div>
    </div>
  );
}
