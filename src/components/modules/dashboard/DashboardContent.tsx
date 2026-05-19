import {
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  ArrowRight,
  Calendar,
  ChevronDown,
  Circle,
  FileText,
  Layers,
  Plus,
  Receipt,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import type { Tenant } from '@/lib/db/schema';
import { Money } from '@/components/shared/Money';
import { PageHead } from '@/components/shared/PageHead';
import { Kpi, KpiRow } from '@/components/shared/Kpi';
import { EstadoBadge } from '@/components/shared/EstadoBadge';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type DashboardData = {
  kpis: {
    ventasMes: number;
    cotizacionesTotal: number;
    pipelineCount: number;
    pipelineValor: number;
    stockCriticoCount: number;
    clientesActivos: number;
  };
  pipeline: Array<{ estado: string; count: number; valor: number }>;
  porAprobar: Array<{
    id: string;
    numero: string;
    cliente: string;
    total: number;
    moneda: string;
    diasHastaVencimiento: number;
  }>;
  stockCritico: Array<{
    id: string;
    codigo: string;
    nombre: string;
    stockActual: number;
    stockMinimo: number;
  }>;
};

function formatSubtitle() {
  const now = new Date();
  const meses = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ];
  const label = `${now.getDate()} ${meses[now.getMonth()]} ${now.getFullYear()}`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const diasRestantes = lastDay.getDate() - now.getDate();
  return `Resumen del ${label} · cierra mes en ${diasRestantes} días`;
}

export function DashboardContent({ tenant, data }: { tenant: Tenant; data: DashboardData }) {
  const firstName =
    (tenant.razonSocial.split(/\s+/)[0] ?? 'Equipo').replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ]/g, '') ||
    'Equipo';

  const { kpis, pipeline, porAprobar, stockCritico } = data;

  return (
    <>
      <PageHead
        title={`Buen día, ${firstName}`}
        subtitle={formatSubtitle()}
        actions={
          <>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-orion-border bg-orion-bg px-3 text-[13px] font-medium text-orion-fg hover:bg-orion-bg-muted"
            >
              <Calendar size={13} />
              Mes en curso
              <ChevronDown size={12} />
            </button>
            <Link
              href={`/${tenant.slug}/cotizaciones/nueva`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-tenant-accent px-3 text-[13px] font-medium text-white hover:brightness-95"
            >
              <Plus size={13} />
              Nueva cotización
            </Link>
          </>
        }
      />

      <KpiRow cols={5}>
        <Kpi
          label="Pipeline activo"
          icon={<Receipt size={12} />}
          delta={
            <>
              <Circle size={8} fill="currentColor" />
              {kpis.pipelineCount} cot. enviadas
            </>
          }
          deltaTone="info"
        >
          <Money value={kpis.pipelineValor} dp={0} ccy="USD" />
        </Kpi>
        <Kpi
          label="Total aceptadas"
          icon={<FileText size={12} />}
          delta={
            kpis.ventasMes > 0 ? (
              <>
                <ArrowUp size={11} />
                cotizaciones cerradas
              </>
            ) : (
              <>
                <Circle size={8} fill="currentColor" />
                sin cierres aún
              </>
            )
          }
          deltaTone={kpis.ventasMes > 0 ? 'up' : 'info'}
        >
          <Money value={kpis.ventasMes} dp={0} ccy="USD" />
        </Kpi>
        <Kpi
          label="CxC vencido"
          icon={<Wallet size={12} />}
          delta={
            <>
              <ArrowDown size={11} />
              módulo en construcción
            </>
          }
          deltaTone="down"
        >
          <span className="text-sm font-normal text-orion-fg-muted">—</span>
        </Kpi>
        <Kpi
          label="Stock crítico"
          icon={<Layers size={12} />}
          delta={
            kpis.stockCriticoCount > 0 ? (
              <>
                <AlertTriangle size={11} />
                bajo umbral mínimo
              </>
            ) : (
              <>
                <Circle size={8} fill="currentColor" />
                sin alertas
              </>
            )
          }
          deltaTone={kpis.stockCriticoCount > 0 ? 'warn' : 'up'}
        >
          {kpis.stockCriticoCount}{' '}
          <span className="text-xs font-normal text-orion-fg-faint">SKUs</span>
        </Kpi>
        <Kpi
          label="Clientes activos"
          icon={<Users size={12} />}
          delta={
            <>
              <Circle size={8} fill="currentColor" />
              en cartera
            </>
          }
          deltaTone="info"
        >
          {kpis.clientesActivos}
        </Kpi>
      </KpiRow>

      <div className="mt-4 grid grid-cols-[3fr_2fr] gap-4">
        <SalesChartCard />
        <PipelineCard pipeline={pipeline} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <CotizacionesPorAprobarCard tenantSlug={tenant.slug} rows={porAprobar} />
        <StockCriticoCard tenantSlug={tenant.slug} rows={stockCritico} />
      </div>
    </>
  );
}

