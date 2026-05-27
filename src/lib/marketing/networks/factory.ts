import { Pool } from 'pg';
import { MetaAdsAdapter, MetaCredentials } from './meta/metaAdsAdapter';
import type { AdNetworkService, NetworkCode, NetworkCredentials } from './types';

let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) _pool = new Pool({ connectionString: process.env.MARKETING_DATABASE_URL });
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
        access_token:  credentials.access_token  || '',
        ad_account_id: credentials.ad_account_id || '',
        app_id:        credentials.app_id,
        app_secret:    credentials.app_secret,
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
      });
    }
  }

  throw new Error(
    `Tenant não possui credenciais configuradas para a rede "${networkCode}". ` +
    `Configure em Configurações → Redes de Anúncios.`,
  );
}
