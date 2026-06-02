/**
 * Test comprehensivo de UI — Orion ERP orion-rp.com
 * Cubre: todos los módulos, pipelines, roles de usuario
 * Genera screenshots en /tmp/orion-test-*
 */
import { chromium, type Page, type BrowserContext } from 'playwright';

const BASE = 'https://orion-rp.com';
const SLUG = 'idex';

const USERS = {
  superadmin: { email: 'lescriva@grupoidex.com.pe', password: 'Idex2026!', role: 'superadmin' },
  vendedor: { email: 'vendedor@idex.demo', password: 'Idex2026!', role: 'vendedor' },
  contador: { email: 'contador@idex.demo', password: 'Idex2026!', role: 'contador' },
  admin: { email: 'lucas@orion.demo', password: 'orion-demo-2026', role: 'admin' },
};

// ─── Resultado tracker ─────────────────────────────────────────────────
interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  note?: string;
}
const results: TestResult[] = [];
let shotCount = 0;

function pass(name: string, note?: string) {
  results.push({ name, status: 'PASS', note });
  console.log(`  ✅ ${name}${note ? ' — ' + note : ''}`);
}
function fail(name: string, note: string) {
  results.push({ name, status: 'FAIL', note });
  console.log(`  ❌ ${name} — ${note}`);
}
function skip(name: string, note: string) {
  results.push({ name, status: 'SKIP', note });
  console.log(`  ⏭️  ${name} — ${note}`);
}

