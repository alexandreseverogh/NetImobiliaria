import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { calculateWastedSpend } from '@/lib/marketing/services/wastedSpendService';
import { invokeForContext } from '@/lib/intelligence/llmInvoker';

export const dynamic = 'force-dynamic';

// POST /api/admin/campanhas/desperdicio/narrativa
// Body: { clientId?: string, days?: number }
export async function POST(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const clientId   = body.clientId  ?? null;
    const periodDays = Math.min(90, Math.max(7, Number(body.days ?? 30)));

    const report = await calculateWastedSpend(payload.tenantId, clientId, periodDays);

    const topCampaigns = Object.values(report.byCategory)
      .flatMap(c => c.campaigns)
      .sort((a, b) => b.wasted - a.wasted)
      .slice(0, 5)
      .map(c => `- ${c.name}: R$${c.wasted.toFixed(2)} — ${c.details}`)
      .join('\n') || 'Nenhuma campanha com desperdício crítico';

    const variables: Record<string, string> = {
      period_days:       String(periodDays),
      total_wasted:      report.totalWasted.toFixed(2),
      zero_leads_count:  String(report.byCategory.ZERO_LEADS_SPEND.campaigns.length),
      zero_leads_amount: report.byCategory.ZERO_LEADS_SPEND.amount.toFixed(2),
      high_cpl_count:    String(report.byCategory.HIGH_CPL_SPEND.campaigns.length),
      high_cpl_amount:   report.byCategory.HIGH_CPL_SPEND.amount.toFixed(2),
      fatigued_count:    String(report.byCategory.FATIGUED_CONTINUE.campaigns.length),
      fatigued_amount:   report.byCategory.FATIGUED_CONTINUE.amount.toFixed(2),
      learning_count:    String(report.byCategory.LEARNING_LIMITED.campaigns.length),
      learning_amount:   report.byCategory.LEARNING_LIMITED.amount.toFixed(2),
      top_campaigns:     topCampaigns,
      recovery_plan:     report.recoveryPlan.map(r => `• ${r}`).join('\n'),
    };

    const content = await invokeForContext({
      templateKey: 'wasted_spend_explanation',
      tenantId:    payload.tenantId,
      clientId,
      variables,
      maxTokens:   1200,
    });

    return NextResponse.json({ content, generatedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('POST /desperdicio/narrativa error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar narrativa' }, { status: 500 });
  }
}
