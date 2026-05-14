import { and, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { createElement, type ReactElement } from 'react';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { db } from '@/lib/db/client';
import { clientes, cotizacionItems, cotizaciones, tenants } from '@/lib/db/schema';
import { CotizacionPDF } from '@/lib/pdf/CotizacionPDF';
import { CotizacionPDFDesignA } from '@/lib/pdf/CotizacionPDF-A';
import { CotizacionPDFDesignB } from '@/lib/pdf/CotizacionPDF-B';

const LOGOS: Record<string, string> = {
  idex: 'http://localhost:3000/idex-logo.png',
  agroalves: 'http://localhost:3000/agroalves-logo.png',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companySlug: string; id: string }> }
) {
  try {
    const { id, companySlug } = await params;
    const design = req.nextUrl.searchParams.get('design');
    const tenant = await getCurrentTenant();

    const [row] = await db
      .select({
        id: cotizaciones.id,
        numero: cotizaciones.numeroCompleto,
        estado: cotizaciones.estado,
        moneda: cotizaciones.moneda,
        tipoCambio: cotizaciones.tipoCambio,
        fechaEmision: cotizaciones.fechaEmision,
        fechaVencimiento: cotizaciones.fechaVencimiento,
        subtotal: cotizaciones.subtotal,
        igv: cotizaciones.igv,
        total: cotizaciones.total,
        notas: cotizaciones.notas,
        terminosCondiciones: cotizaciones.terminosCondiciones,
        formaPago: cotizaciones.formaPago,
        tiempoEntrega: cotizaciones.tiempoEntrega,
        lugarEntrega: cotizaciones.lugarEntrega,
        incluyeIgv: cotizaciones.incluyeIgv,
        contactoClienteNombre: cotizaciones.contactoClienteNombre,
        contactoClienteCargo: cotizaciones.contactoClienteCargo,
        contactoClienteEmail: cotizaciones.contactoClienteEmail,
        creadoPor: cotizaciones.creadoPor,
        clienteRazon: clientes.razonSocial,
        clienteRuc: clientes.numeroDocumento,
      })
      .from(cotizaciones)
      .leftJoin(clientes, eq(clientes.id, cotizaciones.clienteId))
      .where(and(eq(cotizaciones.id, id), eq(cotizaciones.tenantId, tenant.id)))
      .limit(1);

    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [items, [tenantRow]] = await Promise.all([
      db
        .select({
          codigo: cotizacionItems.codigo,
          descripcion: cotizacionItems.descripcion,
          cantidad: cotizacionItems.cantidad,
          precioUnitario: cotizacionItems.precioUnitario,
          subtotal: cotizacionItems.subtotal,
        })
        .from(cotizacionItems)
        .where(eq(cotizacionItems.cotizacionId, id))
        .orderBy(cotizacionItems.orden),
      db
        .select({
          razonSocial: tenants.razonSocial,
          ruc: tenants.ruc,
          direccionFiscal: tenants.direccionFiscal,
          web: tenants.web,
          telefono: tenants.telefono,
          contactoEmail: tenants.contactoEmail,
          bancoNombre: tenants.bancoNombre,
          bancoCuenta: tenants.bancoCuenta,
          bancoCci: tenants.bancoCci,
          bancoDetraccionCuenta: tenants.bancoDetraccionCuenta,
        })
        .from(tenants)
        .where(eq(tenants.id, tenant.id)),
    ]);

    // Datos del comercial (creado_por)
    let comercial: { nombre: string; email: string | null; telefono: string | null } | null = null;
    if (row.creadoPor) {
      const { createClient } = await import('@supabase/supabase-js');
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: userData } = await admin.auth.admin.getUserById(row.creadoPor);
      if (userData?.user) {
        const meta = userData.user.user_metadata as Record<string, unknown> | undefined;
        comercial = {
          nombre: (meta?.full_name as string) ?? userData.user.email ?? 'Comercial',
          email: userData.user.email ?? null,
          telefono: (meta?.telefono as string) ?? null,
        };
      }
    }

    const pdfData = {
      numero: row.numero ?? '—',
      estado: row.estado,
      tenant: {
        razonSocial: tenantRow?.razonSocial ?? tenant.razonSocial,
        ruc: tenantRow?.ruc ?? tenant.ruc,
        direccionFiscal: tenantRow?.direccionFiscal ?? null,
        web: tenantRow?.web ?? null,
        telefono: tenantRow?.telefono ?? null,
        contactoEmail: tenantRow?.contactoEmail ?? null,
        bancoNombre: tenantRow?.bancoNombre ?? null,
        bancoCuenta: tenantRow?.bancoCuenta ?? null,
        bancoCci: tenantRow?.bancoCci ?? null,
        bancoDetraccionCuenta: tenantRow?.bancoDetraccionCuenta ?? null,
      },
      cliente: row.clienteRazon ?? '—',
      clienteRuc: row.clienteRuc,
      contactoClienteNombre: row.contactoClienteNombre,
      contactoClienteCargo: row.contactoClienteCargo,
      contactoClienteEmail: row.contactoClienteEmail,
      fechaEmision: row.fechaEmision ?? '—',
      fechaVencimiento: row.fechaVencimiento ?? '—',
      moneda: row.moneda,
      tipoCambio: row.tipoCambio ? Number(row.tipoCambio) : null,
      items: items.map((it) => ({
        sku: it.codigo,
        descripcion: it.descripcion,
        cantidad: Number(it.cantidad),
        precioUnitario: Number(it.precioUnitario),
        subtotal: Number(it.subtotal),
      })),
      totales: {
        subtotal: Number(row.subtotal),
        igv: Number(row.igv),
        total: Number(row.total),
      },
      condiciones: {
        formaPago: row.formaPago,
        tiempoEntrega: row.tiempoEntrega,
        lugarEntrega: row.lugarEntrega,
        incluyeIgv: row.incluyeIgv,
      },
      comercial,
      notas: row.notas,
      terminosCondiciones: row.terminosCondiciones,
    };

    const logoUrl = LOGOS[companySlug];
    const Component =
      design === 'a' ? CotizacionPDFDesignA : design === 'b' ? CotizacionPDFDesignB : CotizacionPDF;
    const elementProps =
      design === 'a' || design === 'b' ? { data: pdfData, logoUrl } : { data: pdfData };
    const element = createElement(Component, elementProps) as ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);

    const suffix = design === 'a' || design === 'b' ? `-design-${design}` : '';
    const filename = `${row.numero ?? 'cotizacion'}${suffix}.pdf`;
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('PDF generation error:', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
