/**
 * Cotización PDF — Diseño B: "Clásico moderno con header amplio Idex"
 * - Header amplio con logo grande y banda verde
 * - Cuadros Cliente / Documento separados
 * - Tabla a todo el ancho con header verde sutil
 * - Card total destacada
 */
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import type { CotizacionPDFData } from './CotizacionPDF';

const C = {
  green: '#1F6B3C',
  greenSoft: '#E8F5EC',
  greenStrong: '#155028',
  ink: '#0F172A',
  body: '#1F2937',
  muted: '#6B7280',
  light: '#F9FAFB',
  border: '#E5E7EB',
  white: '#FFFFFF',
};

const s = StyleSheet.create({
  page: {
    backgroundColor: C.white,
    color: C.body,
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingBottom: 50,
  },

  // ─── Header ────────────────────────────────────────
  headerBar: { height: 8, backgroundColor: C.green },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 36,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottom: `1 solid ${C.border}`,
  },
  headerL: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logo: { width: 110, height: 36, objectFit: 'contain' },
  tenantBlock: { marginLeft: 4 },
  tenantName: { fontSize: 13, fontWeight: 700, color: C.ink, letterSpacing: -0.2 },
  tenantSub: { fontSize: 8.5, color: C.muted, marginTop: 1 },
  tenantSub2: { fontSize: 8.5, color: C.muted },

  headerR: { alignItems: 'flex-end' },
  docTitle: { fontSize: 9, color: C.muted, letterSpacing: 1, textTransform: 'uppercase' },
  docName: {
    fontSize: 22,
    fontWeight: 700,
    color: C.green,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  docNumber: { fontSize: 11, fontWeight: 600, color: C.ink, marginTop: 2 },
  estadoChip: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    backgroundColor: C.greenSoft,
    borderRadius: 3,
    alignSelf: 'flex-end',
  },
  estadoChipText: {
    fontSize: 7,
    color: C.greenStrong,
    fontWeight: 700,
    letterSpacing: 0.6,
  },

  // ─── Cuadros cliente + doc ───
  blocks: { flexDirection: 'row', gap: 12, paddingHorizontal: 36, marginTop: 18, marginBottom: 18 },
  block: {
    flex: 1,
    border: `1 solid ${C.border}`,
    borderRadius: 6,
    padding: 12,
  },
  blockTitle: {
    fontSize: 7,
    color: C.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  blockMain: { fontSize: 11, fontWeight: 700, color: C.ink, marginBottom: 2 },
  blockSub: { fontSize: 8.5, color: C.muted },
  metaRow: { flexDirection: 'row', gap: 18, marginTop: 6 },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 7, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  metaValue: { fontSize: 9, fontWeight: 600, color: C.ink, marginTop: 2 },

  // ─── Tabla ───
  tableWrap: { paddingHorizontal: 36 },
  thead: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: C.greenSoft,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottom: `1.5 solid ${C.green}`,
  },
  thText: {
    fontSize: 7,
    fontWeight: 700,
    color: C.greenStrong,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  tr: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottom: `0.5 solid ${C.border}`,
  },
  trAlt: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: C.light,
    borderBottom: `0.5 solid ${C.border}`,
  },
  cSku: { width: '12%' },
  cDesc: { flex: 1 },
  cQty: { width: '8%', textAlign: 'right' },
  cPrice: { width: '18%', textAlign: 'right' },
  cTotal: { width: '18%', textAlign: 'right' },
  td: { fontSize: 8, color: C.body },
  tdMuted: { fontSize: 7.5, color: C.muted, fontFamily: 'Courier' },

  // ─── Totales en card ───
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 36,
    marginTop: 14,
  },
  totalsCard: {
    width: 240,
    borderRadius: 6,
    overflow: 'hidden',
    border: `1 solid ${C.border}`,
  },
  totRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  totBigRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: C.green,
  },
  totK: { fontSize: 9, color: C.muted },
  totV: { fontSize: 9, color: C.body, fontWeight: 600 },
  totBigK: { fontSize: 10, color: C.white, fontWeight: 700 },
  totBigV: { fontSize: 12, color: C.white, fontWeight: 700, letterSpacing: -0.2 },

  // notas
  notas: {
    marginTop: 18,
    marginHorizontal: 36,
    padding: 12,
    border: `1 solid ${C.border}`,
    borderLeft: `3 solid ${C.green}`,
    borderRadius: 3,
    backgroundColor: C.light,
  },
  notasTitle: {
    fontSize: 7,
    fontWeight: 700,
    color: C.greenStrong,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  notasText: { fontSize: 8.5, color: C.body, lineHeight: 1.5 },

  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    paddingTop: 8,
    borderTop: `0.5 solid ${C.border}`,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: C.muted },
});

