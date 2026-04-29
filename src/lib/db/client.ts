import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// En tests y scripts se usa un cliente con max 1 conexión para evitar leaks.
// En la app Next.js se reutiliza la instancia vía module cache.
const sql = postgres(connectionString, {
  max: process.env.NODE_ENV === 'test' ? 1 : 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(sql, { schema });
export type DB = typeof db;
