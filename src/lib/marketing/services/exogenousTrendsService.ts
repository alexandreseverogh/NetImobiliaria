/**
 * FASE 18.1 — Exogenous Trends Service
 * Busca sinais de demanda reais do Google Trends via google-trends-api.
 * ZERO MOCK — se a API falhar, retorna null. Nunca inventa valores.
 *
 * Nota: Funciona de forma confiável no VPS (1 req/dia por ângulo, IP dedicado).
 * Em localhost pode receber 429 se o IP local já atingiu rate-limit do Google.
 */

// google-trends-api não tem types oficiais — importação via require
// eslint-disable-next-line @typescript-eslint/no-var-requires
const googleTrends = require('google-trends-api');

export type TrendAngle =
  | 'investment'
  | 'lifestyle'
  | 'family'
  | 'price'
  | 'urgency'
  | 'social'
  | 'luxury'
  | 'other';

export interface TrendScore {
  angle:  TrendAngle;
  score:  number | null;   // null = dado não disponível (sem mock)
  term:   string;
  source: 'trends' | 'unavailable';
  rawValues?: number[];
  error?: string;
}

// Termos primários PT-BR por ângulo (espelho do seed SQL)
const PRIMARY_TERMS: Record<TrendAngle, string> = {
  investment: 'apartamento para investimento',
  lifestyle:  'apartamento de luxo',
  family:     'apartamento família',
  price:      'apartamento barato',
  urgency:    'lançamento imobiliário',
  social:     'condomínio clube',
  luxury:     'apartamento alto padrão',
  other:      'comprar imóvel',
};

const GEO        = 'BR';
const LOCALE     = 'pt-BR';
const TIMEZONE   = -180; // BRT = UTC-3
const DAYS_BACK  = 30;

/**
 * Calcula score 0-100 como média dos últimos 7 dias da série.
 */
function computeScore(timelineData: any[]): number {
  const recent = timelineData.slice(-7);
  if (recent.length === 0) return 0;
  const sum = recent.reduce((acc: number, pt: any) => acc + (pt?.value?.[0] ?? 0), 0);
  return Math.round(Math.min(100, Math.max(0, sum / recent.length)));
}

/**
 * Busca score real do Google Trends para um ângulo.
 * Retorna null no score se a API não responder ou rate-limitar.
 */
export async function fetchAngleScore(angle: TrendAngle): Promise<TrendScore> {
  const term = PRIMARY_TERMS[angle];

  try {
    const startTime = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000);
    const endTime   = new Date();

    const raw: string = await googleTrends.interestOverTime({
      keyword:   term,
      geo:       GEO,
      startTime,
      endTime,
      hl:        LOCALE,
      timezone:  TIMEZONE,
    });

    const json = JSON.parse(raw);
    const timelineData: any[] = json?.default?.timelineData ?? [];

    if (timelineData.length === 0) {
      return { angle, score: null, term, source: 'unavailable', error: 'empty_timeline' };
    }

    const rawValues = timelineData.map((pt: any) => pt?.value?.[0] ?? 0) as number[];
    const score     = computeScore(timelineData);

    return { angle, score, term, source: 'trends', rawValues };

  } catch (err: any) {
    const msg: string = err?.message ?? String(err);
    const reason = msg.includes('429') ? 'rate_limited'
      : msg.includes('403')           ? 'forbidden'
      : msg.includes('not valid JSON') ? 'html_response'
      : 'fetch_error';

    console.warn(`[exogenousTrends] ${angle} — ${reason}: ${msg.slice(0, 120)}`);
    return { angle, score: null, term, source: 'unavailable', error: reason };
  }
}

/**
 * Busca scores reais para todos os 8 ângulos em sequência com delay entre
 * requests para reduzir chance de rate-limit (usado no cron diário).
 */
export async function fetchAllAngleScoresCron(): Promise<TrendScore[]> {
  const angles: TrendAngle[] = [
    'investment', 'lifestyle', 'family', 'price',
    'urgency', 'social', 'luxury', 'other',
  ];

  const results: TrendScore[] = [];
  for (const angle of angles) {
    const score = await fetchAngleScore(angle);
    results.push(score);
    // Delay entre requests para não saturar rate-limit
    if (results.length < angles.length) {
      await new Promise(r => setTimeout(r, 2500));
    }
  }
  return results;
}

/**
 * Busca scores em paralelo (usado para on-the-fly se necessário).
 * Menos gentil com o rate-limit — preferir fetchAllAngleScoresCron no cron.
 */
export async function fetchAllAngleScores(): Promise<TrendScore[]> {
  const angles: TrendAngle[] = [
    'investment', 'lifestyle', 'family', 'price',
    'urgency', 'social', 'luxury', 'other',
  ];

  const results = await Promise.allSettled(angles.map(fetchAngleScore));
  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return {
      angle: angles[i],
      score: null,
      term:  PRIMARY_TERMS[angles[i]],
      source: 'unavailable' as const,
      error:  r.reason?.message ?? 'promise_rejected',
    };
  });
}