function fmt(n: number, ccy: string, dp = 2) {
  return `${ccy} ${n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
}
function num(n: number, dp = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

export function CotizacionPDFDesignB({
  data,
  logoUrl,
}: {
  data: CotizacionPDFData;
  logoUrl?: string;
}) {
  return (
    <Document title={`${data.numero} — ${data.tenant.razonSocial}`}>
      <Page size="A4" style={s.page}>
        <View style={s.headerBar} />

        <View style={s.header}>
          <View style={s.headerL}>
            {logoUrl ? <Image src={logoUrl} style={s.logo} /> : null}
            <View style={s.tenantBlock}>
              <Text style={s.tenantName}>{data.tenant.razonSocial}</Text>
              <Text style={s.tenantSub}>RUC {data.tenant.ruc}</Text>
              {data.tenant.direccionFiscal ? (
                <Text style={s.tenantSub2}>{data.tenant.direccionFiscal}</Text>
              ) : null}
            </View>
          </View>
          <View style={s.headerR}>
            <Text style={s.docTitle}>Documento comercial</Text>
            <Text style={s.docName}>COTIZACIÓN</Text>
            <Text style={s.docNumber}>{data.numero}</Text>
            <View style={s.estadoChip}>
              <Text style={s.estadoChipText}>{data.estado.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={s.blocks}>
          <View style={s.block}>
            <Text style={s.blockTitle}>Cliente</Text>
            <Text style={s.blockMain}>{data.cliente}</Text>
            {data.clienteRuc ? <Text style={s.blockSub}>RUC {data.clienteRuc}</Text> : null}
            {data.contactoClienteNombre ? (
              <View style={{ marginTop: 8, paddingTop: 8, borderTop: `0.5 solid ${C.border}` }}>
                <Text style={s.blockTitle}>Atención de</Text>
                <Text style={{ fontSize: 9.5, fontWeight: 700, color: C.ink }}>
                  {data.contactoClienteNombre}
                </Text>
                {data.contactoClienteCargo ? (
                  <Text style={{ fontSize: 8.5, color: C.muted }}>{data.contactoClienteCargo}</Text>
                ) : null}
                {data.contactoClienteEmail ? (
                  <Text style={{ fontSize: 8.5, color: C.muted }}>{data.contactoClienteEmail}</Text>
                ) : null}
              </View>
            ) : null}
          </View>
          <View style={s.block}>
            <Text style={s.blockTitle}>Documento</Text>
            <View style={s.metaRow}>
              <View style={s.metaItem}>
                <Text style={s.metaLabel}>Emisión</Text>
                <Text style={s.metaValue}>{data.fechaEmision}</Text>
              </View>
              <View style={s.metaItem}>
                <Text style={s.metaLabel}>Vencimiento</Text>
                <Text style={s.metaValue}>{data.fechaVencimiento}</Text>
              </View>
              <View style={s.metaItem}>
                <Text style={s.metaLabel}>Moneda</Text>
                <Text style={s.metaValue}>
                  {data.moneda}
                  {data.tipoCambio ? ` · TC ${data.tipoCambio.toFixed(4)}` : ''}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={s.tableWrap}>
          <View style={s.thead}>
            <Text style={[s.thText, s.cSku]}>SKU</Text>
            <Text style={[s.thText, s.cDesc]}>DESCRIPCIÓN</Text>
            <Text style={[s.thText, s.cQty]}>CANT.</Text>
            <Text style={[s.thText, s.cPrice]}>{data.moneda} P. UNIT.</Text>
            <Text style={[s.thText, s.cTotal]}>{data.moneda} SUBTOTAL</Text>
          </View>
          {data.items.map((it, i) => (
            <View key={i} style={i % 2 === 1 ? s.trAlt : s.tr}>
              <Text style={[s.tdMuted, s.cSku]}>{it.sku ?? '—'}</Text>
              <Text style={[s.td, s.cDesc]}>{it.descripcion}</Text>
              <Text style={[s.td, s.cQty]}>{it.cantidad.toLocaleString('en-US')}</Text>
              <Text style={[s.td, s.cPrice]}>{num(it.precioUnitario, 4)}</Text>
              <Text style={[s.td, s.cTotal]}>{num(it.subtotal, 2)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totalsRow}>
          <View style={s.totalsCard}>
            <View style={s.totRow}>
              <Text style={s.totK}>Subtotal</Text>
              <Text style={s.totV}>{fmt(data.totales.subtotal, data.moneda)}</Text>
            </View>
            <View style={s.totRow}>
              <Text style={s.totK}>IGV 18%</Text>
              <Text style={s.totV}>{fmt(data.totales.igv, data.moneda)}</Text>
            </View>
            <View style={s.totBigRow}>
              <Text style={s.totBigK}>TOTAL A PAGAR</Text>
              <Text style={s.totBigV}>{fmt(data.totales.total, data.moneda)}</Text>
            </View>
          </View>
        </View>

        {/* Condiciones comerciales */}
        {data.condiciones &&
        (data.condiciones.formaPago ||
          data.condiciones.tiempoEntrega ||
          data.condiciones.lugarEntrega) ? (
          <View
            style={{
              marginTop: 14,
              marginHorizontal: 36,
              padding: 12,
              border: `1 solid ${C.border}`,
              borderLeft: `3 solid ${C.green}`,
              borderRadius: 3,
              backgroundColor: C.light,
            }}
          >
            <Text
              style={{
                fontSize: 7,
                fontWeight: 700,
                color: C.greenStrong,
                textTransform: 'uppercase',
                letterSpacing: 0.7,
                marginBottom: 6,
              }}
            >
              Condiciones comerciales
            </Text>
            <View style={{ flexDirection: 'row', gap: 18, flexWrap: 'wrap' }}>
              {data.condiciones.formaPago ? (
                <View style={{ minWidth: 140 }}>
                  <Text style={{ fontSize: 7, color: C.muted, textTransform: 'uppercase' }}>
                    Forma de pago
                  </Text>
                  <Text style={{ fontSize: 9, color: C.ink, fontWeight: 600 }}>
                    {data.condiciones.formaPago}
                  </Text>
                </View>
              ) : null}
              {data.condiciones.tiempoEntrega ? (
                <View style={{ minWidth: 140 }}>
                  <Text style={{ fontSize: 7, color: C.muted, textTransform: 'uppercase' }}>
                    Tiempo de entrega
                  </Text>
                  <Text style={{ fontSize: 9, color: C.ink, fontWeight: 600 }}>
                    {data.condiciones.tiempoEntrega}
                  </Text>
                </View>
              ) : null}
              {data.condiciones.lugarEntrega ? (
                <View style={{ minWidth: 140 }}>
                  <Text style={{ fontSize: 7, color: C.muted, textTransform: 'uppercase' }}>
                    Lugar de entrega
                  </Text>
                  <Text style={{ fontSize: 9, color: C.ink, fontWeight: 600 }}>
                    {data.condiciones.lugarEntrega}
                  </Text>
                </View>
              ) : null}
              <View style={{ minWidth: 140 }}>
                <Text style={{ fontSize: 7, color: C.muted, textTransform: 'uppercase' }}>
                  Vigencia / IGV
                </Text>
                <Text style={{ fontSize: 9, color: C.ink, fontWeight: 600 }}>
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
            style={{
              marginTop: 10,
              marginHorizontal: 36,
              padding: 10,
              border: `1 solid ${C.border}`,
              borderRadius: 4,
            }}
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
                <Text style={{ fontSize: 9.5, color: C.ink, fontWeight: 700 }}>
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
                  <Text style={{ fontFamily: 'Courier' }}>{data.tenant.bancoDetraccionCuenta}</Text>
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
              marginHorizontal: 36,
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

        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {data.tenant.razonSocial} · RUC {data.tenant.ruc}
          </Text>
          <Text style={s.footerText}>{data.numero}</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
