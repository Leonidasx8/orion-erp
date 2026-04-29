'use client';

import { useState, useTransition } from 'react';
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
import type { Cliente } from '@/lib/db/schema';

type ClienteRow = Pick<
  Cliente,
  | 'id'
  | 'tipoDocumento'
  | 'numeroDocumento'
  | 'razonSocial'
  | 'nombres'
  | 'apellidoPaterno'
  | 'apellidoMaterno'
  | 'email'
  | 'telefono'
  | 'estado'
  | 'tipoPersona'
>;

function nombreDisplay(c: ClienteRow) {
  if (c.tipoPersona === 'juridica') return c.razonSocial ?? '—';
  return [c.nombres, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(' ') || '—';
}

const columns: ColumnDef<ClienteRow>[] = [
  {
    accessorKey: 'numeroDocumento',
    header: 'Documento',
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        <span className="mr-1 text-xs text-muted-foreground">{row.original.tipoDocumento}</span>
        {row.original.numeroDocumento}
      </span>
    ),
  },
  {
    id: 'nombre',
    header: 'Cliente',
    cell: ({ row }) => (
      <Link href={`clientes/${row.original.id}`} className="font-medium hover:underline">
        {nombreDisplay(row.original)}
      </Link>
    ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) ?? '—'}</span>,
  },
  {
    accessorKey: 'telefono',
    header: 'Teléfono',
    cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) ?? '—'}</span>,
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    cell: ({ getValue }) => {
      const estado = getValue() as string;
      return (
        <Badge
          variant={
            estado === 'activo' ? 'default' : estado === 'bloqueado' ? 'destructive' : 'secondary'
          }
        >
          {estado}
        </Badge>
      );
    },
  },
  {
    id: 'acciones',
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" asChild>
        <Link href={`clientes/${row.original.id}`}>Ver</Link>
      </Button>
    ),
  },
];

export function ClientesList({
  clientes,
  canCreate,
}: {
  clientes: ClienteRow[];
  canCreate: boolean;
}) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [, startTransition] = useTransition();

  const table = useReactTable({
    data: clientes,
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
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, documento..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8"
          />
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="clientes/nuevo">
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo cliente
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
