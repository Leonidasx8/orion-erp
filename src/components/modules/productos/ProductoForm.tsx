'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productoSchema, type ProductoInput, tiposProducto } from '@/lib/schemas/producto';
import { crearProducto, actualizarProducto } from '@/server/actions/productos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Producto, CategoriaProducto, UnidadMedida } from '@/lib/db/schema';

interface Props {
  companySlug: string;
  producto?: Producto;
  categorias: CategoriaProducto[];
  uoms: UnidadMedida[];
}

export function ProductoForm({ companySlug, producto, categorias, uoms }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductoInput>({
    resolver: zodResolver(productoSchema) as Resolver<ProductoInput>,
    defaultValues: producto
      ? {
          codigo: producto.codigo,
          nombre: producto.nombre,
          descripcion: producto.descripcion ?? undefined,
          tipo: producto.tipo as ProductoInput['tipo'],
          categoriaId: producto.categoriaId ?? undefined,
          unidadMedida: producto.unidadMedida,
          precioUnitario: parseFloat(producto.precioUnitario ?? '0'),
          tieneIgv: producto.tieneIgv,
          costoUnitario:
            producto.costoUnitario != null ? parseFloat(producto.costoUnitario) : undefined,
          controlaStock: producto.controlaStock,
          stockMinimo: producto.stockMinimo != null ? parseFloat(producto.stockMinimo) : undefined,
          codigoSunat: producto.codigoSunat ?? undefined,
          activo: producto.activo,
        }
      : {
          tipo: 'bien',
          unidadMedida: 'NIU',
          precioUnitario: 0,
          tieneIgv: true,
          controlaStock: false,
          activo: true,
        },
  });

  const controlaStock = watch('controlaStock');
  const tipo = watch('tipo');

  const onSubmit = (data: ProductoInput): void => {
    setServerError(null);
    startTransition(async () => {
      const res = producto
        ? await actualizarProducto(producto.id, data)
        : await crearProducto(data);

      if (!res.success) {
        setServerError(res.error);
        return;
      }

      if (!producto && res.success) {
        router.push(
          `/${companySlug}/productos/${(res as { success: true; data: { id: string } }).data.id}`
        );
      } else {
        router.push(`/${companySlug}/productos`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Identificación */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="codigo">Código interno *</Label>
          <Input id="codigo" {...register('codigo')} className="font-mono" />
          {errors.codigo && <p className="text-xs text-destructive">{errors.codigo.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Tipo *</Label>
          <Select
            defaultValue={watch('tipo')}
            onValueChange={(v) => {
              setValue('tipo', v as ProductoInput['tipo']);
              setValue('unidadMedida', v === 'servicio' ? 'ZZ' : 'NIU');
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tiposProducto.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">
                  {t === 'bien' ? 'Bien / producto físico' : 'Servicio'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nombre">Nombre *</Label>
        <Input id="nombre" {...register('nombre')} />
        {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea id="descripcion" {...register('descripcion')} rows={3} />
      </div>

      {/* Clasificación */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Categoría</Label>
          <Select
            defaultValue={watch('categoriaId') ?? '__none__'}
            onValueChange={(v) => setValue('categoriaId', v === '__none__' ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sin categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sin categoría</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Unidad de medida *</Label>
          <Select
            defaultValue={watch('unidadMedida')}
            onValueChange={(v) => setValue('unidadMedida', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {uoms.map((u) => (
                <SelectItem key={u.codigo} value={u.codigo}>
                  {u.descripcion} ({u.simbolo ?? u.codigo})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Precios */}
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="text-sm font-medium">Precios</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="precio">Precio unitario (S/) *</Label>
            <Input
              id="precio"
              type="number"
              step="0.0001"
              min="0"
              {...register('precioUnitario')}
              className="tabular-nums"
            />
            {errors.precioUnitario && (
              <p className="text-xs text-destructive">{errors.precioUnitario.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="costo">Costo unitario (S/)</Label>
            <Input
              id="costo"
              type="number"
              step="0.0001"
              min="0"
              {...register('costoUnitario')}
              className="tabular-nums"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="tiene-igv"
            checked={watch('tieneIgv')}
            onCheckedChange={(v) => setValue('tieneIgv', !!v)}
          />
          <label htmlFor="tiene-igv" className="cursor-pointer text-sm">
            Afecto a IGV (18%)
          </label>
        </div>
      </div>

      {/* Inventario — solo para bienes */}
      {tipo === 'bien' && (
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="text-sm font-medium">Inventario</h3>
          <div className="flex items-center gap-2">
            <Checkbox
              id="controla-stock"
              checked={controlaStock}
              onCheckedChange={(v) => setValue('controlaStock', !!v)}
            />
            <label htmlFor="controla-stock" className="cursor-pointer text-sm">
              Controlar stock de este producto
            </label>
          </div>
          {controlaStock && (
            <div className="space-y-1.5">
              <Label htmlFor="stock-min">Stock mínimo</Label>
              <Input
                id="stock-min"
                type="number"
                step="0.01"
                min="0"
                {...register('stockMinimo')}
                className="w-40 tabular-nums"
              />
            </div>
          )}
        </div>
      )}

      {/* SUNAT */}
      <div className="space-y-1.5">
        <Label htmlFor="codigo-sunat">Código SUNAT / GS1</Label>
        <Input id="codigo-sunat" {...register('codigoSunat')} className="w-48 font-mono" />
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando…' : producto ? 'Guardar cambios' : 'Crear producto'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${companySlug}/productos`)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
