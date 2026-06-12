import { eq, and, gt, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { validacionesDocumento } from '@/lib/db/schema';

const CACHE_TTL_DAYS = 30;
const API_BASE = 'https://api.decolecta.com/v1';

export interface DatosSunatRUC {
  tipoDocumento: 'RUC';
  numeroDocumento: string;
  razonSocial: string;
  condicion: string;
  estado: string;
  ubigeo: string | null;
  direccion: string | null;
  departamento: string | null;
  provincia: string | null;
  distrito: string | null;
}

export interface DatosSunatDNI {
  tipoDocumento: 'DNI';
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
}

export type DatosSunat = DatosSunatRUC | DatosSunatDNI;

async function fromCache(tipo: string, numero: string): Promise<DatosSunat | null> {
  const cutoff = new Date(Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ resultado: validacionesDocumento.resultado })
    .from(validacionesDocumento)
    .where(
      and(
        eq(validacionesDocumento.tipoDocumento, tipo),
        eq(validacionesDocumento.numero, numero),
        gt(validacionesDocumento.consultadoAt, cutoff)
      )
    );
  return rows.length > 0 ? (rows[0].resultado as DatosSunat) : null;
}

async function upsertCache(tipo: string, numero: string, resultado: DatosSunat) {
  await db
    .insert(validacionesDocumento)
    .values({ tipoDocumento: tipo, numero, resultado })
    .onConflictDoUpdate({
      target: [validacionesDocumento.tipoDocumento, validacionesDocumento.numero],
      set: { resultado, consultadoAt: sql`now()` },
    });
}

async function fetchFromApi(tipo: 'RUC' | 'DNI', numero: string): Promise<DatosSunat> {
  const token = process.env.DECOLECTA_TOKEN;
  if (!token) throw new Error('DECOLECTA_TOKEN no configurado');

  const endpoint =
    tipo === 'RUC'
      ? `${API_BASE}/sunat/ruc?numero=${numero}`
      : `${API_BASE}/reniec/dni?numero=${numero}`;

  const res = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`decolecta ${tipo} ${numero}: HTTP ${res.status}`);

  const data = await res.json();

  if (tipo === 'RUC') {
    return {
      tipoDocumento: 'RUC',
      numeroDocumento: numero,
      razonSocial: data.razon_social ?? '',
      condicion: data.condicion ?? '',
      estado: data.estado ?? '',
      ubigeo: data.ubigeo ?? null,
      direccion: data.direccion?.trim() || null,
      departamento: data.departamento ?? null,
      provincia: data.provincia ?? null,
      distrito: data.distrito ?? null,
    };
  }

  return {
    tipoDocumento: 'DNI',
    numeroDocumento: numero,
    nombres: data.first_name ?? '',
    apellidoPaterno: data.first_last_name ?? '',
    apellidoMaterno: data.second_last_name ?? '',
  };
}

export async function consultarDocumento(
  tipo: 'RUC' | 'DNI',
  numero: string
): Promise<DatosSunat | null> {
  const cached = await fromCache(tipo, numero);
  if (cached) return cached;

  try {
    const resultado = await fetchFromApi(tipo, numero);
    await upsertCache(tipo, numero, resultado);
    return resultado;
  } catch {
    return null;
  }
}
