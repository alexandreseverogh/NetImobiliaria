/**
 * Sugestão de segmentação (público e horário) para uma nova campanha Meta, baseada no histórico
 * de desempenho por quebra da PRÓPRIA empresa (InsightBreakdown).
 *
 * Regras (sem número mágico por segmento ou empresa):
 * - Volume mínimo: `min_leads_scale` pela cascata de benchmarks (cliente → empresa → segmento →
 *   padrão). É curado por segmento e pode ser ajustado por empresa/cliente.
 * - Confiança: uma faixa só é recomendada quando o número de leads observados é
 *   estatisticamente maior que o esperado pela taxa média da campanha (teste de Poisson, z ≥ Z).
 *   Assim, a recomendação depende da diferença real entre faixas, não só do tamanho da amostra.
 *
 * Esta camada só RECOMENDA. Nunca altera campanha, orçamento ou público sozinha.
 */
import pool from '@/lib/database/connection';
import { resolveSegment } from '@/lib/intelligence/segmentResolver';
import { resolveBenchmarks } from '@/lib/intelligence/benchmarkResolver';

/** z de 1,645 ≈ 95% de confiança unilateral (convenção estatística; não é ajuste por segmento). */
export const SUGGESTION_Z_CRITICAL = 1.645;
/** Janela de histórico usada para a sugestão. */
export const SUGGESTION_WINDOW_DAYS = 60;

interface BreakdownAgg {
  key: string;
  leads: number;
  spend: number;
}

export interface FieldEvidence {
  key: string;
  cpl: number | null;
  leads: number;
  z: number;
}

export interface SegmentSuggestion {
  ready: boolean;
  reason?: string;
  segmentName: string | null;
  windowDays: number;
  minLeads: number;
  totalLeads: number;
  overallCpl: number | null;
  fields: {
    ageMin?: number;
    ageMax?: number;
    genders?: number[];
    scheduleStartHour?: number;
    scheduleEndHour?: number;
    regions?: string[];
  };
  evidence: {
    age: FieldEvidence[];
    gender: FieldEvidence[];
    hour: FieldEvidence[];
    region: FieldEvidence[];
  };
}

const EMPTY: Omit<SegmentSuggestion, 'ready' | 'reason'> = {
  segmentName: null, windowDays: SUGGESTION_WINDOW_DAYS, minLeads: 0, totalLeads: 0, overallCpl: null,
  fields: {}, evidence: { age: [], gender: [], hour: [], region: [] },
};

/** Teste de Poisson: leads observados vs. esperados se a taxa do campo fosse a média da campanha. */
function zScore(leads: number, spend: number, overallRate: number): number {
  const expected = overallRate * spend;
  if (expected <= 0) return 0;
  return (leads - expected) / Math.sqrt(expected);
}

/** "25-34" → [25, 34]; "65+" → [65, 65] (teto de idade da Meta). */
function parseAgeRange(key: string): [number, number] | null {
  const base = key.split('|')[0];
  if (base.endsWith('+')) {
    const lo = parseInt(base, 10);
    return Number.isFinite(lo) ? [lo, 65] : null;
  }
  const [a, b] = base.split('-').map(s => parseInt(s, 10));
  return Number.isFinite(a) && Number.isFinite(b) ? [a, b] : null;
}

function analyze(rows: BreakdownAgg[], overallRate: number, minLeads: number): (BreakdownAgg & { cpl: number | null; z: number; recommended: boolean })[] {
  return rows.map(r => {
    const z = zScore(r.leads, r.spend, overallRate);
    const cpl = r.leads > 0 ? r.spend / r.leads : null;
    const recommended = r.leads >= minLeads && z >= SUGGESTION_Z_CRITICAL && r.spend > 0;
    return { ...r, cpl, z, recommended };
  });
}

function toEvidence(rows: ReturnType<typeof analyze>): FieldEvidence[] {
  return rows
    .filter(r => r.recommended)
    .map(r => ({ key: r.key, cpl: r.cpl, leads: r.leads, z: Math.round(r.z * 100) / 100 }));
}

