# Runbook — Operaciones del Sistema Orión

> Cómo desplegar, monitorear, recuperar de fallos y operar el sistema en producción.

## Despliegue normal (continuous)

### Staging

```
git push origin develop
```

Trigger automático en GitHub Actions:

1. CI: lint + typecheck + tests
2. Deploy a Vercel staging
3. Migrations a Supabase staging
4. Smoke tests E2E
5. Notificación a #orion-deploys (Slack si configurado)

### Producción

```
git push origin main
```

Requiere:

- PR review aprobado
- CI green en staging
- Aprobación manual en GitHub Environments
- Backup automático Supabase prod previo

## Despliegue manual de emergencia

```bash
# Si CI/CD está roto y necesitamos producción YA
cd ~/dev/orion-erp
git checkout main
pnpm install
pnpm build
vercel --prod --token=$VERCEL_TOKEN

# Migrations manuales
supabase link --project-ref <PROD_PROJECT_REF>
supabase db push
```

## Backups

### Automáticos

- Supabase Pro: PITR (Point-In-Time Recovery) por 7 días
- GitHub Action diaria a las 03:00 UTC: `pg_dump` → upload a Google Drive Dignita
- Snapshots de Storage: backup semanal de PDFs/XMLs

### Restore de backup

```bash
# 1. Crear nuevo proyecto Supabase
# 2. Aplicar el dump
psql -h db.NEW_PROJECT.supabase.co -U postgres < backup.sql
# 3. Cambiar variables de entorno en Vercel
# 4. Verificar
```

## Monitoreo

| Métrica        | Herramienta           | Umbral alerta   |
| -------------- | --------------------- | --------------- |
| Errores 5xx    | Sentry                | > 10/hora       |
| Errores SUNAT  | Sentry tag=sunat      | > 5/día         |
| LCP            | Vercel Speed Insights | p75 > 2.5s      |
| DB connections | Supabase dashboard    | > 80% del pool  |
| Uptime         | UptimeRobot           | < 99.5% mensual |
| CDR pendientes | Query interna         | > 100           |

## Incidentes comunes

### Factura no llega a SUNAT

1. Ver tabla `sunat_outbox` para ver intentos
2. Ver Sentry para el error específico
3. Si NUBEFACT está caído: la cola reintentará automáticamente cuando vuelva
4. Si el payload está mal: corregir y reenviar manualmente

### Stock se descuadra

Probable trigger de kardex que falló. Pasos:

1. Identificar el rango temporal del problema
2. Query: `SELECT * FROM kardex_movimientos WHERE producto_id=X ORDER BY fecha`
3. Recalcular `saldo_post` con función `recalcular_saldo_producto(producto_id)`
4. Crear movimiento de ajuste manual con `tipo='ajuste'` y observación

### Usuario perdió acceso

1. Verificar `tenant_members` que esté activo
2. Verificar `roles` y `rol_permisos` que tenga al menos el rol Comercial
3. Si problema es de Casbin: `SELECT * FROM casbin_rule WHERE v0 = '<user_id>'`
4. Recrear policies con seeder

## Operaciones programadas

### Diarias (pg_cron)

- 00:30 UTC: marcar facturas vencidas
- 00:45 UTC: marcar cotizaciones vencidas
- 03:00 UTC: backup full a Google Drive
- 04:00 UTC: refresh vista materializada `cuentas_por_cobrar`

### Mensuales

- Día 1, 06:00: snapshot de `tenant_usage_metrics` para facturación Dignita
- Día 5: enviar reporte de uso a cada cliente

### Anuales

- Renovar dominio
- Renovar plan Supabase Pro
- Auditar y purgar audit logs > 5 años

## Contactos de emergencia

- Leonidas (tech): leonidas@dignita.tech / WhatsApp
- Lucas (cliente Idex): contacto principal designado
- NUBEFACT soporte: soporte@nubefact.com
- Supabase: support@supabase.io
