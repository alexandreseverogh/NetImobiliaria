/**
 * GET  /api/admin/campanhas/portfolio/cross-insights?period=30
 *   → Retorna insights cruzados persistidos (último gerado) ou gera inline sem LLM
 *
 * POST /api/admin/campanhas/portfolio/cross-insights
 *   → Gera novo relatório com análise LLM de padrões transferíveis entre clientes
 *
 * FASE 10 — Portfolio Cross-Pollination
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import pool from '@/lib/database/connection';
import { invokeForContext } from '@/lib/intelligence/llmInvoker';

export const dynamic = 'force-dynamic';

/* ── tipos ──────────────────────────────────────────────────────── */

export interface CrossInsight {
  id:          string;
  type:        'opportunity' | 'warning' | 'pattern';
  title:       string;
  description: string;
  actions:     string[];     // ações recomendadas (sempre preenchido)
  sourceClients: string[];   // nomes dos clientes de onde vem o padrão
  targetClients: string[];   // clientes que podem se beneficiar
  metric?:     string;
  improvement?: string;      // ex: "↓ 28% CPL"
}

/** Detalhe por conta para o contexto da LLM */
export interface CrossClientDetail {
  clientName:  string;
  isTenant:    boolean;     // true = é o tenant (empresa gestora), não um cliente gerenciado
  segmentName: string | null;
  cpl:         number | null;
  spend:       number;
  status:      string;
}

export interface CrossInsightsResponse {
  generatedAt:   string;
  period:        number;
  top:           number;   // FASE 13 — Top N solicitado
  totalClients:  number;
  tenantName:    string;   // nome do tenant para contexto LLM
  narrative:     string | null;
  insights:      CrossInsight[];
  topPerformers: { clientName: string; cpl: number | null; spend: number }[];
  underperformers: { clientName: string; cpl: number | null; spend: number; reason: string }[];
  clientDetails: CrossClientDetail[];  // contexto enriquecido para LLM
}

/* ── builder de insights rule-based (sem LLM) ───────────────────── */

