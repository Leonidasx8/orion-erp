import { Users, Wallet, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Money } from '@/components/shared/Money';

export type DashboardCxCData = {
  clientesConDeuda: number;
  totalCxC: number;
  totalVencido: number;
  moneda: 'PEN' | 'USD';
};

export function DashboardCxC({ data }: { data: DashboardCxCData }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Clientes con deuda */}
      <Card>
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
          <p className="mt-1 text-xs text-orion-fg-faint">clientes con saldo pendiente</p>
        </CardContent>
      </Card>

      {/* Total CxC */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-orion-fg-muted">
            Total por cobrar
          </CardTitle>
          <Wallet size={16} className="text-orion-fg-faint" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orion-fg">
            <Money value={data.totalCxC} ccy={data.moneda} />
          </div>
          <p className="mt-1 text-xs text-orion-fg-faint">saldo total pendiente</p>
        </CardContent>
      </Card>

      {/* Total vencido */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-orion-fg-muted">Total vencido</CardTitle>
          <AlertTriangle size={16} className="text-danger-fg" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-danger-fg">
            <Money value={data.totalVencido} ccy={data.moneda} />
          </div>
          <p className="mt-1 text-xs text-orion-fg-faint">facturas con fecha vencida</p>
        </CardContent>
      </Card>
    </div>
  );
}
