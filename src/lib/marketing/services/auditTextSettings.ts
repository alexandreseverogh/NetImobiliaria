import pool from '@/lib/database/connection';

/**
 * Textos e limites da auditoria por segmento (campanhasmarketingdigital.audit_text_settings).
 * Nenhum número de estimativa ou limite de exibição fica no código: tudo vem daqui.
 * Falha explícita se o segmento não tiver um parâmetro (não usa valor silencioso).
 */

export interface AuditTextParam {
  min: number;
  max: number | null;
}

export class AuditTextMissingError extends Error {
  constructor(segmentId: string, key: string) {
    super(`Texto da auditoria sem parâmetro configurado: segmento ${segmentId}, ${key}`);
    this.name = 'AuditTextMissingError';
  }
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; value: Promise<Map<string, AuditTextParam>> }>();

export function loadAuditTexts(segmentId: string): Promise<Map<string, AuditTextParam>> {
  const hit = cache.get(segmentId);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  const value = (async () => {
    const res = await pool.query(
      `SELECT param_key, value_min, value_max
       FROM campanhasmarketingdigital.audit_text_settings
       WHERE segment_id = $1::uuid`,
      [segmentId],
    );
    return new Map<string, AuditTextParam>(
      res.rows.map(r => [r.param_key, {
        min: Number(r.value_min),
        max: r.value_max == null ? null : Number(r.value_max),
      }]),
    );
  })();
  cache.set(segmentId, { at: Date.now(), value });
  return value;
}

export function invalidateAuditTexts(segmentId?: string) {
  if (segmentId) cache.delete(segmentId); else cache.clear();
}

/** Parâmetro obrigatório; lança se ausente. */
export function textParam(map: Map<string, AuditTextParam>, segmentId: string, key: string): AuditTextParam {
  const p = map.get(key);
  if (!p) throw new AuditTextMissingError(segmentId, key);
  return p;
}

/** Formata um intervalo como "15–30" ou um valor único como "40". */
export function formatRange(p: AuditTextParam): string {
  return p.max == null ? String(p.min) : `${p.min}–${p.max}`;
}
