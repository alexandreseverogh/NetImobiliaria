/**
 * FASE 18.2 — Exogenous Trends Service (dirigido por segmento)
 * Busca sinais reais do Google Trends via google-trends-api, com termos vindos do
 * banco (segment_angle_terms) por segmento. ZERO MOCK, ZERO HARDCODE.
 * Se a API falhar, score = null (nunca inventa valores).
 */

// google-trends-api não tem types oficiais — importação via require
// eslint-disable-next-line @typescript-eslint/no-var-requires
const googleTrends = require('google-trends-api');

import { getSegmentSearchTerms } from './segmentTaxonomyService';

export interface AngleTrendScore {
  angle:     string;          // angle_slug
  label:     string;
  term:      string;
  score:     number | null;   // null = indisponível (sem mock)
  source:    'trends' | 'unavailable';
  rawValues?: number[];
  error?:    string;
}

const GEO       = 'BR';
const LOCALE    = 'pt-BR';
const TIMEZONE  = -180; // BRT
const DAYS_BACK = 30;
const REQUEST_DELAY_MS = 2500;

function computeScore(timelineData: any[]): number {
  const recent = timelineData.slice(-7);
  if (recent.length === 0) return 0;
  const sum = recent.reduce((acc: number, pt: any) => acc + (pt?.value?.[0] ?? 0), 0);
  return Math.round(Math.min(100, Math.max(0, sum / recent.length)));
}

/**
 * Busca score real (0-100) do Google Trends para um termo. null se a API falhar.
 */
async function fetchTermScore(term: string): Promise<{ score: number | null; rawValues?: number[]; error?: string }> {
  try {
    const startTime = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000);
    const endTime   = new Date();

    const raw: string = await googleTrends.interestOverTime({
      keyword: term, geo: GEO, startTime, endTime, hl: LOCALE, timezone: TIMEZONE,
    });

    const json = JSON.parse(raw);
    const timelineData: any[] = json?.default?.timelineData ?? [];
    if (timelineData.length === 0) return { score: null, error: 'empty_timeline' };

    const rawValues = timelineData.map((pt: any) => pt?.value?.[0] ?? 0) as number[];
    return { score: computeScore(timelineData), rawValues };
  } catch (err: any) {
    const msg: string = err?.message ?? String(err);
    const reason = msg.includes('429') ? 'rate_limited'
      : msg.includes('403')            ? 'forbidden'
      : msg.includes('not valid JSON') ? 'html_response'
      : 'fetch_error';
    return { score: null, error: reason };
  }
}

/**
 * Busca scores reais para todos os ângulos de um segmento (termos do banco),
 * sequencialmente com delay para respeitar o rate-limit do Google.
 * Quando um ângulo tem vários termos, usa a média dos scores disponíveis.
 */
export async function fetchSegmentAngleScores(segmentId: string): Promise<AngleTrendScore[]> {
  const terms = await getSegmentSearchTerms(segmentId);
  if (terms.length === 0) return [];

  // Agrupa termos por ângulo
  const byAngle = new Map<string, { label: string; terms: string[] }>();
  for (const t of terms) {
    if (!byAngle.has(t.angle)) byAngle.set(t.angle, { label: t.label, terms: [] });
    byAngle.get(t.angle)!.terms.push(t.term);
  }

  const results: AngleTrendScore[] = [];
  const angleEntries = Array.from(byAngle.entries());

  for (let ai = 0; ai < angleEntries.length; ai++) {
    const [angle, { label, terms: angleTerms }] = angleEntries[ai];
    const scores: number[] = [];
    let lastRaw: number[] | undefined;
    let lastError: string | undefined;
    let primaryTerm = angleTerms[0];

    for (let ti = 0; ti < angleTerms.length; ti++) {
      const r = await fetchTermScore(angleTerms[ti]);
      if (r.score !== null) {
        scores.push(r.score);
        lastRaw = r.rawValues;
      } else {
        lastError = r.error;
      }
      // delay entre requests (exceto após o último de todos)
      const isLast = ai === angleEntries.length - 1 && ti === angleTerms.length - 1;
      if (!isLast) await new Promise(res => setTimeout(res, REQUEST_DELAY_MS));
    }

    if (scores.length > 0) {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      results.push({ angle, label, term: primaryTerm, score: avg, source: 'trends', rawValues: lastRaw });
    } else {
      results.push({ angle, label, term: primaryTerm, score: null, source: 'unavailable', error: lastError });
    }
  }

  return results;
}
