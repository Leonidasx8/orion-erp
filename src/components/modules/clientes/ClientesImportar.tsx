'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Check,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  parsearArchivoClientes,
  confirmarImportClientes,
  type FilaClienteImportada,
} from '@/server/actions/clientes-importar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RowStatus = 'ok' | 'error';

interface PreviewRow extends FilaClienteImportada {
  status: RowStatus;
  message: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateRows(rows: PreviewRow[]): PreviewRow[] {
  const docsVistos = new Map<string, number>();

  return rows.map((r): PreviewRow => {
    const doc = r.numeroDocumento.replace(/\D/g, '');

    if (!doc) {
      return { ...r, status: 'error', message: 'RUC/DNI obligatorio' };
    }
    if (doc.length !== 8 && doc.length !== 11) {
      return { ...r, status: 'error', message: 'RUC debe tener 11 dígitos, DNI 8' };
    }

    const prevIdx = docsVistos.get(doc);
    if (prevIdx != null) {
      return { ...r, status: 'error', message: `Documento duplicado en fila ${prevIdx}` };
    }
    docsVistos.set(doc, r.index);

    const esJuridica = doc.length === 11;
    if (esJuridica && !r.razonSocial.trim()) {
      return { ...r, status: 'error', message: 'Razón social obligatoria para RUC (empresa)' };
    }
    if (!esJuridica && (!r.nombres.trim() || !r.apellidoPaterno.trim())) {
      return { ...r, status: 'error', message: 'Nombres y apellido paterno obligatorios para DNI' };
    }

    return { ...r, status: 'ok', message: '' };
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepIndicator({ current }: { current: number }) {
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
// Step 1 — Upload
// ---------------------------------------------------------------------------

interface Step1Props {
  companySlug: string;
  onNext: (fileName: string, rows: PreviewRow[]) => void;
}

function Step1({ companySlug, onNext }: Step1Props) {
  const [fileName, setFileName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState('');
  const [pending, startTransition] = useTransition();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    setFile(f);
    setFileName(f.name);
    setParseError('');
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleNext() {
    if (!file) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append('archivo', file);
      const res = await parsearArchivoClientes(fd);
      if (!res.success) {
        setParseError(res.error);
        return;
      }
      const rows: PreviewRow[] = res.data.filas.map((f) => ({
        ...f,
        status: 'ok' as RowStatus,
        message: '',
      }));
      onNext(res.data.nombreArchivo, validateRows(rows));
    });
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
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>

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
              setFile(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {parseError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{parseError}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${companySlug}/clientes`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Volver a clientes
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/${companySlug}/clientes/plantilla`} download>
              Descargar plantilla
            </a>
          </Button>
          <Button onClick={handleNext} disabled={!fileName || pending}>
            {pending ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Leyendo archivo…
              </>
            ) : (
              <>
                Siguiente
                <ChevronRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Preview
// ---------------------------------------------------------------------------

interface Step2Props {
  fileName: string;
  rows: PreviewRow[];
  onBack: () => void;
  onConfirm: () => void;
  confirming: boolean;
  confirmError: string;
}

function Step2({ fileName, rows, onBack, onConfirm, confirming, confirmError }: Step2Props) {
  const okCount = rows.filter((r) => r.status === 'ok').length;
  const errorCount = rows.filter((r) => r.status === 'error').length;
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  const visibleRows = showOnlyErrors ? rows.filter((r) => r.status === 'error') : rows;
  const hasErrors = errorCount > 0;

  return (
    <div className="space-y-4">
      {/* Info bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border bg-muted/30 px-4 py-2.5 text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          {fileName}
        </span>
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {okCount} OK
        </span>
        <span className="flex items-center gap-1 text-destructive">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
          {errorCount} error{errorCount !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-10 px-3 py-2.5 text-left font-medium text-muted-foreground">#</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">RUC/DNI</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  RAZÓN SOCIAL / NOMBRES
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">EMAIL</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">TIPO</th>
                <th className="min-w-[180px] px-3 py-2.5 text-left font-medium text-muted-foreground">
                  ESTADO
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleRows.map((row) => {
                const esJuridica = row.numeroDocumento.length === 11;
                const nombre = esJuridica
                  ? row.razonSocial
                  : [row.nombres, row.apellidoPaterno, row.apellidoMaterno]
                      .filter(Boolean)
                      .join(' ');
                return (
                  <tr
                    key={row.index}
                    className={row.status === 'error' ? 'bg-red-50 dark:bg-red-950/20' : ''}
                  >
                    <td className="px-3 py-2.5 text-muted-foreground">{row.index}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">
                      {row.numeroDocumento || (
                        <span className="italic text-muted-foreground">(vacío)</span>
                      )}
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-2.5">
                      {nombre || <span className="italic text-muted-foreground">—</span>}
                    </td>
                    <td className="max-w-[160px] truncate px-3 py-2.5 text-muted-foreground">
                      {row.email || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {esJuridica ? 'Empresa' : 'Persona'}
                    </td>
                    <td className="px-3 py-2.5">
                      {row.status === 'ok' ? (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <Check className="h-4 w-4" />
                          <span className="text-xs font-medium">OK</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-destructive">
                          <X className="h-4 w-4 shrink-0" />
                          <span className="text-xs">{row.message}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
          <span>
            {rows.length} fila{rows.length !== 1 ? 's' : ''} · {errorCount} con error
            {errorCount !== 1 ? 'es' : ''}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant={showOnlyErrors ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 text-xs"
              onClick={() => setShowOnlyErrors(true)}
              disabled={errorCount === 0}
            >
              Solo errores
            </Button>
            <Button
              variant={!showOnlyErrors ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 text-xs"
              onClick={() => setShowOnlyErrors(false)}
            >
              Mostrar todas
            </Button>
          </div>
        </div>
      </div>

      {hasErrors && (
        <Alert variant="destructive" className="border-red-300 bg-red-50 dark:bg-red-950/30">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-semibold">
              {errorCount} error{errorCount !== 1 ? 'es' : ''} impide
              {errorCount !== 1 ? 'n' : ''} la importación.
            </span>{' '}
            Corrige el archivo y vuelve a subirlo.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between pt-1">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Subir otro archivo
        </Button>
        <Button onClick={onConfirm} disabled={hasErrors || confirming}>
          {confirming ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              Importando…
            </>
          ) : (
            <>
              Confirmar import ({okCount})
              <ChevronRight className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {confirmError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{confirmError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Done
// ---------------------------------------------------------------------------

function Step3({
  companySlug,
  creados,
  actualizados,
}: {
  companySlug: string;
  creados: number;
  actualizados: number;
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-12 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
        <Check className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-foreground">Importación completada</h2>
        <p className="text-muted-foreground">
          {creados} cliente{creados !== 1 ? 's' : ''} creado{creados !== 1 ? 's' : ''}
          {actualizados > 0 && (
            <>
              {' · '}
              {actualizados} actualizado{actualizados !== 1 ? 's' : ''}
            </>
          )}
        </p>
      </div>
      <Button asChild size="lg">
        <Link href={`/${companySlug}/clientes`}>
          Ver clientes
          <ChevronRight className="ml-1.5 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<number, string> = {
  1: 'Selecciona el archivo a importar',
  2: 'Revisa los datos antes de confirmar',
  3: 'Importación finalizada',
};

export function ClientesImportar({ companySlug }: { companySlug: string }) {
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [resultado, setResultado] = useState({ creados: 0, actualizados: 0 });
  const [confirmError, setConfirmError] = useState('');
  const [confirming, startConfirm] = useTransition();

  function handleConfirm() {
    const validas = rows.filter((r) => r.status === 'ok');
    setConfirmError('');
    startConfirm(async () => {
      const res = await confirmarImportClientes({
        filas: validas.map((r) => ({
          numeroDocumento: r.numeroDocumento,
          razonSocial: r.razonSocial,
          nombres: r.nombres,
          apellidoPaterno: r.apellidoPaterno,
          apellidoMaterno: r.apellidoMaterno,
          email: r.email,
          telefono: r.telefono,
          lineaCredito: r.lineaCredito,
          plazoCredito: r.plazoCredito,
          direccion: r.direccion,
          notas: r.notas,
        })),
      });
      if (!res.success) {
        setConfirmError(res.error);
        return;
      }
      setResultado(res.data);
      setStep(3);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href={`/${companySlug}/clientes`} className="hover:underline">
            Clientes
          </Link>{' '}
          / Importar
        </p>
        <h1 className="mt-1 text-2xl font-bold">Importar clientes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paso {step} de 3 · {STEP_LABELS[step]}
        </p>
      </div>

      <StepIndicator current={step} />

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        {step === 1 && (
          <Step1
            companySlug={companySlug}
            onNext={(name, parsedRows) => {
              setFileName(name);
              setRows(parsedRows);
              setStep(2);
            }}
          />
        )}
        {step === 2 && (
          <Step2
            fileName={fileName}
            rows={rows}
            onBack={() => setStep(1)}
            onConfirm={handleConfirm}
            confirming={confirming}
            confirmError={confirmError}
          />
        )}
        {step === 3 && (
          <Step3
            companySlug={companySlug}
            creados={resultado.creados}
            actualizados={resultado.actualizados}
          />
        )}
      </div>
    </div>
  );
}
