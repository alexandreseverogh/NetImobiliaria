/**
 * POST /api/admin/campanhas/criativos/hook-suggestions
 *
 * Decide, no servidor (nunca confiando em CTR/CPL que o client mandasse), se o tenant/cliente
 * tem histórico maduro o bastante (min_leads_scale + min_days_running do segmento, mesmo
 * critério já usado no resto da plataforma pra "SCALE") pra algum hook real:
 *   - Caminho A (com histórico): reaproveita generateCreativeConcepts, já ancorado em CTR/CPL
 *     reais do próprio tenant.
 *   - Caminho B (sem histórico): generateVisualHookSuggestions, ancorado só na descrição real
 *     de cena de criativos já analisados — nunca inventa fato, nunca sugere Prova
 *     Social/Urgência-de-estoque (exigem dado externo que, por definição, não existe aqui).
 *
 * Body: { clientId?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import {
  getHookSuggestionContext,
  HOOK_LABELS,
} from '@/lib/marketing/services/hookSaturationService';
import {
  generateCreativeConcepts,
  generateVisualHookSuggestions,
} from '@/lib/marketing/services/creativeAnalysisService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const clientId: string | null = body?.clientId ?? null;

    const ctx = await getHookSuggestionContext(payload.tenantId, clientId);

    if (ctx.hasHistory && ctx.historyHook) {
      const concepts = await generateCreativeConcepts({
        segment: ctx.segmentName,
        style: 'Corporativo/Profissional',
        hook_type: ctx.historyHook.hookType,
        angle: 'other',
        emotional_tone: 'neutral',
        avg_ctr: (ctx.historyHook.avgCtr ?? 0).toString(),
        avg_cpl: (ctx.historyHook.avgCpl ?? 0).toString(),
        ads_count: '1',
        tenantId: payload.tenantId,
      });
      return NextResponse.json({
        path: 'history',
        basedOn: {
          hookType: ctx.historyHook.hookType,
          label: ctx.historyHook.label,
          leads: ctx.historyHook.leads,
          daysRunning: ctx.historyHook.daysRunning,
          avgCtr: ctx.historyHook.avgCtr,
          avgCpl: ctx.historyHook.avgCpl,
        },
        concepts,
      });
    }

    if (ctx.missingSafeHooks.length === 0) {
      return NextResponse.json({
        path: 'coldstart',
        basedOn: null,
        suggestions: [],
        message: 'Nenhum hook seguro (Curiosidade/Benefício/História/Problema) está ausente do portfólio.',
      });
    }
    if (ctx.scenes.length === 0) {
      return NextResponse.json({
        path: 'coldstart',
        basedOn: null,
        suggestions: [],
        message: 'Nenhum criativo com análise de imagem concluída pra ancorar sugestões.',
      });
    }

    const suggestions = await generateVisualHookSuggestions({
      segment: ctx.segmentName,
      missingHooks: ctx.missingSafeHooks,
      hookLabels: HOOK_LABELS,
      scenes: ctx.scenes,
    });

    return NextResponse.json({
      path: 'coldstart',
      basedOn: null,
      suggestions,
    });
  } catch (err: any) {
    console.error('[hook-suggestions] erro:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
