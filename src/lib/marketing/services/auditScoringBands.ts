import pool from '@/lib/database/connection';

/**
 * Faixas de pontuação da auditoria (tabela campanhasmarketingdigital.audit_scoring_bands).
 * Carregadas uma vez por segmento. Nenhum número de decisão fica no código: pesos, notas,
 * limites de faixa, cortes de status e limiares de problema/oportunidade vêm daqui.
 *
 * Falha explícita: se o segmento não tiver a faixa, lança erro (não usa fallback silencioso).
 */

export type Comparison = 'lte' | 'lt' | 'gte' | 'gt' | 'any';

export interface AuditBand {
  dimension:  string;
  ruleKey:    string;
  sortOrder:  number;
  comparison: Comparison;
  bound:      number | null;
  score:      number;
  label:      string | null;
}

export interface AuditBandSet {
  segmentId: string;
  bands: AuditBand[];
}

export class AuditBandMissingError extends Error {
  constructor(segmentId: string, dimension: string, ruleKey: string) {
    super(`Pontuação da auditoria sem faixa configurada: segmento ${segmentId}, ${dimension}/${ruleKey}`);
    this.name = 'AuditBandMissingError';
  }
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; value: Promise<AuditBandSet> }>();

export function loadAuditBands(segmentId: string): Promise<AuditBandSet> {
  const hit = cache.get(segmentId);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  {
    const value = (async () => {
      const res = await pool.query(
        `SELECT dimension, rule_key, sort_order, comparison, bound_value, score, label
         FROM campanhasmarketingdigital.audit_scoring_bands
         WHERE segment_id = $1::uuid
         ORDER BY dimension, rule_key, sort_order`,
        [segmentId],
      );
      const bands: AuditBand[] = res.rows.map(r => ({
        dimension:  r.dimension,
        ruleKey:    r.rule_key,
        sortOrder:  Number(r.sort_order),
        comparison: r.comparison as Comparison,
        bound:      r.bound_value == null ? null : Number(r.bound_value),
        score:      Number(r.score),
        label:      r.label,
      }));
      return { segmentId, bands };
    })();
    cache.set(segmentId, { at: Date.now(), value });
    return value;
  }
}

/** Limpa o cache (usado após gravação pela tela do Master). */
export function invalidateAuditBands(segmentId?: string) {
  if (segmentId) cache.delete(segmentId); else cache.clear();
}

function rulesOf(set: AuditBandSet, dimension: string, ruleKey: string): AuditBand[] {
  const rows = set.bands.filter(b => b.dimension === dimension && b.ruleKey === ruleKey);
  if (rows.length === 0) throw new AuditBandMissingError(set.segmentId, dimension, ruleKey);
  return rows;
}

function matches(band: AuditBand, x: number): boolean {
  if (band.comparison === 'any') return true;
  const bound = band.bound as number;
  switch (band.comparison) {
    case 'lte': return x <= bound;
    case 'lt':  return x <  bound;
    case 'gte': return x >= bound;
    case 'gt':  return x >  bound;
  }
}

/** Primeira faixa (por sort_order) que casa com x. */
export function bandFor(set: AuditBandSet, dimension: string, ruleKey: string, x: number): AuditBand {
  const rows = rulesOf(set, dimension, ruleKey);
  const hit = rows.find(r => matches(r, x));
  if (!hit) throw new AuditBandMissingError(set.segmentId, dimension, ruleKey);
  return hit;
}

/** Nota da primeira faixa que casa com x. */
export function scoreByBands(set: AuditBandSet, dimension: string, ruleKey: string, x: number): number {
  return bandFor(set, dimension, ruleKey, x).score;
}

/** Valor único de uma regra (peso, nota-base, referência, corte). */
export function singleValue(set: AuditBandSet, dimension: string, ruleKey: string): number {
  const rows = rulesOf(set, dimension, ruleKey);
  return rows[0].score;
}

/** Status de uma dimensão a partir da nota, pelos cortes configurados para essa dimensão. */
export function statusFor(set: AuditBandSet, dimension: string, score: number): 'ok' | 'warn' | 'critical' {
  const okMin   = singleValue(set, dimension, 'status_ok_min');
  const warnMin = singleValue(set, dimension, 'status_warn_min');
  if (score >= okMin) return 'ok';
  if (score >= warnMin) return 'warn';
  return 'critical';
}
