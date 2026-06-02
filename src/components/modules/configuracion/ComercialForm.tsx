'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { actualizarInfoComercial } from '@/server/actions/configuracion-empresa';
import type { Tenant } from '@/lib/db/schema';

type Props = Pick<
  Tenant,
  | 'comercialNombre'
  | 'comercialCargo'
  | 'comercialTelefono'
  | 'bancoNombre'
  | 'bancoCuenta'
  | 'bancoCci'
  | 'bancoDetraccionCuenta'
  | 'bancoCuentaUsd'
  | 'bancoCciUsd'
>;

export function ComercialForm(props: Props) {
  const [nombre, setNombre] = useState(props.comercialNombre ?? '');
  const [cargo, setCargo] = useState(props.comercialCargo ?? '');
  const [telefono, setTelefono] = useState(props.comercialTelefono ?? '');
  const [bancoNombre, setBancoNombre] = useState(props.bancoNombre ?? '');
  const [bancoCuenta, setBancoCuenta] = useState(props.bancoCuenta ?? '');
  const [bancoCci, setBancoCci] = useState(props.bancoCci ?? '');
  const [bancoDetraccion, setBancoDetraccion] = useState(props.bancoDetraccionCuenta ?? '');
  const [cuentaUsd, setCuentaUsd] = useState(props.bancoCuentaUsd ?? '');
  const [cciUsd, setCciUsd] = useState(props.bancoCciUsd ?? '');
  const [isPending, startTransition] = useTransition();

  const onGuardar = () => {
    startTransition(async () => {
      const res = await actualizarInfoComercial({
        comercialNombre: nombre,
        comercialCargo: cargo,
        comercialTelefono: telefono,
        bancoNombre,
        bancoCuenta,
        bancoCci,
        bancoDetraccionCuenta: bancoDetraccion,
        bancoCuentaUsd: cuentaUsd,
        bancoCciUsd: cciUsd,
      });
      if (res.success) {
        toast.success('Datos comerciales y bancarios guardados');
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Gerente / contacto comercial */}
      <Section title="Gerente / representante comercial">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Nombre completo">
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Lucas Escrivá"
              className={inp}
            />
          </Field>
          <Field label="Cargo">
            <input
              type="text"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="Gerente General"
              className={inp}
            />
          </Field>
          <Field label="Teléfono directo">
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="987-654-321"
              className={inp}
            />
          </Field>
        </div>
        <p className="text-[11px] text-orion-fg-muted">
          Aparece en el pie de cotizaciones como firma del vendedor.
        </p>
      </Section>

      <div className="h-px bg-orion-border" />

      {/* Datos bancarios PEN */}
      <Section title="Cuenta bancaria — Soles (PEN)">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Banco">
            <input
              type="text"
              value={bancoNombre}
              onChange={(e) => setBancoNombre(e.target.value)}
              placeholder="BCP"
              className={inp}
            />
          </Field>
          <Field label="N° de cuenta">
            <input
              type="text"
              value={bancoCuenta}
              onChange={(e) => setBancoCuenta(e.target.value)}
              placeholder="1234567890"
              className={inp}
            />
          </Field>
          <Field label="CCI">
            <input
              type="text"
              value={bancoCci}
              onChange={(e) => setBancoCci(e.target.value)}
              placeholder="00212345678900"
              className={inp}
            />
          </Field>
        </div>
      </Section>

      {/* Cuenta USD */}
      <Section title="Cuenta bancaria — Dólares (USD)">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="N° de cuenta USD">
            <input
              type="text"
              value={cuentaUsd}
              onChange={(e) => setCuentaUsd(e.target.value)}
              placeholder="1234567891"
              className={inp}
            />
          </Field>
          <Field label="CCI USD">
            <input
              type="text"
              value={cciUsd}
              onChange={(e) => setCciUsd(e.target.value)}
              placeholder="00212345678901"
              className={inp}
            />
          </Field>
        </div>
      </Section>

      {/* Detracciones */}
      <Section title="Cuenta de detracciones">
        <Field label="N° cuenta Banco de la Nación">
          <input
            type="text"
            value={bancoDetraccion}
            onChange={(e) => setBancoDetraccion(e.target.value)}
            placeholder="00-123-456789"
            className={inp}
          />
        </Field>
        <p className="text-[11px] text-orion-fg-muted">
          Se muestra en facturas sujetas a detracción.
        </p>
      </Section>

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

const inp =
  'h-9 w-full rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] text-orion-fg placeholder:text-orion-fg-muted focus:outline-none focus:ring-2 focus:ring-orion-brand';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-orion-fg-muted">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-medium text-orion-fg-muted">{label}</label>
      {children}
    </div>
  );
}
