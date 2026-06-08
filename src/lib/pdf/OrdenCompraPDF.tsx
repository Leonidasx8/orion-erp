import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export interface OrdenCompraPDFData {
  numero: string;
  fechaEmision: string;
  fechaEntrega?: string | null;
  moneda: string;
  estado: string;
  emisor: {
    razonSocial: string;
    ruc: string;
    direccionFiscal?: string | null;
    telefono?: string | null;
    contactoEmail?: string | null;
  };
  proveedor: string;
  direccionEntrega?: string | null;
  comprador?: string | null;
  terminosPago?: string | null;
  observaciones?: string | null;
  items: Array<{
    sku: string | null;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }>;
  totales: { subtotal: number; igv: number; total: number };
}

const C = {
  ink: '#0f172a',
  body: '#334155',
  muted: '#64748b',
  line: '#e2e8f0',
  bg: '#f8fafc',
};

const s = StyleSheet.create({
  page: { paddingHorizontal: 40, paddingVertical: 36, fontSize: 9.5, color: C.body },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  emisorName: { fontSize: 13, fontWeight: 700, color: C.ink },
  emisorLine: { fontSize: 8.5, color: C.muted, marginTop: 2 },
  docBox: { alignItems: 'flex-end' },
  docTitle: { fontSize: 14, fontWeight: 700, color: C.ink, letterSpacing: 1 },
  docNumero: { fontSize: 11, color: C.body, marginTop: 2, fontFamily: 'Courier' },
  metaRow: { flexDirection: 'row', gap: 28, marginBottom: 14 },
  metaLabel: { fontSize: 7.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { fontSize: 9.5, color: C.ink, marginTop: 1 },
  th: {
    flexDirection: 'row',
    backgroundColor: C.bg,
    borderBottom: `1pt solid ${C.line}`,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  thText: { fontSize: 7.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  tr: {
    flexDirection: 'row',
    borderBottom: `0.5pt solid ${C.line}`,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  cellText: { fontSize: 8.5, color: C.body },
  colSku: { width: '16%' },
  colDesc: { width: '44%' },
  colNum: { width: '13%', textAlign: 'right' },
  totalsBox: { marginTop: 12, alignSelf: 'flex-end', width: '40%' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  totalLabel: { fontSize: 9, color: C.muted },
  totalValue: { fontSize: 9, color: C.body, fontFamily: 'Courier' },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 4,
    borderTop: `1pt solid ${C.line}`,
  },
  grandLabel: { fontSize: 10.5, fontWeight: 700, color: C.ink },
  grandValue: { fontSize: 10.5, fontWeight: 700, color: C.ink, fontFamily: 'Courier' },
  termsBox: { marginTop: 18, borderTop: `0.5pt solid ${C.line}`, paddingTop: 8 },
  termsLabel: { fontSize: 7.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  termsText: { fontSize: 9, color: C.body, marginTop: 2 },
});

function money(n: number, ccy: string) {
  const sym = ccy === 'USD' ? 'US$' : 'S/';
  return `${sym} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function OrdenCompraPDF({ data }: { data: OrdenCompraPDFData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.emisorName}>{data.emisor.razonSocial}</Text>
            <Text style={s.emisorLine}>RUC {data.emisor.ruc}</Text>
            {data.emisor.direccionFiscal ? (
              <Text style={s.emisorLine}>{data.emisor.direccionFiscal}</Text>
            ) : null}
            {data.emisor.telefono ? <Text style={s.emisorLine}>{data.emisor.telefono}</Text> : null}
          </View>
          <View style={s.docBox}>
            <Text style={s.docTitle}>ORDEN DE COMPRA</Text>
            <Text style={s.docNumero}>{data.numero}</Text>
          </View>
        </View>

        <View style={s.metaRow}>
          <View>
            <Text style={s.metaLabel}>Proveedor</Text>
            <Text style={s.metaValue}>{data.proveedor}</Text>
          </View>
          <View>
            <Text style={s.metaLabel}>Emisión</Text>
            <Text style={s.metaValue}>{data.fechaEmision}</Text>
          </View>
          {data.fechaEntrega ? (
            <View>
              <Text style={s.metaLabel}>Entrega esperada</Text>
              <Text style={s.metaValue}>{data.fechaEntrega}</Text>
            </View>
          ) : null}
          <View>
            <Text style={s.metaLabel}>Moneda</Text>
            <Text style={s.metaValue}>{data.moneda}</Text>
          </View>
        </View>

        {data.direccionEntrega ? (
          <View style={{ marginBottom: 12 }}>
            <Text style={s.metaLabel}>Dirección de entrega</Text>
            <Text style={s.metaValue}>{data.direccionEntrega}</Text>
          </View>
        ) : null}

        {/* Tabla de ítems */}
        <View style={s.th}>
          <Text style={[s.thText, s.colSku]}>SKU</Text>
          <Text style={[s.thText, s.colDesc]}>Descripción</Text>
          <Text style={[s.thText, s.colNum]}>Cant.</Text>
          <Text style={[s.thText, s.colNum]}>P. Unit.</Text>
          <Text style={[s.thText, s.colNum]}>Subtotal</Text>
        </View>
        {data.items.map((it, i) => (
          <View style={s.tr} key={i}>
            <Text style={[s.cellText, s.colSku, { fontFamily: 'Courier' }]}>{it.sku ?? '—'}</Text>
            <Text style={[s.cellText, s.colDesc]}>{it.descripcion}</Text>
            <Text style={[s.cellText, s.colNum]}>{it.cantidad}</Text>
            <Text style={[s.cellText, s.colNum, { fontFamily: 'Courier' }]}>
              {money(it.precioUnitario, data.moneda)}
            </Text>
            <Text style={[s.cellText, s.colNum, { fontFamily: 'Courier' }]}>
              {money(it.subtotal, data.moneda)}
            </Text>
          </View>
        ))}

        <View style={s.totalsBox}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalValue}>{money(data.totales.subtotal, data.moneda)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>IGV 18%</Text>
            <Text style={s.totalValue}>{money(data.totales.igv, data.moneda)}</Text>
          </View>
          <View style={s.grandRow}>
            <Text style={s.grandLabel}>Total</Text>
            <Text style={s.grandValue}>{money(data.totales.total, data.moneda)}</Text>
          </View>
        </View>

        {(data.terminosPago || data.observaciones || data.comprador) && (
          <View style={s.termsBox}>
            {data.terminosPago ? (
              <>
                <Text style={s.termsLabel}>Términos de pago</Text>
                <Text style={s.termsText}>{data.terminosPago}</Text>
              </>
            ) : null}
            {data.observaciones ? (
              <>
                <Text style={[s.termsLabel, { marginTop: 6 }]}>Observaciones</Text>
                <Text style={s.termsText}>{data.observaciones}</Text>
              </>
            ) : null}
            {data.comprador ? (
              <Text style={[s.termsText, { marginTop: 8, color: C.muted }]}>
                Comprador: {data.comprador}
              </Text>
            ) : null}
          </View>
        )}
      </Page>
    </Document>
  );
}