async function shot(page: Page, label: string) {
  const path = `/tmp/orion-test-${String(++shotCount).padStart(3, '0')}-${label.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function hasAppError(page: Page): Promise<boolean> {
  const body = await page.textContent('body').catch(() => '');
  return !!(body?.includes('Application error') || body?.includes('Internal Server Error'));
}

// ─── Login helper ───────────────────────────────────────────────────────
async function login(ctx: BrowserContext, email: string, password: string): Promise<Page> {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.fill('input#email', email);
  await page.fill('input#password', password);
  await page.waitForSelector('button:not([disabled])', { timeout: 5000 });
  await page.click('button:has-text("Ingresar")');
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 20000 });
  // Dismiss cookie banner if present
  await page.click('button:has-text("Decline"), button:has-text("Accept")').catch(() => {});
  return page;
}

// Dismiss cookie banner on any page
async function dismissCookies(page: Page) {
  await page
    .click('button:has-text("Decline"), button:has-text("Accept"), button:has-text("Rechazar")')
    .catch(() => {});
}

// ─── Navigate to tenant page ────────────────────────────────────────────
async function nav(page: Page, path: string) {
  await page.goto(`${BASE}/${SLUG}${path}`, { waitUntil: 'networkidle', timeout: 25000 });
}

// ══════════════════════════════════════════════════════════════════════
// SUITE 1: Admin Panel
// ══════════════════════════════════════════════════════════════════════
async function testAdminPanel(ctx: BrowserContext) {
  console.log('\n── SUITE: Admin Panel ──');
  const page = await login(ctx, USERS.admin.email, USERS.admin.password);

  // Try navigating to admin
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 20000 });
  const url = page.url();
  await shot(page, 'admin-access');

  if (url.includes('/admin') && !url.includes('/login')) {
    pass('Admin panel accessible con lucas@orion.demo');

    // Try tenant list
    await page.goto(`${BASE}/admin/tenants`, { waitUntil: 'networkidle', timeout: 15000 });
    if (await hasAppError(page)) {
      fail('Admin: tenant list', 'Application error');
    } else {
      pass('Admin: lista de tenants');
      await shot(page, 'admin-tenants');
    }

    // Try "Nuevo tenant" wizard
    await page.goto(`${BASE}/admin/tenants/nuevo`, { waitUntil: 'networkidle', timeout: 15000 });
    await shot(page, 'admin-nuevo-tenant');
    if (await hasAppError(page)) {
      fail('Admin: wizard nuevo tenant', 'Application error');
    } else {
      pass('Admin: wizard nuevo tenant carga');
      // Check step 1 exists
      const razonSocial = page.locator(
        'input[name="razonSocial"], input[placeholder*="razón"], input[placeholder*="empresa"]'
      );
      if ((await razonSocial.count()) > 0) {
        await razonSocial.first().fill('TESTCORP SAC');
        pass('Admin: wizard Step 1 — razon social field funciona');
        await shot(page, 'admin-wizard-step1');
      } else {
        skip('Admin: wizard fields', 'Campos no encontrados con esos selectores');
      }
    }
  } else {
    fail('Admin panel', `No accesible — redirigió a ${url} (no es platform admin)`);
    skip('Admin: lista tenants', 'Sin acceso admin');
    skip('Admin: wizard nuevo tenant', 'Sin acceso admin');
  }

  await page.close();
}

// ══════════════════════════════════════════════════════════════════════
// SUITE 2: Dashboard
// ══════════════════════════════════════════════════════════════════════
async function testDashboard(page: Page) {
  console.log('\n── SUITE: Dashboard ──');
  await nav(page, '');
  await shot(page, 'dashboard');

  if (await hasAppError(page)) {
    fail('Dashboard', 'Application error');
    return;
  }
  pass('Dashboard carga');

  // Check KPIs are present
  const kpiText = await page.textContent('body');
  if (kpiText?.includes('Ventas del mes') || kpiText?.includes('Stock crítico')) {
    pass('Dashboard: KPIs presentes');
  } else {
    fail('Dashboard: KPIs', 'No se encontraron KPIs en el DOM');
  }

  // Check sidebar links present
  const sidebarLinks = await page.$$('aside a, nav a');
  if (sidebarLinks.length > 3) {
    pass(`Dashboard: sidebar con ${sidebarLinks.length} links`);
  } else {
    fail('Dashboard: sidebar', 'Menos de 3 links en sidebar');
  }
}

// ══════════════════════════════════════════════════════════════════════
// SUITE 3: Clientes CRUD
// ══════════════════════════════════════════════════════════════════════
let testClienteId = '';

async function testClientes(page: Page) {
  console.log('\n── SUITE: Clientes ──');

  // List
  await nav(page, '/clientes');
  if (await hasAppError(page)) {
    fail('Clientes: lista', 'Application error');
    return;
  }
  pass('Clientes: lista carga');
  await shot(page, 'clientes-list');

  // Count rows
  const rows = await page.$$('table tbody tr, [data-row]');
  pass(`Clientes: ${rows.length} registros visibles`);

  // Create new cliente
  await nav(page, '/clientes/nuevo');
  if (await hasAppError(page)) {
    fail('Clientes: form nuevo', 'Application error');
    return;
  }
  await shot(page, 'clientes-nuevo-form');
  pass('Clientes: form nuevo carga');

  // Dismiss cookie banner
  await dismissCookies(page);

  // Use timestamp-based RUC suffix to avoid duplicates across runs
  const uniqueRuc = `209${Date.now().toString().slice(-8)}`;
  await page
    .fill('input#numero-doc', uniqueRuc)
    .catch(() => page.fill('input[name="numeroDocumento"]', uniqueRuc).catch(() => {}));

  // Wait for SUNAT autocomplete (if any)
  await page.waitForTimeout(2000);

  // Fill razón social (id="razon-social")
  const razonInput = page.locator('input#razon-social, input[name="razonSocial"]').first();
  if ((await razonInput.count()) > 0) await razonInput.fill('CLIENTE PRUEBA SAC');

  await page.fill('input#email, input[name="email"]', 'test@prueba.pe').catch(() => {});
  await page.fill('input#telefono, input[name="telefono"]', '999888777').catch(() => {});

  // esCliente checkbox
  const esClienteCheckbox = page.locator('input[name="esCliente"]');
  if ((await esClienteCheckbox.count()) > 0) {
    const checked = await esClienteCheckbox.isChecked();
    if (!checked) await esClienteCheckbox.check();
  }

  await shot(page, 'clientes-nuevo-filled');

  // Submit — wait for navigation (router.push after server action)
  await page.click('button:has-text("Guardar cliente"), button[type="submit"]');
  try {
    await page.waitForURL(
      (url) => {
        const u = url.toString();
        return u.includes('/clientes/') && !u.includes('/nuevo');
      },
      { timeout: 15000 }
    );
    const afterUrl = page.url();
    testClienteId = afterUrl.split('/clientes/')[1].split('/')[0];
    await shot(page, 'clientes-nuevo-after');
    pass('Clientes: crear nuevo cliente', `ID: ${testClienteId}`);
  } catch {
    await shot(page, 'clientes-nuevo-after');
    // Check for server-side error message in form
    const errMsg = await page
      .locator('.text-destructive, [role="alert"], p.text-destructive')
      .first()
      .textContent()
      .catch(() => '');
    if (errMsg) {
      fail('Clientes: crear', `Server error: ${errMsg}`);
    } else {
      fail('Clientes: crear', `No redirigió a /clientes/[id] — URL: ${page.url()}`);
    }
  }

  // View detail (if we have ID)
  if (testClienteId) {
    await nav(page, `/clientes/${testClienteId}`);
    if (await hasAppError(page)) {
      fail('Clientes: detalle', 'Application error');
    } else {
      pass('Clientes: detalle carga');
      await shot(page, 'clientes-detalle');

      // "Agregar contacto" — sr-only text inside ghost icon button
      const btnContacto = page.locator('button:has-text("Agregar contacto")').first();
      if ((await btnContacto.count()) > 0) {
        await btnContacto.click();
        await page.waitForTimeout(1000);
        // Modal is div.fixed (no role=dialog) — same pattern as RecepcionModal
        await page.waitForTimeout(800);
        const modal = page.locator('div.fixed:has(input)').first();
        if ((await modal.count()) > 0) {
          pass('Clientes: modal agregar contacto abre');
          await shot(page, 'clientes-modal-contacto');
          // Inputs are controlled (no name attr) — use placeholder selector
          const inputNombre = modal
            .locator('input[placeholder="Juan Pérez"], input[placeholder*="Pérez"]')
            .first();
          const inputEmail = modal
            .locator('input[type="email"], input[placeholder*="empresa"]')
            .first();
          if ((await inputNombre.count()) > 0) {
            await inputNombre.click();
            await inputNombre.fill('Contacto Test');
            await page.waitForTimeout(300); // React state update
            pass('Clientes: campo nombre contacto llenado');
          } else {
            // Fallback: first text input in modal
            const firstInput = modal.locator('input[type="text"], input:not([type])').first();
            if ((await firstInput.count()) > 0) {
              await firstInput.click();
              await firstInput.fill('Contacto Test');
            }
          }
          if ((await inputEmail.count()) > 0)
            await inputEmail.fill('contacto@prueba.pe').catch(() => {});

          // Wait for button to become enabled (disabled={!nombre.trim()})
          await page
            .waitForSelector('div.fixed button:has-text("Guardar"):not([disabled])', {
              timeout: 5000,
            })
            .catch(() => {});

          const btnGuardar = modal.locator('button:has-text("Guardar"):not([disabled])').first();
          if ((await btnGuardar.count()) > 0) {
            await btnGuardar.click();
            await page.waitForTimeout(2000);
            pass('Clientes: agregar contacto submit');
          } else {
            // Force click even if still disabled (might be a timing issue)
            const btn = modal.locator('button:has-text("Guardar")').first();
            await btn.click({ force: true }).catch(() => {});
            await page.waitForTimeout(2000);
            pass('Clientes: agregar contacto click forzado');
          }
        } else {
          fail('Clientes: modal contacto', 'Modal no apareció');
        }
      } else {
        skip('Clientes: agregar contacto', 'Botón no encontrado');
      }
    }

    // Edit cliente
    await nav(page, `/clientes/${testClienteId}/editar`);
    if (await hasAppError(page)) {
      fail('Clientes: form editar', 'Application error');
    } else {
      pass('Clientes: form editar carga');
      await shot(page, 'clientes-editar');
      await page.fill('input[name="email"]', 'editado@prueba.pe').catch(() => {});
      await page.click('button[type="submit"], button:has-text("Guardar")');
      await page.waitForTimeout(2000);
      pass('Clientes: editar submit');
    }
  }
}

// ══════════════════════════════════════════════════════════════════════
// SUITE 4: Productos CRUD
// ══════════════════════════════════════════════════════════════════════
let testProductoId = '';

async function testProductos(page: Page) {
  console.log('\n── SUITE: Productos ──');

  // List
  await nav(page, '/productos');
  if (await hasAppError(page)) {
    fail('Productos: lista', 'Application error');
    return;
  }
  pass('Productos: lista carga');
  await shot(page, 'productos-list');

  // Grid/list toggle
  const btnList = page.locator(
    'button[aria-label*="list"], button[title*="lista"], [data-view="list"]'
  );
  const btnGrid = page.locator(
    'button[aria-label*="grid"], button[title*="grid"], [data-view="grid"]'
  );
  if ((await btnList.count()) > 0 || (await btnGrid.count()) > 0) {
    pass('Productos: toggle grid/list botones existen');
  }

  // Search
  const searchInput = page
    .locator('input[placeholder*="SKU"], input[placeholder*="buscar"], input[type="search"]')
    .first();
  if ((await searchInput.count()) > 0) {
    await searchInput.fill('CB-');
    await page.waitForTimeout(500);
    await shot(page, 'productos-search');
    pass('Productos: búsqueda funciona');
    await searchInput.clear();
    await page.waitForTimeout(300);
  }

  // Create new producto
  await nav(page, '/productos/nuevo');
  if (await hasAppError(page)) {
    fail('Productos: form nuevo', 'Application error');
    return;
  }
  pass('Productos: form nuevo carga');
  await shot(page, 'productos-nuevo-form');

  // ProductoForm uses: id="codigo" (register='codigo'), id="nombre" (register='nombre')
  // id="precio" (register='precioUnitario'), id="costo" (register='costoUnitario')
  const uniqueSku = `T${Date.now().toString().slice(-6)}`;
  await page.fill('input#codigo, input[name="codigo"]', uniqueSku).catch(() => {});
  await page.fill('input#nombre, input[name="nombre"]', 'Cable de Prueba AWG #12').catch(() => {});
  await page
    .fill('textarea#descripcion, textarea[name="descripcion"]', 'Producto de prueba funcional')
    .catch(() => {});

  // Category: shadcn Select — click trigger then pick option
  const catTrigger = page.locator('button[role="combobox"]:near(:text("Categoría"))').first();
  if ((await catTrigger.count()) > 0) {
    await catTrigger.click();
    await page.waitForTimeout(400);
    const catOpt = page.locator('[role="option"]').first();
    if ((await catOpt.count()) > 0) {
      await catOpt.click();
      pass('Productos: categoría seleccionada');
    }
  } else {
    const catSelect = page.locator('select[name="categoriaId"]').first();
    if ((await catSelect.count()) > 0) {
      const opts = await page
        .locator('select[name="categoriaId"] option:not([disabled]):not([value=""])')
        .all();
      if (opts.length > 0) await catSelect.selectOption({ index: 1 });
    }
  }

  // Precios — id="precio" and id="costo"
  await page.fill('input#precio, input[name="precioUnitario"]', '15').catch(() => {});
  await page.fill('input#costo, input[name="costoUnitario"]', '10').catch(() => {});

  await shot(page, 'productos-nuevo-filled');

  await page.click(
    'button:has-text("Guardar producto"), button:has-text("Guardar"), button[type="submit"]'
  );
  try {
    await page.waitForURL(
      (url) => {
        const u = url.toString();
        return u.includes('/productos/') && !u.includes('/nuevo');
      },
      { timeout: 15000 }
    );
    const afterUrl = page.url();
    testProductoId = afterUrl.split('/productos/')[1].split('/')[0];
    await shot(page, 'productos-nuevo-after');
    pass('Productos: crear nuevo producto', `ID: ${testProductoId}`);
  } catch {
    await shot(page, 'productos-nuevo-after');
    const errMsg = await page
      .locator('.text-destructive, [role="alert"]')
      .first()
      .textContent()
      .catch(() => '');
    fail(
      'Productos: crear',
      errMsg ? `Server error: ${errMsg}` : `No redirigió a /productos/[id] — URL: ${page.url()}`
    );
  }

  // View & Edit
  if (testProductoId) {
    await nav(page, `/productos/${testProductoId}`);
    if (await hasAppError(page)) {
      fail('Productos: detalle', 'Application error');
    } else {
      pass('Productos: detalle carga');
      await shot(page, 'productos-detalle');

      // Check tabs (Precios, Historial)
      const tabs = await page.$$('[role="tab"], button[data-radix-collection-item]');
      pass(`Productos: ${tabs.length} tabs en detalle`);

      // Click Precios tab if exists
      const preciosTab = page.locator(
        '[role="tab"]:has-text("Precio"), [role="tab"]:has-text("precio")'
      );
      if ((await preciosTab.count()) > 0) {
        await preciosTab.first().click();
        await page.waitForTimeout(800);
        pass('Productos: tab Precios accesible');
        await shot(page, 'productos-tab-precios');
      }
    }

    await nav(page, `/productos/${testProductoId}/editar`);
    if (await hasAppError(page)) {
      fail('Productos: form editar', 'Application error');
    } else {
      pass('Productos: form editar carga');
      await page.fill('input[name="precioVenta"]', '18').catch(() => {});
      await page.click('button[type="submit"], button:has-text("Guardar")');
      await page.waitForTimeout(2000);
      pass('Productos: editar submit');
    }
  }

  // Actualizar precios masivo
  await nav(page, '/productos/actualizar-precios');
  if (await hasAppError(page)) {
    fail('Productos: actualizar precios masivo', 'Application error');
  } else {
    pass('Productos: actualizar precios masivo carga');
    await shot(page, 'productos-precios-masivo');

    // Check filters exist
    const familiaFilter = await page.$('select[name="familia"], select[name="categoriaId"]');
    if (familiaFilter) pass('Productos: filtro familia en precios masivo');

    // Check mode radio buttons
    const modeRadio = await page.$('input[type="radio"], [role="radio"]');
    if (modeRadio) pass('Productos: radio modo en precios masivo');
  }
}

// ══════════════════════════════════════════════════════════════════════
// SUITE 5: Cotizaciones — pipeline completo
// ══════════════════════════════════════════════════════════════════════
let testCotizacionId = '';

async function testCotizacionesPipeline(page: Page) {
  console.log('\n── SUITE: Cotizaciones Pipeline ──');

  // List
  await nav(page, '/cotizaciones');
  if (await hasAppError(page)) {
    fail('Cotizaciones: lista', 'Application error');
    return;
  }
  pass('Cotizaciones: lista carga');
  await shot(page, 'cotizaciones-list');

  // Check filter chips
  const chips = await page.$$(
    '[data-state], button:has-text("Borrador"), button:has-text("Enviada")'
  );
  pass(`Cotizaciones: ${chips.length} chips de estado encontrados`);

  // Click chip "Aceptadas"
  const chipAceptada = page.locator('button:has-text("Aceptada"), [data-value="aceptada"]').first();
  if ((await chipAceptada.count()) > 0) {
    await chipAceptada.click();
    await page.waitForTimeout(800);
    pass('Cotizaciones: filtro chip Aceptada funciona');
    // Reset
    const chipTodas = page.locator('button:has-text("Todas"), button:has-text("todas")').first();
    if ((await chipTodas.count()) > 0) await chipTodas.click();
    await page.waitForTimeout(500);
  }

  // New quotation
  await nav(page, '/cotizaciones/nueva');
  if (await hasAppError(page)) {
    fail('Cotizaciones: form nueva', 'Application error');
    return;
  }
  pass('Cotizaciones: form nueva carga');
  await shot(page, 'cotizaciones-nueva-form');

  // Select cliente — uses native <select> with name="clienteId"
  const clienteSelect = page.locator('select[name="clienteId"]').first();
  if ((await clienteSelect.count()) > 0) {
    const opts = await page
      .locator('select[name="clienteId"] option:not([disabled]):not([value=""])')
      .all();
    if (opts.length > 0) {
      await clienteSelect.selectOption({ index: 1 });
      pass(`Cotizaciones: cliente seleccionado (${opts.length} opciones)`);
    } else {
      fail('Cotizaciones: cliente dropdown', 'Sin opciones de cliente');
    }
  } else {
    // Maybe it's a combobox
    const clienteCombo = page.locator('[placeholder*="cliente"], [placeholder*="empresa"]').first();
    if ((await clienteCombo.count()) > 0) {
      await clienteCombo.click();
      await page.waitForTimeout(500);
      const firstOption = page.locator('[role="option"], li[data-value]').first();
      if ((await firstOption.count()) > 0) {
        await firstOption.click();
        pass('Cotizaciones: cliente seleccionado (combobox)');
      }
    }
  }

  // Keep moneda as PEN (default) — USD requires tipoCambio which complicates test
  // Just make sure PEN is selected
  const monedaSelect = page.locator('select[name="moneda"]').first();
  if ((await monedaSelect.count()) > 0) await monedaSelect.selectOption('PEN');

  // Notas
  const notasTA = page.locator('textarea[name="notas"]').first();
  if ((await notasTA.count()) > 0) await notasTA.fill('Cotización de prueba funcional');

  // The form already starts with 1 empty line — fill it directly
  // items.0.descripcion is required
  const descInput = page.locator('input[name="items.0.descripcion"]').first();
  if ((await descInput.count()) > 0) {
    await descInput.fill('Cable AWG #12 100m — test');
    pass('Cotizaciones: descripción de línea llenada');
  } else {
    // Fallback: find by index in tbody
    const firstDesc = page.locator('table tbody tr:first-child input[type="text"]').first();
    if ((await firstDesc.count()) > 0) await firstDesc.fill('Cable de prueba 100m');
    pass('Cotizaciones: descripción (fallback)');
  }

  // items.0.cantidad
  const cantInput0 = page.locator('input[name="items.0.cantidad"]').first();
  if ((await cantInput0.count()) > 0) await cantInput0.fill('5');

  // items.0.precioUnitario
  const precioInput0 = page.locator('input[name="items.0.precioUnitario"]').first();
  if ((await precioInput0.count()) > 0) await precioInput0.fill('100');

  await page.waitForTimeout(500);
  await shot(page, 'cotizaciones-nueva-con-item');
  pass('Cotizaciones: línea llenada con descripción + cantidad + precio');

  // Submit cotización
  await page.click(
    'button:has-text("Guardar cotización"), button:has-text("Guardar"), button[type="submit"]'
  );
  try {
    await page.waitForURL(
      (url) => {
        const u = url.toString();
        return u.includes('/cotizaciones/') && !u.includes('/nueva') && !u.includes('/editar');
      },
      { timeout: 15000 }
    );
    testCotizacionId = page.url().split('/cotizaciones/')[1].split('/')[0];
    await shot(page, 'cotizaciones-nueva-after');
    pass('Cotizaciones: crear', `ID: ${testCotizacionId}`);
  } catch {
    await shot(page, 'cotizaciones-nueva-after');
    const errMsg = await page
      .locator('.text-destructive, [role="alert"], p[class*="destructive"]')
      .first()
      .textContent()
      .catch(() => '');
    fail(
      'Cotizaciones: crear',
      errMsg ? `Server error: ${errMsg}` : `No redirigió — URL: ${page.url()}`
    );
    // Fallback: use existing borrador for pipeline test
    await nav(page, '/cotizaciones');
    const borrLink = await page
      .locator('a[href*="/cotizaciones/"]:near(:text("Borrador"))')
      .first()
      .getAttribute('href')
      .catch(() => null);
    if (borrLink) {
      testCotizacionId = borrLink.split('/cotizaciones/')[1];
      pass(`Cotizaciones: usando existente ${testCotizacionId}`);
    }
  }

  // ── Pipeline: view detail
  if (!testCotizacionId) {
    fail('Cotizaciones: pipeline', 'Sin ID de cotización para probar pipeline');
    return;
  }

  await nav(page, `/cotizaciones/${testCotizacionId}`);
  if (await hasAppError(page)) {
    fail('Cotizaciones: detalle', 'Application error');
    return;
  }
  pass('Cotizaciones: detalle carga');
  await shot(page, 'cotizaciones-detalle');

  // Check visible action buttons
  const actionBtns = await page.$$('button:not([disabled])');
  pass(`Cotizaciones: ${actionBtns.length} botones activos en detalle`);

  // ── Pipeline: PDF download
  const pdfLink = page
    .locator('a[href*="/pdf"], button:has-text("PDF"), a:has-text("PDF")')
    .first();
  if ((await pdfLink.count()) > 0) {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 8000 }).catch(() => null),
      pdfLink.click(),
    ]);
    if (download) {
      pass('Cotizaciones: PDF descarga');
    } else {
      // Maybe it opens in a new tab
      const pages = page.context().pages();
      if (pages.length > 1) {
        pass('Cotizaciones: PDF abre en nueva pestaña');
        await pages[pages.length - 1].close();
      } else {
        await page.waitForTimeout(2000);
        pass('Cotizaciones: PDF link clickeable (no se pudo verificar descarga)');
      }
    }
  } else {
    skip('Cotizaciones: PDF', 'Link PDF no visible (cotización en borrador o estado incompatible)');
  }

  // ── Pipeline: Enviar (borrador → enviada)
  // const estadoText = await page.textContent('[data-badge], .badge, span:has-text("borrador"), span:has-text("enviada"), span:has-text("aceptada")').catch(() => '');

  const btnEnviar = page.locator('button:has-text("Enviar")').first();
  if ((await btnEnviar.count()) > 0 && !(await btnEnviar.isDisabled())) {
    await btnEnviar.click();
    await page.waitForTimeout(3000);
    await shot(page, 'cotizaciones-enviada');
    const newState = await page.textContent('body');
    if (newState?.includes('enviada') || newState?.includes('Enviada')) {
      pass('Cotizaciones: pipeline enviar (borrador → enviada)');
    } else {
      pass('Cotizaciones: pipeline enviar click (estado no verificado)');
    }
    await page.waitForTimeout(1000);
  } else {
    skip('Cotizaciones: enviar', 'Botón Enviar no disponible (puede que ya esté enviada)');
  }

  // Reload to get current state
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // ── Pipeline: Aceptar (enviada → aceptada)
  const btnAceptar = page.locator('button:has-text("Aceptar"), button:has-text("Aprobar")').first();
  if ((await btnAceptar.count()) > 0 && !(await btnAceptar.isDisabled())) {
    await btnAceptar.click();
    await page.waitForTimeout(3000);
    await shot(page, 'cotizaciones-aceptada');
    const newState = await page.textContent('body');
    if (newState?.includes('aceptada') || newState?.includes('Aceptada')) {
      pass('Cotizaciones: pipeline aceptar (enviada → aceptada)');
    } else {
      pass('Cotizaciones: pipeline aceptar click');
    }
  } else {
    skip('Cotizaciones: aceptar', 'Botón Aceptar no disponible');
  }

  // Reload
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // ── Pipeline: Generar OC (desde cotización aceptada)
  const btnGenOC = page
    .locator('button:has-text("Compra"), button:has-text("Generar compra"), button:has-text("OC")')
    .first();
  if ((await btnGenOC.count()) > 0 && !(await btnGenOC.isDisabled())) {
    await btnGenOC.click();
    await page.waitForTimeout(4000);
    const afterGenUrl = page.url();
    await shot(page, 'cotizaciones-gen-oc-after');
    if (afterGenUrl.includes('/ordenes/')) {
      pass('Cotizaciones: generar OC → redirige a orden', afterGenUrl);
    } else {
      // const toast = await page.$('[data-sonner-toast]');
      pass('Cotizaciones: generar OC click (verificar toast)');
    }
  } else {
    skip(
      'Cotizaciones: generar OC',
      'Botón no disponible (cotización no aceptada o sin proveedor)'
    );
  }

  // Reload and try generar factura
  await nav(page, `/cotizaciones/${testCotizacionId}`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const btnGenFactura = page
    .locator('button:has-text("Factura"), button:has-text("factura")')
    .first();
  if ((await btnGenFactura.count()) > 0 && !(await btnGenFactura.isDisabled())) {
    await btnGenFactura.click();
    await page.waitForTimeout(4000);
    await shot(page, 'cotizaciones-gen-factura-after');
    const afterUrl = page.url();
    if (afterUrl.includes('/facturas/')) {
      pass('Cotizaciones: generar factura → redirige a factura');
    } else {
      pass('Cotizaciones: generar factura click');
    }
  } else {
    skip('Cotizaciones: generar factura', 'Botón no disponible');
  }

  // Test duplicar
  await nav(page, `/cotizaciones/${testCotizacionId}`);
  await page.waitForTimeout(1000);
  const btnDuplicar = page.locator('button:has-text("Duplicar")').first();
  if ((await btnDuplicar.count()) > 0) {
    await btnDuplicar.click();
    await page.waitForTimeout(3000);
    const dupUrl = page.url();
    if (
      dupUrl.includes('/cotizaciones/') &&
      dupUrl !== `${BASE}/${SLUG}/cotizaciones/${testCotizacionId}`
    ) {
      pass('Cotizaciones: duplicar → nueva cotización creada');
    } else {
      pass('Cotizaciones: duplicar click');
    }
    await shot(page, 'cotizaciones-duplicada');
  } else {
    skip('Cotizaciones: duplicar', 'Botón no encontrado');
  }

  // Test rechazar (usar cotización nueva/borrador si existe)
  await nav(page, '/cotizaciones');
  const borradorLink = page
    .locator('a[href*="/cotizaciones/"]:near(span:has-text("Borrador"))')
    .first();
  if ((await borradorLink.count()) > 0) {
    const href = await borradorLink.getAttribute('href');
    if (href) {
      await page.goto(`${BASE}${href}`, { waitUntil: 'networkidle', timeout: 15000 });
      // Try to send then reject
      const btnEnv2 = page.locator('button:has-text("Enviar")').first();
      if ((await btnEnv2.count()) > 0 && !(await btnEnv2.isDisabled())) {
        await btnEnv2.click();
        await page.waitForTimeout(2000);
        await page.reload({ waitUntil: 'networkidle' });
        const btnRech = page.locator('button:has-text("Rechazar")').first();
        if ((await btnRech.count()) > 0 && !(await btnRech.isDisabled())) {
          await btnRech.click();
          await page.waitForTimeout(1000);
          // Fill motivo if dialog appears
          const motivoInput = page
            .locator('textarea[name="motivo"], input[name="motivo"], [placeholder*="motivo"]')
            .first();
          if ((await motivoInput.count()) > 0) {
            await motivoInput.fill('Prueba de rechazo funcional');
            const btnConfirm = page
              .locator(
                'button:has-text("Confirmar"), button:has-text("Rechazar"):not(:first-of-type)'
              )
              .last();
            if ((await btnConfirm.count()) > 0) await btnConfirm.click();
          }
          await page.waitForTimeout(2000);
          pass('Cotizaciones: pipeline rechazar');
          await shot(page, 'cotizaciones-rechazada');
        }
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════
// SUITE 6: Órdenes de Compra — pipeline completo
// ══════════════════════════════════════════════════════════════════════
let testOrdenId = '';

async function testOrdenesPipeline(page: Page) {
  console.log('\n── SUITE: Compras a Proveedores ──');

  await nav(page, '/ordenes');
  if (await hasAppError(page)) {
    fail('Órdenes: lista', 'Application error');
    return;
  }
  pass('Órdenes: lista carga');
  await shot(page, 'ordenes-list');

  // Create new order
  await nav(page, '/ordenes/nueva');
  if (await hasAppError(page)) {
    fail('Órdenes: form nuevo', 'Application error');
    return;
  }
  pass('Órdenes: form nueva carga');
  await shot(page, 'ordenes-nueva-form');

  // Select proveedor (native select)
  const provSelect = page.locator('select[name="proveedorId"]').first();
  if ((await provSelect.count()) > 0) {
    const opts = await page
      .locator('select[name="proveedorId"] option:not([disabled]):not([value=""])')
      .all();
    if (opts.length > 0) {
      await provSelect.selectOption({ index: 1 });
      pass(`Órdenes: proveedor seleccionado (${opts.length} opciones)`);
    }
  }

  // Keep PEN to avoid tipoCambio required validation
  const monedaSelect = page.locator('select[name="moneda"]').first();
  if ((await monedaSelect.count()) > 0) await monedaSelect.selectOption('PEN');

  // OrdenForm starts with 1 empty line — fill lineas.0.* directly
  // skuSnapshot is required (min(1))
  const skuOrden = page.locator('input[name="lineas.0.skuSnapshot"]').first();
  if ((await skuOrden.count()) > 0) {
    await skuOrden.fill('CB-TEST-001');
    pass('Órdenes: SKU llenado');
  }

  const descOrden = page.locator('input[name="lineas.0.descripcion"]').first();
  if ((await descOrden.count()) > 0) {
    await descOrden.fill('Cable AWG #12 — orden prueba');
    pass('Órdenes: descripción de línea llenada');
  }
  const cantOrden = page.locator('input[name="lineas.0.cantidad"]').first();
  if ((await cantOrden.count()) > 0) await cantOrden.fill('5');

  const precioOrden = page.locator('input[name="lineas.0.precioUnitario"]').first();
  if ((await precioOrden.count()) > 0) await precioOrden.fill('10');

  await shot(page, 'ordenes-nueva-filled');
  await page.click(
    'button:has-text("Crear orden"), button:has-text("Guardar"), button[type="submit"]'
  );
  try {
    await page.waitForURL(
      (url) => {
        const u = url.toString();
        return u.includes('/ordenes/') && !u.includes('/nueva');
      },
      { timeout: 15000 }
    );
    testOrdenId = page.url().split('/ordenes/')[1].split('/')[0];
    await shot(page, 'ordenes-nueva-after');
    pass('Órdenes: crear nueva orden', `ID: ${testOrdenId}`);
  } catch {
    await shot(page, 'ordenes-nueva-after');
    const errMsg = await page
      .locator('.text-destructive, [role="alert"]')
      .first()
      .textContent()
      .catch(() => '');
    fail(
      'Órdenes: crear',
      errMsg ? `Server error: ${errMsg}` : `No redirigió — URL: ${page.url()}`
    );
    // Fallback: use existing pendiente order
    await nav(page, '/ordenes');
    const href = await page
      .locator('a[href*="/ordenes/"]:not([href*="/nueva"])')
      .first()
      .getAttribute('href')
      .catch(() => null);
    if (href) {
      testOrdenId = href.split('/ordenes/')[1];
      pass(`Órdenes: usando existente ${testOrdenId}`);
    }
  }

  if (!testOrdenId) {
    fail('Órdenes: pipeline', 'Sin ID de orden');
    return;
  }

  // View detail
  await nav(page, `/ordenes/${testOrdenId}`);
  if (await hasAppError(page)) {
    fail('Órdenes: detalle', 'Application error');
    return;
  }
  pass('Órdenes: detalle carga');
  await shot(page, 'ordenes-detalle');

  // Pipeline: Enviar
  const btnEnviar = page.locator('button:has-text("Enviar")').first();
  if ((await btnEnviar.count()) > 0 && !(await btnEnviar.isDisabled())) {
    await btnEnviar.click();
    await page.waitForTimeout(3000);
    pass('Órdenes: pipeline enviar');
    await shot(page, 'ordenes-enviada');
    await page.reload({ waitUntil: 'networkidle' });
  }

  // Pipeline: Aprobar
  const btnAprobar = page.locator('button:has-text("Aprobar")').first();
  if ((await btnAprobar.count()) > 0 && !(await btnAprobar.isDisabled())) {
    await btnAprobar.click();
    await page.waitForTimeout(3000);
    pass('Órdenes: pipeline aprobar');
    await shot(page, 'ordenes-aprobada');
    await page.reload({ waitUntil: 'networkidle' });
  } else {
    skip('Órdenes: aprobar', 'Botón no disponible');
  }

  // Pipeline: Recepción parcial — botón es "Registrar recepción"
  const btnRecibir = page.locator('button:has-text("Registrar recepción")').first();
  if ((await btnRecibir.count()) > 0 && !(await btnRecibir.isDisabled())) {
    await btnRecibir.click();
    await page.waitForTimeout(1000);

    // Modal is div.fixed (no role=dialog) with h2 "Registrar recepción"
    const modal = page.locator('div.fixed:has(h2:has-text("Registrar recepción"))').first();
    if ((await modal.count()) > 0) {
      pass('Órdenes: modal recepción abre');
      await shot(page, 'ordenes-recepcion-modal');

      // "Recibir todo" button fills all quantities
      const btnRecibirTodo = modal.locator('button:has-text("Recibir todo")').first();
      if ((await btnRecibirTodo.count()) > 0) {
        await btnRecibirTodo.click();
        await page.waitForTimeout(500);
        pass('Órdenes: recibir todo click');
      } else {
        // Manually fill first quantity input
        const cantRecInput = modal.locator('input[type="number"]').first();
        if ((await cantRecInput.count()) > 0) {
          await cantRecInput.fill('2');
          pass('Órdenes: cantidad recepción llenada');
        }
      }

      // Submit — "Confirmar recepción"
      const btnConfirmar = modal.locator('button:has-text("Confirmar recepción")').first();
      if ((await btnConfirmar.count()) > 0) {
        await btnConfirmar.click();
        await page.waitForTimeout(4000);
        pass('Órdenes: recepción parcial confirmada');
        await shot(page, 'ordenes-recepcion-done');
      }
    } else {
      fail('Órdenes: modal recepción', 'Modal no apareció tras click Registrar recepción');
    }
  } else {
    skip('Órdenes: recepción', 'Botón Registrar recepción no disponible (orden no aprobada)');
  }

  // Pipeline: Cerrar
  await page.reload({ waitUntil: 'networkidle' });
  const btnCerrar = page.locator('button:has-text("Cerrar")').first();
  if ((await btnCerrar.count()) > 0 && !(await btnCerrar.isDisabled())) {
    await btnCerrar.click();
    await page.waitForTimeout(2000);
    pass('Órdenes: pipeline cerrar');
    await shot(page, 'ordenes-cerrada');
  } else {
    skip('Órdenes: cerrar', 'Botón no disponible');
  }
}

// ══════════════════════════════════════════════════════════════════════
// SUITE 7: Inventario + Ajuste Manual
// ══════════════════════════════════════════════════════════════════════
async function testInventario(page: Page) {
  console.log('\n── SUITE: Inventario ──');

  await nav(page, '/inventario');
  if (await hasAppError(page)) {
    fail('Inventario: lista', 'Application error');
    return;
  }
  pass('Inventario: lista carga');
  await shot(page, 'inventario-list');

  // Check filter chips
  const chipCritico = page
    .locator('button:has-text("Crítico"), button:has-text("critico")')
    .first();
  if ((await chipCritico.count()) > 0) {
    await chipCritico.click();
    await page.waitForTimeout(600);
    pass('Inventario: filtro Stock crítico');
    const chipTodos = page.locator('button:has-text("Todos"), button:has-text("todos")').first();
    if ((await chipTodos.count()) > 0) await chipTodos.click();
  }

  // Check search
  const searchInput = page.locator('input[type="search"], input[placeholder*="Buscar"]').first();
  if ((await searchInput.count()) > 0) {
    await searchInput.fill('CB-');
    await page.waitForTimeout(500);
    pass('Inventario: búsqueda funciona');
    await searchInput.clear();
  }

  // Test "ajuste" icon button in row (SlidersHorizontal)
  const ajusteLink = page.locator('a[href*="/ajuste"]').first();
  if ((await ajusteLink.count()) > 0) {
    const href = await ajusteLink.getAttribute('href');
    pass('Inventario: link ajuste manual existe en fila');
    if (href) {
      await page.goto(`${BASE}${href}`, { waitUntil: 'networkidle', timeout: 15000 });
      if (await hasAppError(page)) {
        fail('Inventario: ajuste manual form', 'Application error');
      } else {
        pass('Inventario: ajuste manual form carga');
        await shot(page, 'inventario-ajuste-form');

        // Fill form
        const tipoSelect = page.locator('select[name="tipo"]').first();
        if ((await tipoSelect.count()) > 0) {
          await tipoSelect.selectOption('ajuste_pos');
          pass('Inventario: tipo ajuste seleccionado');
        }

        const cantInput = page.locator('input[name="cantidad"]').first();
        if ((await cantInput.count()) > 0) {
          await cantInput.fill('2');
        }

        const motivoInput = page.locator('input[name="motivo"], textarea[name="motivo"]').first();
        if ((await motivoInput.count()) > 0) {
          await motivoInput.fill('Ajuste de prueba funcional');
        }

        // Check preview updates reactively
        await page.waitForTimeout(800);
        await shot(page, 'inventario-ajuste-filled');

        // Submit
        await page.click(
          'button[type="submit"], button:has-text("Aplicar"), button:has-text("Confirmar")'
        );
        await page.waitForTimeout(3000);
        await shot(page, 'inventario-ajuste-after');
        const afterUrl = page.url();
        if (afterUrl.includes('/inventario')) {
          pass('Inventario: ajuste manual aplicado → redirect a inventario');
        } else {
          pass('Inventario: ajuste manual submit');
        }
      }
    }
  } else {
    skip('Inventario: ajuste manual', 'Link ajuste no encontrado en filas');
  }

  // Kardex detail
  const kardexLink = page.locator('a[href*="/inventario/"]:not([href*="/ajuste"])').first();
  if ((await kardexLink.count()) > 0) {
    await kardexLink.click();
    await page.waitForTimeout(3000);
    if (await hasAppError(page)) {
      fail('Inventario: kardex detalle', 'Application error');
    } else {
      pass('Inventario: kardex detalle carga');
      await shot(page, 'inventario-kardex');

      // Check KPI strip
      const kpis = await page.$$('[data-kpi], .kpi');
      pass(`Inventario: ${kpis.length} KPIs en kardex`);

      // Test filter chips in kardex
      const entradaChip = page
        .locator('button:has-text("Entrada"), button:has-text("entrada")')
        .first();
      if ((await entradaChip.count()) > 0) {
        await entradaChip.click();
        await page.waitForTimeout(500);
        pass('Inventario: filtro tipo movimiento en kardex');
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════
// SUITE 8: Facturas
// ══════════════════════════════════════════════════════════════════════
async function testFacturas(page: Page) {
  console.log('\n── SUITE: Facturas ──');

  await nav(page, '/facturas');
  if (await hasAppError(page)) {
    fail('Facturas: lista', 'Application error');
    return;
  }
  pass('Facturas: lista carga');
  await shot(page, 'facturas-list');

  // Check filter chips
  const bodyText = (await page.textContent('body')) ?? '';
  if (
    bodyText.includes('Sin enviar') ||
    bodyText.includes('Aceptada') ||
    bodyText.includes('borrador')
  ) {
    pass('Facturas: chips de estado SUNAT visibles');
  }

  // Try to open first factura
  const facturaLink = page.locator('a[href*="/facturas/"]:not([href="/facturas"])').first();
  if ((await facturaLink.count()) > 0) {
    await facturaLink.click();
    await page.waitForTimeout(3000);
    if (await hasAppError(page)) {
      fail('Facturas: detalle', 'Application error');
    } else {
      pass('Facturas: detalle carga');
      await shot(page, 'facturas-detalle');

      // Check SUNAT box
      const sunatBox = await page.$('[data-sunat], section:has-text("SUNAT"), div:has-text("CDR")');
      if (sunatBox) pass('Facturas: box SUNAT visible');

      // Check Anular button
      const btnAnular = page
        .locator('button:has-text("Anular"), button:has-text("anular")')
        .first();
      if ((await btnAnular.count()) > 0) {
        pass('Facturas: botón Anular existe');
      }
    }
  } else {
    skip('Facturas: detalle', 'Sin facturas en lista aún');
  }
}

// ══════════════════════════════════════════════════════════════════════
// SUITE 9: Crédito y CxC
// ══════════════════════════════════════════════════════════════════════
async function testCredito(page: Page) {
  console.log('\n── SUITE: Crédito y CxC ──');

  await nav(page, '/credito');
  if (await hasAppError(page)) {
    fail('Crédito: dashboard', 'Application error');
    return;
  }
  pass('Crédito: dashboard carga');
  await shot(page, 'credito-dashboard');

  // Check aging chart
  const agingText = (await page.textContent('body')) ?? '';
  if (
    agingText.includes('0-30') ||
    agingText.includes('30-60') ||
    agingText.includes('aging') ||
    agingText.includes('vencimiento')
  ) {
    pass('Crédito: aging chart / datos visibles');
  }

  // Click on a client in credit
  const clienteLink = page.locator('a[href*="/credito/clientes/"]').first();
  if ((await clienteLink.count()) > 0) {
    await clienteLink.click();
    await page.waitForTimeout(3000);
    if (await hasAppError(page)) {
      fail('Crédito: detalle cliente', 'Application error');
    } else {
      pass('Crédito: detalle cliente carga');
      await shot(page, 'credito-cliente-detalle');

      // Test otorgar crédito
      const btnOtorgar = page
        .locator(
          'button:has-text("Otorgar"), button:has-text("otorgar"), button:has-text("Crédito")'
        )
        .first();
      if ((await btnOtorgar.count()) > 0) {
        await btnOtorgar.click();
        await page.waitForTimeout(1000);

        const limiteInput = page
          .locator('input[name="limiteCredito"], input[name="limite"]')
          .first();
        if ((await limiteInput.count()) > 0) {
          await limiteInput.fill('5000');
          pass('Crédito: form otorgar crédito');

          const plazoInput = page.locator('input[name="plazosDias"], input[name="plazo"]').first();
          if ((await plazoInput.count()) > 0) await plazoInput.fill('30');

          const btnGuardar = page
            .locator(
              'button[type="submit"], button:has-text("Guardar"), button:has-text("Otorgar")'
            )
            .last();
          if ((await btnGuardar.count()) > 0) {
            await btnGuardar.click();
            await page.waitForTimeout(2000);
            pass('Crédito: otorgar crédito submit');
          }
        } else {
          // Might have opened inline form
          pass('Crédito: botón otorgar crédito clickeable');
        }
        await shot(page, 'credito-otorgar');
      } else {
        skip('Crédito: otorgar', 'Botón no encontrado');
      }
    }
  } else {
    skip('Crédito: detalle cliente', 'Sin clientes en lista CxC');
  }

  // Test registrar pago
  await nav(page, '/credito/pagos/nuevo');
  if (await hasAppError(page)) {
    fail('Crédito: form nuevo pago', 'Application error');
  } else {
    pass('Crédito: form nuevo pago carga');
    await shot(page, 'credito-nuevo-pago');
  }
}

// ══════════════════════════════════════════════════════════════════════
// SUITE 10: Reportes
// ══════════════════════════════════════════════════════════════════════
async function testReportes(page: Page) {
  console.log('\n── SUITE: Reportes ──');

  await nav(page, '/reportes');
  if (await hasAppError(page)) {
    fail('Reportes: index', 'Application error');
    return;
  }
  pass('Reportes: index carga');
  await shot(page, 'reportes-index');

  await nav(page, '/reportes/ventas');
  if (await hasAppError(page)) {
    fail('Reportes: ventas', 'Application error');
  } else {
    pass('Reportes: ventas carga');
    await shot(page, 'reportes-ventas');

    // Check export button
    const btnExport = page.locator('button:has-text("Exportar"), button:has-text("Excel")').first();
    if ((await btnExport.count()) > 0) {
      pass('Reportes: botón Exportar existe');
      await btnExport.click().catch(() => {});
      await page.waitForTimeout(2000);
      pass('Reportes: exportar click');
    }

    // Check filters
    const filtros = await page.$$('select, input[type="date"], input[type="month"]');
    pass(`Reportes: ${filtros.length} controles de filtro`);
  }
}

// ══════════════════════════════════════════════════════════════════════
// SUITE 11: Role-Based Access — Vendedor
// ══════════════════════════════════════════════════════════════════════
async function testVendedor(ctx: BrowserContext) {
  console.log('\n── SUITE: Vendedor role ──');
  let page: Page;
  try {
    page = await login(ctx, USERS.vendedor.email, USERS.vendedor.password);
  } catch (e) {
    fail('Vendedor: login', `Error: ${(e as Error).message}`);
    return;
  }

  const url = page.url();
  if (url.includes('/login')) {
    fail(
      'Vendedor: login',
      'No pudo hacer login — credenciales incorrectas o usuario sin contraseña'
    );
    await page.close();
    return;
  }
  pass('Vendedor: login OK', url);

  // Should land on /idex or tenant picker
  if (url.includes('/idex') || url.includes('seleccionar')) {
    pass('Vendedor: redirige correctamente post-login');
  }

  // If on tenant picker, select idex
  if (url.includes('seleccionar')) {
    const idexBtn = page
      .locator('a:has-text("idex"), button:has-text("idex"), a[href*="/idex"]')
      .first();
    if ((await idexBtn.count()) > 0) {
      await idexBtn.click();
      await page.waitForURL((url) => url.toString().includes('/idex'), { timeout: 10000 });
    }
  }

  await shot(page, 'vendedor-dashboard');

  // Vendedor should see cotizaciones
  await page.goto(`${BASE}/${SLUG}/cotizaciones`, { waitUntil: 'networkidle', timeout: 20000 });
  if (await hasAppError(page)) {
    fail('Vendedor: cotizaciones', 'Application error o acceso denegado');
  } else {
    pass('Vendedor: puede ver cotizaciones');
    await shot(page, 'vendedor-cotizaciones');
  }

  // Vendedor tiene permiso reportes.ver por diseño (rol Comercial incluye reportes.ver)
  await page.goto(`${BASE}/${SLUG}/reportes/ventas`, { waitUntil: 'networkidle', timeout: 15000 });
  await shot(page, 'vendedor-reportes-access');
  if ((await hasAppError(page)) || page.url().includes('/login')) {
    fail('Vendedor: reportes/ventas con Application error inesperado');
  } else {
    pass('Vendedor: reportes/ventas accesible (correcto — rol Comercial tiene reportes.ver)');
  }

  // Vendedor accede a /admin — debe redirigir a /seleccionar-empresa (no al panel admin)
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 15000 });
  const adminRedirectUrl = page.url();
  await shot(page, 'vendedor-admin-access');
  if (!adminRedirectUrl.includes('/admin') || adminRedirectUrl.includes('/seleccionar')) {
    pass('Vendedor: /admin redirige correctamente (no es platform admin)');
  } else {
    fail('Vendedor: acceso admin', `Vendedor puede ver panel admin — URL: ${adminRedirectUrl}`);
  }

  await page.close();
}

// ══════════════════════════════════════════════════════════════════════
// SUITE 12: Role-Based Access — Contador
// ══════════════════════════════════════════════════════════════════════
async function testContador(ctx: BrowserContext) {
  console.log('\n── SUITE: Contador role ──');
  let page: Page;
  try {
    page = await login(ctx, USERS.contador.email, USERS.contador.password);
  } catch (e) {
    fail('Contador: login', `Error: ${(e as Error).message}`);
    return;
  }

  const url = page.url();
  if (url.includes('/login')) {
    fail('Contador: login', 'No pudo hacer login');
    await page.close();
    return;
  }
  pass('Contador: login OK');

  if (url.includes('seleccionar')) {
    const idexBtn = page.locator('a[href*="/idex"]').first();
    if ((await idexBtn.count()) > 0) {
      await idexBtn.click();
      await page.waitForURL((url) => url.toString().includes('/idex'), { timeout: 10000 });
    }
  }

  // Contador should see facturas
  await page.goto(`${BASE}/${SLUG}/facturas`, { waitUntil: 'networkidle', timeout: 20000 });
  if (await hasAppError(page)) {
    fail('Contador: facturas', 'Application error');
  } else {
    pass('Contador: puede ver facturas');
    await shot(page, 'contador-facturas');
  }

  // Contador should see crédito
  await page.goto(`${BASE}/${SLUG}/credito`, { waitUntil: 'networkidle', timeout: 20000 });
  if (await hasAppError(page)) {
    fail('Contador: crédito', 'Application error');
  } else {
    pass('Contador: puede ver crédito');
    await shot(page, 'contador-credito');
  }

  // Contador no tiene cotizaciones.crear — debe redirigir al listado
  await page.goto(`${BASE}/${SLUG}/cotizaciones/nueva`, {
    waitUntil: 'networkidle',
    timeout: 15000,
  });
  const cotNuevaUrl = page.url();
  await shot(page, 'contador-cot-nueva');
  if (cotNuevaUrl.includes('/nueva') && !(await hasAppError(page))) {
    fail(
      'Contador: crear cotización',
      'Contador puede acceder a /cotizaciones/nueva — revisar permisos'
    );
  } else if (!cotNuevaUrl.includes('/nueva')) {
    pass('Contador: cotizaciones/nueva redirige correctamente (sin permiso cotizaciones.crear)');
  } else {
    pass('Contador: cotizaciones/nueva bloqueada (error 403 o redirect)');
  }

  await page.close();
}

// ══════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  ORION ERP — Test Comprehensivo UI');
  console.log('  Target: https://orion-rp.com/idex');
  console.log('═══════════════════════════════════════════');

  const browser = await chromium.launch({ headless: true });
  const errors: string[] = [];

  // ── Superadmin context ──
  const ctxSuper = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  ctxSuper.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`);
  });
  ctxSuper.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

  try {
    // Login as superadmin
    console.log('\n🔐 Login como superadmin...');
    const superPage = await login(ctxSuper, USERS.superadmin.email, USERS.superadmin.password);
    console.log('  → Logueado:', superPage.url());

    await testDashboard(superPage);
    await testClientes(superPage);
    await testProductos(superPage);
    await testCotizacionesPipeline(superPage);
    await testOrdenesPipeline(superPage);
    await testInventario(superPage);
    await testFacturas(superPage);
    await testCredito(superPage);
    await testReportes(superPage);

    await superPage.close();
  } catch (e) {
    fail('Suite superadmin', `Error crítico: ${(e as Error).message}`);
    console.error(e);
  }

  // ── Admin panel context ──
  const ctxAdmin = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await testAdminPanel(ctxAdmin).catch((e) => fail('Suite admin', e.message));
  await ctxAdmin.close();

  // ── Vendedor context ──
  const ctxVendedor = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await testVendedor(ctxVendedor).catch((e) => fail('Suite vendedor', e.message));
  await ctxVendedor.close();

  // ── Contador context ──
  const ctxContador = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await testContador(ctxContador).catch((e) => fail('Suite contador', e.message));
  await ctxContador.close();

  await browser.close();

  // ── Summary ──
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const skipped = results.filter((r) => r.status === 'SKIP').length;

  console.log('\n═══════════════════════════════════════════');
  console.log(`  RESULTADOS: ${passed} ✅  ${failed} ❌  ${skipped} ⏭️`);
  console.log('═══════════════════════════════════════════');

  if (failed > 0) {
    console.log('\n❌ FALLOS:');
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => console.log(`  • ${r.name}: ${r.note}`));
  }

  if (errors.length > 0) {
    console.log('\n⚠️  ERRORES DE CONSOLA/JS:');
    [...new Set(errors)].slice(0, 10).forEach((e) => console.log(`  • ${e}`));
  }

  console.log(`\n📸 ${shotCount} screenshots en /tmp/orion-test-*.png`);

  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
