/**
 * GET /api/admin/campanhas/realocacoes
 *
 * docs/PLANO_TIKTOK.md §8.6 — superfícies de UI do motor de realocação cross-rede (T4):
 * "oportunidades vivas" (propostas aguardando aprovação, o gancho do card no dashboard e da
 * seção "Para onde mover" no Desperdício) + "histórico" (o que já foi decidido/executado, com
 * o veredito D+14 quando disponível — a prova de valor do módulo pro gestor).
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const denied = await requireApiPermission(request, 'dashboard-campanhas', 'READ');
  if (denied) return denied;

  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  let clientId = searchParams.get('clientId');
  if (clientId === 'segment' || clientId === 'all') clientId = null;
  const historyLimit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));

  const clientWhere: any = {};
  if (clientId === 'own') clientWhere.clientId = null;
  else if (clientId) clientWhere.clientId = clientId;

  try {
    const [live, history] = await Promise.all([
      prisma.budgetReallocation.findMany({
        where: { tenantId: payload.tenantId, status: 'PROPOSED', ...clientWhere },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.budgetReallocation.findMany({
        where: {
          tenantId: payload.tenantId,
          status: { in: ['EXECUTED', 'MEASURED', 'REJECTED', 'BLOCKED'] },
          ...clientWhere,
        },
        orderBy: { createdAt: 'desc' },
        take: historyLimit,
      }),
    ]);

    return NextResponse.json({ live, history });
  } catch (e: any) {
    console.error('GET /campanhas/realocacoes error:', e);
    return NextResponse.json({ error: e.message || 'Erro ao carregar realocações' }, { status: 500 });
  }
}
