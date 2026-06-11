'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

// Ventana de comunicación de baja SUNAT: hasta el 7.º día calendario
// contado desde el día siguiente a la emisión (RS 097-2012/SUNAT).
// Pasada la ventana, la anulación sigue siendo posible vía NC (sin plazo).
const DIAS_VENTANA_BAJA = 7;

export function deadlineBaja(fechaEmision: string): number {
  // fechaEmision es 'YYYY-MM-DD'; la ventana corre en hora de Lima (UTC-5)
  const inicio = new Date(`${fechaEmision}T00:00:00-05:00`).getTime();
  return inicio + (DIAS_VENTANA_BAJA + 1) * 24 * 60 * 60 * 1000;
}

export function formatDuracion(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${Math.max(min, 1)} min`;
  const horas = Math.floor(min / 60);
  if (horas < 48) return `${horas} h`;
  const dias = Math.floor(horas / 24);
  return `${dias} día${dias === 1 ? '' : 's'}`;
}

function formatRestante(ms: number): string {
  const totalMin = Math.floor(ms / 60_000);
  const dias = Math.floor(totalMin / (24 * 60));
  const horas = Math.floor((totalMin % (24 * 60)) / 60);
  const min = totalMin % 60;
  if (dias > 0) return `${dias}d ${horas}h`;
  if (horas > 0) return `${horas}h ${min}m`;
  return `${min}m`;
}

export function AnulacionCountdown({
  fechaEmision,
  compact = false,
}: {
  fechaEmision: string;
  compact?: boolean;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (now == null) return <span className="text-xs text-orion-fg-faint">…</span>;

  const restante = deadlineBaja(fechaEmision) - now;

  if (restante <= 0) {
    return (
      <span
        className="text-xs text-orion-fg-faint"
        title="Pasó la ventana de baja SUNAT (7 días). La anulación vía Nota de Crédito sigue disponible, sin plazo."
      >
        Ventana de baja vencida · NC sin plazo
      </span>
    );
  }

  const urgente = restante < 24 * 60 * 60 * 1000;
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-xs ${
        urgente ? 'text-warn-fg' : 'text-orion-fg-muted'
      }`}
      title="Tiempo restante de la ventana de baja SUNAT (7 días desde la emisión). Después solo se anula vía Nota de Crédito, sin plazo."
    >
      <Clock size={11} className="shrink-0" />
      {compact ? formatRestante(restante) : `Baja SUNAT: ${formatRestante(restante)}`}
    </span>
  );
}
