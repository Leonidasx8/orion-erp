#!/usr/bin/env bash
# Aplica migrations a Supabase staging.
# Requiere SUPABASE_PROJECT_ID_STAGING y SUPABASE_ACCESS_TOKEN en .env

set -e
source .env.local

echo "▶ Linkeando proyecto staging..."
supabase link --project-ref "$SUPABASE_PROJECT_ID_STAGING"

echo "▶ Generando diff de migrations..."
supabase db diff --use-migra > /tmp/diff.sql
if [ -s /tmp/diff.sql ]; then
  echo "⚠ Hay diffs entre local y staging. Revisá:"
  cat /tmp/diff.sql
  read -p "¿Aplicar? (y/n): " CONFIRM
  if [ "$CONFIRM" != "y" ]; then
    exit 1
  fi
fi

echo "▶ Aplicando migrations..."
supabase db push

echo "✅ Staging actualizado"
