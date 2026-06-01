import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { invokeForContext } from '@/lib/intelligence/llmInvoker';

export const dynamic = 'force-dynamic';

// POST /api/admin/campanhas/dashboard/funnel/diagnosis
// Body: { stages, conversionRates, totals, period, clientId? }
export async function POST(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { stages, conversionRates, totals, period, clientId } = body;

    if (!stages || !conversionRates) {
      return NextResponse.json({ error: 'Dados do funil obrigatórios' }, { status: 400 });
    }

    // ── Montar variáveis para o prompt ──────────────────────────────────────
    const fmt = (v: number, prefix = 'R$') =>
      v > 0 ? `${prefix}${v.toFixed(2)}` : '—';

    const funnelDataLines = (stages as any[]).map((s: any) =>
      `${s.icon} ${s.label}: ${s.campaigns_count} campanha(s) | Investido: ${fmt(s.spend)} | Impressões: ${s.impressions.toLocaleString('pt-BR')} | Cliques: ${s.clicks.toLocaleString('pt-BR')} | Leads: ${s.leads}`
    ).join('\n');

    const convLines = [
      conversionRates.tof_ctr > 0  && `• CTR Topo (impressões→cliques): ${conversionRates.tof_ctr}%`,
      conversionRates.mof_ltr > 0  && `• Lead Rate Meio (cliques→leads): ${conversionRates.mof_ltr}%`,
      conversionRates.bof_cvr > 0  && `• Conv. Rate Fundo (leads→conversões): ${conversionRates.bof_cvr}%`,
      totals.cpl > 0               && `• CPL geral: ${fmt(totals.cpl)}`,
    ].filter(Boolean).join('\n') || 'Sem dados suficientes para calcular taxas';

    const startDate = period?.startDate ? new Date(period.startDate).toLocaleDateString('pt-BR') : '—';
    const endDate   = period?.endDate   ? new Date(period.endDate).toLocaleDateString('pt-BR')   : '—';

    const TIMEOUT_MS = 28_000; // 28 s — evita Connection Terminated do pool pg

    const diagnosis = await Promise.race([
      invokeForContext({
        templateKey: 'funnel_diagnosis',
        tenantId:    payload.tenantId,
        clientId:    clientId || null,
        variables: {
          segment:          'Imóveis', // fallback; resolveSegment já está no invokeForContext
          period:           `${startDate} a ${endDate}`,
          funnel_data:      funnelDataLines,
          conversion_rates: convLines,
        },
        maxTokens: 400,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Tempo limite excedido (28s). Tente novamente.')),
          TIMEOUT_MS
        )
      ),
    ]);

    return NextResponse.json({
      diagnosis,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('POST /funnel/diagnosis error:', error);
    const isTimeout = (error.message ?? '').includes('Tempo limite') ||
      (error.message ?? '').includes('Connection terminated');
    return NextResponse.json(
      { error: isTimeout ? 'Tempo limite excedido — tente novamente.' : (error.message || 'Erro ao gerar diagnóstico') },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
