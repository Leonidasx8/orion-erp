'use server';

import { createSSRClient } from '@/lib/supabase/server';

export async function enrollMfa() {
  const supabase = await createSSRClient();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
  if (error) return { success: false as const, error: error.message };
  return {
    success: true as const,
    data: {
      factorId: data.id,
      qr: data.totp.qr_code,
      secret: data.totp.secret,
    },
  };
}

export async function verifyMfaEnroll(factorId: string, code: string) {
  const supabase = await createSSRClient();
  const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
    factorId,
  });
  if (challengeErr || !challenge)
    return { success: false as const, error: challengeErr?.message ?? 'challenge-failed' };

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: null };
}

export async function verifyMfaLogin(code: string) {
  const supabase = await createSSRClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp?.[0];
  if (!factor) return { success: false as const, error: 'no-factor' };

  const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
    factorId: factor.id,
  });
  if (challengeErr || !challenge)
    return { success: false as const, error: challengeErr?.message ?? 'challenge-failed' };

  const { error } = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.id,
    code,
  });
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: null };
}
