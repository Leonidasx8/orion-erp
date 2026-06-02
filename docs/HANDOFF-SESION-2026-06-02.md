# Handoff — Sesión 2026-06-02 (despliegue producción + B.10/B.11 + bloqueador DB)

> Continúa en sesión nueva con **Sonnet** por default. Lee este archivo PRIMERO.
> El bloqueador #1 (conexión DB) es lo único que impide que la demo del **miércoles 4-jun** corra en `orion-rp.com`.

---

## 🟢 LO QUE SE LOGRÓ ESTA SESIÓN

### Infraestructura de producción (toda con cuentas oficiales de Orion)

- **GitHub:** repo privado `orionrp-hub/orion-erp`, default branch `main` (fast-forward desde el tronco de trabajo). 90+ commits.
- **Supabase cloud:** proyecto `aycraotcdbunybfjzlmq` (`sa-east-1`), 43 migraciones aplicadas, seed cargado (tenant idex con 18 productos, 10 clientes, 9 cotizaciones, 7 OC, 18 kardex).
- **Vercel:** proyecto `orion-erp` en team `orion-rp-s-projects`, dominio **orion-rp.com** + www con SSL. Build OK (pnpm, PG17, Next 15 params Promise fix).
- **Resend:** dominio `orion-rp.com` verificado. 6 skills de Resend instalados.
- 14 env vars en Vercel (Supabase, Nubefact Idex reales, Resend, CRON_SECRET). Faltan vacías: `APIS_NET_PE_TOKEN`, Nubefact Agroalves.

### Módulos nuevos (subagent-driven, spec+quality review por tarea)

- **B.10 Crédito + CxC** — branch `feat/B-10-credito`. Tablas `creditos_cliente`/`pagos`, matview `cuentas_por_cobrar`, vista `aging_cxc`, server actions (otorgar/bloquear/registrarPago), cron facturas vencidas, UI completa (dashboard, aging chart, detalle cliente, form pago). Migraciones 0037–0041 (+ b-suffix fixes aplicados vía API).
- **B.11 Reportes** — branch `feat/B-11-reportes`. 4 matviews (dashboard_metricas, pipeline, top_clientes, top_productos), componentes chart (KpiCard/BarChart/BarList), dashboard homepage con datos reales, reporte ventas con filtros, drill-down, export Excel (ExcelJS + Supabase Storage). Migraciones 0042–0043.
- Ambos mergeados a `main`. "Reportes" habilitado en sidebar.

### Usuarios y roles (en producción)

Contrato define 3 roles. Configurados en tenant idex:

- `superadmin` (57 permisos) — Lucas
- `comercial` (14 permisos) — se le agregaron `cotizaciones.enviar` + `cotizaciones.duplicar` (faltaban vs contrato)
- `facturacion` (19 permisos) — sin acento en `tenant_members.rol` por constraint `rol_values`

Credenciales (todas en memoria `project_prod_db_blocker`):
| Rol | Email | Password |
|---|---|---|
| superadmin | lescriva@grupoidex.com.pe | Idex2026! |
| comercial | vendedor@idex.demo | Idex2026! |
| facturacion | contador@idex.demo | Idex2026! |
| demo | lucas@orion.demo | orion-demo-2026 |

### Portal Dignita (app.dignita.tech, Supabase winfbsfjfemszxtphzcd, schema portal)

- Cliente "Grupo Idex SAC", proyecto "Sistema Orión ERP" (progreso 87%), 10 hitos, 2 facturas (cuota 1 parcial $690.01, cuota 2 pendiente $938.40 con IGV acumulado). Ya estaba registrado; solo se actualizó el progreso.

---

## 🔴 BLOQUEADOR #1 — Conexión DB Vercel ↔ Supabase (RESOLVER PRIMERO)

**Síntoma:** "Application error: a server-side exception" en toda página que usa Drizzle (`db`). El **login YA funciona** (callback parchado a supabase-js REST → llega a `/seleccionar-empresa`), pero `/seleccionar-empresa` y todo lo demás usa Drizzle y revienta.

