#!/usr/bin/env bash
# Reset completo de la DB local + seed
# Uso: ./scripts/db-reset-local.sh

set -e
echo "▶ Reset Supabase local..."
supabase db reset

echo "▶ Regenerando tipos TypeScript..."
supabase gen types typescript --local > src/lib/database.types.ts

echo "▶ Aplicando seed de desarrollo..."
if [ -f supabase/seed.sql ]; then
  supabase db query "$(cat supabase/seed.sql)"
fi

echo "✅ DB local lista en localhost:54321"
echo "   Studio: http://localhost:54323"
