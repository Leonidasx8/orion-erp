'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { TenantStep5Schema, type TenantStep5Input } from '@/lib/schemas/tenant';
import { crearTenant } from '@/server/actions/tenants';
import { useWizard } from '../_state/wizard-state';

const PLANES = [
  {
    value: 'starter' as const,
    label: 'Starter',
    descripcion: 'Hasta 500 documentos/mes',
  },
  {
    value: 'pro' as const,
    label: 'Pro',
    descripcion: 'Hasta 5 000 documentos/mes',
  },
  {
    value: 'enterprise' as const,
    label: 'Enterprise',
    descripcion: 'Sin límites',
  },
];

export function WizardStep5Plan() {
  const { data, back } = useWizard();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<TenantStep5Input>({
    resolver: zodResolver(TenantStep5Schema),
    defaultValues: { plan: data.plan ?? 'starter' },
  });

  const selectedPlan = form.watch('plan');

  const onSubmit = async (values: TenantStep5Input) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await crearTenant({
        ...(data as Parameters<typeof crearTenant>[0]),
        ...values,
      });
      if (!result.ok) {
        setError(result.error ?? 'Error al crear el tenant');
        return;
      }
      router.push(`/admin/tenants/${result.tenant.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="plan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plan</FormLabel>
              <div className="grid grid-cols-3 gap-3">
                {PLANES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => field.onChange(p.value)}
                    className={cn(
                      'relative rounded-lg border-2 p-4 text-left transition-colors',
                      field.value === p.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/50'
                    )}
                  >
                    {field.value === p.value && (
                      <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-primary" />
                    )}
                    <p className="font-medium">{p.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{p.descripcion}</p>
                  </button>
                ))}
              </div>
              <FormControl>
                <input type="hidden" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Resumen */}
        <div className="space-y-1 rounded-lg bg-muted/40 p-4 text-sm">
          <p className="mb-2 font-medium">Resumen del tenant</p>
          <p>
            <span className="text-muted-foreground">Razón social:</span> {data.razonSocial}
          </p>
          <p>
            <span className="text-muted-foreground">RUC:</span> {data.ruc}
          </p>
          <p>
            <span className="text-muted-foreground">Slug:</span> /{data.slug}
          </p>
          <p>
            <span className="text-muted-foreground">Admin:</span> {data.adminEmail}
          </p>
          <p>
            <span className="text-muted-foreground">Plan:</span> {selectedPlan}
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={back} disabled={submitting}>
            Atrás
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear tenant
          </Button>
        </div>
      </form>
    </Form>
  );
}
