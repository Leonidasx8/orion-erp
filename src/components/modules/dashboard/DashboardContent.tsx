import {
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  ArrowRight,
  Calendar,
  ChevronDown,
  Check,
  Circle,
  FileText,
  Layers,
  Plus,
  Receipt,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import type { Tenant } from '@/lib/db/schema';
import { Money } from '@/components/shared/Money';
import { PageHead } from '@/components/shared/PageHead';
import { Kpi, KpiRow } from '@/components/shared/Kpi';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Dashboard tenant — pivote del Sistema de Diseño V1.
 * TODO: reemplazar mock data con queries reales cuando llegue B.11 reportes.
 */
export function DashboardContent({ tenant, greetName }: { tenant: Tenant; greetName?: string }) {
  const firstName =
    greetName ??
    (tenant.razonSocial.split(/\s+/)[0] ?? 'Equipo').replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ]/g, '') ??
    'Equipo';

  return (
    <>
      <PageHead
        title={`Buen día, ${firstName}`}
        subtitle="Resumen del 5 may 2026 · cierra mes en 26 días"
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

      <KpiRow cols={6}>
        <Kpi
          label="Ventas mes"
          icon={<Receipt size={12} />}
          delta={
            <>
              <ArrowUp size={11} />
              +18,4% vs marzo
            </>
          }
          deltaTone="up"
        >
          <Money value={48231} dp={0} />
        </Kpi>
        <Kpi
          label="Cotizaciones"
          icon={<FileText size={12} />}
          delta={
            <>
              <Circle size={8} fill="currentColor" />
              USD 38.412 en pipeline
            </>
          }
          deltaTone="info"
        >
          42 <span className="text-xs font-normal text-orion-fg-faint">· 12 abiertas</span>
        </Kpi>
        <Kpi
          label="CxC vencido"
          icon={<Wallet size={12} />}
          delta={
            <>
              <ArrowDown size={11} />3 facturas {'>'} 30 días
            </>
          }
          deltaTone="down"
        >
          <span className="text-warn-fg">
            <Money value={5840.5} dp={2} />
          </span>
        </Kpi>
        <Kpi
          label="Stock crítico"
          icon={<Layers size={12} />}
          delta={
            <>
              <AlertTriangle size={11} />
              bajo umbral mínimo
            </>
          }
          deltaTone="warn"
        >
          7 <span className="text-xs font-normal text-orion-fg-faint">SKUs</span>
        </Kpi>
        <Kpi
          label="SUNAT (mes)"
          icon={<Zap size={12} />}
          delta={
            <>
              <Check size={11} />
              100% sin rechazo
            </>
          }
          deltaTone="up"
        >
          187 <span className="text-xs font-normal text-orion-fg-faint">aceptadas</span>
        </Kpi>
        <Kpi
          label="Clientes activos"
          icon={<Users size={12} />}
          delta={
            <>
              <ArrowUp size={11} />
              +5 este mes
            </>
          }
          deltaTone="up"
        >
          94
        </Kpi>
      </KpiRow>

      <div className="mt-4 grid grid-cols-[3fr_2fr] gap-4">
        <SalesChartCard />
        <PipelineCard />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <CotizacionesPorAprobarCard tenantSlug={tenant.slug} />
        <StockCriticoCard />
      </div>
    </>
  );
}

