'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
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
import { TenantStep1Schema, type TenantStep1Input } from '@/lib/schemas/tenant';
import { verificarSlugDisponible } from '@/server/actions/tenants';
import { useWizard } from '../_state/wizard-state';

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken';

export function WizardStep1Datos() {
  const { data, setData, next } = useWizard();
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [slugTimer, setSlugTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<TenantStep1Input>({
    resolver: zodResolver(TenantStep1Schema),
    defaultValues: {
      razonSocial: data.razonSocial ?? '',
      ruc: data.ruc ?? '',
      slug: data.slug ?? '',
      direccionFiscal: data.direccionFiscal ?? '',
      ubigeo: data.ubigeo ?? '',
    },
  });

  const checkSlug = useCallback(async (slug: string) => {
    if (!slug || slug.length < 2) {
      setSlugStatus('idle');
      return;
    }
    setSlugStatus('checking');
    const res = await verificarSlugDisponible(slug);
    setSlugStatus(res.available ? 'available' : 'taken');
  }, []);

  const slug = form.watch('slug');
  useEffect(() => {
    if (slugTimer) clearTimeout(slugTimer);
    const t = setTimeout(() => checkSlug(slug), 400);
    setSlugTimer(t);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const onSubmit = (values: TenantStep1Input) => {
    if (slugStatus !== 'available') {
      form.setError('slug', { message: 'El slug no está disponible' });
      return;
    }
    setData(values);
    next();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="razonSocial"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Razón social</FormLabel>
                <FormControl>
                  <Input placeholder="GRUPO IDEX SAC" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ruc"
            render={({ field }) => (
              <FormItem>
                <FormLabel>RUC</FormLabel>
                <FormControl>
                  <Input placeholder="20614847370" maxLength={11} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug del tenant</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input placeholder="idex" {...field} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {slugStatus === 'checking' && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {slugStatus === 'available' && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      {slugStatus === 'taken' && <XCircle className="h-4 w-4 text-destructive" />}
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
                {slugStatus === 'taken' && (
                  <p className="text-xs text-destructive">Slug no disponible</p>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="direccionFiscal"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Dirección fiscal</FormLabel>
                <FormControl>
                  <Input placeholder="Av. La Marina 123, Lima" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ubigeo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ubigeo</FormLabel>
                <FormControl>
                  <Input placeholder="150101" maxLength={6} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={slugStatus === 'checking' || slugStatus === 'taken'}>
            Siguiente
          </Button>
        </div>
      </form>
    </Form>
  );
}
