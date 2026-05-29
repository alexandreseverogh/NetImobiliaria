import { Pool } from 'pg';
import { MetaAdsAdapter, MetaCredentials } from './meta/metaAdsAdapter';
import type { AdNetworkService, NetworkCode, NetworkCredentials } from './types';

let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) _pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.MARKETING_DATABASE_URL?.split('?')[0] });
  return _pool;
}

/**
 * Returns a fully-configured AdNetworkService for the given network code and credentials.
 * Throws for unsupported (not-yet-implemented) networks.
 */
export function buildNetworkService(
  code: NetworkCode,
  credentials: NetworkCredentials,
): AdNetworkService {
  switch (code) {
    case 'meta':
      return new MetaAdsAdapter({
        access_token:       credentials.access_token       || '',
        ad_account_id:      credentials.ad_account_id      || '',
        app_id:             credentials.app_id,
        app_secret:         credentials.app_secret,
        // Campos adicionados na revisão 2026-05-29 (hotfix page_id + pixel)
        page_id:            credentials.page_id,
        pixel_id:           credentials.pixel_id,
        instagram_actor_id: credentials.instagram_actor_id,
      } as MetaCredentials);

    case 'google':
    case 'linkedin':
    case 'tiktok':
      throw new Error(`Rede "${code}" ainda não está implementada. Disponível na FASE 11.`);

    default:
      throw new Error(`Rede desconhecida: "${code}"`);
  }
}

/**
 * Loads tenant credentials from the DB and returns a ready adapter.
 * Falls back to legacy tenants columns for Meta if tenant_network_credentials is empty.
 */
export async function getNetworkServiceForTenant(
  tenantId: string,
  networkCode: NetworkCode,
): Promise<AdNetworkService> {
  const pool = getPool();

  // Try new tenant_network_credentials table first
  const res = await pool.query(
    `SELECT tnc.credentials, tnc.account_id, n.code
     FROM public.tenant_network_credentials tnc
     JOIN public.ad_networks n ON n.id = tnc.network_id
     WHERE tnc.tenant_id = $1::uuid
       AND n.code = $2
       AND tnc.is_active = true
     LIMIT 1`,
    [tenantId, networkCode],
  );

  if (res.rows[0]) {
    const { credentials, account_id } = res.rows[0];
    // credentials JSONB contém: access_token, app_id, app_secret,
    // page_id, pixel_id, instagram_actor_id (adicionados via Settings → Identidade Meta)
    const merged: NetworkCredentials = { ...credentials, ad_account_id: account_id };
    return buildNetworkService(networkCode, merged);
  }

  // Legacy fallback for Meta: use tenants columns directly
  if (networkCode === 'meta') {
    const legacy = await pool.query(
      `SELECT meta_token, meta_ad_account_id, meta_app_id, meta_app_secret
       FROM public.tenants WHERE id = $1::uuid LIMIT 1`,
      [tenantId],
    );
    const t = legacy.rows[0];
    if (t?.meta_token && t?.meta_ad_account_id) {
      return buildNetworkService('meta', {
        access_token:  t.meta_token,
        ad_account_id: t.meta_ad_account_id,
        app_id:        t.meta_app_id,
        app_secret:    t.meta_app_secret,
        // page_id não existe nas colunas legado — adapter lançará erro orientativo
      });
    }
  }

  throw new Error(
    `Tenant não possui credenciais configuradas para a rede "${networkCode}". ` +
    `Configure em Configurações → Redes de Anúncios.`,
  );
}

/**
 * Resolve os network_defaults do segmento para uma campanha.
 * Retorna {specialAdCategory, objective, customEventType, optimizationGoal, billingEvent}
 * com fallbacks seguros para não quebrar segmentos sem network_defaults.
 */
export async function resolveSegmentNetworkDefaults(
  tenantId: string,
  clientId: string | null | undefined,
  networkCode: NetworkCode,
): Promise<{
  specialAdCategory: string;
  objective: string;
  customEventType: string;
  optimizationGoal: string;
  billingEvent: string;
}> {
  const pool = getPool();

  let segmentId: string | null = null;

  if (clientId) {
    // Campanha para cliente: usa o segmento do cliente
    const clientRes = await pool.query(
      `SELECT segment_id FROM public.clientes WHERE uuid = $1::uuid AND tenant_id = $2::uuid LIMIT 1`,
      [clientId, tenantId],
    );
    segmentId = clientRes.rows[0]?.segment_id || null;
  }

  if (!segmentId) {
    // Campanha do próprio tenant: usa o segmento do tenant
    const tenantRes = await pool.query(
      `SELECT segment_id FROM public.tenants WHERE id = $1::uuid LIMIT 1`,
      [tenantId],
    );
    segmentId = tenantRes.rows[0]?.segment_id || null;
  }

  // Fallback gracioso: sem segmento ou sem network_defaults → defaults neutros
  const SAFE_DEFAULTS = {
    specialAdCategory: 'NONE',
    objective:         'OUTCOME_LEADS',
    customEventType:   'LEAD',
    optimizationGoal:  'LEAD_GENERATION',
    billingEvent:      'IMPRESSIONS',
  };

  if (!segmentId) return SAFE_DEFAULTS;

  const segRes = await pool.query(
    `SELECT network_defaults FROM public.system_segments WHERE id = $1::uuid LIMIT 1`,
    [segmentId],
  );

  const nd = segRes.rows[0]?.network_defaults?.[networkCode];
  if (!nd) return SAFE_DEFAULTS;

  const cats = nd.special_ad_categories;
  return {
    specialAdCategory: Array.isArray(cats) && cats.length > 0 ? cats[0] : 'NONE',
    objective:         nd.objective         || SAFE_DEFAULTS.objective,
    customEventType:   nd.custom_event_type || SAFE_DEFAULTS.customEventType,
    optimizationGoal:  nd.optimization_goal || SAFE_DEFAULTS.optimizationGoal,
    billingEvent:      nd.billing_event     || SAFE_DEFAULTS.billingEvent,
  };
}
