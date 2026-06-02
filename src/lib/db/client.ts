import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// prepare: false es requerido para Supabase pooler (PgBouncer).
// Lo forzamos siempre en producción — no afecta correctitud, solo rendimiento.
const sql = postgres(connectionString, {
  max: process.env.NODE_ENV === 'test' ? 1 : 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});

export const db = drizzle(sql, { schema });
export type DB = typeof db;
