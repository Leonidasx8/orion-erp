'use client';

import { useState, useTransition } from 'react';
import { Building2, Globe, Phone, Mail, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { actualizarInfoEmpresa } from '@/server/actions/configuracion-empresa';
import type { Tenant } from '@/lib/db/schema';

type Props = Pick<
  Tenant,
  'razonSocial' | 'ruc' | 'direccionFiscal' | 'logoUrl' | 'web' | 'telefono' | 'contactoEmail'
>;

export function EmpresaForm(props: Props) {
  const [razonSocial, setRazonSocial] = useState(props.razonSocial ?? '');
  const [ruc, setRuc] = useState(props.ruc ?? '');
  const [direccionFiscal, setDireccionFiscal] = useState(props.direccionFiscal ?? '');
  const [logoUrl, setLogoUrl] = useState(props.logoUrl ?? '');
  const [web, setWeb] = useState(props.web ?? '');
  const [telefono, setTelefono] = useState(props.telefono ?? '');
  const [contactoEmail, setContactoEmail] = useState(props.contactoEmail ?? '');
  const [isPending, startTransition] = useTransition();

  const onGuardar = () => {
    startTransition(async () => {
      const res = await actualizarInfoEmpresa({
        razonSocial,
        ruc,
        direccionFiscal,
        logoUrl,
        web,
        telefono,
        contactoEmail,
      });
      if (res.success) {
        toast.success('Información de la empresa guardada');
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="flex items-start gap-5">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-orion-border bg-orion-bg-subtle">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
          ) : (
            <Building2 size={28} className="text-orion-fg-muted" />
          )}
        </div>
        <div className="flex-1 space-y-1.5">
          <label className="block text-[12px] font-medium text-orion-fg-muted">URL del logo</label>
          <div className="relative">
            <ImageIcon
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-orion-fg-muted"
            />
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://ejemplo.com/logo.png"
              className="focus:ring-orion-brand h-9 w-full rounded-md border border-orion-border bg-orion-bg pl-8 pr-3 text-[13px] text-orion-fg placeholder:text-orion-fg-muted focus:outline-none focus:ring-2"
            />
          </div>
          <p className="text-[11px] text-orion-fg-muted">
            Aparece en PDFs de cotizaciones y en el sidebar.
          </p>
        </div>
      </div>

      <div className="h-px bg-orion-border" />

      {/* Razón social + RUC */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Razón social" required>
          <input
            type="text"
            value={razonSocial}
            onChange={(e) => setRazonSocial(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="RUC" required>
          <input
            type="text"
            maxLength={11}
            value={ruc}
            onChange={(e) => setRuc(e.target.value.replace(/\D/g, ''))}
            className={inputCls}
          />
        </Field>
      </div>

      {/* Dirección */}
      <Field label="Dirección fiscal">
        <input
          type="text"
          value={direccionFiscal}
          onChange={(e) => setDireccionFiscal(e.target.value)}
          placeholder="Av. Ejemplo 123, Lima"
          className={inputCls}
        />
      </Field>

      <div className="h-px bg-orion-border" />

      {/* Contacto */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Sitio web" icon={<Globe size={13} />}>
          <input
            type="text"
            value={web}
            onChange={(e) => setWeb(e.target.value)}
            placeholder="www.empresa.com"
            className={inputCls}
          />
        </Field>
        <Field label="Teléfono" icon={<Phone size={13} />}>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="01-234-5678"
            className={inputCls}
          />
        </Field>
        <Field label="Email de contacto" icon={<Mail size={13} />}>
          <input
            type="email"
            value={contactoEmail}
            onChange={(e) => setContactoEmail(e.target.value)}
            placeholder="info@empresa.com"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onGuardar}
          disabled={isPending}
          className="bg-orion-brand rounded-md px-5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

const inputCls =
  'h-9 w-full rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] text-orion-fg placeholder:text-orion-fg-muted focus:outline-none focus:ring-2 focus:ring-orion-brand';

function Field({
  label,
  required,
  icon,
  children,
}: {
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[12px] font-medium text-orion-fg-muted">
        {icon}
        {label}
        {required && <span className="text-danger-fg">*</span>}
      </label>
      {children}
    </div>
  );
}
