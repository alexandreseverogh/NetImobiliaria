import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { resolveSegment } from '@/lib/intelligence/segmentResolver';
import { resolveBenchmark } from '@/lib/intelligence/benchmarkResolver';

export const dynamic = 'force-dynamic';

type Status = 'ok' | 'atencao' | 'critico' | 'info' | 'sem_dado';

interface Explanation {
  indicator: string;   // nome do indicador
  status: Status;
  value: string;       // valor observado
  meaning: string;     // o que o indicador mede
  comparison: string;  // comparação com benchmark ou com concorrentes
  action: string | null; // o que fazer
}

const RANKING_EXPLAIN: Record<string, { indicator: string; meaning: string; action: string }> = {
  quality: {
    indicator: 'Qualidade (Meta)',
    meaning: 'A Meta avalia a qualidade percebida do anúncio: quantas pessoas ocultaram, denunciaram ou reclamaram dele, comparado aos outros anúncios que disputam o mesmo público.',
    action: 'Revise o excesso de texto na imagem, a clareza da promessa e se o anúncio entrega o que o título diz. Anúncios com sinais negativos de quem viu tendem a perder entrega.',
  },
  engagement: {
    indicator: 'Engajamento (Meta)',
    meaning: 'Compara a taxa esperada de interação (reações, comentários, compartilhamentos e cliques no anúncio) com a dos concorrentes do mesmo público.',
    action: 'Teste uma nova abertura: uma pergunta ou um dado concreto nos primeiros segundos. Imagem genérica e texto longo costumam reduzir a interação.',
  },
  conversion: {
    indicator: 'Conversão (Meta)',
    meaning: 'Compara a chance de quem vê o anúncio virar conversa ou lead com a dos concorrentes que buscam o mesmo resultado.',
    action: 'Revise a promessa do anúncio e a primeira mensagem da conversa. Clique alto com pouca conversa geralmente indica que o anúncio promete mais do que o atendimento entrega.',
  },
};

function rankingStatus(v: string | null): { status: Status; value: string; comparison: string } {
  if (!v || v === 'UNKNOWN') {
    return { status: 'sem_dado', value: 'Sem dados', comparison: 'A Meta ainda não tem volume de entrega suficiente para comparar este anúncio com os concorrentes.' };
  }
  if (v.startsWith('BELOW_AVERAGE')) {
    const sev = v === 'BELOW_AVERAGE_10' ? 'entre os 10% piores' : v === 'BELOW_AVERAGE_20' ? 'entre os 20% piores' : v === 'BELOW_AVERAGE_35' ? 'entre os 35% piores' : 'abaixo da média';
    return { status: 'critico', value: 'Abaixo da média', comparison: `Este anúncio está ${sev} dos concorrentes do mesmo público.` };
  }
  if (v === 'ABOVE_AVERAGE') {
    return { status: 'ok', value: 'Acima da média', comparison: 'Este anúncio está acima da média dos concorrentes do mesmo público.' };
  }
  return { status: 'info', value: 'Na média', comparison: 'Este anúncio está na média dos concorrentes do mesmo público.' };
}

/**
 * GET /api/admin/campanhas/creatives/performance?period=30&clientId=own|<uuid>|segment
 * Desempenho e feedback da Meta por ANÚNCIO, com explicação de cada indicador,
 * comparação com os limites do segmento e a ação sugerida. Nunca usa números fixos.
 */
