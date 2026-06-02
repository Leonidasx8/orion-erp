import { Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Badge de estado canónico del DS V1.
 * Mapea cualquier estado conocido del dominio a su variante visual.
 */
export type Estado =
  | 'borrador'
  | 'enviada'
  | 'pendiente'
  | 'aprobada'
  | 'aceptada'
  | 'rechazada'
  | 'vencida'
  | 'anulada'
  | 'convertida'
  | 'pagada'
  | 'recibida_parcial'
  | 'recibida_total'
  | 'cerrada'
  | 'lista_para_emitir'
  | 'emitida'
  | 'sin_enviar';

const CFG: Record<Estado, { label: string; className: string; lineThrough?: boolean }> = {
  borrador: { label: 'Borrador', className: 'bg-orion-bg-muted text-orion-fg-muted' },
  enviada: { label: 'Enviada', className: 'bg-info-soft text-info-fg' },
  pendiente: { label: 'Pendiente', className: 'bg-info-soft text-info-fg' },
  aprobada: { label: 'Aprobada', className: 'bg-success-soft text-success-fg' },
  aceptada: { label: 'Aceptada SUNAT', className: 'bg-success-soft text-success-fg' },
  pagada: { label: 'Pagada', className: 'bg-success-soft text-success-fg' },
  rechazada: { label: 'Rechazada', className: 'bg-danger-soft text-danger-fg' },
  vencida: { label: 'Vencida', className: 'bg-warn-soft text-warn-fg' },
  anulada: {
    label: 'Anulada',
    className: 'bg-orion-bg-muted text-orion-fg-faint',
    lineThrough: true,
  },
  convertida: { label: 'Convertida', className: 'bg-orion-bg-muted text-orion-fg-muted' },
  recibida_parcial: { label: 'Recibida parcial', className: 'bg-warn-soft text-warn-fg' },
  recibida_total: { label: 'Recibida total', className: 'bg-success-soft text-success-fg' },
  cerrada: { label: 'Cerrada', className: 'bg-orion-bg-muted text-orion-fg-muted' },
  lista_para_emitir: { label: 'Lista para emitir', className: 'bg-info-soft text-info-fg' },
  emitida: { label: 'Emitida', className: 'bg-success-soft text-success-fg' },
  sin_enviar: { label: 'Sin enviar', className: 'bg-orion-bg-muted text-orion-fg-muted' },
};

export function EstadoBadge({
  estado,
  label,
  size = 'md',
}: {
  estado: Estado;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const cfg = CFG[estado];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'sm' ? 'h-[18px] px-1.5 text-[10.5px]' : 'h-5 px-2 text-[11px]',
        cfg.className,
        cfg.lineThrough && 'line-through'
      )}
    >
      <Circle size={size === 'sm' ? 5 : 6} fill="currentColor" />
      {label ?? cfg.label}
    </span>
  );
}
