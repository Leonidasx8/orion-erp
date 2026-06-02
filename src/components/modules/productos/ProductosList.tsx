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
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Search,
  Plus,
  Upload,
  Download,
  TrendingUp,
  X,
  LayoutGrid,
  List,
  AlertTriangle,
} from 'lucide-react';
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
  | 'imagenUrl'
>;

const STOCK_MIN_DEFAULT = 20;
const PAGE_SIZE_GRID = 8;
const PAGE_SIZE_LIST = 25;

function formatPrecio(valor: string | null) {
  if (!valor) return '—';
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(
    parseFloat(valor)
  );
}

function StockIndicator({ producto }: { producto: ProductoRow }) {
  if (!producto.controlaStock) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const stock = parseFloat(producto.stockActual ?? '0');
  const min = STOCK_MIN_DEFAULT;

  if (stock <= 0) {
    return <span className="text-xs font-medium text-destructive">Sin stock</span>;
  }
  if (stock < min) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-amber-600">
        <AlertTriangle className="h-3 w-3" />
        {stock} de {min}
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">{stock} u.</span>;
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [globalFilter, setGlobalFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [stockFilter, setStockFilter] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [gridPage, setGridPage] = useState(0);
  const [, startTransition] = useTransition();

  const catMap = Object.fromEntries(categorias.map((c) => [c.id, c.nombre]));
  const uomMap = Object.fromEntries(uoms.map((u) => [u.codigo, u.simbolo ?? u.codigo]));

  // Derived filtered data
  const filtered = productos.filter((p) => {
    const query = globalFilter.trim().toLowerCase();
    if (query) {
      const matchesCodigo = p.codigo.toLowerCase().includes(query);
      const matchesNombre = p.nombre.toLowerCase().includes(query);
      if (!matchesCodigo && !matchesNombre) return false;
    }
    if (categoryFilter.length > 0) {
      if (!p.categoriaId || !categoryFilter.includes(p.categoriaId)) return false;
    }
    if (stockFilter) {
      const stock = parseFloat(p.stockActual ?? '0');
      if (stock <= 0) return false;
    }
    return true;
  });

  const totalFiltered = filtered.length;
  const totalCategorias = categorias.length;

  // Grid pagination (local)
  const pageSize = viewMode === 'grid' ? PAGE_SIZE_GRID : PAGE_SIZE_LIST;
  const pageCount = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const currentPage = Math.min(gridPage, pageCount - 1);
  const pagedItems = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  // List view table (always built, rendered conditionally)
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
      cell: ({ row }) => <StockIndicator producto={row.original} />,
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
    data: filtered,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: (v) => startTransition(() => setGlobalFilter(v)),
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE_LIST } },
    manualFiltering: true,
  });

  const handleCategoryToggle = (id: string) => {
    setCategoryFilter((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
    setGridPage(0);
  };

  const handleSearchChange = (value: string) => {
    setGlobalFilter(value);
    setGridPage(0);
  };

  const queryLabel = globalFilter.trim() ? ` con "${globalFilter.trim()}"` : '';

  const rangeStart = totalFiltered === 0 ? 0 : currentPage * pageSize + 1;
  const rangeEnd = Math.min((currentPage + 1) * pageSize, totalFiltered);

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Catálogo</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {productos.length} productos · {totalCategorias} familias · lista AAA vigente
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="productos/actualizar-precios">
              <TrendingUp className="mr-1.5 h-4 w-4" />
              Actualizar precios
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="productos/importar">
              <Upload className="mr-1.5 h-4 w-4" />
              Importar Excel
            </Link>
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-1.5 h-4 w-4" />
            Exportar
          </Button>
          {canCreate && (
            <Button size="sm" asChild>
              <Link href="productos/nuevo">
                <Plus className="mr-1.5 h-4 w-4" />
                Nuevo producto
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ── Toolbar ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-80 flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar SKU, descripción, calibre…"
            value={globalFilter}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Active category chips */}
        {categoryFilter.map((id) => (
          <button
            key={id}
            onClick={() => handleCategoryToggle(id)}
            className="inline-flex items-center gap-1 rounded-full bg-tenant-accent px-2.5 py-1 text-xs font-medium text-white"
          >
            {catMap[id] ?? id}
            <X className="h-3 w-3" />
          </button>
        ))}

        {/* Family filter dropdown */}
        <div className="relative">
          <details className="group">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
              Familia
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute left-0 top-full z-10 mt-1 min-w-44 rounded-md border bg-popover shadow-md">
              {categorias.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">Sin familias</div>
              ) : (
                categorias.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryToggle(cat.id)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted ${
                      categoryFilter.includes(cat.id) ? 'font-medium text-primary' : ''
                    }`}
                  >
                    {cat.nombre}
                    {categoryFilter.includes(cat.id) && <X className="h-3 w-3" />}
                  </button>
                ))
              )}
            </div>
          </details>
        </div>

        {/* Calibre placeholder */}
        <button className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
          Calibre
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        {/* Stock filter toggle */}
        <button
          onClick={() => {
            setStockFilter((v) => !v);
            setGridPage(0);
          }}
          className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm transition-colors ${
            stockFilter
              ? 'border-tenant-accent bg-tenant-accent-soft font-medium text-tenant-accent-fg'
              : 'hover:bg-muted'
          }`}
        >
          Solo con stock
        </button>

        {/* View mode toggle — pushed to right */}
        <div className="ml-auto flex items-center rounded-md border">
          <button
            onClick={() => setViewMode('grid')}
            className={`rounded-l-md p-1.5 transition-colors ${
              viewMode === 'grid' ? 'bg-muted' : 'hover:bg-muted/50'
            }`}
            title="Vista cuadrícula"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`rounded-r-md p-1.5 transition-colors ${
              viewMode === 'list' ? 'bg-muted' : 'hover:bg-muted/50'
            }`}
            title="Vista lista"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Grid View ──────────────────────────────────────── */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {pagedItems.length === 0 ? (
            <div className="col-span-full py-16 text-center text-sm text-muted-foreground">
              No se encontraron productos
            </div>
          ) : (
            pagedItems.map((producto) => {
              const catNombre = producto.categoriaId
                ? (catMap[producto.categoriaId] ?? null)
                : null;

              return (
                <Link
                  key={producto.id}
                  href={`productos/${producto.id}`}
                  className="group overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md"
                >
                  {/* Image */}
                  <div className="relative flex h-32 items-center justify-center overflow-hidden border-b bg-muted">
                    {producto.imagenUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={producto.imagenUrl}
                        alt={producto.nombre}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">
                        {producto.codigo}
                      </span>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="p-3">
                    {/* SKU */}
                    <p className="font-mono text-xs text-primary">{producto.codigo}</p>

                    {/* Name */}
                    <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug">
                      {producto.nombre}
                    </p>

                    {/* Tags */}
                    {catNombre && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <span className="inline-block rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          {catNombre}
                        </span>
                      </div>
                    )}

                    {/* Price + Stock row */}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatPrecio(producto.precioUnitario)}
                      </span>
                      <StockIndicator producto={producto} />
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* ── List View ──────────────────────────────────────── */}
      {viewMode === 'list' && (
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
      )}

      {/* ── Pagination ─────────────────────────────────────── */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {rangeStart}–{rangeEnd} de {totalFiltered}
            {queryLabel}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (viewMode === 'grid') {
                  setGridPage((p) => Math.max(0, p - 1));
                } else {
                  table.previousPage();
                }
              }}
              disabled={currentPage === 0}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (viewMode === 'grid') {
                  setGridPage((p) => Math.min(pageCount - 1, p + 1));
                } else {
                  table.nextPage();
                }
              }}
              disabled={currentPage >= pageCount - 1}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
