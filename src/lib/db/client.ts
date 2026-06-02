import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// En tests y scripts se usa un cliente con max 1 conexión para evitar leaks.
// En la app Next.js se reutiliza la instancia vía module cache.
// Supabase transaction pooler (port 6543) no soporta prepared statements.
// `prepare: false` es requerido para compatibilidad con PgBouncer/Supabase pooler.
const isPooler =
  connectionString.includes('pooler.supabase.com') || connectionString.includes(':6543');

const sql = postgres(connectionString, {
  max: process.env.NODE_ENV === 'test' ? 1 : 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: !isPooler,
});

export const db = drizzle(sql, { schema });
export type DB = typeof db;
