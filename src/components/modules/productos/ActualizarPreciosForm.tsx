'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { TrendingUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  actualizarPreciosMasivo,
  type ActualizarPreciosMasivoInput,
} from '@/server/actions/productos';

type ProductoRow = {
  id: string;
  codigo: string;
  nombre: string;
  categoriaId: string | null;
  proveedorPrincipalId: string | null;
  precioUnitario: string | null;
  costoUnitario: string | null;
};

type Categoria = { id: string; nombre: string };
type Proveedor = { id: string; label: string };

interface Props {
  productos: ProductoRow[];
  categorias: Categoria[];
  proveedores: Proveedor[];
  companySlug: string;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(v);

function computeNuevo(actual: number, modo: 'porcentaje' | 'fijo', valor: number): number {
  if (modo === 'porcentaje') return Math.round(actual * (1 + valor / 100) * 10000) / 10000;
  return valor;
}

export function ActualizarPreciosForm({ productos, categorias, proveedores, companySlug }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filters
  const [catFilter, setCatFilter] = useState<string>('');
  const [provFilter, setProvFilter] = useState<string>('');

  // Adjustment params
  const [campo, setCampo] = useState<'precio' | 'costo'>('precio');
  const [modo, setModo] = useState<'porcentaje' | 'fijo'>('porcentaje');
  const [valorStr, setValorStr] = useState('');
  const [razon, setRazon] = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const valor = parseFloat(valorStr);

  const filtered = useMemo(() => {
    return productos.filter((p) => {
      if (catFilter && p.categoriaId !== catFilter) return false;
      if (provFilter && p.proveedorPrincipalId !== provFilter) return false;
      return true;
    });
  }, [productos, catFilter, provFilter]);

  // Sync selection when filter changes — keep only those still visible
  const visibleIds = useMemo(() => new Set(filtered.map((p) => p.id)), [filtered]);
  const activeSelection = useMemo(
    () => new Set([...selectedIds].filter((id) => visibleIds.has(id))),
    [selectedIds, visibleIds]
  );

  const allChecked = filtered.length > 0 && filtered.every((p) => activeSelection.has(p.id));
  const someChecked = !allChecked && filtered.some((p) => activeSelection.has(p.id));

  function toggleAll() {
    if (allChecked) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((p) => next.add(p.id));
        return next;
      });
    }
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const canPreview = activeSelection.size > 0 && !isNaN(valor) && valorStr !== '';

  const previewRows = useMemo(() => {
    if (!canPreview) return [];
    return filtered
      .filter((p) => activeSelection.has(p.id))
      .map((p) => {
        const actual = Number(
          campo === 'precio' ? (p.precioUnitario ?? 0) : (p.costoUnitario ?? 0)
        );
        const nuevo = computeNuevo(actual, modo, valor);
        const diff = nuevo - actual;
        const pct = actual !== 0 ? (diff / actual) * 100 : 0;
        return { ...p, actual, nuevo, diff, pct };
      });
  }, [filtered, activeSelection, campo, modo, valor, canPreview]);

  function handleSubmit() {
    if (!canPreview) return;
    if (!razon.trim() || razon.trim().length < 3) {
      toast.error('La razón es obligatoria (mín. 3 caracteres)');
      return;
    }

    const input: ActualizarPreciosMasivoInput = {
      productoIds: [...activeSelection],
      campo,
      modo,
      valor,
      razon: razon.trim(),
    };

    startTransition(async () => {
      const result = await actualizarPreciosMasivo(input);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `${result.data.actualizados} producto${result.data.actualizados !== 1 ? 's' : ''} actualizado${result.data.actualizados !== 1 ? 's' : ''}`
      );
      router.push(`/${companySlug}/productos`);
    });
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Familia</label>
          <div className="relative">
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="h-9 w-full appearance-none rounded-md border bg-background px-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Todas las familias</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        {proveedores.length > 0 && (
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Proveedor principal
            </label>
            <div className="relative">
              <select
                value={provFilter}
                onChange={(e) => setProvFilter(e.target.value)}
                className="h-9 w-full appearance-none rounded-md border bg-background px-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Todos los proveedores</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Adjustment controls */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Campo</label>
          <div className="flex overflow-hidden rounded-md border">
            {(['precio', 'costo'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setCampo(opt)}
                className={`px-4 py-1.5 text-sm transition-colors ${
                  campo === opt
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                {opt === 'precio' ? 'Precio venta' : 'Costo'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Tipo de ajuste
          </label>
          <div className="flex overflow-hidden rounded-md border">
            {(['porcentaje', 'fijo'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setModo(opt)}
                className={`px-4 py-1.5 text-sm transition-colors ${
                  modo === opt
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                {opt === 'porcentaje' ? '% Incremento' : 'Precio fijo'}
              </button>
            ))}
          </div>
        </div>

        <div className="w-36">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {modo === 'porcentaje' ? 'Porcentaje (%)' : 'Nuevo valor (USD)'}
          </label>
          <Input
            type="number"
            step="0.01"
            placeholder={modo === 'porcentaje' ? 'ej: 8.5' : 'ej: 125.00'}
            value={valorStr}
            onChange={(e) => setValorStr(e.target.value)}
            className="h-9 text-sm"
          />
        </div>

        <div className="min-w-[240px] flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Razón del cambio <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="ej: Ajuste inflación proveedor CELSA may-2026"
            value={razon}
            onChange={(e) => setRazon(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* Product table */}
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = someChecked;
                  }}
                  onChange={toggleAll}
                  className="h-4 w-4 cursor-pointer rounded border"
                />
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Código</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Producto</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                Precio actual
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                Costo actual
              </th>
              {canPreview && (
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                  Nuevo {campo === 'precio' ? 'precio' : 'costo'}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  Sin productos con los filtros seleccionados
                </td>
              </tr>
            )}
            {filtered.map((p) => {
              const isSelected = activeSelection.has(p.id);
              const preview =
                canPreview && isSelected ? previewRows.find((r) => r.id === p.id) : null;

              return (
                <tr
                  key={p.id}
                  className={`border-b transition-colors last:border-0 ${
                    isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(p.id)}
                      className="h-4 w-4 cursor-pointer rounded border"
                    />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-primary">{p.codigo}</td>
                  <td className="max-w-xs px-3 py-2.5">
                    <span
                      className="block overflow-hidden text-ellipsis whitespace-nowrap"
                      title={p.nombre}
                    >
                      {p.nombre}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                    {p.precioUnitario ? fmt(Number(p.precioUnitario)) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                    {p.costoUnitario ? fmt(Number(p.costoUnitario)) : '—'}
                  </td>
                  {canPreview && (
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {preview ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="font-semibold">{fmt(preview.nuevo)}</span>
                          <span
                            className={`text-xs ${
                              preview.diff >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {preview.diff >= 0 ? '+' : ''}
                            {preview.pct.toFixed(1)}%
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {activeSelection.size} de {filtered.length} productos seleccionados
        </p>
        <Button
          onClick={handleSubmit}
          disabled={!canPreview || razon.trim().length < 3 || isPending}
          className="gap-2"
        >
          <TrendingUp className="h-4 w-4" />
          {isPending
            ? 'Actualizando…'
            : `Actualizar ${activeSelection.size > 0 ? activeSelection.size : ''} producto${activeSelection.size !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </div>
  );
}
