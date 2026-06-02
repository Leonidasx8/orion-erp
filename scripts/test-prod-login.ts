/**
 * Test de login completo en orion-rp.com
 * Verifica: login → /idex dashboard → clientes → productos → cotizaciones
 */
import { chromium } from 'playwright';

const BASE = 'https://orion-rp.com';
const EMAIL = 'lescriva@grupoidex.com.pe';
const PASSWORD = 'Idex2026!';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  // Capture console errors
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`PAGE ERROR: ${err.message}`));

  try {
    console.log('1. Navegando a /login...');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('   URL:', page.url());
    await page.screenshot({ path: '/tmp/orion-01-login.png' });

    console.log('2. Llenando credenciales...');
    await page.fill('input#email', EMAIL);
    await page.fill('input#password', PASSWORD);
    // Wait for button to become enabled (it starts disabled)
    await page.waitForSelector('button:not([disabled])', { timeout: 5000 });
    await page.screenshot({ path: '/tmp/orion-02-creds-filled.png' });

    console.log('3. Enviando formulario...');
    // Click the "Ingresar" button (not submit type, just a button)
    await page.click('button:has-text("Ingresar")');
    await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 25000 });
    const afterLoginUrl = page.url();
    console.log('   Redirigido a:', afterLoginUrl);
    await page.screenshot({ path: '/tmp/orion-03-after-login.png' });

    // Check for Application error
    const bodyText = await page.textContent('body');
    if (bodyText?.includes('Application error')) {
      throw new Error('Application error detected after login!');
    }

    // May land on /tenant-picker or /idex
    if (afterLoginUrl.includes('tenant') || afterLoginUrl.includes('picker')) {
      console.log('4. Seleccionando tenant Idex...');
      await page.click('text=idex', { timeout: 10000 }).catch(async () => {
        // Try clicking any link that contains 'idex'
        const links = await page.$$('a[href*="idex"]');
        if (links.length > 0) await links[0].click();
      });
      await page.waitForURL((url) => url.toString().includes('/idex'), { timeout: 15000 });
      console.log('   URL:', page.url());
    }

    await page.screenshot({ path: '/tmp/orion-04-dashboard.png' });
    console.log('✅ Dashboard OK:', page.url());

    // Navigate to clientes
    console.log('5. Navegando a Clientes...');
    await page.goto(`${BASE}/idex/clientes`, { waitUntil: 'networkidle', timeout: 20000 });
    if ((await page.textContent('body'))?.includes('Application error')) {
      throw new Error('Application error en /clientes');
    }
    await page.screenshot({ path: '/tmp/orion-05-clientes.png' });
    console.log('✅ Clientes OK');

    // Navigate to productos
    console.log('6. Navegando a Productos...');
    await page.goto(`${BASE}/idex/productos`, { waitUntil: 'networkidle', timeout: 20000 });
    if ((await page.textContent('body'))?.includes('Application error')) {
      throw new Error('Application error en /productos');
    }
    await page.screenshot({ path: '/tmp/orion-06-productos.png' });
    console.log('✅ Productos OK');

    // Navigate to cotizaciones
    console.log('7. Navegando a Cotizaciones...');
    await page.goto(`${BASE}/idex/cotizaciones`, { waitUntil: 'networkidle', timeout: 20000 });
    if ((await page.textContent('body'))?.includes('Application error')) {
      throw new Error('Application error en /cotizaciones');
    }
    await page.screenshot({ path: '/tmp/orion-07-cotizaciones.png' });
    console.log('✅ Cotizaciones OK');

    // Navigate to ordenes
    console.log('8. Navegando a Compras (órdenes)...');
    await page.goto(`${BASE}/idex/ordenes`, { waitUntil: 'networkidle', timeout: 20000 });
    if ((await page.textContent('body'))?.includes('Application error')) {
      throw new Error('Application error en /ordenes');
    }
    await page.screenshot({ path: '/tmp/orion-08-ordenes.png' });
    console.log('✅ Compras OK');

    // Navigate to inventario
    console.log('9. Navegando a Inventario...');
    await page.goto(`${BASE}/idex/inventario`, { waitUntil: 'networkidle', timeout: 20000 });
    if ((await page.textContent('body'))?.includes('Application error')) {
      throw new Error('Application error en /inventario');
    }
    await page.screenshot({ path: '/tmp/orion-09-inventario.png' });
    console.log('✅ Inventario OK');

    console.log('\n=== RESULTADO: TODAS LAS PÁGINAS OK ===');
    if (errors.length > 0) {
      console.log('\n⚠️ Errores de consola detectados:');
      errors.forEach((e) => console.log('  -', e));
    } else {
      console.log('Sin errores de consola.');
    }
  } catch (err) {
    console.error('\n❌ FALLO:', (err as Error).message);
    await page.screenshot({ path: '/tmp/orion-ERROR.png' });
    if (errors.length > 0) {
      console.log('Errores de consola previos:');
      errors.forEach((e) => console.log('  -', e));
    }
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
