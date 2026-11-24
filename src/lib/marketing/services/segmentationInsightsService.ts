/**
 * Insights de Segmentação (idade×gênero, região, horário).
 *
 * Duas camadas, de propósito separadas:
 *  1. FATOS — calculados por regra, a partir de InsightBreakdown. Números e comparações
 *     são sempre determinísticos; a IA nunca calcula nem inventa valor.
 *  2. NARRATIVA — a IA apenas redige a explicação e a recomendação em português a partir
 *     dos fatos já calculados. Template `segmentation_insights` (system_prompt_templates).
 */
import pool from '@/lib/database/connection';
import { resolveCampaignIdsBySegment } from '@/lib/marketing/segmentUtils';
import { invokeWithTemplate } from '@/lib/intelligence/llmInvoker';

// Piso estatístico: célula/região/hora com menos leads que isso não entra em comparação de CPL
// (CPL de 1–2 leads é ruído, não sinal).
const MIN_LEADS_FOR_COMPARISON = 5;

export type SegmentationTone = 'good' | 'warn' | 'info';

export interface SegmentationFact {
  kind: 'age_gender' | 'region' | 'hour';
  tone: SegmentationTone;
  text: string;
}

export interface SegmentationInsightsResult {
  days: number;
  hasData: boolean;
  facts: SegmentationFact[];
  narrative: string | null;
}

interface Scope {
  tenantId: string;
  startDate: string;
  endDate: string;
  segmentId: string | null;
  clientId: string | null;
}

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (n: number) => `${Math.round(n * 100)}%`;
const num1 = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const AGE_GENDER_LABEL: Record<string, string> = { male: 'homens', female: 'mulheres' };

async function loadBreakdownRows(scope: Scope) {
  let campaignIds: string[] | null = null;
  if (scope.segmentId) {
    campaignIds = await resolveCampaignIdsBySegment(scope.tenantId, scope.segmentId, scope.clientId ?? undefined);
  } else if (scope.clientId === 'own') {
    const r = await pool.query<{ id: string }>(
      `SELECT id FROM campanhasmarketingdigital."Campaign" WHERE tenant_id = $1::uuid AND client_id IS NULL`,
      [scope.tenantId],
    );
    campaignIds = r.rows.map(x => x.id);
  } else if (scope.clientId) {
    const r = await pool.query<{ id: string }>(
      `SELECT id FROM campanhasmarketingdigital."Campaign" WHERE tenant_id = $1::uuid AND client_id = $2::uuid`,
      [scope.tenantId, scope.clientId],
    );
    campaignIds = r.rows.map(x => x.id);
  }
  if (campaignIds !== null && campaignIds.length === 0) return [];

  const params: any[] = [scope.tenantId, scope.startDate, scope.endDate];
  let scopeSql = '';
  if (campaignIds !== null) {
    params.push(campaignIds);
    scopeSql = `AND campaign_id = ANY($4::text[])`;
  }
  const { rows } = await pool.query<{ breakdown_type: string; breakdown_key: string; spend: string; leads: string }>(
    `SELECT breakdown_type, breakdown_key, SUM(spend)::text AS spend, SUM(leads)::text AS leads
       FROM campanhasmarketingdigital."InsightBreakdown"
      WHERE tenant_id = $1::uuid AND date BETWEEN $2::date AND $3::date ${scopeSql}
      GROUP BY breakdown_type, breakdown_key`,
    params,
  );
  return rows;
}

