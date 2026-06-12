import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Money } from '@/components/shared/Money';

export type DashboardCxCData = {
  clientesConDeuda: number;
  totalCxCUsd: number;
  totalCxCPen: number;
  totalVencidoUsd: number;
  totalVencidoPen: number;
};

export function DashboardCxC({ data }: { data: DashboardCxCData }) {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
      {/* Clientes con deuda */}
      <Card className="col-span-2 xl:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-orion-fg-muted">
            Clientes con deuda
          </CardTitle>
          <Users size={16} className="text-orion-fg-faint" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums text-orion-fg">
            {data.clientesConDeuda}
          </div>
          <p className="mt-1 text-xs text-orion-fg-faint">con saldo pendiente</p>
        </CardContent>
      </Card>

      {/* Total USD */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-orion-fg-muted">
            Total por cobrar
          </CardTitle>
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            USD
          </span>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums text-orion-fg">
            <Money value={data.totalCxCUsd} ccy="USD" />
          </div>
          <p className="mt-1 text-xs text-orion-fg-faint">saldo pendiente USD</p>
        </CardContent>
      </Card>

      {/* Vencido USD */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-orion-fg-muted">Vencido</CardTitle>
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            USD
          </span>
        </CardHeader>
        <CardContent>
          {data.totalVencidoUsd > 0 ? (
            <div className="text-2xl font-bold tabular-nums text-danger-fg">
              <Money value={data.totalVencidoUsd} ccy="USD" />
            </div>
          ) : (
            <div className="text-2xl font-bold tabular-nums text-orion-fg-muted">—</div>
          )}
          <p className="mt-1 text-xs text-orion-fg-faint">facturas vencidas USD</p>
        </CardContent>
      </Card>

      {/* Total PEN */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-orion-fg-muted">
            Total por cobrar
          </CardTitle>
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            S/
          </span>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums text-orion-fg">
            <Money value={data.totalCxCPen} ccy="PEN" />
          </div>
          <p className="mt-1 text-xs text-orion-fg-faint">saldo pendiente soles</p>
        </CardContent>
      </Card>

      {/* Vencido PEN */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-orion-fg-muted">Vencido</CardTitle>
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            S/
          </span>
        </CardHeader>
        <CardContent>
          {data.totalVencidoPen > 0 ? (
            <div className="text-2xl font-bold tabular-nums text-danger-fg">
              <Money value={data.totalVencidoPen} ccy="PEN" />
            </div>
          ) : (
            <div className="text-2xl font-bold tabular-nums text-orion-fg-muted">—</div>
          )}
          <p className="mt-1 text-xs text-orion-fg-faint">facturas vencidas soles</p>
        </CardContent>
      </Card>
    </div>
  );
}
