/**
 * GET /api/admin/campanhas/dashboard/revenue-attribution
 *
 * Visão 4 — Funil de Receita (docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md §5/§6, F6): CPA real e
 * ROAS real por campanha, atribuídos via leads_staging/leads_kanban (negócio fechado real).
 * Só disponível pra tenants com o módulo de CRM contratado (C+R) — sem CRM, `available:false`
 * com o motivo explícito (degradação graciosa — nunca finge um dado que o tenant não tem como
 * ter, ver DG2 do plano de testes).
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { hasCrmModule, getRevenueAttribution } from '@/lib/marketing/services/revenueAttributionService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const denied = await requireApiPermission(request, 'dashboard-campanhas', 'READ');
  if (denied) return denied;

  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawClientId = searchParams.get('clientId');
  const clientId = rawClientId === 'own' ? 'own' : (rawClientId || undefined);
  const periodDays = parseInt(searchParams.get('period') || '30', 10);

  try {
    const crmContratado = await hasCrmModule(payload.tenantId);
    if (!crmContratado) {
      return NextResponse.json({
        available: false,
        reason: 'crm_not_contracted',
        message: 'A Visão de Receita (CPA/ROAS real) exige o módulo de CRM contratado — sem ele não há como saber quais leads viraram negócio fechado.',
      });
    }

    const data = await getRevenueAttribution({
      tenantId: payload.tenantId,
      clientId,
      periodDays: Number.isFinite(periodDays) ? periodDays : 30,
    });

    return NextResponse.json({ available: true, ...data });
  } catch (e: any) {
    console.error('GET /dashboard/revenue-attribution error:', e);
    return NextResponse.json({ error: e.message || 'Erro ao calcular atribuição de receita' }, { status: 500 });
  }
}
