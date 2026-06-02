import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema';

export const runtime = 'nodejs';

export async function GET() {
  const url = (process.env.DATABASE_URL ?? '').replace(/:([^:@]+)@/, ':***@');
  try {
    const result = await db.select({ slug: tenants.slug }).from(tenants).limit(1);
    return NextResponse.json({ ok: true, url_redacted: url, result });
  } catch (err: unknown) {
    const e = err as Error;
    return NextResponse.json({ ok: false, url_redacted: url, error: e.message }, { status: 500 });
  }
}
