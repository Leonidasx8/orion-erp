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
import { TenantStep3Schema, type TenantStep3Input } from '@/lib/schemas/tenant';
import { useWizard } from '../_state/wizard-state';

export function WizardStep3Admin() {
  const { data, setData, next, back } = useWizard();

  const form = useForm<TenantStep3Input>({
    resolver: zodResolver(TenantStep3Schema),
    defaultValues: {
      adminEmail: data.adminEmail ?? '',
      adminNombre: data.adminNombre ?? '',
    },
  });

  const onSubmit = (values: TenantStep3Input) => {
    setData(values);
    next();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <p className="text-sm text-muted-foreground">
          El primer usuario recibirá un magic link para activar su cuenta y acceder al tenant.
        </p>

        <FormField
          control={form.control}
          name="adminNombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre completo</FormLabel>
              <FormControl>
                <Input placeholder="Lucas Escrivá" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="adminEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email del administrador</FormLabel>
              <FormControl>
                <Input type="email" placeholder="lucas@grupoidex.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
