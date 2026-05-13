'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { TenantStep2Schema, type TenantStep2Input } from '@/lib/schemas/tenant';
import { useWizard } from '../_state/wizard-state';

const COLORES = ['#0070f3', '#16a34a', '#7c3aed', '#dc2626', '#ea580c', '#0891b2', '#0f172a'];

export function WizardStep2Branding() {
  const { data, setData, next, back } = useWizard();

  const form = useForm<TenantStep2Input>({
    resolver: zodResolver(TenantStep2Schema),
    defaultValues: {
      logoUrl: data.logoUrl ?? '',
      colorPrimario: data.colorPrimario ?? '#0070f3',
      colorSecundario: data.colorSecundario ?? '#7928ca',
      faviconUrl: data.faviconUrl ?? '',
    },
  });

  const colorPrimario = form.watch('colorPrimario');
  const slug = data.slug ?? 'tenant';
  const nombre = data.razonSocial ?? 'Tenant';
  const initials = slug.slice(0, 2).toUpperCase();

  const onSubmit = (values: TenantStep2Input) => {
    setData(values);
    next();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-3 gap-4">
          {/* Left: form */}
          <div className="col-span-2 space-y-5 rounded-lg border bg-card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Branding
            </h3>

            {/* Color de acento */}
            <FormField
              control={form.control}
              name="colorPrimario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color de acento</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap items-center gap-2">
                      {COLORES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => field.onChange(c)}
                          className="relative h-8 w-8 rounded-md transition-all"
                          style={{
                            background: c,
                            boxShadow:
                              field.value === c
                                ? '0 0 0 2px white, 0 0 0 4px ' + c
                                : 'inset 0 0 0 1px rgba(0,0,0,.1)',
                          }}
                        >
                          {field.value === c && (
                            <Check size={14} className="absolute inset-0 m-auto text-white" />
                          )}
                        </button>
                      ))}
                      <input
                        type="color"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="h-8 w-8 cursor-pointer rounded-md border border-input"
                        title="Color personalizado"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Logo upload */}
            <div className="space-y-1.5">
              <Label>Logotipo</Label>
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 py-6 text-center">
                <Upload size={20} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Arrastra un archivo · PNG, SVG (máx 1 MB)
                </p>
                <p className="text-xs text-muted-foreground">
                  Recomendado 256×256 fondo transparente
                </p>
              </div>
            </div>

            {/* Densidad */}
            <div className="space-y-1.5">
              <Label>Densidad por defecto</Label>
              <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option>Compacta · 36px row</option>
                <option>Normal · 44px row</option>
              </select>
            </div>
          </div>

          {/* Right: live preview */}
          <div className="space-y-4 rounded-lg border bg-card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Vista previa
            </h3>
            <div className="overflow-hidden rounded-lg border">
              {/* Mini topbar */}
              <div className="flex h-9 items-center gap-2 border-b bg-background px-3">
                <div
                  className="grid h-5 w-5 place-items-center rounded text-[9px] font-bold text-white"
                  style={{ background: colorPrimario }}
                >
                  {initials}
                </div>
                <span className="text-xs font-semibold">{nombre.split(' ')[0]}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                  orion.app/{slug}
                </span>
              </div>
              {/* Mini layout */}
              <div className="flex h-40 bg-muted/20">
                <div className="w-16 space-y-1 border-r bg-background p-2">
                  <div className="h-5 rounded" style={{ background: colorPrimario + '33' }} />
                  <div className="h-3 rounded bg-muted" />
                  <div className="h-3 rounded bg-muted" />
                  <div className="h-3 rounded bg-muted" />
                </div>
                <div className="flex-1 space-y-2 p-3">
                  <div className="h-3 w-24 rounded bg-muted" />
                  <div className="h-2 w-40 rounded bg-muted" />
                  <div
                    className="mt-3 inline-block rounded px-3 py-1.5 text-[10px] font-medium text-white"
                    style={{ background: colorPrimario }}
                  >
                    Nueva cotización
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Los cambios de branding se aplican inmediatamente a todos los usuarios del tenant.
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-between">
          <Button type="button" variant="outline" onClick={back}>
            Atrás
          </Button>
          <Button type="submit">Continuar</Button>
        </div>
      </form>
    </Form>
  );
}
