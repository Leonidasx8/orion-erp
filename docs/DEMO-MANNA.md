# Demo Manna — Guion 9:00 AM, 13 may 2026

> Duración objetivo: **20 minutos**. 15 min demo + 5 min Q&A.

---

## Pre-flight (5 min antes de empezar)

1. Levantar dev server (en otra terminal, ya debe estar corriendo):

   ```bash
   cd ~/dev/orion-erp && pnpm dev
   ```

   Verificar que abre en `http://localhost:3000`.

2. Levantar Supabase local si está apagado:

   ```bash
   pnpm supabase start
   ```

3. Abrir 3 pestañas del browser:
   - **Pestaña A**: `http://localhost:3000/api/dev-login?email=admin@orion.demo`
     → entra a `/admin` (panel plataforma).
   - **Pestaña B**: `http://localhost:3000/api/dev-login?email=lucas@orion.demo`
     → entra a `/agroalves` (operación de tenant).
   - **Pestaña C**: `http://localhost:3000/api/dev-login?email=lucas@orion.demo&to=picker`
     → fuerza el selector de empresas (para mostrar multi-tenant).

4. Si necesitas regenerar links: `pnpm tsx scripts/demo-login.ts`.

---

## Apertura (2 min) — Pestaña A: Vista plataforma

**Decir:**

> "Orión es un ERP en español pensado para empresas peruanas. Lo que ven es el **panel de plataforma**: la consola que opera **nosotros** como proveedores del SaaS — desde acá damos de alta clientes, monitoreamos uso, controlamos SUNAT."

**Mostrar (`/admin`):**

- KPIs arriba: Tenants activos, Usuarios totales, Facturas SUNAT mes, API NUBEFACT 99.8%.
- Tabla de tenants (Agroalves + Idex).
- Sidebar izquierdo: Dashboard, Tenants, Usuarios globales, Auditoría, Configuración, Seguridad.

**Decir:**

> "Cada tenant es una empresa cliente nuestra. Hoy tenemos dos cargados — Idex (eléctrico) y Agroalves (agroindustrial). Vamos a entrar a Idex con un usuario operativo."

---

## Bloque 1 — Multi-tenant + cambio de empresa (1 min) — Pestaña C

**Mostrar:** `/seleccionar-empresa`

- Card de Idex + card de Agroalves, ambos con badge "superadmin".

**Decir:**

> "Lucas es socio de las dos empresas, así que ve un selector. Si solo trabajara con una, entraría directo. Cambia de contexto sin reloguearse."

**Click**: card de **Idex**.

---

## Bloque 2 — Dashboard del tenant (1 min)

**Mostrar:** `/idex`

- "Buen día, IDEX"
- 6 tarjetas KPI: Ventas mes, Cotizaciones, CxC vencido, Stock crítico, SUNAT mes, Clientes activos.
- Gráfica de ventas 12 meses.
- Pipeline de cotizaciones por estado.

**Decir:**

> "Esto es lo que ve el gerente de Idex cuando entra. Todo en tiempo real desde la base — nada hardcodeado."

---

## Bloque 3 — Catálogo de productos (2 min)

**Click:** sidebar → **Productos**.

**Mostrar:** `/idex/productos`

- Grid de 18 productos con **fotos**.
- SKU, nombre, categoría, precio, stock.

**Decir:**

> "Cada producto trae código SUNAT, unidades de medida, control de stock, márgenes mínimos para alertar si vendes por debajo del costo. Importamos catálogos desde Excel — Idex cargó esto en 5 minutos."

**Click**: cualquier producto → muestra detalle.
**Volver atrás.**

---

## Bloque 4 — Cotización completa (4 min) 🎯 _núcleo de la demo_

**Click:** sidebar → **Cotizaciones**.

**Mostrar:** lista de 9 cotizaciones, tabs por estado (Borrador, Enviadas, Aprobadas, Rechazadas, Vencidas, Convertidas).

**Click:** primera cotización **COT-2026-000001** (estado Borrador).

**Mostrar:** detalle de la cotización.

- Cabecera con número, cliente, fechas.
- Items con cantidad, precio, descuento, IGV.
- Totales calculados al instante.

**Click:** botón **PDF**.
**Decir:**

> "El PDF se arma server-side con los datos reales — listo para enviar al cliente. Si cambias el logo o color del tenant en branding, el PDF lo refleja sin redeploy."

