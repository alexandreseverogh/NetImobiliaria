import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { getNetworkServiceForTenant } from '@/lib/marketing/networks/factory';
import type { AccountBalanceResult, NetworkCode } from '@/lib/marketing/networks/types';

export const dynamic = 'force-dynamic';

interface NetworkBalanceEntry {
  code: string;
  name: string;
  icon: string | null;
  color: string | null;
  contracted: boolean;
  connected: boolean;
  balance: AccountBalanceResult | null;
}

/**
 * GET /api/admin/campanhas/configuracoes/redes/balance
 *
 * Saldo disponível para lançamento de campanhas, por rede — consumido no topo de
 * /admin/campanhas/nova (gestão do saldo antes de o tenant lançar campanha paga). Reaproveita
 * exatamente a mesma resolução de contratação+conexão já usada por
 * GET /api/admin/campanhas/configuracoes/redes (`contracted`/`connected`) — só chama a rede
 * real (`fetchAccountBalance`) para quem já está contratado E conectado, pra nunca gastar uma
 * chamada de API em credencial que nem existe.
 *
 * Nunca lança 500 por falha de UMA rede — cada entrada reporta o próprio estado
 * (`unavailableReason` dentro de `balance`, ou `balance: null` quando nem foi tentado).
 */
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const tenantId = payload.tenantId;
    const isMaster = payload.is_system_role === true;

    const res = await pool.query(
      `SELECT
         n.code,
         n.name,
         n.icon,
         n.color,
         CASE WHEN tnc.id IS NOT NULL AND tnc.is_active THEN true ELSE false END AS connected,
         CASE WHEN $2::boolean THEN true ELSE COALESCE(tfo.is_active, false) END AS contracted
       FROM public.ad_networks n
       LEFT JOIN public.tenant_network_credentials tnc
         ON tnc.network_id = n.id AND tnc.tenant_id = $1::uuid
       LEFT JOIN public.system_features sf
         ON sf.slug = 'campanhas-rede-' || n.code
       LEFT JOIN public.tenant_feature_overrides tfo
         ON tfo.feature_id = sf.id AND tfo.tenant_id = $1::uuid
       WHERE n.code <> 'linkedin'
       ORDER BY n.sort_order, n.name`,
      [tenantId, isMaster],
    );

    const entries: NetworkBalanceEntry[] = await Promise.all(
      res.rows.map(async (row): Promise<NetworkBalanceEntry> => {
        const base = {
          code: row.code,
          name: row.name,
          icon: row.icon,
          color: row.color,
          contracted: row.contracted,
          connected: row.connected,
        };

        if (!row.contracted || !row.connected) {
          return { ...base, balance: null };
        }

        try {
          const service = await getNetworkServiceForTenant(tenantId, row.code as NetworkCode);
          if (typeof service.fetchAccountBalance !== 'function') {
            return {
              ...base,
              balance: {
                network: row.code as NetworkCode,
                currency: null,
                amountSpent: null,
                spendCap: null,
                available: null,
                balanceDue: null,
                isPrepay: null,
                fundingSourceType: null,
                checkedAt: new Date().toISOString(),
                unavailableReason: `Consulta de saldo ainda não implementada para a rede "${row.name}".`,
              },
            };
          }
          const balance = await service.fetchAccountBalance();
          return { ...base, balance };
        } catch (err: any) {
          return {
            ...base,
            balance: {
              network: row.code as NetworkCode,
              currency: null,
              amountSpent: null,
              spendCap: null,
              available: null,
              balanceDue: null,
              isPrepay: null,
              fundingSourceType: null,
              checkedAt: new Date().toISOString(),
              unavailableReason: err?.message || `Erro ao consultar saldo da rede "${row.name}".`,
            },
          };
        }
      }),
    );

    return NextResponse.json({ networks: entries });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
