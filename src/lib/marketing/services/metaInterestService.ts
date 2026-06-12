/**
 * FASE 18.4 — Meta Interest Service
 * Resolve o access_token do tenant e busca interesses reais na Meta Targeting API.
 * IDs de interesse do Meta são globais (não dependem da conta que busca).
 */

import pool from '@/lib/database/connection';
import axios from 'axios';

export interface MetaInterest {
  id:            string;
  name:          string;
  audienceLower?: number;
  audienceUpper?: number;
  path?:         string[];
}

/** access_token do tenant (tenant_network_credentials → fallback legado). */
export async function resolveMetaAccessToken(tenantId: string): Promise<string | null> {
  const credRes = await pool.query(
    `SELECT tnc.credentials
     FROM public.tenant_network_credentials tnc
     JOIN public.ad_networks n ON n.id = tnc.network_id
     WHERE tnc.tenant_id = $1::uuid AND n.code = 'meta' AND tnc.is_active = true
     LIMIT 1`,
    [tenantId],
  );
  if (credRes.rows[0]?.credentials?.access_token) return credRes.rows[0].credentials.access_token;

  const legacy = await pool.query(
    `SELECT meta_token FROM public.tenants WHERE id = $1::uuid LIMIT 1`,
    [tenantId],
  );
  return legacy.rows[0]?.meta_token || null;
}

/** Busca interesses reais na Meta Targeting Search API (chamada direta, sem cache). */
export async function searchMetaInterests(
  accessToken: string,
  query: string,
  limit = 6,
): Promise<MetaInterest[]> {
  if (query.trim().length < 2) return [];
  const res = await axios.get('https://graph.facebook.com/v18.0/search', {
    params: {
      type:         'adinterest',
      q:            query.trim(),
      limit,
      locale:       'pt_BR',
      access_token: accessToken,
    },
    timeout: 8000,
  });
  const raw: any[] = res.data?.data || [];
  return raw.map(item => ({
    id:            String(item.id),
    name:          item.name as string,
    audienceLower: item.audience_size_lower_bound as number | undefined,
    audienceUpper: item.audience_size_upper_bound as number | undefined,
    path:          Array.isArray(item.path) ? item.path : [],
  }));
}

const CACHE_TTL_DAYS = 30;
const S = 'campanhasmarketingdigital';
const normTerm = (q: string) => q.trim().toLowerCase().slice(0, 200);

/**
 * Busca com cache: evita rechamadas ao endpoint adinterest (rate-limit).
 *  - hit fresco (< TTL) → retorna do banco, sem chamar a Meta.
 *  - miss/expirado → chama a Meta, grava no cache.
 *  - erro da Meta (ex: rate-limit) → serve cache STALE se existir; senão relança.
 * IDs de interesse do Meta são globais → cache compartilhado por termo.
 */
export async function searchMetaInterestsCached(
  accessToken: string,
  query: string,
  limit = 6,
  geo = 'BR',
  locale = 'pt_BR',
): Promise<MetaInterest[]> {
  const term = normTerm(query);
  if (term.length < 2) return [];

  // 1. Cache fresco?
  let staleResults: MetaInterest[] | null = null;
  try {
    const { rows } = await pool.query(
      `SELECT results, fetched_at FROM ${S}.meta_interest_cache
       WHERE query_term = $1 AND geo = $2 AND locale = $3 LIMIT 1`,
      [term, geo, locale],
    );
    if (rows[0]) {
      const ageDays = (Date.now() - new Date(rows[0].fetched_at).getTime()) / 86400000;
      const results = rows[0].results as MetaInterest[];
      if (ageDays < CACHE_TTL_DAYS) return results;       // hit fresco
      staleResults = results;                              // guarda p/ fallback
    }
  } catch { /* cache lookup não-fatal */ }

  // 2. Chama a Meta
  try {
    const results = await searchMetaInterests(accessToken, query, limit);
    // grava no cache (upsert)
    try {
      await pool.query(
        `INSERT INTO ${S}.meta_interest_cache (query_term, geo, locale, results, fetched_at)
         VALUES ($1, $2, $3, $4::jsonb, NOW())
         ON CONFLICT (query_term, geo, locale)
         DO UPDATE SET results = EXCLUDED.results, fetched_at = NOW()`,
        [term, geo, locale, JSON.stringify(results)],
      );
    } catch { /* cache write não-fatal */ }
    return results;
  } catch (err) {
    // 3. Meta falhou — serve cache stale se houver
    if (staleResults) return staleResults;
    throw err;
  }
}
