import { NextResponse } from 'next/server';
import { and, eq, lt } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { cotizaciones } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hoy = new Date().toISOString().slice(0, 10);

  try {
    const resultado = await db
      .update(cotizaciones)
      .set({ estado: 'vencida', updatedAt: new Date() })
      .where(and(eq(cotizaciones.estado, 'enviada'), lt(cotizaciones.fechaVencimiento, hoy)))
      .returning({ id: cotizaciones.id });

    console.log(
      `[cron/cotizaciones-vencer] ${resultado.length} cotizaciones marcadas vencidas — ${hoy}`
    );

    return NextResponse.json({ ok: true, vencidas: resultado.length, fecha: hoy });
  } catch (err) {
    console.error('[cron/cotizaciones-vencer] Error al procesar vencimientos:', err);
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 });
  }
}
