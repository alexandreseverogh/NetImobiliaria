import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/campanhas/sync
 * Dispara sincronização de insights Meta + decisor para todos os tenants.
 * Protegido por CRON_SECRET para uso por schedulers externos.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { syncMetrics, getActiveTenants } = await import('@/lib/marketing/services/agentMonitor');
    const { runDecisor } = await import('@/lib/marketing/services/agentDecisor');

    await syncMetrics();
    const tenants = await getActiveTenants();
    await Promise.allSettled(tenants.map((tid: string) => runDecisor(tid)));

    return NextResponse.json({ ok: true, tenants: tenants.length });
  } catch (error: any) {
    console.error('POST /cron/campanhas/sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
