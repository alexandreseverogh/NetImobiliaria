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
    // FASE 1 (Google Ads) A6 — agente de negativação (só age em tenants com campanhas Google)
    const { runNegationAgent } = await import('@/lib/marketing/services/googleNegationService');
    // docs/PLANO_TIKTOK.md T4 — motor de realocação cross-rede (não depende de rede específica,
    // já opera sobre Meta×Google hoje)
    const { runReallocationAgent } = await import('@/lib/marketing/services/reallocationEngine');
    const { notifyDigest } = await import('@/lib/marketing/services/agentNotificador');

    await syncMetrics();
    const tenants = await getActiveTenants();
    await Promise.allSettled(tenants.map((tid: string) => runDecisor(tid)));
    await Promise.allSettled(tenants.map((tid: string) => runNegationAgent(tid)));
    // Mensagem própria (não mesclada com o digest de runDecisor, que já notifica sozinho) —
    // evita um refactor maior em runDecisor só pra combinar os dois em 1 mensagem.
    await Promise.allSettled(tenants.map(async (tid: string) => {
      const { digestItems } = await runReallocationAgent(tid);
      if (digestItems.length > 0) await notifyDigest(tid, digestItems).catch(() => {});
    }));

    return NextResponse.json({ ok: true, tenants: tenants.length });
  } catch (error: any) {
    console.error('POST /cron/campanhas/sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