function buildRuleBasedInsights(
  clients: Array<{
    clientName: string;
    isTenant: boolean;          // true = é a empresa gestora (tenant)
    cpl: number | null;
    spend: number;
    leads: number;
    ctr: number | null;
    status: string;
    segment_name: string | null;
    cplIdeal: number | null;
    cplCritical: number | null;
  }>
): CrossInsight[] {
  const insights: CrossInsight[] = [];

  // Para comparações cruzadas, usa APENAS clientes gerenciados (não o tenant)
  const realClients = clients.filter(c => !c.isTenant);

  const ok       = realClients.filter(c => c.status === 'ok');
  const critical = realClients.filter(c => c.status === 'critical');  // alertas só de clientes reais
  const warn     = realClients.filter(c => c.status === 'warn');      // eslint-disable-line @typescript-eslint/no-unused-vars

  // Padrão: clientes saudáveis → podem inspirar os críticos
  if (ok.length > 0 && critical.length > 0) {
    insights.push({
      id: 'cross-01',
      type: 'opportunity',
      title: `${ok.length} cliente(s) com CPL eficiente — padrões transferíveis`,
      description: `${ok.map(c => c.clientName).join(', ')} operam com CPL dentro da meta. `
        + `Analisar estrutura de criativos e segmentação desses clientes pode ajudar `
        + `${critical.map(c => c.clientName).join(', ')} a reduzir o custo por lead.`,
      actions: [
        `Abrir o dashboard de ${ok[0].clientName} e documentar segmentação, ângulo de comunicação e criativos ativos`,
        `Comparar públicos-alvo: faixa etária, localização e interesses entre os clientes`,
        `Testar o mesmo ângulo/criativo de ${ok[0].clientName} em uma campanha de teste para ${critical[0].clientName}`,
        `Verificar se o benchmark de CPL está calibrado para o segmento de cada cliente`,
      ],
      sourceClients: ok.map(c => c.clientName),
      targetClients: critical.map(c => c.clientName),
      metric: 'CPL',
    });
  }

  // Alerta: clientes críticos
  for (const c of critical) {
    if (c.cpl !== null && c.cplCritical !== null) {
      const excess = Math.round(((c.cpl - c.cplCritical) / c.cplCritical) * 100);
      insights.push({
        id:   `critical-${c.clientName}`,
        type: 'warning',
        title: `${c.clientName} — CPL ${excess}% acima do limite crítico`,
        description: `CPL atual R$${c.cpl.toFixed(2)} · limite crítico R$${c.cplCritical.toFixed(2)} · `
          + `excesso de R$${(c.cpl - c.cplCritical).toFixed(2)} por lead.`,
        actions: [
          `Revisar segmentação: testar público mais qualificado (interesse comprovado em imóveis/produto)`,
          `Analisar criativos ativos: pausar anúncio com menor CTR e testar variação de copy ou imagem`,
          `Verificar orçamento diário: reduzir 20–30% e deixar o Meta otimizar por 5 dias antes de ajustar`,
          `Comparar com cliente de CPL saudável no mesmo segmento e replicar estrutura de campanha`,
          `Checar pixel: confirmar que conversões estão sendo rastreadas corretamente`,
        ],
        sourceClients: [],
        targetClients: [c.clientName],
        metric: 'CPL',
        improvement: `Redução necessária: R$${(c.cpl - c.cplCritical).toFixed(2)}`,
      });
    }
  }

  // Oportunidade: clientes reais sem dados (campanhas pausadas ou sem leads)
  const nodata = realClients.filter(c => c.status === 'nodata' && c.spend === 0);
  if (nodata.length > 0) {
    insights.push({
      id:   'nodata-01',
      type: 'opportunity',
      title: `${nodata.length} cliente(s) sem campanha ativa no período`,
      description: `${nodata.map(c => c.clientName).join(', ')} não registraram investimento no período. `
        + `Oportunidade para retomar campanhas usando padrões dos clientes saudáveis.`,
      actions: [
        `Verificar se as campanhas foram pausadas intencionalmente ou por falta de verba`,
        `Reativar com orçamento mínimo (R$20–30/dia) para testar resposta do público`,
        `Usar os melhores criativos de ${ok.map(c => c.clientName).join(', ')} como referência`,
        `Definir meta de CPL e configurar alerta automático no dashboard`,
      ],
      sourceClients: ok.map(c => c.clientName),
      targetClients: nodata.map(c => c.clientName),
    });
  }

  // Padrão de CTR — só entre clientes reais do MESMO segmento
  const goodCtr  = realClients.filter(c => c.ctr !== null && c.ctr >= 1.5);
  const poorCtr  = realClients.filter(c => c.ctr !== null && c.ctr < 0.8);
  if (goodCtr.length > 0 && poorCtr.length > 0) {
    insights.push({
      id:   'ctr-01',
      type: 'pattern',
      title: `CTR elevado em ${goodCtr.length} cliente(s) — revisar ângulos criativos`,
      description: `${goodCtr.map(c => c.clientName).join(', ')} alcançam CTR acima de 1,5%, `
        + `enquanto ${poorCtr.map(c => c.clientName).join(', ')} estão abaixo de 0,8%.`,
      actions: [
        `Analisar os hooks de abertura (primeiros 3s) dos criativos de ${goodCtr[0].clientName}`,
        `Verificar o ângulo de comunicação: clientes com CTR alto costumam usar proposta clara na imagem`,
        `Testar variação de thumbnail e headline nos anúncios de ${poorCtr[0].clientName}`,
        `Checar posicionamentos: comparar CTR por placement (feed vs. stories vs. reels)`,
      ],
      sourceClients: goodCtr.map(c => c.clientName),
      targetClients: poorCtr.map(c => c.clientName),
      metric: 'CTR',
    });
  }

  // Benchmarks por segmento — usa apenas clientes reais (exclui tenant)
  // Tenant pode ter segmento diferente dos clientes que gerencia
  const segGroups = new Map<string, typeof clients>();
  for (const c of realClients) {
    if (!c.segment_name) continue;
    if (!segGroups.has(c.segment_name)) segGroups.set(c.segment_name, []);
    segGroups.get(c.segment_name)!.push(c);
  }
  for (const [segName, group] of segGroups.entries()) {
    if (group.length < 2) continue;
    const withCpl = group.filter(c => c.cpl !== null);
    if (withCpl.length < 2) continue;
    const cpls    = withCpl.map(c => c.cpl!).sort((a, b) => a - b);
    const best    = withCpl.find(c => c.cpl === cpls[0])!;
    const worst   = withCpl.find(c => c.cpl === cpls[cpls.length - 1])!;
    if (best.clientName === worst.clientName) continue;
    const diff = Math.round(((worst.cpl! - best.cpl!) / best.cpl!) * 100);
    if (diff < 20) continue; // diferença insignificante
    insights.push({
      id:   `segment-${segName}`,
      type: 'opportunity',
      title: `Segmento ${segName}: CPL ${diff}% melhor em ${best.clientName}`,
      description: `${best.clientName} opera com CPL R$${best.cpl!.toFixed(2)} vs. `
        + `R$${worst.cpl!.toFixed(2)} de ${worst.clientName} — mesmo segmento "${segName}".`,
      actions: [
        `Comparar configuração de campanha: objetivo, público, criativos e orçamento entre os dois clientes`,
        `Verificar se ${worst.clientName} usa o mesmo tipo de conversão (leads form vs. landing page)`,
        `Replicar a estrutura de adset de ${best.clientName} em uma campanha de teste para ${worst.clientName}`,
        `Consultar Padrões Vencedores para verificar criativos de alta performance do segmento ${segName}`,
      ],
      sourceClients: [best.clientName],
      targetClients: [worst.clientName],
      metric: 'CPL',
      improvement: `Potencial de ↓ ${diff}% no CPL`,
    });
  }

  return insights;
}

