import { desc, eq } from 'drizzle-orm';
import { requirePermissionPage } from '@/lib/auth/require-permission';
import { db } from '@/lib/db/client';
import {
  historialPrecios,
  cotizaciones,
  facturas,
  kardexMovimientos,
  clientes,
  productos,
} from '@/lib/db/schema';

export const metadata = { title: 'Auditoría — Orión ERP' };

type AuditRow = {
  fecha: Date;
  modulo: string;
  actor: string;
  accion: string;
  detalle: string;
};

function formatPEN(n: string | null | undefined) {
  if (!n) return '';
  return `S/ ${parseFloat(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fechaCorta(d: Date) {
  return new Date(d).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AuditoriaPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const { tenant } = await requirePermissionPage('admin.auditoria.ver', companySlug);

  const [preciosData, cotizData, facturasData, kardexData] = await Promise.all([
    db
      .select({
        fecha: historialPrecios.createdAt,
        actor: historialPrecios.creadoPorNombre,
        precioAnterior: historialPrecios.precioAnterior,
        precioNuevo: historialPrecios.precioNuevo,
        productoNombre: productos.nombre,
      })
      .from(historialPrecios)
      .leftJoin(productos, eq(productos.id, historialPrecios.productoId))
      .where(eq(historialPrecios.tenantId, tenant.id))
      .orderBy(desc(historialPrecios.createdAt))
      .limit(100),

    db
      .select({
        createdAt: cotizaciones.createdAt,
        enviadaAt: cotizaciones.enviadaAt,
        aceptadaAt: cotizaciones.aceptadaAt,
        rechazadaAt: cotizaciones.rechazadaAt,
        updatedAt: cotizaciones.updatedAt,
        estado: cotizaciones.estado,
        actor: cotizaciones.creadoPorNombre,
        numero: cotizaciones.numeroCompleto,
        total: cotizaciones.total,
        facturaId: cotizaciones.facturaId,
        clienteNombre: clientes.razonSocial,
      })
      .from(cotizaciones)
      .leftJoin(clientes, eq(clientes.id, cotizaciones.clienteId))
      .where(eq(cotizaciones.tenantId, tenant.id))
      .orderBy(desc(cotizaciones.createdAt))
      .limit(100),

    db
      .select({
        createdAt: facturas.createdAt,
        numeroCompleto: facturas.numeroCompleto,
        total: facturas.total,
        clienteNombre: facturas.clienteRazonSocialSnapshot,
      })
      .from(facturas)
      .where(eq(facturas.tenantId, tenant.id))
      .orderBy(desc(facturas.createdAt))
      .limit(100),

    db
      .select({
        fecha: kardexMovimientos.fecha,
        tipo: kardexMovimientos.tipo,
        cantidad: kardexMovimientos.cantidad,
        saldoPost: kardexMovimientos.saldoPost,
        origenTipo: kardexMovimientos.origenTipo,
        productoNombre: productos.nombre,
      })
      .from(kardexMovimientos)
      .leftJoin(productos, eq(productos.id, kardexMovimientos.productoId))
      .where(eq(kardexMovimientos.tenantId, tenant.id))
      .orderBy(desc(kardexMovimientos.fecha))
      .limit(100),
  ]);

  const rows: AuditRow[] = [];

  for (const r of preciosData) {
    if (!r.fecha) continue;
    rows.push({
      fecha: r.fecha,
      modulo: 'Productos',
      actor: r.actor ?? '—',
      accion: 'precio_actualizado',
      detalle: `${r.productoNombre ?? '?'}: ${formatPEN(r.precioAnterior)} → ${formatPEN(r.precioNuevo)}`,
    });
  }

  for (const c of cotizData) {
    const nro = c.numero ?? '?';
    const cli = c.clienteNombre ?? '?';
    if (c.createdAt) {
      rows.push({
        fecha: c.createdAt,
        modulo: 'Cotizaciones',
        actor: c.actor ?? '—',
        accion: 'cotizacion_creada',
        detalle: `${nro} · ${cli} · ${formatPEN(c.total)}`,
      });
    }
    if (c.enviadaAt) {
      rows.push({
        fecha: c.enviadaAt,
        modulo: 'Cotizaciones',
        actor: c.actor ?? '—',
        accion: 'cotizacion_enviada',
        detalle: `${nro} · ${cli}`,
      });
    }
    if (c.aceptadaAt) {
      rows.push({
        fecha: c.aceptadaAt,
        modulo: 'Cotizaciones',
        actor: c.actor ?? '—',
        accion: 'cotizacion_aceptada',
        detalle: `${nro} · ${cli}`,
      });
    }
    if (c.rechazadaAt) {
      rows.push({
        fecha: c.rechazadaAt,
        modulo: 'Cotizaciones',
        actor: c.actor ?? '—',
        accion: 'cotizacion_rechazada',
        detalle: `${nro} · ${cli}`,
      });
    }
    if (c.facturaId && c.estado === 'convertida' && c.updatedAt) {
      rows.push({
        fecha: c.updatedAt,
        modulo: 'Cotizaciones',
        actor: c.actor ?? '—',
        accion: 'cotizacion_convertida',
        detalle: `${nro} → Factura · ${cli}`,
      });
    }
  }

  for (const f of facturasData) {
    if (!f.createdAt) continue;
    rows.push({
      fecha: f.createdAt,
      modulo: 'Facturas',
      actor: '—',
      accion: 'factura_creada',
      detalle: `${f.numeroCompleto ?? '?'} · ${f.clienteNombre ?? '?'} · ${formatPEN(f.total)}`,
    });
  }

  for (const k of kardexData) {
    if (!k.fecha) continue;
    const esEntrada = k.tipo === 'entrada' || k.tipo === 'ajuste_pos';
    rows.push({
      fecha: k.fecha,
      modulo: 'Inventario',
      actor: '—',
      accion: esEntrada ? 'stock_entrada' : 'stock_salida',
      detalle: `${k.productoNombre ?? '?'} · ${esEntrada ? '+' : '-'}${Number(k.cantidad)} uds · saldo: ${Number(k.saldoPost)}`,
    });
  }

  rows.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  const top100 = rows.slice(0, 100);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Auditoría</h1>
          <p className="text-sm text-muted-foreground">
            Últimos 100 eventos de actividad del tenant
          </p>
        </div>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Módulo</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Acción</th>
              <th className="px-4 py-3">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {top100.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Sin actividad registrada aún.
                </td>
              </tr>
            ) : (
              top100.map((r, i) => (
                <tr key={i} className="hover:bg-muted/20">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {fechaCorta(r.fecha)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                      {r.modulo}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium">{r.actor}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.accion}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.detalle}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