export async function getSegmentSuggestion(tenantId: string, clientId: string | null): Promise<SegmentSuggestion> {
  // Erro de banco NÃO vira "sem segmento": deixa propagar para o endpoint tratar como falha.
  const segment = await resolveSegment(tenantId, clientId);
  if (!segment) {
    return { ...EMPTY, ready: false, reason: 'Esta empresa ainda não tem segmento definido.' };
  }

  const benchmarks = await resolveBenchmarks(['min_leads_scale'], tenantId, segment.id, clientId, 'meta');
  const minLeads = benchmarks.min_leads_scale ?? 0;

  // Campanhas do escopo: da empresa (client_id nulo) ou de um cliente específico.
  const { rows: campRows } = await pool.query(
    `SELECT id FROM campanhasmarketingdigital."Campaign"
      WHERE tenant_id = $1::uuid AND client_id IS NOT DISTINCT FROM $2::uuid`,
    [tenantId, clientId],
  );
  const campaignIds = campRows.map((r: any) => r.id);
  if (campaignIds.length === 0) {
    return { ...EMPTY, segmentName: segment.name, minLeads, ready: false, reason: 'Ainda não há campanhas nesta empresa para aprender com o histórico.' };
  }

  const { rows } = await pool.query(
    `SELECT breakdown_type, breakdown_key,
            COALESCE(SUM(leads), 0)::int AS leads,
            COALESCE(SUM(spend), 0)::float AS spend
       FROM campanhasmarketingdigital."InsightBreakdown"
      WHERE tenant_id = $1::uuid
        AND campaign_id = ANY($2::text[])
        AND date >= CURRENT_DATE - ($3::int * INTERVAL '1 day')
      GROUP BY breakdown_type, breakdown_key`,
    [tenantId, campaignIds, SUGGESTION_WINDOW_DAYS],
  );

  const byType = (t: string): BreakdownAgg[] =>
    rows.filter((r: any) => r.breakdown_type === t).map((r: any) => ({ key: r.breakdown_key, leads: r.leads, spend: r.spend }));

  const ageGender = byType('age_gender');
  const totalLeads = ageGender.reduce((s, r) => s + r.leads, 0);
  const totalSpend = ageGender.reduce((s, r) => s + r.spend, 0);
  const overallRate = totalSpend > 0 ? totalLeads / totalSpend : 0;
  const overallCpl = totalLeads > 0 ? totalSpend / totalLeads : null;

  if (totalLeads < minLeads) {
    return {
      ...EMPTY, segmentName: segment.name, minLeads, totalLeads, overallCpl,
      ready: false,
      reason: `Histórico insuficiente: ${totalLeads} lead(s) nos últimos ${SUGGESTION_WINDOW_DAYS} dias (mínimo do segmento: ${minLeads}).`,
    };
  }

  // Idade e gênero vêm da mesma quebra "idade|gênero".
  const ageRows = new Map<string, BreakdownAgg>();
  const genderRows = new Map<string, BreakdownAgg>();
  for (const r of ageGender) {
    const [age, gender] = r.key.split('|');
    const a = ageRows.get(age) ?? { key: age, leads: 0, spend: 0 };
    a.leads += r.leads; a.spend += r.spend; ageRows.set(age, a);
    if (gender) {
      const g = genderRows.get(gender) ?? { key: gender, leads: 0, spend: 0 };
      g.leads += r.leads; g.spend += r.spend; genderRows.set(gender, g);
    }
  }
  const ageAnalyzed = analyze([...ageRows.values()], overallRate, minLeads);
  const genderAnalyzed = analyze([...genderRows.values()], overallRate, minLeads);

  const hourAnalyzed = analyze(byType('hour'), overallRate, minLeads);
  const regionAnalyzed = analyze(byType('region'), overallRate, minLeads);

  const fields: SegmentSuggestion['fields'] = {};

  // Sinal, não ruído: se a recomendação cobre mais da metade das células de uma dimensão, ela
  // não discrimina nada (ex.: "todas as horas são boas") e não vira sugestão de campo.
  const notDiscriminating = (recCount: number, total: number) => total > 0 && recCount / total > 0.5;

  const recAgeRows = ageAnalyzed.filter(r => r.recommended);
  const recAges = recAgeRows.map(r => parseAgeRange(r.key)).filter(Boolean) as [number, number][];
  if (recAges.length > 0 && !notDiscriminating(recAgeRows.length, ageAnalyzed.length)) {
    fields.ageMin = Math.min(...recAges.map(x => x[0]));
    fields.ageMax = Math.max(...recAges.map(x => x[1]));
  }

  const recGenders = genderAnalyzed.filter(r => r.recommended).map(r => r.key);
  if (recGenders.length > 0 && recGenders.length < 2) {
    // Meta: 1 = masculino, 2 = feminino. Só sugere gênero quando há diferença real (um só vence).
    fields.genders = recGenders.map(g => (g === 'male' ? 1 : 2));
  }

  const recHourRows = hourAnalyzed.filter(r => r.recommended);
  const recHours = recHourRows.map(r => parseInt(r.key, 10)).filter(Number.isFinite);
  if (recHours.length > 0 && !notDiscriminating(recHourRows.length, hourAnalyzed.length)) {
    fields.scheduleStartHour = Math.min(...recHours);
    fields.scheduleEndHour = Math.min(24, Math.max(...recHours) + 1);
  }

  const recRegionRows = regionAnalyzed.filter(r => r.recommended);
  if (recRegionRows.length > 0 && !notDiscriminating(recRegionRows.length, regionAnalyzed.length)) {
    fields.regions = recRegionRows.map(r => r.key);
  }

  return {
    ready: true,
    segmentName: segment.name,
    windowDays: SUGGESTION_WINDOW_DAYS,
    minLeads,
    totalLeads,
    overallCpl,
    fields,
    evidence: {
      age: toEvidence(ageAnalyzed),
      gender: toEvidence(genderAnalyzed),
      hour: toEvidence(hourAnalyzed),
      region: toEvidence(regionAnalyzed),
    },
  };
}
