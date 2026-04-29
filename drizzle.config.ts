import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema/index.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // No generamos migraciones con drizzle-kit — usamos supabase migrations directamente.
  // drizzle-kit se usa solo para introspección y type generation.
  verbose: true,
});