/* ── GET ─────────────────────────────────────────────────────────── */

export async function GET(request: NextRequest) {
  const denied = await requireApiPermission(request, 'dashboard-campanhas', 'READ');
  if (denied) return denied;

  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = Math.min(Math.max(parseInt(searchParams.get('period') || '30'), 1), 365);
  // FASE 13 — Top N configurável (default 3, faixa 1..50)
  const topN = Math.min(Math.max(parseInt(searchParams.get('top') || '3'), 1), 50);

  try {
    // Reutiliza a lógica da rota de portfolio para agregar dados
    const metricsQuery = await pool.query<{
      client_id: string | null;
      total_spend: string;
      total_impressions: string;
      total_clicks: string;
    }>(`
      SELECT
        camp.client_id,
        COALESCE(SUM(i.spend), 0)       AS total_spend,
        COALESCE(SUM(i.impressions), 0) AS total_impressions,
        COALESCE(SUM(i.clicks), 0)      AS total_clicks
      FROM campanhasmarketingdigital."Campaign" camp
      LEFT JOIN campanhasmarketingdigital."Insight" i
        ON i."campaignId" = camp.id
        AND i.date >= NOW() - ($2 || ' days')::INTERVAL
      WHERE camp.tenant_id = $1::uuid
      GROUP BY camp.client_id
    `, [payload.tenantId, period]);

    const leadsQuery = await pool.query<{ client_id: string | null; lead_count: string }>(`
      SELECT client_id, COUNT(*)::int AS lead_count
      FROM campanhasmarketingdigital."Lead"
      WHERE tenant_id = $1::uuid
        AND "clickedAt" >= NOW() - ($2 || ' days')::INTERVAL
      GROUP BY client_id
    `, [payload.tenantId, period]);

    const leadsMap = new Map(leadsQuery.rows.map(r => [r.client_id ?? '__own__', parseInt(r.lead_count)]));

    const clientIds = metricsQuery.rows.map(r => r.client_id).filter((id): id is string => id !== null);

    let clientInfoMap = new Map<string, {
      nome: string; segment_id: string | null; segment_name: string | null;
    }>();

    if (clientIds.length > 0) {
      const cq = await pool.query(`
        SELECT c.uuid, c.nome, c.segment_id, s.name AS segment_name
        FROM public.clientes c
        LEFT JOIN public.system_segments s ON s.id = c.segment_id
        WHERE c.uuid = ANY($1::uuid[]) AND c.tenant_id = $2::uuid
      `, [clientIds, payload.tenantId]);
      for (const r of cq.rows) clientInfoMap.set(r.uuid, r);
    }

    const tenantRow = await pool.query(`
      SELECT t.name AS nome, t.segment_id, s.name AS segment_name
      FROM public.tenants t
      LEFT JOIN public.system_segments s ON s.id = t.segment_id
      WHERE t.id = $1::uuid
    `, [payload.tenantId]);
    const tenantInfo = tenantRow.rows[0];

    // Benchmarks
    const segmentIds = [...new Set([
      ...Array.from(clientInfoMap.values()).map(c => c.segment_id).filter(Boolean),
      tenantInfo?.segment_id,
    ].filter(Boolean))] as string[];

    const benchMap = new Map<string, { cplIdeal: number | null; cplCritical: number | null; ctrMin: number | null }>();
    if (segmentIds.length > 0) {
      const bq = await pool.query(`
        SELECT segment_id::text, metric_key, value
        FROM public.system_benchmarks
        WHERE segment_id = ANY($1::uuid[])
          AND metric_key IN ('cpl_ideal', 'cpl_critical', 'ctr_min')
      `, [segmentIds]);
      for (const r of bq.rows) {
        if (!benchMap.has(r.segment_id)) benchMap.set(r.segment_id, { cplIdeal: null, cplCritical: null, ctrMin: null });
        const b = benchMap.get(r.segment_id)!;
        if (r.metric_key === 'cpl_ideal')    b.cplIdeal    = parseFloat(r.value);
        if (r.metric_key === 'cpl_critical') b.cplCritical = parseFloat(r.value);
        if (r.metric_key === 'ctr_min')      b.ctrMin      = parseFloat(r.value);
      }
    }

    // Monta lista consolidada — isTenant identifica a empresa gestora
    const clientList = metricsQuery.rows.map(row => {
      const isTenant = row.client_id === null;
      const mapKey   = row.client_id ?? '__own__';
      const info     = row.client_id ? clientInfoMap.get(row.client_id) : null;
      const segId    = info?.segment_id ?? tenantInfo?.segment_id ?? null;
      const bench    = segId ? benchMap.get(segId) ?? { cplIdeal: null, cplCritical: null, ctrMin: null }
                             : { cplIdeal: null, cplCritical: null, ctrMin: null };

      const spend  = parseFloat(row.total_spend);
      const imp    = parseInt(row.total_impressions);
      const clicks = parseInt(row.total_clicks);
      const leads  = leadsMap.get(mapKey) ?? 0;
      const cpl    = leads > 0 ? spend / leads : null;
      const ctr    = imp   > 0 ? (clicks / imp) * 100 : null;

      let status: 'ok' | 'warn' | 'critical' | 'nodata' = 'nodata';
      if (spend > 0) {
        if (cpl === null) status = 'nodata';
        else if (bench.cplCritical !== null && cpl >= bench.cplCritical) status = 'critical';
        else if (bench.cplIdeal    !== null && cpl > bench.cplIdeal)     status = 'warn';
        else status = 'ok';
      }

      return {
        isTenant,
        clientName:   isTenant ? (tenantInfo?.nome ?? 'Minha Empresa') : (info?.nome ?? 'Cliente'),
        cpl, spend, leads, ctr, status,
        segment_name: info?.segment_name ?? tenantInfo?.segment_name ?? null,
        cplIdeal:    bench.cplIdeal,
        cplCritical: bench.cplCritical,
      };
    });

    const insights = buildRuleBasedInsights(clientList);

    const sorted = [...clientList].filter(c => c.cpl !== null).sort((a, b) => (a.cpl ?? 0) - (b.cpl ?? 0));
    const topPerformers   = sorted.slice(0, topN).map(c => ({ clientName: c.clientName, cpl: c.cpl, spend: c.spend }));
    const underperformers = clientList
      .filter(c => c.status === 'critical')
      .map(c => ({
        clientName: c.clientName,
        cpl: c.cpl,
        spend: c.spend,
        reason: c.cpl !== null && c.cplCritical !== null
          ? `CPL R$${c.cpl.toFixed(2)} — ${Math.round(((c.cpl - c.cplCritical!) / c.cplCritical!) * 100)}% acima do crítico`
          : 'CPL acima do limite',
      }));

    const clientDetails: CrossClientDetail[] = clientList.map(c => ({
      clientName:  c.clientName,
      isTenant:    c.isTenant,
      segmentName: c.segment_name,
      cpl:         c.cpl,
      spend:       c.spend,
      status:      c.status,
    }));

    const result: CrossInsightsResponse = {
      generatedAt:   new Date().toISOString(),
      period,
      top:           topN,
      totalClients:  clientList.length,
      tenantName:    tenantInfo?.nome ?? 'Minha Empresa',
      narrative:     null, // LLM opcional via POST
      insights,
      topPerformers,
      underperformers,
      clientDetails,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('GET /portfolio/cross-insights error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/* ── POST — gera narrativa LLM ───────────────────────────────────── */

export async function POST(request: NextRequest) {
  const denied = await requireApiPermission(request, 'dashboard-campanhas', 'READ');
  if (denied) return denied;

  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body   = await request.json().catch(() => ({}));
  const period = Math.min(Math.max(parseInt(body.period || '30'), 1), 365);
  const topN   = Math.min(Math.max(parseInt(body.top || '3'), 1), 50);  // FASE 13

  try {
    // Busca dados consolidados via GET interno
    const baseUrl     = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:3000`;
    const authCookie  = request.headers.get('cookie') || '';

    const dataRes = await fetch(
      `${baseUrl}/api/admin/campanhas/portfolio/cross-insights?period=${period}&top=${topN}`,
      { headers: { cookie: authCookie } },
    );
    const data: CrossInsightsResponse = await dataRes.json();

    // Tenta gerar narrativa LLM via template cross_pollination_insights
    try {
      // Contexto enriquecido: separa tenant de clientes gerenciados, inclui segmento
      const clientDetails = data.clientDetails ?? [];

      const managedClients = clientDetails.filter(c => !c.isTenant);
      const tenantDetail   = clientDetails.find(c => c.isTenant);

      const clientContextLines: string[] = [];
      if (tenantDetail) {
        const seg = tenantDetail.segmentName ?? 'sem segmento';
        const cplStr = tenantDetail.cpl != null ? `CPL R$${tenantDetail.cpl.toFixed(2)}` : 'sem CPL';
        clientContextLines.push(
          `[TENANT — empresa gestora, NÃO é cliente gerenciado] ${data.tenantName} (${seg}): ${cplStr}, status=${tenantDetail.status}`
        );
      }
      for (const c of managedClients) {
        const seg = c.segmentName ?? 'sem segmento';
        const cplStr = c.cpl != null ? `CPL R$${c.cpl.toFixed(2)}` : 'sem CPL';
        clientContextLines.push(
          `[CLIENTE] ${c.clientName} (${seg}): ${cplStr}, investimento R$${c.spend.toFixed(2)}, status=${c.status}`
        );
      }

      const clientContextText = clientContextLines.length > 0
        ? clientContextLines.join('\n')
        : '- Sem dados de clientes no período';

      const criticalAlertsText = data.underperformers.length > 0
        ? data.underperformers.map(c => `- ${c.clientName}: ${c.reason}`).join('\n')
        : '- Nenhum cliente em estado crítico';

      const patternsText = data.insights.length > 0
        ? data.insights.map(i => `- [${i.type.toUpperCase()}] ${i.title}`).join('\n')
        : '- Nenhum padrão identificado no período';

      data.narrative = await invokeForContext({
        templateKey: 'cross_pollination_insights',
        tenantId:    payload.tenantId,
        clientId:    null,
        variables: {
          tenant_name:     data.tenantName,
          total_clients:   String(managedClients.length),  // apenas clientes gerenciados
          period:          String(period),
          client_context:  clientContextText,
          critical_alerts: criticalAlertsText,
          patterns:        patternsText,
        },
        maxTokens: 400,
      });
    } catch (llmErr: any) {
      console.warn('[cross-insights] LLM não disponível:', llmErr.message);
      // continua sem narrativa
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('POST /portfolio/cross-insights error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
