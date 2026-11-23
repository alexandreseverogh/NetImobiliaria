import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/security/cronAuth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/campanhas/breakdowns
 * Coleta diária das quebras de desempenho (idade+gênero, região, horário) de todos os tenants.
 * Agendamento: todo dia às 07:45 (roda separado do sync, para não consumir o limite da Meta junto).
 * Protegido por CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get('x-cron-secret'))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    const { getActiveTenants } = await import('@/lib/marketing/services/agentMonitor');
    const { syncBreakdownsForTenant } = await import('@/lib/marketing/services/breakdownSyncService');

    const tenantIds = await getActiveTenants();
    const results = [];
    for (const tenantId of tenantIds) {
      try {
        results.push(await syncBreakdownsForTenant(tenantId, 30));
      } catch (err: any) {
        // Um tenant com erro não interrompe os demais.
        console.error(`[breakdowns] tenant=${tenantId}:`, err?.message || err);
        results.push({ tenantId, rowsSaved: 0, unavailable: [], skipped: `erro: ${err?.message || 'desconhecido'}` });
      }
    }

    const rowsSaved = results.reduce((s, r) => s + r.rowsSaved, 0);
    const elapsed = Date.now() - startedAt;
    console.log(`[breakdowns] tenants=${tenantIds.length} linhas=${rowsSaved} ${elapsed}ms`);

    return NextResponse.json({ ok: true, tenants: tenantIds.length, rowsSaved, elapsedMs: elapsed, results });
  } catch (error: any) {
    console.error('POST /cron/campanhas/breakdowns error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