**Volver** al detalle.
**Click:** botón **Editar**.
**Mostrar:** el form se abre con todos los datos cargados. Cambiar una cantidad, mostrar cómo recalcula el total al vuelo.

**Decir:**

> "Sólo se puede editar mientras está en Borrador. Una vez enviada queda inmutable — auditoría limpia para SUNAT."

**Cerrar sin guardar.**

---

## Bloque 5 — Otros módulos (3 min, ritmo más rápido)

**Recorrer (un clic por módulo, 30s cada uno):**

1. **Órdenes de compra** (`/idex/ordenes`)
   - Pipeline: Borrador → Enviada → Aprobada → Recibida parcial/total → Cerrada.
   - "Workflow de compras con recepción parcial — útil cuando llegan items en partidas."

2. **Inventario** (`/idex/inventario`)
   - "Stock real-time, kardex completo por SKU, ajustes manuales con motivo y trazabilidad."

3. **Clientes** (`/idex/clientes`)
   - "11 clientes cargados. Línea de crédito, saldo CxC, contactos por cliente."

---

## Bloque 6 — Cambio rápido a Agroalves (1 min)

**Click:** avatar arriba a la derecha → **Cambiar empresa**.
**Click:** Agroalves.

**Mostrar:** `/agroalves` — dashboard distinto, colores adaptados al branding del tenant.

**Decir:**

> "Misma plataforma, otro contexto. Agroalves tiene sus propios productos, clientes, series SUNAT — todo aislado por tenant. Permisos también: si Lucas no fuera superadmin acá, no vería los módulos sensibles."

---

## Bloque 7 — Alta de tenant (2 min) — Volver a Pestaña A

**Click:** sidebar Admin → **Tenants** → botón **+ Nuevo tenant**.

**Mostrar:** wizard de 5 pasos:

1. **Identidad**: razón social, RUC, slug.
2. **Branding**: color de acento + logo + preview en vivo del topbar.
3. **Datos fiscales**: dirección, plan (starter/pro/enterprise).
4. **Series SUNAT**: F001, B001, correlativos iniciales, credenciales NUBEFACT.
5. **Resumen + crear**.

**Decir:**

> "Onboarding nuevo cliente en menos de 5 minutos. Series SUNAT, branding, primer usuario superadmin — todo en este wizard. Atrás corre seed de roles base, casbin para permisos, y ya queda operativo."

**No completarlo** (a menos que quieras crear un tenant nuevo en vivo).

---

## Cierre (1 min)

**Decir:**

> "Resumen de qué vieron:
>
> - Multi-tenant real con aislamiento de datos y permisos.
> - SUNAT integrado vía NUBEFACT (facturas, boletas, guías, notas).
> - Cotizaciones → órdenes → facturas con auditoría completa.
> - PDF on-demand con branding del tenant.
> - Onboarding en wizard, sin tocar código.
>
> Stack: Next.js 15, Postgres, Supabase, hospedado en Vercel. El admin lo manejas vos directo desde el panel.
>
> ¿Preguntas?"

---

## Backup / si algo falla

- **Login no funciona**: regenerar links con `pnpm tsx scripts/demo-login.ts`.
- **Página tarda en cargar**: Turbopack compila lazy. Espera 15s, no reabras.
- **Sin datos en Agroalves**: explicar que es tenant recién creado. Mostrar Idex (con seed completo) en su lugar.
- **PDF no abre**: probarlo con `curl http://localhost:3000/api/idex/cotizaciones/{id}/pdf -o test.pdf`.
- **Casbin permisos roto**: `pnpm db:seed` (re-seedea idex) + `pnpm tsx scripts/seed-agroalves.ts`.

---

## Credenciales de respaldo (sin script)

Magic link válido 1h, regenerar al toque desde Supabase admin:

```ts
// Una sola vez al inicio del día
import { createClient } from '@supabase/supabase-js';
const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
await s.auth.admin.generateLink({ type: 'magiclink', email: 'admin@orion.demo' });
```

O simplemente pegar `http://localhost:3000/api/dev-login?email={admin|lucas}@orion.demo` en el browser.

---

**Estado de la BD al momento de la demo:**

- Tenants: `idex` (data completa) + `agroalves` (estructura sin data).
- Platform admins: `admin@orion.demo`, `lucas@orion.demo`.
- 18 productos con fotos en Idex, 11 clientes, 9 cotizaciones de ejemplo.
- Casbin sembrado para ambos tenants.
- Tema: naranja `#ea580c` + negro + blanco.
