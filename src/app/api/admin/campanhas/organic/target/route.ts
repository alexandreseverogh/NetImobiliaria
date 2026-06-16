/**
 * GET /api/admin/campanhas/organic/target?clientId=own|<uuid>
 *
 * Resolve o destino Meta (Página do Facebook / conta Instagram) onde a
 * publicação orgânica será realizada, segundo a cascata cliente → tenant.
 * Best-effort: se o token/permissão falhar, devolve só os IDs configurados.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import pool from '@/lib/database/connection';
import { getNetworkServiceForTenant } from '@/lib/marketing/networks/factory';
import type { MetaAdsAdapter } from '@/lib/marketing/networks/meta/metaAdsAdapter';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const tenantId = payload.tenantId;
    const raw = new URL(request.url).searchParams.get('clientId');
    const clientId = (raw && raw !== 'own' && raw !== 'segment' && raw !== 'all') ? raw : null;

    // Nome do contexto selecionado (cliente ou própria empresa)
    let contextName = '';
    if (clientId) {
      const r = await pool.query(
        `SELECT nome FROM public.clientes WHERE uuid = $1::uuid AND tenant_id = $2::uuid LIMIT 1`,
        [clientId, tenantId],
      );
      contextName = r.rows[0]?.nome || 'Cliente';
    } else {
      const r = await pool.query(`SELECT name FROM public.tenants WHERE id = $1::uuid LIMIT 1`, [tenantId]);
      contextName = r.rows[0]?.name || 'Minha Empresa';
    }

    // De onde veio o page_id (override do cliente vs. herdado do tenant)
    let pageSource: 'client' | 'tenant' = clientId ? 'client' : 'tenant';
    if (clientId) {
      const c = await pool.query(
        `SELECT page_id FROM public.clientes WHERE uuid = $1::uuid AND tenant_id = $2::uuid LIMIT 1`,
        [clientId, tenantId],
      );
      if (!c.rows[0]?.page_id) pageSource = 'tenant'; // sem override → herda do tenant
    }

    try {
      const svc = await getNetworkServiceForTenant(tenantId, 'meta', clientId) as MetaAdsAdapter;
      if (!svc.configuredPageId) {
        return NextResponse.json({ configured: false, contextName, pageSource });
      }
      const info = await svc.getPageInfo();
      return NextResponse.json({
        configured: true,
        contextName,
        pageSource,
        pageId:            info.pageId,
        pageName:          info.pageName,
        instagramActorId:  info.instagramActorId,
        instagramUsername: info.instagramUsername,
      });
    } catch (e: any) {
      // Sem credenciais Meta → destino não configurado (mensagem acionável)
      return NextResponse.json({ configured: false, contextName, pageSource, reason: e.message });
    }
  } catch (err: any) {
    console.error('[organic/target]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
