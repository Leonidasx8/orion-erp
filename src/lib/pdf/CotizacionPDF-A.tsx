/**
 * Cotización PDF — Diseño A: "Ejecutivo con sidebar verde Idex"
 * - Sidebar lateral izquierdo en verde corporativo con datos del doc
 * - Contenido principal a la derecha
 * - Logo del tenant en header
 */
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import type { CotizacionPDFData } from './CotizacionPDF';

const C = {
  green: '#1F6B3C',
  greenSoft: '#E8F5EC',
  greenAccent: '#2E8C4A',
  ink: '#0F172A',
  body: '#1F2937',
  muted: '#6B7280',
  light: '#F3F4F6',
  border: '#E5E7EB',
  white: '#FFFFFF',
};

const s = StyleSheet.create({
  page: { flexDirection: 'row', backgroundColor: C.white, color: C.body, fontFamily: 'Helvetica' },

  // ─── Sidebar izquierdo (verde) ───
  sidebar: { width: 180, backgroundColor: C.green, color: C.white, padding: 24, paddingTop: 32 },
  sidebarLogo: { width: 120, height: 30, objectFit: 'contain', marginBottom: 24 },
  sidebarTenant: { fontSize: 9, color: '#A7D8B9', marginBottom: 1 },
  sidebarRuc: { fontSize: 9, color: '#A7D8B9' },
  sidebarSection: { marginTop: 22 },
  sidebarLabel: {
    fontSize: 7,
    color: '#A7D8B9',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sidebarValue: { fontSize: 10, color: C.white, fontWeight: 700 },
  sidebarValueSm: { fontSize: 9, color: C.white },
  sidebarDoc: {
    fontSize: 16,
    color: C.white,
    fontWeight: 700,
    letterSpacing: -0.3,
    marginTop: 32,
  },
  sidebarNumero: { fontSize: 11, color: '#A7D8B9', marginTop: 2 },
  totalBlock: {
    marginTop: 28,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 6,
  },
  totalLabel: { fontSize: 7, color: '#A7D8B9', letterSpacing: 0.8, textTransform: 'uppercase' },
  totalValue: { fontSize: 16, color: C.white, fontWeight: 700, marginTop: 4, letterSpacing: -0.3 },

  // ─── Contenido principal ───
  main: { flex: 1, padding: 32, paddingTop: 32 },
  h1: { fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 2 },
  h1Sub: { fontSize: 9, color: C.muted },
  cardCli: {
    marginTop: 20,
    padding: 14,
    borderRadius: 6,
    border: `1 solid ${C.border}`,
    backgroundColor: C.light,
  },
  cardLabel: {
    fontSize: 7,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  cardValue: { fontSize: 12, fontWeight: 700, color: C.ink },
  cardValueSub: { fontSize: 9, color: C.muted, marginTop: 1 },

  // tabla
  table: { marginTop: 22 },
  tHead: {
    flexDirection: 'row',
    backgroundColor: C.green,
    color: C.white,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  th: {
    fontSize: 7,
    color: C.white,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tr: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottom: `0.5 solid ${C.border}`,
  },
  cSku: { width: '14%' },
  cDesc: { flex: 1 },
  cQty: { width: '8%', textAlign: 'right' },
  cPrice: { width: '20%', textAlign: 'right' },
  cTotal: { width: '20%', textAlign: 'right' },
  td: { fontSize: 8, color: C.body },
  tdMuted: { fontSize: 7.5, color: C.muted },

  // totales en main
  totales: { marginTop: 10, paddingTop: 10, alignItems: 'flex-end' },
  totalesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 220,
    paddingVertical: 2,
  },
  totalesK: { fontSize: 8.5, color: C.muted },
  totalesV: { fontSize: 9, color: C.body, fontWeight: 600 },
  totalesBigRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 220,
    paddingVertical: 6,
    marginTop: 4,
    borderTop: `1 solid ${C.green}`,
  },
  totalesKBig: { fontSize: 10, color: C.ink, fontWeight: 700 },
  totalesVBig: { fontSize: 12, color: C.green, fontWeight: 700, letterSpacing: -0.2 },

  // notas
  notas: {
    marginTop: 20,
    padding: 12,
    backgroundColor: C.greenSoft,
    borderRadius: 4,
    borderLeft: `3 solid ${C.green}`,
  },
  notasTitle: {
    fontSize: 7,
    fontWeight: 700,
    color: C.green,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  notasText: { fontSize: 8.5, color: C.body, lineHeight: 1.5 },

  footer: {
    position: 'absolute',
    bottom: 18,
    left: 32 + 180,
    right: 32,
    fontSize: 7,
    color: C.muted,
    textAlign: 'center',
  },
});

function fmt(n: number, ccy: string, dp = 2) {
  return `${ccy} ${n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
}
function num(n: number, dp = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

export function CotizacionPDFDesignA({
  data,
  logoUrl,
}: {
  data: CotizacionPDFData;
  logoUrl?: string;
}) {
  return (
    <Document title={`${data.numero} — ${data.tenant.razonSocial}`}>
      <Page size="A4" style={s.page}>
        {/* Sidebar verde */}
        <View style={s.sidebar}>
          {logoUrl ? <Image src={logoUrl} style={s.sidebarLogo} /> : null}
          <Text style={s.sidebarTenant}>{data.tenant.razonSocial}</Text>
          <Text style={s.sidebarRuc}>RUC {data.tenant.ruc}</Text>
          {data.tenant.direccionFiscal ? (
            <Text style={[s.sidebarRuc, { marginTop: 6 }]}>{data.tenant.direccionFiscal}</Text>
          ) : null}

          <Text style={s.sidebarDoc}>COTIZACIÓN</Text>
          <Text style={s.sidebarNumero}>{data.numero}</Text>

          <View style={s.sidebarSection}>
            <Text style={s.sidebarLabel}>Emisión</Text>
            <Text style={s.sidebarValueSm}>{data.fechaEmision}</Text>
          </View>
          <View style={s.sidebarSection}>
            <Text style={s.sidebarLabel}>Vence</Text>
            <Text style={s.sidebarValueSm}>{data.fechaVencimiento}</Text>
          </View>
          <View style={s.sidebarSection}>
            <Text style={s.sidebarLabel}>Moneda</Text>
            <Text style={s.sidebarValueSm}>
              {data.moneda}
              {data.tipoCambio ? ` · TC ${data.tipoCambio.toFixed(4)}` : ''}
            </Text>
          </View>
          <View style={s.sidebarSection}>
            <Text style={s.sidebarLabel}>Estado</Text>
            <Text style={s.sidebarValueSm}>{data.estado.toUpperCase()}</Text>
          </View>

          <View style={s.totalBlock}>
            <Text style={s.totalLabel}>Total a pagar</Text>
            <Text style={s.totalValue}>{fmt(data.totales.total, data.moneda)}</Text>
          </View>
        </View>

        {/* Main */}
        <View style={s.main}>
          <Text style={s.h1}>Cotización</Text>
          <Text style={s.h1Sub}>
            Documento sin valor fiscal · Válido hasta {data.fechaVencimiento}
          </Text>

          <View style={s.cardCli}>
            <Text style={s.cardLabel}>Cliente</Text>
            <Text style={s.cardValue}>{data.cliente}</Text>
            {data.clienteRuc ? <Text style={s.cardValueSub}>RUC {data.clienteRuc}</Text> : null}
            {data.contactoClienteNombre ? (
              <View style={{ marginTop: 8, paddingTop: 8, borderTop: `0.5 solid ${C.border}` }}>
                <Text style={[s.cardLabel, { marginBottom: 2 }]}>Atención de</Text>
                <Text style={[s.cardValueSub, { color: C.ink, fontWeight: 700 }]}>
                  {data.contactoClienteNombre}
                  {data.contactoClienteCargo ? ` · ${data.contactoClienteCargo}` : ''}
                </Text>
                {data.contactoClienteEmail ? (
                  <Text style={s.cardValueSub}>{data.contactoClienteEmail}</Text>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={s.table}>
            <View style={s.tHead}>
              <Text style={[s.th, s.cSku]}>SKU</Text>
              <Text style={[s.th, s.cDesc]}>DESCRIPCIÓN</Text>
              <Text style={[s.th, s.cQty]}>CANT.</Text>
              <Text style={[s.th, s.cPrice]}>{data.moneda} P. UNIT.</Text>
              <Text style={[s.th, s.cTotal]}>{data.moneda} SUBTOTAL</Text>
            </View>
            {data.items.map((it, i) => (
              <View key={i} style={s.tr}>
                <Text style={[s.tdMuted, s.cSku]}>{it.sku ?? '—'}</Text>
                <Text style={[s.td, s.cDesc]}>{it.descripcion}</Text>
                <Text style={[s.td, s.cQty]}>{it.cantidad.toLocaleString('en-US')}</Text>
                <Text style={[s.td, s.cPrice]}>{num(it.precioUnitario, 4)}</Text>
                <Text style={[s.td, s.cTotal]}>{num(it.subtotal, 2)}</Text>
              </View>
            ))}
          </View>

          <View style={s.totales}>
            <View style={s.totalesRow}>
              <Text style={s.totalesK}>Subtotal</Text>
              <Text style={s.totalesV}>{fmt(data.totales.subtotal, data.moneda)}</Text>
            </View>
            <View style={s.totalesRow}>
              <Text style={s.totalesK}>IGV 18%</Text>
              <Text style={s.totalesV}>{fmt(data.totales.igv, data.moneda)}</Text>
            </View>
            <View style={s.totalesBigRow}>
              <Text style={s.totalesKBig}>TOTAL</Text>
              <Text style={s.totalesVBig}>{fmt(data.totales.total, data.moneda)}</Text>
            </View>
          </View>

          {/* Condiciones comerciales */}
          {data.condiciones &&
          (data.condiciones.formaPago ||
            data.condiciones.tiempoEntrega ||
            data.condiciones.lugarEntrega) ? (
            <View
              style={{
                marginTop: 16,
                padding: 12,
                backgroundColor: C.greenSoft,
                borderRadius: 4,
                borderLeft: `3 solid ${C.green}`,
              }}
            >
              <Text
                style={{
                  fontSize: 7,
                  fontWeight: 700,
                  color: C.green,
                  textTransform: 'uppercase',
                  letterSpacing: 0.7,
                  marginBottom: 6,
                }}
              >
                Condiciones comerciales
              </Text>
              <View style={{ flexDirection: 'row', gap: 24, flexWrap: 'wrap' }}>
                {data.condiciones.formaPago ? (
                  <View style={{ minWidth: 140, marginBottom: 4 }}>
                    <Text style={{ fontSize: 7, color: C.muted, textTransform: 'uppercase' }}>
                      Forma de pago
                    </Text>
                    <Text style={{ fontSize: 8.5, color: C.ink, fontWeight: 600 }}>
                      {data.condiciones.formaPago}
                    </Text>
                  </View>
                ) : null}
                {data.condiciones.tiempoEntrega ? (
                  <View style={{ minWidth: 140, marginBottom: 4 }}>
                    <Text style={{ fontSize: 7, color: C.muted, textTransform: 'uppercase' }}>
                      Tiempo de entrega
                    </Text>
                    <Text style={{ fontSize: 8.5, color: C.ink, fontWeight: 600 }}>
                      {data.condiciones.tiempoEntrega}
                    </Text>
                  </View>
                ) : null}
                {data.condiciones.lugarEntrega ? (
                  <View style={{ minWidth: 140, marginBottom: 4 }}>
                    <Text style={{ fontSize: 7, color: C.muted, textTransform: 'uppercase' }}>
                      Lugar de entrega
                    </Text>
                    <Text style={{ fontSize: 8.5, color: C.ink, fontWeight: 600 }}>
                      {data.condiciones.lugarEntrega}
                    </Text>
                  </View>
                ) : null}
                <View style={{ minWidth: 140 }}>
                  <Text style={{ fontSize: 7, color: C.muted, textTransform: 'uppercase' }}>
                    Vigencia / IGV
                  </Text>
                  <Text style={{ fontSize: 8.5, color: C.ink, fontWeight: 600 }}>
                    Hasta {data.fechaVencimiento}
                    {' · '}
                    {data.condiciones.incluyeIgv ? 'Incluye IGV' : 'No incluye IGV'}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* Datos bancarios */}
          {data.tenant.bancoCuenta || data.tenant.bancoCci ? (
            <View
              style={{ marginTop: 10, padding: 10, border: `1 solid ${C.border}`, borderRadius: 4 }}
            >
              <Text
                style={{
                  fontSize: 7,
                  fontWeight: 700,
                  color: C.muted,
                  textTransform: 'uppercase',
                  letterSpacing: 0.7,
                  marginBottom: 4,
                }}
              >
                Datos para pago
              </Text>
              <View style={{ flexDirection: 'row', gap: 24, flexWrap: 'wrap' }}>
                {data.tenant.bancoNombre ? (
                  <Text style={{ fontSize: 9, color: C.ink, fontWeight: 700 }}>
                    {data.tenant.bancoNombre}
                  </Text>
                ) : null}
                {(data.moneda === 'USD' ? data.tenant.bancoCuentaUsd : data.tenant.bancoCuenta) ? (
                  <Text style={{ fontSize: 8.5, color: C.body }}>
                    Cta. {data.moneda === 'USD' ? 'US$' : 'S/'}{' '}
                    <Text style={{ fontFamily: 'Courier' }}>
                      {data.moneda === 'USD' ? data.tenant.bancoCuentaUsd : data.tenant.bancoCuenta}
                    </Text>
                  </Text>
                ) : null}
                {(data.moneda === 'USD' ? data.tenant.bancoCciUsd : data.tenant.bancoCci) ? (
                  <Text style={{ fontSize: 8.5, color: C.body }}>
                    CCI {data.moneda === 'USD' ? 'US$' : 'S/'}{' '}
                    <Text style={{ fontFamily: 'Courier' }}>
                      {data.moneda === 'USD' ? data.tenant.bancoCciUsd : data.tenant.bancoCci}
                    </Text>
                  </Text>
                ) : null}
                {data.tenant.bancoDetraccionCuenta ? (
                  <Text style={{ fontSize: 8.5, color: C.muted }}>
                    Detracciones BN{' '}
                    <Text style={{ fontFamily: 'Courier' }}>
                      {data.tenant.bancoDetraccionCuenta}
                    </Text>
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {(data.notas || data.terminosCondiciones) && (
            <View style={[s.notas, { marginTop: 10 }]}>
              {data.notas ? (
                <>
                  <Text style={s.notasTitle}>Observaciones</Text>
                  <Text style={s.notasText}>{data.notas}</Text>
                </>
              ) : null}
              {data.terminosCondiciones ? (
                <>
                  <Text style={[s.notasTitle, data.notas ? { marginTop: 8 } : {}]}>
                    Términos y condiciones
                  </Text>
                  <Text style={s.notasText}>{data.terminosCondiciones}</Text>
                </>
              ) : null}
            </View>
          )}

          {/* Comercial responsable */}
          {data.comercial ? (
            <View
              style={{
                marginTop: 16,
                paddingTop: 10,
                borderTop: `1 solid ${C.border}`,
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 7,
                    color: C.muted,
                    textTransform: 'uppercase',
                    letterSpacing: 0.7,
                    marginBottom: 2,
                  }}
                >
                  Atendido por
                </Text>
                <Text style={{ fontSize: 11, color: C.ink, fontWeight: 700 }}>
                  {data.comercial.nombre}
                </Text>
                <Text style={{ fontSize: 8.5, color: C.muted }}>
                  {data.comercial.email}
                  {data.comercial.telefono ? ` · ${data.comercial.telefono}` : ''}
                </Text>
              </View>
              {data.tenant.web || data.tenant.telefono ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 7, color: C.muted, textTransform: 'uppercase' }}>
                    {data.tenant.razonSocial}
                  </Text>
                  {data.tenant.web ? (
                    <Text style={{ fontSize: 8.5, color: C.green }}>{data.tenant.web}</Text>
                  ) : null}
                  {data.tenant.telefono ? (
                    <Text style={{ fontSize: 8.5, color: C.muted }}>{data.tenant.telefono}</Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <Text
          style={s.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${data.tenant.razonSocial} · ${data.numero} · Página ${pageNumber} de ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}