function SalesChartCard() {
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
          <p className="mt-0.5 text-[11.5px] text-orion-fg-muted">USD · facturas aceptadas SUNAT</p>
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

function PipelineCard() {
  type Estado = 'borrador' | 'enviada' | 'aprobada' | 'rechazada' | 'vencida';
  const stages: { est: Estado; count: number; val: number; pct: number }[] = [
    { est: 'borrador', count: 5, val: 8420, pct: 18 },
    { est: 'enviada', count: 7, val: 18415, pct: 42 },
    { est: 'aprobada', count: 3, val: 11577, pct: 30 },
    { est: 'rechazada', count: 2, val: 0, pct: 5 },
    { est: 'vencida', count: 1, val: 0, pct: 5 },
  ];
  const barColor: Record<Estado, string> = {
    borrador: 'bg-orion-fg-faint',
    enviada: 'bg-info',
    aprobada: 'bg-success',
    rechazada: 'bg-danger',
    vencida: 'bg-warn',
  };
  return (
    <Card>
      <CardHead>
        <CardTitle>Pipeline cotizaciones</CardTitle>
      </CardHead>
      <div className="p-4">
        {stages.map((s) => (
          <div key={s.est} className="mb-2.5">
            <div className="mb-1 flex items-center">
              <EstadoBadge estado={s.est} />
              <span className="ml-1.5 text-[11.5px] text-orion-fg-muted">{s.count} cot.</span>
              <span className="ml-auto font-mono text-xs text-orion-fg">
                {s.val ? `USD ${s.val.toLocaleString('en-US')}` : '—'}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-sm bg-orion-bg-muted">
              <div className={cn('h-full', barColor[s.est])} style={{ width: `${s.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CotizacionesPorAprobarCard({ tenantSlug }: { tenantSlug: string }) {
  const rows: { num: string; cli: string; total: number; vence: string; urgent: boolean }[] = [
    {
      num: 'COT-2026-00132',
      cli: 'TECNOLOGÍA INDUSTRIAL SAC',
      total: 4218.4,
      vence: 'mañana',
      urgent: true,
    },
    {
      num: 'COT-2026-00128',
      cli: 'ELECTROANDES SA',
      total: 12480.0,
      vence: '3 días',
      urgent: false,
    },
    {
      num: 'COT-2026-00125',
      cli: 'GRUPO MINERA CERRO VERDE',
      total: 22150.5,
      vence: '5 días',
      urgent: false,
    },
    {
      num: 'COT-2026-00121',
      cli: 'CONSTRUCTORA SUR EIRL',
      total: 1840.2,
      vence: '7 días',
      urgent: false,
    },
  ];
  return (
    <Card>
      <CardHead>
        <CardTitle>Cotizaciones por aprobar</CardTitle>
        <a
          href={`/${tenantSlug}/cotizaciones`}
          className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-orion-fg-muted hover:bg-orion-bg-muted hover:text-orion-fg"
        >
          Ver todas <ArrowRight size={12} />
        </a>
      </CardHead>
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
            <tr key={r.num} className="[&_td]:h-8">
              <Td className="font-mono text-[11.5px]">{r.num}</Td>
              <Td className="max-w-[180px] truncate">{r.cli}</Td>
              <Td align="right">
                <Money value={r.total} dp={2} />
              </Td>
              <Td>
                {r.urgent ? (
                  <span className="inline-flex h-5 items-center rounded-sm bg-warn-soft px-1.5 text-[11px] font-medium text-warn-fg">
                    {r.vence}
                  </span>
                ) : (
                  <span className="text-orion-fg-muted">{r.vence}</span>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

function StockCriticoCard() {
  const rows: { sku: string; name: string; stock: number; min: number }[] = [
    { sku: 'TER-50AWG-1/4', name: 'Terminal compresión 50AWG ¼"', stock: 3, min: 20 },
    { sku: 'CAB-10AWG-NEG', name: 'Cable cobre 10 AWG negro 600V', stock: 28, min: 100 },
    { sku: 'TER-25AWG-3/8', name: 'Terminal compresión 25AWG ⅜"', stock: 0, min: 15 },
    { sku: 'TUB-12-NEG', name: 'Tubería termo-contractible 12mm', stock: 12, min: 40 },
    { sku: 'CAB-14AWG-AZU', name: 'Cable cobre 14 AWG azul 600V', stock: 45, min: 80 },
  ];
  return (
    <Card>
      <CardHead>
        <CardTitle>Stock crítico</CardTitle>
        <Badge
          variant="outline"
          className="border-warn/40 ml-auto h-5 gap-1 bg-warn-soft px-2 text-[11px] font-medium text-warn-fg"
        >
          <Circle size={6} fill="currentColor" />7 SKUs
        </Badge>
      </CardHead>
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
            <tr key={r.sku} className="[&_td]:h-8">
              <Td className="font-mono text-[11.5px]">{r.sku}</Td>
              <Td className="max-w-[200px] truncate">{r.name}</Td>
              <Td
                align="right"
                className={cn('font-semibold', r.stock === 0 ? 'text-danger-fg' : 'text-warn-fg')}
              >
                {r.stock}
              </Td>
              <Td align="right" className="text-orion-fg-muted">
                {r.min}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
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
function EstadoBadge({
  estado,
}: {
  estado: 'borrador' | 'enviada' | 'aprobada' | 'rechazada' | 'vencida';
}) {
  const cfg: Record<typeof estado, { label: string; className: string }> = {
    borrador: { label: 'Borrador', className: 'bg-orion-bg-muted text-orion-fg-muted' },
    enviada: { label: 'Enviada', className: 'bg-info-soft text-info-fg' },
    aprobada: { label: 'Aprobada', className: 'bg-success-soft text-success-fg' },
    rechazada: { label: 'Rechazada', className: 'bg-danger-soft text-danger-fg' },
    vencida: { label: 'Vencida', className: 'bg-warn-soft text-warn-fg' },
  };
  const c = cfg[estado];
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-medium',
        c.className
      )}
    >
      <Circle size={6} fill="currentColor" />
      {c.label}
    </span>
  );
}