**Causa raíz:** free tier `sa-east-1`:

- `db.{ref}.supabase.co` resuelve solo IPv6; Vercel es IPv4 → `getaddrinfo ENOTFOUND`.
- Pooler `aws-0-sa-east-1.pooler.supabase.com` → TCP conecta pero responde `(ENOTFOUND) tenant/user postgres.aycraotcdbunybfjzlmq not found`.

**Diagnóstico disponible:** endpoint temporal `GET /api/test-db` (público vía middleware) devuelve `{ok, error, cause, code}`. **BORRARLO antes del cierre** (`src/app/api/test-db/route.ts` + quitar de PUBLIC_PATHS en `src/middleware.ts`).

### Plan de resolución (en orden)

1. **Sacar la connection string EXACTA del dashboard Supabase** → proyecto `aycraotcdbunybfjzlmq` → botón **Connect** → pestaña "Transaction pooler" (puerto 6543) o "Session pooler". La URL armada a mano puede tener región equivocada (`aws-0` vs `aws-1`). Poner esa URL como `DATABASE_URL` en Vercel prod + redeploy. **`prepare: false` ya está forzado** en `src/lib/db/client.ts` (requerido para pooler). Es lo más probable que lo resuelva.
2. Si el pooler genuinamente no está provisionado: esperar (suele tardar <24h desde la creación del proyecto — se creó 1-jun) y reintentar la directa con IPv4 cuando propague.
3. Fallback Neon (gratis): ⚠️ complejo — migraciones tienen `REFERENCES auth.users(id)` y usan `pg_cron`/`pgmq` que Neon no soporta. Auth queda en Supabase, solo Drizzle apunta a Neon. Requiere stubear auth.users + quitar crons. NO hacer salvo que 1-2 fallen.

Cliente NO paga el IPv4 add-on de Supabase.

---

## 🟡 PENDIENTES (después del bloqueador)

1. **25 archivos modificados sin commit** en `main` (branding landing, metadata Orión, ajustes UI de list components). Revisar `git diff`, commitear con scope válido (`feat(ui)`).
2. **Probar los 3 roles end-to-end** — estaba bloqueado por la DB. Verificar con Playwright que comercial NO ve costos/facturas, facturacion sí, superadmin todo.
3. **Borrar `/api/test-db`** (endpoint diagnóstico temporal).
4. **B.8 Guías de remisión UI** — infra DB lista; bloqueado por credenciales Nubefact sandbox.
5. **Prueba emisión real Nubefact** — `scripts/test-nubefact.ts` listo, creds Idex reales en env. Requiere consentimiento de Lucas (emite doc REAL en SUNAT, S/1.18). Cambiar a Opus para esto.
6. **Demo 4-jun:** guion en respuesta de la sesión; recorrido 35 min superadmin → catálogo CELSA → cotización → OC/kardex → facturas → crédito/reportes. Tocar tema pagos (cuota 2 = $938.40). Crear seed con datos reales de Idex si el demo seed no alcanza.

---

## Notas técnicas de la sesión

- `DATABASE_URL` password se reseteó a `3iKJIrPJt7aN5iCYPMXu5cnMOTBVQEvh` (sin caracteres especiales; el `*` original rompía el parser de URL).
- Commitlint scopes válidos: [auth, tenants, clientes, productos, cotizaciones, ordenes, kardex, guias, facturas, credito, reportes, admin, sunat, pdf, db, ui, infra, deps, adr, config, seed]. "build" NO es válido.
- Husky lint-staged corre eslint+prettier en cada commit; reformatea archivos vecinos.
- MCP Supabase: reiniciar Claude Code para que tome el token nuevo de Orion (en sesión sigue con DignitaTech).
- Login callback (`src/app/(auth)/login/callback/route.ts`) ya NO usa Drizzle — usa `createServerAdminClient` (supabase-js). Patrón a replicar si se decide migrar más rutas a REST.
