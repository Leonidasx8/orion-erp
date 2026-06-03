import { NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createSSRClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
