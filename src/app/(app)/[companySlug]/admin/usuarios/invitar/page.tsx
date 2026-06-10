'use client';

import { useTransition, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams, useRouter } from 'next/navigation';
import { invitarUsuario } from '@/server/actions/users';
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

const Schema = z.object({
  email: z.string().email('Email inválido'),
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  rolNombre: z.string().min(1, 'Selecciona un rol'),
});

const ROLES = [
  { value: 'Superadmin', label: 'Admin' },
  { value: 'Comercial', label: 'Comercial' },
  { value: 'Facturación', label: 'Facturación' },
];

export default function InvitarUsuarioPage() {
  const router = useRouter();
  const params = useParams<{ companySlug: string }>();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof Schema>>({
    resolver: zodResolver(Schema),
    defaultValues: { email: '', nombre: '', rolNombre: '' },
  });

  const onSubmit = (data: z.infer<typeof Schema>) => {
    setError(null);
    startTransition(async () => {
      const res = await invitarUsuario(data);
      if (!res.success) {
        setError(res.error);
        return;
      }
      router.push(`/${params.companySlug}/admin/usuarios`);
    });
  };

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-bold">Invitar usuario</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="usuario@empresa.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Juan Pérez" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rolNombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rol</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Enviando invitación...' : 'Invitar'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
