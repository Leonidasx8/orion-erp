#!/usr/bin/env bash
# Backup manual de producción.
# Uso: ./scripts/backup-prod.sh

set -e

if [ -z "$SUPABASE_PROJECT_ID_PROD" ] || [ -z "$SUPABASE_DB_PASSWORD_PROD" ]; then
  echo "❌ Variables SUPABASE_PROJECT_ID_PROD y SUPABASE_DB_PASSWORD_PROD requeridas"
  exit 1
fi

DATE=$(date +%Y%m%d-%H%M%S)
OUT="backups/orion-prod-${DATE}.sql"
mkdir -p backups

echo "▶ Linkeando proyecto producción..."
supabase link --project-ref "$SUPABASE_PROJECT_ID_PROD"

echo "▶ Dump de producción → $OUT ..."
supabase db dump -f "$OUT"

echo "✅ Backup en $OUT"
echo "   Tamaño: $(du -h "$OUT" | cut -f1)"
echo ""
echo "⚠ Subilo manualmente a Google Drive Dignita o configurá rclone"
