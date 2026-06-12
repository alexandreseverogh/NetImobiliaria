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

/** Busca interesses reais na Meta Targeting Search API. */
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