function SalesChartCard() {
  // Placeholder — wired to real data in B.11 reportes
  const data = [28, 32, 30, 38, 42, 35, 46, 52, 48, 55, 58, 48];
  const labels = [
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic',
    'Ene',
    'Feb',
    'Mar',
    'Abr',
  ];
  const max = Math.max(...data);
  const height = 180;
  return (
    <Card>
      <CardHead>
        <div>
          <CardTitle>Ventas · 12 meses</CardTitle>
          <p className="mt-0.5 text-[11.5px] text-orion-fg-muted">
            USD · referencia histórica (B.11)
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <ChartRangeBtn>Mes</ChartRangeBtn>
          <ChartRangeBtn active>Trimestre</ChartRangeBtn>
          <ChartRangeBtn>Año</ChartRangeBtn>
        </div>
      </CardHead>
      <div className="p-4">
        <div className="flex items-end gap-1.5" style={{ height }}>
          {data.map((v, i) => (
            <div key={labels[i]} className="group flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-sm bg-tenant-accent transition-opacity group-hover:opacity-80"
                style={{ height: `${(v / max) * (height - 24)}px` }}
                title={`${labels[i]}: USD ${v}k`}
              />
              <div className="text-[10px] text-orion-fg-faint">{labels[i]}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

const PIPELINE_COLORS: Record<string, string> = {
  borrador: 'bg-orion-fg-faint',
  enviada: 'bg-info',
  aceptada: 'bg-success',
  rechazada: 'bg-danger',
  vencida: 'bg-warn',
};

function PipelineCard({ pipeline }: { pipeline: DashboardData['pipeline'] }) {
  const maxVal = Math.max(...pipeline.map((s) => s.valor), 1);
  return (
    <Card>
      <CardHead>
        <CardTitle>Pipeline cotizaciones</CardTitle>
      </CardHead>
      <div className="p-4">
        {pipeline.map((s) => (
          <div key={s.estado} className="mb-2.5">
            <div className="mb-1 flex items-center">
              <EstadoBadge estado={s.estado as 'borrador'} />
              <span className="ml-1.5 text-[11.5px] text-orion-fg-muted">{s.count} cot.</span>
              <span className="ml-auto font-mono text-xs text-orion-fg">
                {s.valor > 0 ? <Money value={s.valor} ccy="USD" dp={0} /> : '—'}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-sm bg-orion-bg-muted">
              <div
                className={cn('h-full', PIPELINE_COLORS[s.estado] ?? 'bg-orion-fg-faint')}
                style={{ width: `${(s.valor / maxVal) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CotizacionesPorAprobarCard({
  tenantSlug,
  rows,
}: {
  tenantSlug: string;
  rows: DashboardData['porAprobar'];
}) {
  return (
    <Card>
      <CardHead>
        <CardTitle>Cotizaciones por aprobar</CardTitle>
        <a
          href={`/${tenantSlug}/cotizaciones?estado=enviada`}
          className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-orion-fg-muted hover:bg-orion-bg-muted hover:text-orion-fg"
        >
          Ver todas <ArrowRight size={12} />
        </a>
      </CardHead>
      {rows.length === 0 ? (
        <div className="flex items-center justify-center py-10 text-[12px] text-orion-fg-muted">
          No hay cotizaciones pendientes
        </div>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Número</Th>
              <Th>Cliente</Th>
              <Th align="right">Total</Th>
              <Th>Vence</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="[&_td]:h-8">
                <Td className="font-mono text-[11.5px]">
                  <Link
                    href={`/${tenantSlug}/cotizaciones/${r.id}`}
                    className="hover:text-tenant-accent hover:underline"
                  >
                    {r.numero}
                  </Link>
                </Td>
                <Td className="max-w-[180px] truncate">{r.cliente}</Td>
                <Td align="right">
                  <Money value={r.total} dp={2} ccy={r.moneda as 'USD' | 'PEN'} />
                </Td>
                <Td>
                  {r.diasHastaVencimiento <= 2 ? (
                    <span className="inline-flex h-5 items-center rounded-sm bg-warn-soft px-1.5 text-[11px] font-medium text-warn-fg">
                      {r.diasHastaVencimiento <= 0
                        ? 'Hoy'
                        : r.diasHastaVencimiento === 1
                          ? 'Mañana'
                          : `${r.diasHastaVencimiento} días`}
                    </span>
                  ) : (
                    <span className="text-orion-fg-muted">
                      {r.diasHastaVencimiento >= 999 ? '—' : `${r.diasHastaVencimiento} días`}
                    </span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

function StockCriticoCard({
  tenantSlug,
  rows,
}: {
  tenantSlug: string;
  rows: DashboardData['stockCritico'];
}) {
  return (
    <Card>
      <CardHead>
        <CardTitle>Stock crítico</CardTitle>
        {rows.length > 0 && (
          <Badge
            variant="outline"
            className="border-warn/40 ml-auto h-5 gap-1 bg-warn-soft px-2 text-[11px] font-medium text-warn-fg"
          >
            <Circle size={6} fill="currentColor" />
            {rows.length} SKUs
          </Badge>
        )}
        <a
          href={`/${tenantSlug}/inventario?estado=critico`}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-orion-fg-muted hover:bg-orion-bg-muted hover:text-orion-fg"
        >
          Ver <ArrowRight size={12} />
        </a>
      </CardHead>
      {rows.length === 0 ? (
        <div className="flex items-center justify-center py-10 text-[12px] text-orion-fg-muted">
          Sin productos bajo umbral mínimo
        </div>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>SKU</Th>
              <Th>Producto</Th>
              <Th align="right">Stock</Th>
              <Th align="right">Mínimo</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="[&_td]:h-8">
                <Td className="font-mono text-[11.5px]">{r.codigo}</Td>
                <Td className="max-w-[200px] truncate">{r.nombre}</Td>
                <Td
                  align="right"
                  className={cn(
                    'font-semibold',
                    r.stockActual === 0 ? 'text-danger-fg' : 'text-warn-fg'
                  )}
                >
                  {r.stockActual}
                </Td>
                <Td align="right" className="text-orion-fg-muted">
                  {r.stockMinimo}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-orion-border bg-orion-bg shadow-orion-1">
      {children}
    </div>
  );
}
function CardHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-orion-border px-4 py-3.5">
      {children}
    </div>
  );
}
function CardTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[14px] font-semibold text-orion-fg">{children}</div>;
}
function ChartRangeBtn({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'h-7 rounded-md px-2 text-[12px] font-medium',
        active
          ? 'bg-orion-bg-muted text-orion-fg'
          : 'text-orion-fg-muted hover:bg-orion-bg-muted hover:text-orion-fg'
      )}
    >
      {children}
    </button>
  );
}
function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full border-collapse text-[12.5px]">{children}</table>;
}
function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={cn(
        'border-b border-orion-border bg-orion-bg-subtle px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-orion-fg-muted',
        align === 'right' ? 'text-right' : 'text-left'
      )}
    >
      {children}
    </th>
  );
}
function Td({
  children,
  align,
  className,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  return (
    <td
      className={cn(
        'border-b border-orion-border px-3 align-middle text-orion-fg',
        align === 'right' ? 'text-right tabular-nums' : '',
        className
      )}
    >
      {children}
    </td>
  );
}
