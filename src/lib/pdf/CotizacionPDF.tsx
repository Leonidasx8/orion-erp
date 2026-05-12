import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#111',
    backgroundColor: '#fff',
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: '1 solid #e5e7eb',
  },
  logo: {
    fontSize: 18,
    fontWeight: 700,
    color: '#0070f3',
    letterSpacing: -0.5,
  },
  ruc: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  docType: {
    fontSize: 14,
    fontWeight: 700,
    color: '#111',
  },
  docNumber: {
    fontSize: 11,
    color: '#0070f3',
    fontWeight: 600,
    marginTop: 2,
  },
  badge: {
    marginTop: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-end',
  },
  badgeText: {
    fontSize: 7.5,
    color: '#6b7280',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 16,
  },
  row2col: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  col: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 7.5,
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  field: {
    marginBottom: 3,
  },
  fieldLabel: {
    fontSize: 7.5,
    color: '#9ca3af',
  },
  fieldValue: {
    fontSize: 9,
    color: '#111',
    fontWeight: 600,
  },
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderTop: '1 solid #e5e7eb',
    borderBottom: '1 solid #e5e7eb',
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottom: '0.5 solid #f3f4f6',
  },
  colSku: { width: '12%' },
  colDesc: { flex: 1 },
  colQty: { width: '8%', textAlign: 'right' },
  colPrice: { width: '14%', textAlign: 'right' },
  colTotal: { width: '14%', textAlign: 'right' },
  thText: {
    fontSize: 7.5,
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tdText: {
    fontSize: 8.5,
    color: '#111',
  },
  tdMuted: {
    fontSize: 8,
    color: '#6b7280',
  },
  totalsBlock: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  totalsTable: {
    width: 220,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  totalsRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: '#f9fafb',
    borderTop: '1 solid #e5e7eb',
    marginTop: 2,
  },
  totalLabel: { fontSize: 8.5, color: '#6b7280' },
  totalValue: { fontSize: 8.5, color: '#111', fontWeight: 600 },
  totalLabelBig: { fontSize: 10, color: '#111', fontWeight: 700 },
  totalValueBig: { fontSize: 10, color: '#0070f3', fontWeight: 700 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTop: '0.5 solid #e5e7eb',
  },
  footerText: {
    fontSize: 7,
    color: '#9ca3af',
  },
  notas: {
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
  },
  notasTitle: {
    fontSize: 7.5,
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  notasText: {
    fontSize: 8.5,
    color: '#374151',
    lineHeight: 1.5,
  },
});

export interface CotizacionPDFData {
  numero: string;
  estado: string;
  tenant: {
    razonSocial: string;
    ruc: string;
    direccionFiscal: string | null;
  };
  cliente: string;
  clienteRuc?: string | null;
  fechaEmision: string;
  fechaVencimiento: string;
  moneda: string;
  tipoCambio?: number | null;
  items: Array<{
    sku: string | null;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }>;
  totales: {
    subtotal: number;
    igv: number;
    total: number;
  };
  notas?: string | null;
  terminosCondiciones?: string | null;
}

function fmt(n: number, ccy: string, dp = 2) {
  return `${ccy} ${n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
}

export function CotizacionPDF({ data }: { data: CotizacionPDFData }) {
  return (
    <Document title={`${data.numero} — ${data.tenant.razonSocial}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>{data.tenant.razonSocial}</Text>
            <Text style={styles.ruc}>RUC {data.tenant.ruc}</Text>
            {data.tenant.direccionFiscal && (
              <Text style={[styles.ruc, { marginTop: 1 }]}>{data.tenant.direccionFiscal}</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docType}>COTIZACIÓN</Text>
            <Text style={styles.docNumber}>{data.numero}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{data.estado.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Fechas + cliente */}
        <View style={styles.row2col}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Cliente</Text>
            <View style={styles.field}>
              <Text style={styles.fieldValue}>{data.cliente}</Text>
              {data.clienteRuc && <Text style={styles.fieldLabel}>RUC {data.clienteRuc}</Text>}
            </View>
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Documento</Text>
            <View style={[styles.field, { flexDirection: 'row', gap: 16 }]}>
              <View>
                <Text style={styles.fieldLabel}>Emisión</Text>
                <Text style={styles.fieldValue}>{data.fechaEmision}</Text>
              </View>
              <View>
                <Text style={styles.fieldLabel}>Vencimiento</Text>
                <Text style={styles.fieldValue}>{data.fechaVencimiento}</Text>
              </View>
              <View>
                <Text style={styles.fieldLabel}>Moneda</Text>
                <Text style={styles.fieldValue}>
                  {data.moneda}
                  {data.tipoCambio ? ` · TC S/ ${data.tipoCambio.toFixed(4)}` : ''}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tabla de ítems */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.thText, styles.colSku]}>SKU</Text>
            <Text style={[styles.thText, styles.colDesc]}>DESCRIPCIÓN</Text>
            <Text style={[styles.thText, styles.colQty]}>CANT.</Text>
            <Text style={[styles.thText, styles.colPrice]}>PRECIO U.</Text>
            <Text style={[styles.thText, styles.colTotal]}>SUBTOTAL</Text>
          </View>
          {data.items.map((it, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tdMuted, styles.colSku]}>{it.sku ?? '—'}</Text>
              <Text style={[styles.tdText, styles.colDesc]}>{it.descripcion}</Text>
              <Text style={[styles.tdText, styles.colQty]}>
                {it.cantidad.toLocaleString('en-US')}
              </Text>
              <Text style={[styles.tdText, styles.colPrice]}>
                {fmt(it.precioUnitario, data.moneda, 4)}
              </Text>
              <Text style={[styles.tdText, styles.colTotal]}>
                {fmt(it.subtotal, data.moneda, 2)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totales */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalsTable}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{fmt(data.totales.subtotal, data.moneda)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalLabel}>IGV 18%</Text>
              <Text style={styles.totalValue}>{fmt(data.totales.igv, data.moneda)}</Text>
            </View>
            <View style={styles.totalsRowTotal}>
              <Text style={styles.totalLabelBig}>TOTAL</Text>
              <Text style={styles.totalValueBig}>{fmt(data.totales.total, data.moneda)}</Text>
            </View>
          </View>
        </View>

        {/* Notas */}
        {(data.notas || data.terminosCondiciones) && (
          <View style={styles.notas}>
            {data.notas && (
              <>
                <Text style={styles.notasTitle}>Observaciones</Text>
                <Text style={styles.notasText}>{data.notas}</Text>
              </>
            )}
            {data.terminosCondiciones && (
              <>
                <Text style={[styles.notasTitle, data.notas ? { marginTop: 8 } : {}]}>
                  Términos y condiciones
                </Text>
                <Text style={styles.notasText}>{data.terminosCondiciones}</Text>
              </>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {data.tenant.razonSocial} · RUC {data.tenant.ruc}
          </Text>
          <Text style={styles.footerText}>{data.numero}</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
