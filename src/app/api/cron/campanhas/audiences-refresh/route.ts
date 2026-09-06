import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/campanhas/audiences-refresh
 *
 * Tier 3 do plano "Loop do ICP" (2026-09-05) — automação da Lookalike/Custom Audience,
 * decidida com o usuário: manter a Custom Audience atualizada e criar a Lookalike a partir
 * dela podem ser 100% automáticos (nenhum dos dois muda campanha nem gasta dinheiro real).
 * A etapa que de fato altera uma campanha real (USE_LOOKALIKE_AUDIENCE, em aiInsights.ts)
 * NUNCA vive aqui — é sempre uma sugestão que passa por aprovação humana via PIN/WhatsApp
 * (mesmo mecanismo já usado por SCALE/REALLOCATE_BUDGET), disparada pelo ciclo do agente em
 * agentMonitor.ts, não por este cron.
 *
 * Ordem de execução, cada passo alimentando o próximo dentro da MESMA rodada:
 * 1. Atualiza status de audiências ainda em processamento — sem isso, uma Custom Audience
 *    recém-criada nunca "vira" READY sozinha, e a Lookalike (passo 4) nunca teria semente.
 * 2. Cria automaticamente 1 Custom Audience para todo escopo (tenant/cliente) com negócios
 *    fechados suficientes que ainda não tem nenhuma.
 * 3. Reenvia a lista de membros de toda Custom Audience já existente (mantém atualizada com
 *    negócios fechados novos desde a última rodada).
 * 4. Cria automaticamente 1 Lookalike para toda Custom Audience já pronta e madura o
 *    suficiente que ainda não tem uma.
 *
 * Mecanismo 1 da "Arquitetura de Cron Jobs" (CLAUDE.md) — chamado por
 * scripts/feed-cron-scheduler.js, não pelo ciclo interno do agentMonitor.ts: este trabalho é
 * independente do ciclo de sync/decisor/negativação/realocação/briefing (não depende de
 * Insight nem dispara nenhuma chamada às APIs de métricas), então entra como uma nova
 * varredura própria, seguindo a regra de decisão já documentada ali.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const {
      refreshAllProcessingStatuses,
      autoCreateCustomAudiencesForEligibleScopes,
      refreshAllExistingCustomAudiences,
      autoCreateLookalikesFromReadyCustoms,
    } = await import('@/lib/marketing/services/audienceService');

    const statusResult = await refreshAllProcessingStatuses();
    const createdResult = await autoCreateCustomAudiencesForEligibleScopes();
    const refreshedResult = await refreshAllExistingCustomAudiences();
    const lookalikeResult = await autoCreateLookalikesFromReadyCustoms();

    return NextResponse.json({
      ok: true,
      statusRefresh: statusResult,
      customAudiencesCreated: createdResult,
      customAudiencesRefreshed: refreshedResult,
      lookalikesCreated: lookalikeResult,
    });
  } catch (err: any) {
    console.error('[cron/audiences-refresh] erro:', err);
    return NextResponse.json({ error: err.message || 'Erro no cron de audiências' }, { status: 500 });
  }
}
