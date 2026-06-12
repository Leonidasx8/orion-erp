'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Loader2,
  Plus,
  Search,
  Download,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { eliminarCliente } from '@/server/actions/clientes';

type ClienteRow = {
  id: string;
  tipoDocumento: string;
  numeroDocumento: string;
  tipoPersona: string;
  razonSocial: string | null;
  nombres: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  email: string | null;
  telefono: string | null;
  estado: string;
  lineaCredito: string | null;
  plazoCredito: string | null;
  updatedAt: Date;
};

function nombreDisplay(c: ClienteRow) {
  if (c.tipoPersona === 'juridica') return c.razonSocial ?? '—';
  return [c.nombres, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(' ') || '—';
}

function fmt(val: string | null) {
  if (!val) return '—';
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  return `USD ${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function tiempoRelativo(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hs = Math.floor(mins / 60);
  if (hs < 24) return `hace ${hs}h`;
  const ds = Math.floor(hs / 24);
  if (ds === 1) return 'ayer';
  if (ds < 7) return `hace ${ds}d`;
  return new Date(date).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

const baseColumns: ColumnDef<ClienteRow>[] = [
  {
    id: 'nombre',
    header: 'Razón social',
    cell: ({ row }) => (
      <span className="flex items-center gap-2">
        <Link href={`clientes/${row.original.id}`} className="font-medium hover:underline">
          {nombreDisplay(row.original)}
        </Link>
        {row.original.estado !== 'activo' && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            {row.original.estado === 'bloqueado' ? 'Bloqueado' : 'Inactivo'}
          </Badge>
        )}
      </span>
    ),
  },
  {
    accessorKey: 'numeroDocumento',
    header: 'RUC / DNI',
    cell: ({ row }) => (
      <span className="font-mono text-sm text-muted-foreground">
        {row.original.numeroDocumento}
      </span>
    ),
  },
  {
    accessorKey: 'tipoPersona',
    header: 'Tipo',
    cell: ({ row }) => (
      <Badge variant="secondary" className="text-xs">
        {row.original.tipoPersona === 'juridica' ? 'Jurídico' : 'Natural'}
      </Badge>
    ),
  },
  {
    accessorKey: 'lineaCredito',
    header: () => <span className="block text-right">Línea crédito</span>,
    cell: ({ row }) => (
      <span className="block text-right text-sm tabular-nums">
        {fmt(row.original.lineaCredito)}
      </span>
    ),
  },
  {
    id: 'saldo',
    header: () => <span className="block text-right">Saldo CxC</span>,
    cell: () => <span className="block text-right text-sm text-muted-foreground">—</span>,
  },
  {
    id: 'comercial',
    header: 'Comercial',
    cell: () => <span className="text-sm text-muted-foreground">—</span>,
  },
  {
    id: 'ultimoDoc',
    header: 'Último doc',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {tiempoRelativo(row.original.updatedAt)}
      </span>
    ),
  },
];

function EliminarClienteButton({ cliente }: { cliente: ClienteRow }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      const res = await eliminarCliente(cliente.id);
      if (res.success) {
        toast.success('Cliente eliminado');
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Eliminar ${nombreDisplay(cliente)}`}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará <strong>{nombreDisplay(cliente)}</strong> ({cliente.numeroDocumento}) junto
            con sus direcciones y contactos. Esta acción no se puede deshacer. Si el cliente tiene
            cotizaciones, facturas u otros documentos, no podrá eliminarse.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ClientesList({
  clientes,
  canCreate,
  canDelete,
}: {
  clientes: ClienteRow[];
  canCreate: boolean;
  canDelete: boolean;
}) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [, startTransition] = useTransition();

  const inactivos = useMemo(() => clientes.filter((c) => c.estado !== 'activo'), [clientes]);
  const data = useMemo(
    () => (mostrarInactivos ? clientes : clientes.filter((c) => c.estado === 'activo')),
    [clientes, mostrarInactivos]
  );

  const columns = useMemo<ColumnDef<ClienteRow>[]>(
    () => [
      ...baseColumns,
      {
        id: 'acciones',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`clientes/${row.original.id}`}>Ver</Link>
            </Button>
            {canDelete && <EliminarClienteButton cliente={row.original} />}
          </div>
        ),
      },
    ],
    [canDelete]
  );

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: (v) => startTransition(() => setGlobalFilter(v)),
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-80 flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por razón social, RUC, nombre comercial…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Importar
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Exportar
          </Button>
          {canCreate && (
            <Button asChild size="sm">
              <Link href="clientes/nuevo">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Nuevo cliente
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {table.getFilteredRowModel().rows.length} resultado
          {table.getFilteredRowModel().rows.length !== 1 ? 's' : ''}
          {globalFilter && ` · búsqueda: "${globalFilter}"`}
        </span>
        {inactivos.length > 0 && (
          <button
            type="button"
            onClick={() => setMostrarInactivos((v) => !v)}
            className="text-xs underline-offset-2 hover:underline"
          >
            {mostrarInactivos ? 'Ocultar inactivos' : `Mostrar inactivos (${inactivos.length})`}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b bg-muted/40">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left font-medium text-muted-foreground"
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                  >
                    <span className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() &&
                        (header.column.getIsSorted() === 'asc' ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : header.column.getIsSorted() === 'desc' ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                        ))}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-muted-foreground">
                  No se encontraron clientes
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/20">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            de {table.getFilteredRowModel().rows.length}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
