// src/components/modules/reportes/PendientesPanel.tsx
import Link from 'next/link';
import { AlertTriangle, PackageCheck } from 'lucide-react';

export type PendientesPanelProps = {
  ocPendientes: { count: number; numeros: string[] };
  stockCritico: number;
  companySlug: string;
};

export function PendientesPanel({ ocPendientes, stockCritico, companySlug }: PendientesPanelProps) {
  if (ocPendientes.count === 0 && stockCritico === 0) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-orion-border bg-orion-bg shadow-orion-1">
      <div className="border-b border-orion-border px-4 py-3">
        <h2 className="text-[13px] font-semibold text-orion-fg">Pendientes de operación</h2>
      </div>
      <div className="divide-y divide-orion-border">
        {ocPendientes.count > 0 && (
          <Link
            href={`/${companySlug}/ordenes?estado=pendiente_recepcion`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-orion-bg-muted"
          >
            <PackageCheck size={15} className="shrink-0 text-warn-fg" />
            <span className="flex-1 text-[13px] text-orion-fg">
              <span className="font-medium">
                {ocPendientes.count} OC {ocPendientes.count === 1 ? 'lista' : 'listas'} para recibir
              </span>
              {ocPendientes.numeros.length > 0 && (
                <span className="ml-1.5 font-mono text-[11.5px] text-orion-fg-muted">
                  {ocPendientes.numeros.slice(0, 3).join(', ')}
                  {ocPendientes.numeros.length > 3 ? ` +${ocPendientes.numeros.length - 3}` : ''}
                </span>
              )}
            </span>
            <span aria-hidden="true" className="text-[12px] text-orion-fg-muted">
              →
            </span>
          </Link>
        )}
        {stockCritico > 0 && (
          <Link
            href={`/${companySlug}/inventario?filtro=critico`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-orion-bg-muted"
          >
            <AlertTriangle size={15} className="shrink-0 text-danger-fg" />
            <span className="flex-1 text-[13px] text-orion-fg">
              <span className="font-medium">
                {stockCritico} producto{stockCritico !== 1 ? 's' : ''} con stock crítico o sin stock
              </span>
            </span>
            <span aria-hidden="true" className="text-[12px] text-orion-fg-muted">
              →
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
