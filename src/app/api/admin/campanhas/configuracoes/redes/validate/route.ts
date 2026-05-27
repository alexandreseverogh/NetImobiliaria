import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { getNetworkServiceForTenant } from '@/lib/marketing/networks/factory';
import pool from '@/lib/database/connection';
import type { NetworkCode } from '@/lib/marketing/networks/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/campanhas/configuracoes/redes/validate
 * Tests connectivity for a network using stored or provided credentials.
 *
 * Body: { network_code }
 */
export async function POST(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const tenantId = payload.tenantId;

    const { network_code } = await request.json() as { network_code: NetworkCode };
    if (!network_code) {
      return NextResponse.json({ error: 'network_code é obrigatório' }, { status: 400 });
    }

    const service = await getNetworkServiceForTenant(tenantId, network_code);
    const result  = await service.validateCredentials();

    if (result.valid) {
      // Update last_validated timestamp
      await pool.query(
        `UPDATE public.tenant_network_credentials tnc
         SET last_validated = now(), updated_at = now()
         FROM public.ad_networks n
         WHERE tnc.network_id = n.id
           AND tnc.tenant_id = $1::uuid
           AND n.code = $2`,
        [tenantId, network_code],
      );
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ valid: false, error: err.message }, { status: 200 });
  }
}
