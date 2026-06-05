/**
 * GET  /api/admin/campanhas/portfolio/cross-insights?period=30&segmentId=<uuid>
 *   → Retorna insights cruzados rule-based (sem LLM), filtráveis por segmento
 *
 * POST /api/admin/campanhas/portfolio/cross-insights
 *   → Gera relatório com narrativa LLM de padrões transferíveis entre clientes
 *
 * REGRA FUNDAMENTAL: comparações cruzadas NUNCA atravessam segmentos de negócio.
 * Um cliente de saúde e um cliente imobiliário têm CPLs e CTRs incomparáveis.
 *
 * FASE 10 — Portfolio Cross-Pollination
 * FASE 13 — Top N configurável (SUBSTITUÍDO por tabela ranqueada completa)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import pool from '@/lib/database/connection';
import { invokeForContext } from '@/lib/intelligence/llmInvoker';

export const dynamic = 'force-dynamic';

/* ── tipos exportados ────────────────────────────────────────────── */

export interface CrossInsight {
  id:            string;
  type:          'opportunity' | 'warning' | 'pattern';
  title:         string;
  description:   string;
  actions:       string[];
  actionsSource: 'default' | 'ai';  // 'ai' = enriquecido pelo LLM no POST
  sourceClients: string[];
  targetClients: string[];
  metric?:       string;
  improvement?:  string;
  segmentName?:  string;
}

export interface CrossPerformer {
  clientName:   string;
  cpl:          number | null;
  spend:        number;
  leads:        number;
  segmentName:  string | null;
  status:       'ok' | 'warn' | 'critical' | 'nodata';
  cplCritical:  number | null;   // limite crítico do segmento (usado no POST p/ LLM)
}

export interface CrossSegment {
  id:          string;
  name:        string;
  clientCount: number;
}

export interface CrossClientDetail {
  clientName:  string;
  isTenant:    boolean;
  segmentName: string | null;
  cpl:         number | null;
  spend:       number;
  status:      string;
}

export interface CrossInsightsResponse {
  generatedAt:    string;
  period:         number;
  segmentFilter:  string | null;   // null = todos os segmentos
  totalClients:   number;
  tenantName:     string;
  narrative:      string | null;
  insights:       CrossInsight[];
  allPerformers:  CrossPerformer[];      // todos os clientes ranqueados por CPL (asc), sem slice
  underperformers: { clientName: string; cpl: number | null; spend: number; reason: string }[];
  clientDetails:  CrossClientDetail[];
  segments:       CrossSegment[];        // segmentos disponíveis para o filtro
  // Campos de diagnóstico LLM (presentes apenas na resposta POST)
  aiEnriched?:    boolean;               // true se ao menos 1 insight teve ações enriquecidas
  aiError?:       string | null;         // mensagem de erro se LLM falhou
}

/* ── tipo interno ────────────────────────────────────────────────── */

type ClientEntry = {
  isTenant:     boolean;
  clientName:   string;
  segmentId:    string | null;
  segment_name: string | null;
  cpl:          number | null;
  spend:        number;
  leads:        number;
  ctr:          number | null;
  status:       'ok' | 'warn' | 'critical' | 'nodata';
  cplIdeal:     number | null;
  cplCritical:  number | null;
};

/* ── builder de insights rule-based — SEGMENTO-AWARE ────────────── */

