'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import { ChevronDown, ChevronUp, ChevronsUpDown, Plus, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoneda } from '@/lib/cotizaciones/calculo';
import type { EstadoCotizacion } from '@/lib/db/schema';

export interface CotizacionRow {
  id: string;
  numeroCompleto: string | null;
  estado: EstadoCotizacion;
  fechaEmision: string;
  fechaVencimiento: string;
  moneda: 'PEN' | 'USD';
  total: string;
  clienteNombre: string;
  clienteDocumento: string;
}

const estados: EstadoCotizacion[] = ['borrador', 'enviada', 'aceptada', 'rechazada', 'vencida'];

const colorEstado: Record<EstadoCotizacion, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  borrador: 'outline',
  enviada: 'default',
  aceptada: 'default',
  rechazada: 'destructive',
  vencida: 'secondary',
};

export function CotizacionesList({
  rows,
  canCreate,
}: {
  rows: CotizacionRow[];
  canCreate: boolean;
}) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'fechaEmision', desc: true }]);
  const [filterEstado, setFilterEstado] = useState<'todos' | EstadoCotizacion>('todos');

  const data = rows.filter((r) => filterEstado === 'todos' || r.estado === filterEstado);

  const columns: ColumnDef<CotizacionRow>[] = [
    {
      accessorKey: 'numeroCompleto',
      header: 'Número',
      cell: ({ row }) => (
        <Link
          href={`cotizaciones/${row.original.id}`}
          className="font-mono text-sm hover:underline"
        >
          {row.original.numeroCompleto ?? '—'}
        </Link>
      ),
    },
    {
      id: 'cliente',
      header: 'Cliente',
      cell: ({ row }) => (
        <div>
          <div className="text-sm font-medium">{row.original.clienteNombre}</div>
          <div className="font-mono text-xs text-muted-foreground">
            {row.original.clienteDocumento}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'fechaEmision',
      header: 'Emisión',
      cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span>,
    },
    {
      accessorKey: 'fechaVencimiento',
      header: 'Vence',
      cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span>,
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={colorEstado[row.original.estado]} className="capitalize">
          {row.original.estado}
        </Badge>
      ),
    },
    {
      accessorKey: 'total',
      header: 'Total',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {formatMoneda(parseFloat(row.original.total), row.original.moneda)}
        </span>
      ),
    },
    {
      id: 'acciones',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`cotizaciones/${row.original.id}`}>Ver</Link>
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, cliente o documento…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap rounded-lg border text-sm">
          {(['todos', ...estados] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterEstado(f)}
              className={`px-3 py-1.5 capitalize first:rounded-l-md last:rounded-r-md ${
                filterEstado === f ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="cotizaciones/nueva">
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva cotización
            </Link>
          </Button>
        )}
      </div>

      <div className="rounded-lg border">
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
                  No hay cotizaciones
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

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Mostrando{' '}
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
