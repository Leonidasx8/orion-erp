'use client';

import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TenantStep4Schema, type TenantStep4Input } from '@/lib/schemas/tenant';
import { useWizard } from '../_state/wizard-state';

const TIPOS_DOC = [
  { value: '01', label: 'F — Factura' },
  { value: '03', label: 'B — Boleta' },
  { value: '07', label: 'FC — Nota de crédito (factura)' },
  { value: '08', label: 'FD — Nota de débito (factura)' },
  { value: '09', label: 'T — Guía de remisión' },
];

const DEFAULT_SERIES: TenantStep4Input['series'] = [
  { tipoDocumento: '01', serie: 'F001', correlativoInicial: 0 },
  { tipoDocumento: '03', serie: 'B001', correlativoInicial: 0 },
];

export function WizardStep4Fiscal() {
  const { data, setData, next, back } = useWizard();

  const form = useForm<TenantStep4Input>({
    resolver: zodResolver(TenantStep4Schema),
    defaultValues: {
      series: data.series ?? DEFAULT_SERIES,
      nubefactRuta: data.nubefactRuta ?? '',
      nubefactToken: data.nubefactToken ?? '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'series',
  });

  const onSubmit = (values: TenantStep4Input) => {
    setData(values);
    next();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Series SUNAT */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <FormLabel className="text-base">Series de documentos</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({ tipoDocumento: '01' as const, serie: '', correlativoInicial: 0 })
              }
            >
              <Plus className="mr-1 h-3 w-3" /> Agregar serie
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, idx) => (
              <div key={field.id} className="grid grid-cols-[1fr_1fr_100px_36px] items-end gap-2">
                <FormField
                  control={form.control}
                  name={`series.${idx}.tipoDocumento`}
                  render={({ field: f }) => (
                    <FormItem>
                      {idx === 0 && <FormLabel className="text-xs">Tipo</FormLabel>}
                      <Select value={f.value} onValueChange={f.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIPOS_DOC.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`series.${idx}.serie`}
                  render={({ field: f }) => (
                    <FormItem>
                      {idx === 0 && <FormLabel className="text-xs">Serie</FormLabel>}
                      <FormControl>
                        <Input placeholder="F001" maxLength={4} className="font-mono" {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`series.${idx}.correlativoInicial`}
                  render={({ field: f }) => (
                    <FormItem>
                      {idx === 0 && <FormLabel className="text-xs">Desde</FormLabel>}
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          className="font-mono"
                          {...f}
                          onChange={(e) => f.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => remove(idx)}
                  disabled={fields.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* NUBEFACT */}
        <div className="space-y-4 rounded-lg border p-4">
          <p className="text-sm font-medium">Configuración NUBEFACT</p>

          <FormField
            control={form.control}
            name="nubefactRuta"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL API NUBEFACT</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://api.nubefact.com/api/v1/..."
                    className="font-mono text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nubefactToken"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Token NUBEFACT</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Token de autenticación"
                    className="font-mono text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
