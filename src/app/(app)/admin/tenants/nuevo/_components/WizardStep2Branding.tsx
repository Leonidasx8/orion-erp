'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { TenantStep2Schema, type TenantStep2Input } from '@/lib/schemas/tenant';
import { useWizard } from '../_state/wizard-state';

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
  const colorSecundario = form.watch('colorSecundario');

  const onSubmit = (values: TenantStep2Input) => {
    setData(values);
    next();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="colorPrimario"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color primario</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={field.value}
                      onChange={field.onChange}
                      className="h-9 w-10 cursor-pointer rounded border border-input"
                    />
                    <Input
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="#0070f3"
                      className="font-mono"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="colorSecundario"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color secundario</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={field.value}
                      onChange={field.onChange}
                      className="h-9 w-10 cursor-pointer rounded border border-input"
                    />
                    <Input
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="#7928ca"
                      className="font-mono"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="logoUrl"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>URL del logo</FormLabel>
                <FormControl>
                  <Input placeholder="https://..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="faviconUrl"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>URL del favicon</FormLabel>
                <FormControl>
                  <Input placeholder="https://..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Preview */}
        <div className="rounded-lg border border-dashed p-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground">Vista previa</p>
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded"
              style={{ backgroundColor: colorPrimario }}
              aria-label="Color primario preview"
            />
            <div
              className="h-8 w-8 rounded"
              style={{ backgroundColor: colorSecundario }}
              aria-label="Color secundario preview"
            />
            <span className="text-sm font-medium" style={{ color: colorPrimario }}>
              {data.razonSocial ?? 'Nombre del tenant'}
            </span>
          </div>
        </div>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={back}>
            Atrás
          </Button>
          <Button type="submit">Siguiente</Button>
        </div>
      </form>
    </Form>
  );
}