function buildRuleBasedInsights(clients: ClientEntry[]): CrossInsight[] {
  const insights: CrossInsight[] = [];

  // Apenas clientes gerenciados (exclui tenant)
  const realClients = clients.filter(c => !c.isTenant);

  // ── 1. Agrupar por segmento ────────────────────────────────────────
  const bySegment = new Map<string, ClientEntry[]>();
  const noSegClients: ClientEntry[] = [];

  for (const c of realClients) {
    if (c.segment_name) {
      const key = c.segment_name;
      if (!bySegment.has(key)) bySegment.set(key, []);
      bySegment.get(key)!.push(c);
    } else {
      noSegClients.push(c);
    }
  }

  // ── 2. Insights por segmento ──────────────────────────────────────
  for (const [segName, group] of Array.from(bySegment.entries())) {
    if (group.length < 2) continue; // mínimo 2 clientes no mesmo segmento para comparar

    const ok       = group.filter(c => c.status === 'ok');
    const critical = group.filter(c => c.status === 'critical');
    const goodCtr  = group.filter(c => c.ctr !== null && c.ctr >= 1.5);
    const poorCtr  = group.filter(c => c.ctr !== null && c.ctr < 0.8);
    const withCpl  = group.filter(c => c.cpl !== null).sort((a, b) => a.cpl! - b.cpl!);

    // 2a. Transferência de padrão CPL: ok → critical (mesmo segmento)
    const hasTransfer = ok.length > 0 && critical.length > 0;
    if (hasTransfer) {
      const potencial = withCpl.length >= 2
        ? Math.round(((withCpl[withCpl.length - 1].cpl! - withCpl[0].cpl!) / withCpl[withCpl.length - 1].cpl!) * 100)
        : null;
      insights.push({
        id:    `cross-${segName}`,
        type:  'opportunity',
        title: `[${segName}] ${ok.length} cliente(s) com CPL eficiente — padrões transferíveis`,
        description:
          `No segmento "${segName}": ${ok.map(c => c.clientName).join(', ')} operam dentro da meta de CPL. ` +
          `Analisar criativos e segmentação desses clientes pode ajudar ` +
          `${critical.map(c => c.clientName).join(', ')} a reduzir o custo por lead no mesmo mercado.`,
        actions: [
          `Abrir dashboard de ${ok[0].clientName} e documentar segmentação, ângulo de comunicação e criativos ativos`,
          `Comparar públicos no segmento "${segName}": faixa etária, localização e interesses entre os clientes`,
          `Testar o mesmo ângulo/criativo de ${ok[0].clientName} em campanha de teste para ${critical[0].clientName}`,
          `Confirmar que o benchmark de CPL está calibrado para o segmento "${segName}"`,
        ],
        actionsSource: 'default' as const,
        sourceClients: ok.map(c => c.clientName),
        targetClients: critical.map(c => c.clientName),
        metric:      'CPL',
        improvement: potencial ? `Potencial de ↓ ${potencial}% no CPL` : undefined,
        segmentName: segName,
      });
    }

    // 2b. Gap de CPL dentro do segmento (só se não há insight de transferência acima)
    if (!hasTransfer && withCpl.length >= 2) {
      const best  = withCpl[0];
      const worst = withCpl[withCpl.length - 1];
      if (best.clientName !== worst.clientName) {
        const diff = Math.round(((worst.cpl! - best.cpl!) / best.cpl!) * 100);
        if (diff >= 20) {
          insights.push({
            id:   `segment-${segName}`,
            type: 'opportunity',
            title: `[${segName}] CPL ${diff}% melhor em ${best.clientName}`,
            description:
              `${best.clientName} opera com CPL R$${best.cpl!.toFixed(2)} vs. ` +
              `R$${worst.cpl!.toFixed(2)} de ${worst.clientName} — mesmo segmento "${segName}".`,
            actions: [
              `Comparar campanha: objetivo, público, criativos e orçamento entre os dois clientes do segmento "${segName}"`,
              `Verificar se ${worst.clientName} usa o mesmo tipo de conversão (formulário vs. landing page)`,
              `Replicar estrutura de adset de ${best.clientName} em campanha de teste para ${worst.clientName}`,
              `Consultar Padrões Vencedores para criativos de alta performance do segmento "${segName}"`,
            ],
            actionsSource: 'default' as const,
            sourceClients: [best.clientName],
            targetClients: [worst.clientName],
            metric:      'CPL',
            improvement: `Potencial de ↓ ${diff}% no CPL`,
            segmentName: segName,
          });
        }
      }
    }

    // 2c. Padrão de CTR dentro do segmento
    if (goodCtr.length > 0 && poorCtr.length > 0) {
      insights.push({
        id:   `ctr-${segName}`,
        type: 'pattern',
        title: `[${segName}] CTR elevado em ${goodCtr.length} cliente(s) — revisar ângulos criativos`,
        description:
          `No segmento "${segName}": ${goodCtr.map(c => c.clientName).join(', ')} alcançam CTR acima de 1,5%, ` +
          `enquanto ${poorCtr.map(c => c.clientName).join(', ')} estão abaixo de 0,8%. ` +
          `Mesmo mercado, resultado diferente — a diferença está nos criativos.`,
        actions: [
          `Analisar hooks de abertura (primeiros 3s) dos criativos de ${goodCtr[0].clientName}`,
          `Verificar ângulo de comunicação: clientes com CTR alto costumam ter proposta visual clara`,
          `Testar variação de thumbnail e headline nos anúncios de ${poorCtr[0].clientName}`,
          `Checar posicionamentos: CTR por placement (feed vs. stories vs. reels) dentro de "${segName}"`,
        ],
        actionsSource: 'default' as const,
        sourceClients: goodCtr.map(c => c.clientName),
        targetClients: poorCtr.map(c => c.clientName),
        metric:      'CTR',
        segmentName: segName,
      });
    }
  }

  // ── 3. Alertas críticos individuais (independem de segmento) ─────
  for (const c of realClients.filter(c => c.status === 'critical')) {
    if (c.cpl !== null && c.cplCritical !== null) {
      const excess  = Math.round(((c.cpl - c.cplCritical) / c.cplCritical) * 100);
      const segCtx  = c.segment_name ? ` [${c.segment_name}]` : '';
      insights.push({
        id:    `critical-${c.clientName}`,
        type:  'warning',
        title: `${c.clientName}${segCtx} — CPL ${excess}% acima do limite crítico`,
        description:
          `CPL atual R$${c.cpl.toFixed(2)} · limite crítico R$${c.cplCritical.toFixed(2)} · ` +
          `excesso de R$${(c.cpl - c.cplCritical).toFixed(2)} por lead.`,
        actions: [
          `Revisar segmentação: testar público mais qualificado${c.segment_name ? ` para "${c.segment_name}"` : ''}`,
          `Analisar criativos ativos: pausar anúncio com menor CTR e testar variação de copy ou imagem`,
          `Verificar orçamento diário: reduzir 20–30% e deixar o Meta otimizar por 5 dias`,
          `Checar pixel: confirmar que conversões estão sendo rastreadas corretamente`,
        ],
        actionsSource: 'default' as const,
        sourceClients: [],
        targetClients: [c.clientName],
        metric:      'CPL',
        improvement: `Redução necessária: R$${(c.cpl - c.cplCritical).toFixed(2)}`,
        segmentName: c.segment_name ?? undefined,
      });
    }
  }

  // ── 4. Clientes sem campanha ativa (agrupados por segmento) ──────
  const allNodata   = realClients.filter(c => c.status === 'nodata' && c.spend === 0);
  const okClients   = realClients.filter(c => c.status === 'ok');
  if (allNodata.length > 0) {
    // Descreve quais segmentos estão inativos
    const nodataBySeg = new Map<string, string[]>();
    for (const c of allNodata) {
      const key = c.segment_name ?? 'sem segmento';
      if (!nodataBySeg.has(key)) nodataBySeg.set(key, []);
      nodataBySeg.get(key)!.push(c.clientName);
    }
    const nodataDesc = Array.from(nodataBySeg.entries())
      .map(([seg, names]) => `${names.join(', ')} (${seg})`)
      .join('; ');

    insights.push({
      id:   'nodata-01',
      type: 'opportunity',
      title: `${allNodata.length} cliente(s) sem campanha ativa no período`,
      description:
        `${nodataDesc} não registraram investimento no período. ` +
        `Oportunidade para retomar campanhas usando padrões de clientes do mesmo segmento.`,
      actions: [
        `Verificar se as campanhas foram pausadas intencionalmente ou por falta de verba`,
        `Reativar com orçamento mínimo (R$20–30/dia) para testar resposta do público`,
        okClients.length > 0
          ? `Usar melhores criativos de ${okClients[0].clientName} (mesmo segmento) como referência`
          : `Analisar Padrões Vencedores do segmento antes de reativar`,
        `Definir meta de CPL e configurar alerta automático no dashboard`,
      ],
      actionsSource: 'default' as const,
      sourceClients: okClients.map(c => c.clientName),
      targetClients: allNodata.map(c => c.clientName),
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
  const period      = Math.min(Math.max(parseInt(searchParams.get('period') || '30'), 1), 365);
  const segmentId   = searchParams.get('segmentId') || null;   // filtro opcional de segmento

  try {
    const metricsQuery = await pool.query<{
      client_id:          string | null;
      total_spend:        string;
      total_impressions:  string;
      total_clicks:       string;
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
      nome: string;
      segment_id: string | null;
      segment_name: string | null;
      cpl_ideal: string | null;    // NUMERIC → string in node-postgres
      cpl_critical: string | null;
      ctr_min: string | null;
    }>();
    if (clientIds.length > 0) {
      const cq = await pool.query(`
        SELECT
          c.uuid, c.nome, c.segment_id::text,
          s.name         AS segment_name,
          s.cpl_ideal,
          s.cpl_critical,
          s.ctr_min
        FROM public.clientes c
        LEFT JOIN public.system_segments s ON s.id = c.segment_id
        WHERE c.uuid = ANY($1::uuid[]) AND c.tenant_id = $2::uuid
      `, [clientIds, payload.tenantId]);
      for (const r of cq.rows) clientInfoMap.set(r.uuid, r);
    }

    const tenantRow = await pool.query(`
      SELECT
        t.name AS nome, t.segment_id::text,
        s.name         AS segment_name,
        s.cpl_ideal,
        s.cpl_critical,
        s.ctr_min
      FROM public.tenants t
      LEFT JOIN public.system_segments s ON s.id = t.segment_id
      WHERE t.id = $1::uuid
    `, [payload.tenantId]);
    const tenantInfo = tenantRow.rows[0];

    // Lista consolidada de clientes com dados enriquecidos
    const clientList: ClientEntry[] = metricsQuery.rows.map(row => {
      const isTenant = row.client_id === null;
      const mapKey   = row.client_id ?? '__own__';
      const info     = row.client_id ? clientInfoMap.get(row.client_id) : null;
      const segId    = info?.segment_id ?? tenantInfo?.segment_id ?? null;
      // Benchmarks lidos diretamente das colunas de system_segments (via JOIN acima)
      // node-postgres retorna NUMERIC como string — parseFloat necessário
      const parseN = (v: any): number | null => {
        if (v == null || v === '') return null;
        const n = parseFloat(v);
        return isNaN(n) ? null : n;
      };
      const bench = {
        cplIdeal:    parseN(info?.cpl_ideal    ?? tenantInfo?.cpl_ideal),
        cplCritical: parseN(info?.cpl_critical ?? tenantInfo?.cpl_critical),
        ctrMin:      parseN(info?.ctr_min      ?? tenantInfo?.ctr_min),
      };

      const spend  = parseFloat(row.total_spend);
      const imp    = parseInt(row.total_impressions);
      const clicks = parseInt(row.total_clicks);
      const leads  = leadsMap.get(mapKey) ?? 0;
      const cpl    = leads > 0 ? spend / leads : null;
      const ctr    = imp   > 0 ? (clicks / imp) * 100 : null;

      let status: 'ok' | 'warn' | 'critical' | 'nodata' = 'nodata';
      if (spend > 0) {
        if (cpl === null)                                                       status = 'nodata';
        else if (bench.cplCritical !== null && cpl >= bench.cplCritical)        status = 'critical';
        else if (bench.cplIdeal    !== null && cpl  > bench.cplIdeal)           status = 'warn';
        else                                                                    status = 'ok';
      }

      return {
        isTenant,
        clientName:   isTenant ? (tenantInfo?.nome ?? 'Minha Empresa') : (info?.nome ?? 'Cliente'),
        segmentId:    segId,
        segment_name: info?.segment_name ?? (isTenant ? tenantInfo?.segment_name : null) ?? null,
        cpl, spend, leads, ctr, status,
        cplIdeal:    bench.cplIdeal,
        cplCritical: bench.cplCritical,
      };
    });

    // Apenas clientes gerenciados (exclui tenant)
    let realClients = clientList.filter(c => !c.isTenant);

    // Aplica filtro de segmento se informado
    if (segmentId) {
      realClients = realClients.filter(c => c.segmentId === segmentId);
    }

    // Lista de segmentos disponíveis (para o dropdown de filtro no frontend)
    const segmentSet = new Map<string, { name: string; count: number }>();
    for (const c of clientList.filter(c => !c.isTenant)) {
      if (!c.segmentId || !c.segment_name) continue;
      if (!segmentSet.has(c.segmentId)) segmentSet.set(c.segmentId, { name: c.segment_name, count: 0 });
      segmentSet.get(c.segmentId)!.count++;
    }
    const segments: CrossSegment[] = Array.from(segmentSet.entries()).map(([id, v]) => ({
      id, name: v.name, clientCount: v.count,
    }));

    // Insights: gerados sobre o conjunto filtrado (mas com isTenant restaurado para contexto)
    const insightClients: ClientEntry[] = segmentId
      ? [...clientList.filter(c => c.isTenant), ...realClients]
      : clientList;
    const insights = buildRuleBasedInsights(insightClients);

    // Ranqueamento: todos os clientes (filtrados) por CPL, nulls ao final
    const sorted: CrossPerformer[] = [
      ...realClients.filter(c => c.cpl !== null).sort((a, b) => a.cpl! - b.cpl!),
      ...realClients.filter(c => c.cpl === null),
    ].map(c => ({
      clientName:   c.clientName,
      cpl:          c.cpl,
      spend:        c.spend,
      leads:        c.leads,
      segmentName:  c.segment_name,
      status:       c.status,
      cplCritical:  c.cplCritical,
    }));

    const underperformers = realClients
      .filter(c => c.status === 'critical')
      .map(c => ({
        clientName: c.clientName,
        cpl:  c.cpl,
        spend: c.spend,
        reason: c.cpl !== null && c.cplCritical !== null
          ? `CPL R$${c.cpl.toFixed(2)} — ${Math.round(((c.cpl - c.cplCritical) / c.cplCritical) * 100)}% acima do crítico`
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
      segmentFilter: segmentId,
      totalClients:  realClients.length,
      tenantName:    tenantInfo?.nome ?? 'Minha Empresa',
      narrative:     null,
      insights,
      allPerformers:  sorted,
      underperformers,
      clientDetails,
      segments,
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

  const body      = await request.json().catch(() => ({}));
  const period    = Math.min(Math.max(parseInt(body.period || '30'), 1), 365);
  const segmentId = body.segmentId || null;

  try {
    const baseUrl    = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:3000`;
    const authCookie = request.headers.get('cookie') || '';

    const segParam = segmentId ? `&segmentId=${segmentId}` : '';
    const dataRes  = await fetch(
      `${baseUrl}/api/admin/campanhas/portfolio/cross-insights?period=${period}${segParam}`,
      { headers: { cookie: authCookie } },
    );
    const data: CrossInsightsResponse = await dataRes.json();

    // ── Enriquecer ações dos alertas críticos com LLM ────────────────
    let aiEnriched = false;
    let aiError: string | null = null;

    const criticalInsights = data.insights.filter(i => i.id.startsWith('critical-'));
    if (criticalInsights.length > 0) {
      const enrichments = criticalInsights.map(async (insight) => {
        const clientName = insight.targetClients[0];
        if (!clientName) return;

        const performer = data.allPerformers.find(p => p.clientName === clientName);
        const detail    = data.clientDetails.find(d => d.clientName === clientName);
        if (!performer || performer.cpl === null || !performer.cplCritical) {
          console.warn('[cross-insights] Pulando enriquecimento para', clientName,
            '— cpl:', performer?.cpl, 'cplCritical:', performer?.cplCritical);
          return;
        }

        const excessBrl = performer.cpl - performer.cplCritical;
        const excessPct = Math.round((excessBrl / performer.cplCritical) * 100);

        try {
          console.log('[cross-insights] Invocando LLM para', clientName,
            '— template: cross_critical_actions, segmento:', detail?.segmentName ?? performer.segmentName);
          const raw = await invokeForContext({
            templateKey: 'cross_critical_actions',
            tenantId:    payload.tenantId!,
            clientId:    null,
            variables: {
              client_name:  clientName,
              segment_name: detail?.segmentName ?? performer.segmentName ?? 'geral',
              cpl_current:  performer.cpl.toFixed(2),
              cpl_critical: performer.cplCritical.toFixed(2),
              excess_pct:   String(excessPct),
              excess_brl:   excessBrl.toFixed(2),
            },
            maxTokens: 300,
          });

          console.log('[cross-insights] Resposta LLM bruta para', clientName, ':', raw?.slice(0, 200));

          if (raw) {
            // Extrai o array JSON da resposta (tolera markdown envolvendo)
            const match = raw.match(/\[[\s\S]*\]/);
            if (match) {
              const parsed: unknown = JSON.parse(match[0]);
              if (Array.isArray(parsed) && parsed.length >= 2) {
                insight.actions       = (parsed as string[]).map(String).slice(0, 4);
                insight.actionsSource = 'ai';
                aiEnriched = true;
                console.log('[cross-insights] ✅ Ações LLM aplicadas para', clientName);
              } else {
                console.warn('[cross-insights] JSON inválido na resposta LLM para', clientName, ':', match[0]);
              }
            } else {
              console.warn('[cross-insights] Resposta LLM não contém JSON array para', clientName, ':', raw?.slice(0, 300));
            }
          } else {
            console.warn('[cross-insights] Resposta LLM vazia para', clientName);
          }
        } catch (err: any) {
          console.error('[cross-insights] ❌ Erro LLM para', clientName, ':', err.message);
          if (!aiError) aiError = err.message;  // captura o primeiro erro
        }
      });
      await Promise.allSettled(enrichments);
    }

    // Adiciona campos de diagnóstico LLM na resposta
    (data as any).aiEnriched = aiEnriched;
    (data as any).aiError    = aiError;

    try {
      const clientDetails  = data.clientDetails ?? [];
      const managedClients = clientDetails.filter(c => !c.isTenant);
      const tenantDetail   = clientDetails.find(c => c.isTenant);

      const clientContextLines: string[] = [];
      if (tenantDetail) {
        const seg    = tenantDetail.segmentName ?? 'sem segmento';
        const cplStr = tenantDetail.cpl != null ? `CPL R$${tenantDetail.cpl.toFixed(2)}` : 'sem CPL';
        clientContextLines.push(
          `[TENANT — empresa gestora] ${data.tenantName} (${seg}): ${cplStr}, status=${tenantDetail.status}`
        );
      }
      for (const c of managedClients) {
        const seg    = c.segmentName ?? 'sem segmento';
        const cplStr = c.cpl != null ? `CPL R$${c.cpl.toFixed(2)}` : 'sem CPL';
        clientContextLines.push(
          `[CLIENTE] ${c.clientName} (${seg}): ${cplStr}, investimento R$${c.spend.toFixed(2)}, status=${c.status}`
        );
      }

      const clientContextText  = clientContextLines.length > 0 ? clientContextLines.join('\n') : '- Sem dados de clientes no período';
      const criticalAlertsText = data.underperformers.length > 0
        ? data.underperformers.map(c => `- ${c.clientName}: ${c.reason}`).join('\n')
        : '- Nenhum cliente em estado crítico';
      const patternsText       = data.insights.length > 0
        ? data.insights.map(i => `- [${i.type.toUpperCase()}] ${i.title}`).join('\n')
        : '- Nenhum padrão identificado no período';

      data.narrative = await invokeForContext({
        templateKey: 'cross_pollination_insights',
        tenantId:    payload.tenantId,
        clientId:    null,
        variables: {
          tenant_name:     data.tenantName,
          total_clients:   String(managedClients.length),
          period:          String(period),
          client_context:  clientContextText,
          critical_alerts: criticalAlertsText,
          patterns:        patternsText,
        },
        maxTokens: 400,
      });
    } catch (llmErr: any) {
      console.warn('[cross-insights] LLM não disponível:', llmErr.message);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('POST /portfolio/cross-insights error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
