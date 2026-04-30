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
import { toggleActivoProducto } from '@/server/actions/productos';
import type { Producto, CategoriaProducto, UnidadMedida } from '@/lib/db/schema';

type ProductoRow = Pick<
  Producto,
  | 'id'
  | 'codigo'
  | 'nombre'
  | 'tipo'
  | 'unidadMedida'
  | 'precioUnitario'
  | 'tieneIgv'
  | 'controlaStock'
  | 'stockActual'
  | 'activo'
  | 'categoriaId'
>;

function formatPrecio(valor: string | null) {
  if (!valor) return '—';
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(
    parseFloat(valor)
  );
}

export function ProductosList({
  productos,
  categorias,
  uoms,
  canCreate,
}: {
  productos: ProductoRow[];
  categorias: CategoriaProducto[];
  uoms: UnidadMedida[];
  canCreate: boolean;
}) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filterActivo, setFilterActivo] = useState<'todos' | 'activo' | 'inactivo'>('activo');
  const [, startTransition] = useTransition();

  const catMap = Object.fromEntries(categorias.map((c) => [c.id, c.nombre]));
  const uomMap = Object.fromEntries(uoms.map((u) => [u.codigo, u.simbolo ?? u.codigo]));

  const data = productos.filter((p) => {
    if (filterActivo === 'activo') return p.activo;
    if (filterActivo === 'inactivo') return !p.activo;
    return true;
  });

  const columns: ColumnDef<ProductoRow>[] = [
    {
      accessorKey: 'codigo',
      header: 'Código',
      cell: ({ getValue }) => <span className="font-mono text-sm">{getValue() as string}</span>,
    },
    {
      accessorKey: 'nombre',
      header: 'Nombre',
      cell: ({ row }) => (
        <Link href={`productos/${row.original.id}`} className="font-medium hover:underline">
          {row.original.nombre}
        </Link>
      ),
    },
    {
      accessorKey: 'tipo',
      header: 'Tipo',
      cell: ({ getValue }) => (
        <Badge variant="secondary" className="capitalize">
          {getValue() as string}
        </Badge>
      ),
    },
    {
      id: 'categoria',
      header: 'Categoría',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.categoriaId ? (catMap[row.original.categoriaId] ?? '—') : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'unidadMedida',
      header: 'UOM',
      cell: ({ getValue }) => (
        <span className="text-sm">{uomMap[getValue() as string] ?? (getValue() as string)}</span>
      ),
    },
    {
      accessorKey: 'precioUnitario',
      header: 'Precio',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {formatPrecio(row.original.precioUnitario)}
          {row.original.tieneIgv && (
            <span className="ml-1 text-xs text-muted-foreground">+IGV</span>
          )}
        </span>
      ),
    },
    {
      id: 'stock',
      header: 'Stock',
      cell: ({ row }) =>
        row.original.controlaStock ? (
          <span className="text-sm tabular-nums">{row.original.stockActual}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: 'activo',
      header: 'Estado',
      cell: ({ row }) => (
        <button
          className="cursor-pointer"
          onClick={() =>
            startTransition(() => {
              toggleActivoProducto(row.original.id);
            })
          }
        >
          <Badge variant={row.original.activo ? 'default' : 'secondary'}>
            {row.original.activo ? 'activo' : 'inactivo'}
          </Badge>
        </button>
      ),
    },
    {
      id: 'acciones',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`productos/${row.original.id}`}>Ver</Link>
        </Button>
      ),
    },
  ];

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
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código o nombre..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex rounded-lg border text-sm">
          {(['todos', 'activo', 'inactivo'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterActivo(f)}
              className={`px-3 py-1.5 capitalize first:rounded-l-md last:rounded-r-md ${
                filterActivo === f ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="productos/nuevo">
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo producto
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
                  No se encontraron productos
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
