/**
 * Test manual de la API Nubefact — producción real.
 * Ejecutar: npx tsx scripts/test-nubefact.ts
 *
 * ⚠️ Esto emite un documento REAL en SUNAT para el RUC de Idex.
 *    Voida la factura inmediatamente después si todo sale bien.
 *    Solo correr con consentimiento de Lucas.
 */

// env cargado via --env-file flag de tsx

const RUTA = process.env.NUBEFACT_RUTA_IDEX!;
const TOKEN = process.env.NUBEFACT_TOKEN_IDEX!;
const BASE_URL = `https://api.nubefact.com/api/v1/${RUTA}`;

// Payload mínimo válido — factura de S/ 1.18 (S/ 1.00 + IGV)
// RUC de Idex: necesitamos el RUC real del emisor en Nubefact
const payload = {
  operacion: 'generar_comprobante',
  tipo_de_comprobante: 1, // Factura
  serie: 'F001',
  numero: 1,
  sunat_transaction: 1,
  cliente_tipo_de_documento: 6, // RUC
  cliente_numero_de_documento: '20131369477', // RUC de SUNAT (como cliente de prueba)
  cliente_denominacion: 'SUPERINTENDENCIA NACIONAL DE ADUANAS Y DE ADMINISTRACION TRIBUTARIA',
  cliente_direccion: 'Av. Test 123, Lima',
  cliente_email: '',
  cliente_email_1: '',
  cliente_email_2: '',
  fecha_de_emision: (() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  })(),
  fecha_de_vencimiento: '',
  moneda: 1, // PEN
  tipo_de_cambio: '',
  porcentaje_de_igv: 18,
  total_gravada: 1.0,
  total_exonerada: 0,
  total_inafecta: 0,
  total_igv: 0.18,
  total: 1.18,
  total_prepagado: 0,
  total_otros_cargos: 0,
  total_en_letras: 'UNO CON 18/100 SOLES',
  forma_de_pago: 'Contado',
  items: [
    {
      unidad_de_medida: 'NIU',
      codigo: 'TEST-001',
      descripcion: 'Servicio de prueba técnica Orion ERP',
      cantidad: 1,
      valor_unitario: 1.0,
      precio_unitario: 1.18,
      descuento: '',
      subtotal: 1.0,
      tipo_de_igv: 1, // Gravado
      igv: 0.18,
      total: 1.18,
      anticipo_regularizacion: false,
      anticipo_documento_serie: '',
      anticipo_documento_numero: '',
    },
  ],
  datos_del_emisor: {
    codigo_del_producto_de_la_sunat: '',
  },
  guias: [],
  anticipo: [],
  cuotas: [],
  documentos_relacionados: [],
  bien_o_servicio: 'S',
};

async function main() {
  if (!RUTA || !TOKEN) {
    console.error('❌ NUBEFACT_RUTA_IDEX o NUBEFACT_TOKEN_IDEX no configurados en .env.local');
    process.exit(1);
  }

  console.log('🔧 Endpoint:', BASE_URL);
  console.log('📦 Payload a enviar:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\n⚠️  Este es un documento REAL. Ctrl+C para cancelar. Enter para continuar...');

  // Esperar input del usuario
  await new Promise<void>((resolve) => {
    process.stdin.once('data', () => resolve());
  });

  console.log('\n🚀 Enviando a Nubefact...');

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });

  const body = await res.json();
  console.log(`\nHTTP ${res.status}:`);
  console.log(JSON.stringify(body, null, 2));

  if (body.enlace_del_pdf) {
    console.log('\n✅ PDF:', body.enlace_del_pdf);
  }
  if (body.enlace_del_xml) {
    console.log('✅ XML:', body.enlace_del_xml);
  }
  if (body.enlace_del_cdr) {
    console.log('✅ CDR:', body.enlace_del_cdr);
  }
}

main().catch(console.error);