export async function GET(request: NextRequest) {
  try {
    const denied = await requireApiPermission(request, 'dashboard-campanhas', 'READ');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const tenantId = payload.tenantId;

    const { searchParams } = new URL(request.url);
    const periodDays = Math.min(Math.max(parseInt(searchParams.get('period') || '30', 10) || 30, 1), 365);
    const rawClient = searchParams.get('clientId');
    // 'own' = Minha Empresa (campanhas sem cliente); uuid = um cliente; 'segment'/vazio = todos.
    const clientId = rawClient && rawClient !== 'own' && rawClient !== 'segment' ? rawClient : null;
    const ownOnly = rawClient === 'own';

    const campaignWhere: any = { tenantId };
    if (ownOnly) campaignWhere.clientId = null;
    else if (clientId) campaignWhere.clientId = clientId;

    const ads = await prisma.ad.findMany({
      where: { metaAdId: { not: null }, adSet: { campaign: campaignWhere } },
      select: {
        id: true, name: true, status: true, creativeType: true, headline: true, body: true, images: true, thumbnails: true,
        adSet: { select: { campaign: { select: { id: true, name: true } } } },
      },
    });

    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    since.setUTCHours(0, 0, 0, 0);
    const rows = ads.length
      ? await prisma.adInsight.findMany({
          where: { adId: { in: ads.map(a => a.id) }, date: { gte: since } },
          orderBy: { date: 'asc' },
        })
      : [];

    const byAd = new Map<string, typeof rows>();
    for (const r of rows) {
      const list = byAd.get(r.adId) ?? [];
      list.push(r);
      byAd.set(r.adId, list);
    }

    const seg = await resolveSegment(tenantId, clientId);
    const segId = seg?.id ?? null;
    const ctrMin = await resolveBenchmark('ctr_min', tenantId, segId, clientId, 'meta');
    const frequencyMax = await resolveBenchmark('frequency_max', tenantId, segId, clientId, 'meta');
    const cplIdeal = await resolveBenchmark('cpl_ideal', tenantId, segId, clientId, 'meta');
    const cplCritical = await resolveBenchmark('cpl_critical', tenantId, segId, clientId, 'meta');
    const hookRateMin = await resolveBenchmark('hook_rate_min', tenantId, segId, clientId, 'meta');

    const out = ads.map(ad => {
      const days = byAd.get(ad.id) ?? [];
      const impressions = days.reduce((s, d) => s + d.impressions, 0);
      const clicks = days.reduce((s, d) => s + d.clicks, 0);
      const spend = days.reduce((s, d) => s + d.spend, 0);
      const conversations = days.reduce((s, d) => s + d.messagingConversations, 0);
      const freqDays = days.filter(d => d.frequency > 0);
      const frequency = freqDays.length ? freqDays.reduce((s, d) => s + d.frequency, 0) / freqDays.length : 0;
      const latest = [...days].reverse().find(d => d.qualityRanking) ?? null;
      const views3s = days.reduce((s, d) => s + d.videoViews3s, 0);
      const views100 = days.reduce((s, d) => s + d.videoViewsP100, 0);
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : null;
      const costPerConversation = conversations > 0 ? spend / conversations : null;
      const hookRate = impressions > 0 && views3s > 0 ? (views3s / impressions) * 100 : null;
      const isCarousel = ad.creativeType === 'CAROUSEL';
      const isVideo = ad.creativeType === 'VIDEO';

      const explanations: Explanation[] = [];

      if (days.length === 0) {
        explanations.push({
          indicator: 'Entrega no período', status: 'sem_dado', value: 'Sem métricas',
          meaning: 'Não há registro de entrega deste anúncio no período selecionado.',
          comparison: 'Nenhuma comparação possível sem dados.',
          action: 'Confirme se o anúncio esteve ativo neste período e rode uma sincronização.',
        });
      }

      if (ctr === null) {
        explanations.push({ indicator: 'CTR (taxa de clique)', status: 'sem_dado', value: 'Sem dados', meaning: 'Percentual de pessoas que, ao verem o anúncio, clicaram nele.', comparison: 'Sem impressões no período.', action: null });
      } else {
        const below = ctr < ctrMin;
        explanations.push({
          indicator: 'CTR (taxa de clique)',
          status: below ? 'critico' : 'ok',
          value: `${ctr.toFixed(2)}%`,
          meaning: 'Percentual de pessoas que, ao verem o anúncio, clicaram nele. Mostra se a imagem e o início do texto param o scroll.',
          comparison: below
            ? `Abaixo do mínimo do segmento (${ctrMin}%).`
            : `Acima do mínimo do segmento (${ctrMin}%).`,
          action: below
            ? 'Troque a imagem de capa ou a primeira frase do texto. É o que decide se a pessoa para e clica.'
            : null,
        });
      }

      if (frequency === 0) {
        explanations.push({ indicator: 'Frequência', status: 'sem_dado', value: 'Sem dados', meaning: 'Quantas vezes, em média, cada pessoa viu este anúncio no período.', comparison: 'Sem registro de frequência no período.', action: null });
      } else {
        const high = frequency > frequencyMax;
        explanations.push({
          indicator: 'Frequência',
          status: high ? 'atencao' : 'ok',
          value: frequency.toFixed(2),
          meaning: 'Quantas vezes, em média, cada pessoa viu este anúncio no período.',
          comparison: high
            ? `Acima do limite do segmento (${frequencyMax}). Acima disso o público começa a se cansar e o custo tende a subir.`
            : `Dentro do limite do segmento (${frequencyMax}).`,
          action: high
            ? 'Não aumente o orçamento deste anúncio. Amplie o público ou troque o criativo.'
            : null,
        });
      }

      if (costPerConversation === null) {
        explanations.push({ indicator: 'Custo por conversa no WhatsApp', status: 'sem_dado', value: 'Sem dados', meaning: 'Quanto custou, em média, cada conversa iniciada no WhatsApp a partir deste anúncio.', comparison: 'Nenhuma conversa iniciada no período.', action: null });
      } else {
        const status: Status = costPerConversation > cplCritical ? 'critico' : costPerConversation > cplIdeal ? 'atencao' : 'ok';
        explanations.push({
          indicator: 'Custo por conversa no WhatsApp',
          status,
          value: `R$ ${costPerConversation.toFixed(2)}`,
          meaning: 'Quanto custou, em média, cada conversa iniciada no WhatsApp a partir deste anúncio.',
          comparison: `Ideal do segmento: até R$ ${cplIdeal.toFixed(2)}. Crítico acima de R$ ${cplCritical.toFixed(2)}.`,
          action: status === 'ok' ? null
            : 'Se o clique está razoável mas a conversa é cara, revise a mensagem inicial e a promessa do anúncio.',
        });
      }

      if (hookRate !== null) {
        const below = hookRate < hookRateMin;
        explanations.push({
          indicator: 'Atenção nos 3 primeiros segundos (vídeo)',
          status: below ? 'atencao' : 'ok',
          value: `${hookRate.toFixed(2)}%`,
          meaning: 'Percentual de impressões em que o vídeo foi assistido por pelo menos 3 segundos. Mostra se a abertura prende a pessoa.',
          comparison: below
            ? `Abaixo do mínimo do segmento (${hookRateMin}%).`
            : `Acima do mínimo do segmento (${hookRateMin}%).`,
          action: below
            ? 'Abra o vídeo com o imóvel ou a oferta logo no primeiro segundo, sem vinheta nem logotipo.'
            : null,
        });
      }

      if (isVideo && views3s > 0) {
        const retention = (views100 / views3s) * 100;
        explanations.push({
          indicator: 'Retenção até o fim (vídeo)',
          status: 'info',
          value: `${retention.toFixed(1)}% dos que assistiram 3s chegaram ao fim`,
          meaning: 'Mostra quantas pessoas que começaram o vídeo continuaram até o final.',
          comparison: 'Compare com a atenção dos 3 primeiros segundos: se a abertura é boa e o fim é fraco, o problema está no meio ou no final.',
          action: retention < 20
            ? 'A maioria desiste antes do fim. Encurte o vídeo e coloque a chamada para conversa mais cedo.'
            : null,
        });
      }

      if (isCarousel) {
        explanations.push({
          indicator: 'Carrossel',
          status: 'info',
          value: 'Carrossel',
          meaning: 'Este anúncio é um carrossel. A Meta fornece os rankings e as métricas do anúncio inteiro, não de cada cartão separadamente.',
          comparison: 'Os rankings abaixo valem para o carrossel como um todo.',
          action: 'Para saber qual cartão funciona melhor, crie um anúncio por cartão e compare.',
        });
      }

      const rankingKeys: Array<['quality' | 'engagement' | 'conversion', string | null]> = [
        ['quality', latest?.qualityRanking ?? null],
        ['engagement', latest?.engagementRateRanking ?? null],
        ['conversion', latest?.conversionRateRanking ?? null],
      ];
      for (const [key, value] of rankingKeys) {
        const info = RANKING_EXPLAIN[key];
        const r = rankingStatus(value);
        explanations.push({
          indicator: info.indicator,
          status: r.status,
          value: r.value,
          meaning: info.meaning,
          comparison: r.comparison,
          action: r.status === 'critico' ? info.action : null,
        });
      }

      // Resumo curto (mantém o contrato anterior: lista de alertas).
      const issues = explanations.filter(e => e.status === 'critico' || e.status === 'atencao').map(e => `${e.indicator}: ${e.value}`);

      return {
        id: ad.id,
        name: ad.name,
        status: ad.status,
        creativeType: ad.creativeType,
        thumbnailUrl: ad.thumbnails?.[0] ?? ad.images?.[0] ?? null,
        images: ad.images ?? [],
        imageCount: ad.images?.length ?? 0,
        headline: ad.headline,
        body: ad.body,
        campaignId: ad.adSet.campaign.id,
        campaignName: ad.adSet.campaign.name,
        spend,
        impressions,
        clicks,
        ctr,
        frequency,
        conversations,
        costPerConversation,
        qualityRanking: latest?.qualityRanking ?? null,
        engagementRateRanking: latest?.engagementRateRanking ?? null,
        conversionRateRanking: latest?.conversionRateRanking ?? null,
        hookRate,
        video: isVideo && views3s > 0
          ? { views3s, retention100: views3s > 0 ? (views100 / views3s) * 100 : null }
          : null,
        hasData: days.length > 0,
        explanations,
        issues,
      };
    }).sort((a, b) => b.spend - a.spend);

    return NextResponse.json({
      periodDays,
      benchmarks: { ctrMin, frequencyMax, cplIdeal, cplCritical, hookRateMin },
      total: out.length,
      withIssues: out.filter(a => a.issues.length > 0).length,
      ads: out,
    });
  } catch (err: any) {
    console.error('GET /creatives/performance error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