/** Calcula os fatos determinísticos do período. Sem IA aqui. */
export async function buildSegmentationFacts(scope: Scope): Promise<{ days: number; hasData: boolean; facts: SegmentationFact[] }> {
  const dayMs = 86_400_000;
  const diff = Math.round((Date.parse(scope.endDate) - Date.parse(scope.startDate)) / dayMs) + 1;
  const days = Number.isFinite(diff) && diff > 0 ? diff : 1;

  const rows = await loadBreakdownRows(scope);
  const facts: SegmentationFact[] = [];
  if (rows.length === 0) return { days, hasData: false, facts };

  // ── Idade × gênero ──
  const cells = rows
    .filter(r => r.breakdown_type === 'age_gender')
    .map(r => {
      const [age, gender] = r.breakdown_key.split('|');
      const spend = Number(r.spend), leads = Number(r.leads);
      return { age, gender, spend, leads, cpl: leads > 0 ? spend / leads : null };
    });
  const totalSpendAG = cells.reduce((s, c) => s + c.spend, 0);
  const comparable = cells.filter(c => c.leads >= MIN_LEADS_FOR_COMPARISON && c.cpl !== null);
  if (comparable.length >= 2) {
    const best = comparable.reduce((a, b) => (b.cpl! < a.cpl! ? b : a));
    const worst = comparable.reduce((a, b) => (b.cpl! > a.cpl! ? b : a));
    const label = (c: typeof best) => `${c.age} anos (${AGE_GENDER_LABEL[c.gender] ?? c.gender})`;
    facts.push({
      kind: 'age_gender', tone: 'good',
      text: `Melhor CPL no público: ${label(best)}, com ${brl(best.cpl!)} por lead (${best.leads} leads).`,
    });
    if (worst.cpl! > best.cpl! * 1.5) {
      facts.push({
        kind: 'age_gender', tone: 'warn',
        text: `Pior CPL no público: ${label(worst)}, com ${brl(worst.cpl!)} por lead — ${num1(worst.cpl! / best.cpl!)}× o melhor (${worst.leads} leads).`,
      });
    }
  }
  if (totalSpendAG > 0) {
    const topSpend = cells.reduce((a, b) => (b.spend > a.spend ? b : a));
    const share = topSpend.spend / totalSpendAG;
    if (share >= 0.4) {
      facts.push({
        kind: 'age_gender', tone: 'info',
        text: `Concentração: ${topSpend.age} anos (${AGE_GENDER_LABEL[topSpend.gender] ?? topSpend.gender}) recebe ${pct(share)} do investimento em público.`,
      });
    }
  }

  // ── Região ──
  const regions = rows
    .filter(r => r.breakdown_type === 'region')
    .map(r => ({ region: r.breakdown_key, spend: Number(r.spend), leads: Number(r.leads) }));
  const totalSpendR = regions.reduce((s, r) => s + r.spend, 0);
  const totalLeadsR = regions.reduce((s, r) => s + r.leads, 0);
  if (totalSpendR > 0 && totalLeadsR > 0) {
    for (const r of regions) {
      const spendShare = r.spend / totalSpendR;
      const leadShare = r.leads / totalLeadsR;
      if (spendShare >= 0.05 && spendShare >= 2 * leadShare) {
        facts.push({
          kind: 'region', tone: 'warn',
          text: `${r.region} recebe ${pct(spendShare)} do investimento mas gera só ${pct(leadShare)} dos leads.`,
        });
      }
    }
    const best = regions
      .filter(r => r.leads >= MIN_LEADS_FOR_COMPARISON)
      .map(r => ({ ...r, cpl: r.spend / r.leads }))
      .reduce<{ region: string; cpl: number; leads: number } | null>((a, b) => (!a || b.cpl < a.cpl ? b : a), null);
    if (best) {
      facts.push({
        kind: 'region', tone: 'good',
        text: `Região de menor CPL: ${best.region}, com ${brl(best.cpl)} por lead (${best.leads} leads).`,
      });
    }
  }

  // ── Horário ──
  const hours = rows
    .filter(r => r.breakdown_type === 'hour')
    .map(r => {
      const h = parseInt(r.breakdown_key, 10);
      const spend = Number(r.spend), leads = Number(r.leads);
      return { hour: h, spend, leads, perDay: leads / days, cpl: leads > 0 ? spend / leads : null };
    })
    .filter(h => h.hour >= 0 && h.hour <= 23);
  const withLeads = hours.filter(h => h.leads > 0);
  if (withLeads.length > 0) {
    const peak = withLeads.reduce((a, b) => (b.perDay > a.perDay ? b : a));
    facts.push({
      kind: 'hour', tone: 'info',
      text: `Pico de leads: ${String(peak.hour).padStart(2, '0')}h, com média de ${num1(peak.perDay)} leads por dia.`,
    });
    const comparableH = hours.filter(h => h.leads >= MIN_LEADS_FOR_COMPARISON && h.cpl !== null);
    if (comparableH.length >= 2) {
      const bestH = comparableH.reduce((a, b) => (b.cpl! < a.cpl! ? b : a));
      facts.push({
        kind: 'hour', tone: 'good',
        text: `Melhor CPL por horário: ${String(bestH.hour).padStart(2, '0')}h, com ${brl(bestH.cpl!)} por lead.`,
      });
    }
  }
  const quiet = hours.filter(h => h.spend > 0 && h.leads === 0).length;
  if (quiet >= 6) {
    facts.push({
      kind: 'hour', tone: 'warn',
      text: `${quiet} horas recebem investimento sem gerar nenhum lead no período.`,
    });
  }

  return { days, hasData: true, facts };
}

/** A IA redige a narrativa a partir dos fatos já calculados. Nunca calcula números. */
export async function narrateSegmentationFacts(
  tenantId: string, segmentId: string | null, days: number, facts: SegmentationFact[],
): Promise<string> {
  const factsText = facts.map(f => `- ${f.text}`).join('\n');
  return invokeWithTemplate({
    templateKey: 'segmentation_insights',
    segmentId,
    tenantId,
    variables: { period_days: String(days), facts: factsText },
    maxTokens: 700,
  });
}
