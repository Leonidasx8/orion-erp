import { and, asc, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { createElement, type ReactElement } from 'react';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { db } from '@/lib/db/client';
import { clientes, lineasOrdenCompra, ordenesCompra, tenants } from '@/lib/db/schema';
import { OrdenCompraPDF, type OrdenCompraPDFData } from '@/lib/pdf/OrdenCompraPDF';

function fmtFecha(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
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
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ companySlug: string; id: string }> }
) {
  try {
    const { id } = await params;
    const tenant = await getCurrentTenant();

    const [row] = await db
      .select({
        numero: ordenesCompra.numero,
        estado: ordenesCompra.estado,
        moneda: ordenesCompra.moneda,
        fechaEmision: ordenesCompra.fechaEmision,
        fechaEntrega: ordenesCompra.fechaEntregaEsperada,
        subtotal: ordenesCompra.subtotal,
        igv: ordenesCompra.igv,
        total: ordenesCompra.total,
        terminosPago: ordenesCompra.terminosPago,
        direccionEntrega: ordenesCompra.direccionEntrega,
        observaciones: ordenesCompra.observaciones,
        compradorNombre: ordenesCompra.compradorNombre,
        proveedorRazon: clientes.razonSocial,
        proveedorNombres: clientes.nombres,
        proveedorApellido: clientes.apellidoPaterno,
      })
      .from(ordenesCompra)
      .leftJoin(clientes, eq(clientes.id, ordenesCompra.proveedorId))
      .where(and(eq(ordenesCompra.id, id), eq(ordenesCompra.tenantId, tenant.id)))
      .limit(1);

    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [lineas, [tenantRow]] = await Promise.all([
      db
        .select({
          sku: lineasOrdenCompra.skuSnapshot,
          descripcion: lineasOrdenCompra.descripcion,
          cantidad: lineasOrdenCompra.cantidad,
          precioUnitario: lineasOrdenCompra.precioUnitario,
          subtotal: lineasOrdenCompra.subtotal,
        })
        .from(lineasOrdenCompra)
        .where(eq(lineasOrdenCompra.ordenId, id))
        .orderBy(asc(lineasOrdenCompra.orden)),
      db
        .select({
          razonSocial: tenants.razonSocial,
          ruc: tenants.ruc,
          direccionFiscal: tenants.direccionFiscal,
          telefono: tenants.telefono,
          contactoEmail: tenants.contactoEmail,
        })
        .from(tenants)
        .where(eq(tenants.id, tenant.id)),
    ]);

    const proveedor =
      row.proveedorRazon ??
      [row.proveedorNombres, row.proveedorApellido].filter(Boolean).join(' ') ??
      '—';

    const pdfData: OrdenCompraPDFData = {
      numero: row.numero,
      fechaEmision: fmtFecha(row.fechaEmision),
      fechaEntrega: row.fechaEntrega ? fmtFecha(row.fechaEntrega) : null,
      moneda: row.moneda,
      estado: row.estado,
      emisor: {
        razonSocial: tenantRow?.razonSocial ?? tenant.razonSocial,
        ruc: tenantRow?.ruc ?? tenant.ruc,
        direccionFiscal: tenantRow?.direccionFiscal ?? null,
        telefono: tenantRow?.telefono ?? null,
        contactoEmail: tenantRow?.contactoEmail ?? null,
      },
      proveedor,
      direccionEntrega: row.direccionEntrega,
      comprador: row.compradorNombre,
      terminosPago: row.terminosPago,
      observaciones: row.observaciones,
      items: lineas.map((l) => ({
        sku: l.sku,
        descripcion: l.descripcion,
        cantidad: Number(l.cantidad),
        precioUnitario: Number(l.precioUnitario),
        subtotal: Number(l.subtotal),
      })),
      totales: {
        subtotal: Number(row.subtotal),
        igv: Number(row.igv),
        total: Number(row.total),
      },
    };

    const element = createElement(OrdenCompraPDF, { data: pdfData }) as ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${row.numero}.pdf"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('OC PDF generation error:', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
