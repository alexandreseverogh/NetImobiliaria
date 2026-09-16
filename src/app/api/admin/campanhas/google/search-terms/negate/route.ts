import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import prisma from '@/lib/marketing/prisma';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { applyNegation } from '@/lib/marketing/services/googleNegationCore';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/campanhas/google/search-terms/negate
 * FASE 1 (Google Ads) A7 — negativação manual (revisão humana), complementar ao agente
 * automático (A6). Body: { campaignId, searchTerm, matchType }.
 */
export async function POST(request: NextRequest) {
  try {
    const denied = await requireApiPermission(request, 'campanhasmarketingdigital', 'UPDATE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const tenantId = payload.tenantId;

    const body = await request.json();
    const { campaignId, searchTerm, matchType } = body as {
      campaignId?: string; searchTerm?: string; matchType?: string;
    };
    if (!campaignId || !searchTerm || !matchType) {
      return NextResponse.json({ error: 'campaignId, searchTerm e matchType são obrigatórios' }, { status: 400 });
    }

    // Valida que a campanha é Google e pertence ao tenant
    const campaignRows = await prisma.$queryRaw<{ id: string; name: string; external_id: string | null }[]>`
      SELECT cam.id, cam.name, cam."external_id"
      FROM campanhasmarketingdigital."Campaign" cam
      JOIN public.ad_networks n ON n.id = cam."network_id"
      WHERE cam.id = ${campaignId} AND cam."tenant_id" = ${tenantId}::uuid AND n.code = 'google'
      LIMIT 1
    `;
    const campaign = campaignRows[0];
    if (!campaign) {
      return NextResponse.json({ error: 'Campanha Google não encontrada para este tenant' }, { status: 404 });
    }

    await applyNegation(tenantId, campaignId, campaign.external_id, searchTerm, matchType, 'human');

    // Registro de auditoria — mesma tabela usada pelo agente automático (AgentAction),
    // já executado (revisão humana não passa por fila de aprovação).
    const actionId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO campanhasmarketingdigital."AgentAction"
        (id, tenant_id, "campaignId", "campaignName", type, title, description, confidence,
         status, negative_term, negative_match_type, "createdAt", "executedAt")
      VALUES
        (${actionId}, ${tenantId}::uuid, ${campaignId}, ${campaign.name},
         'ADD_NEGATIVE_KEYWORD', 'Termo negativado manualmente',
         ${`O termo "${searchTerm}" foi negativado manualmente por um usuário na campanha "${campaign.name}".`},
         1.0, 'EXECUTED', ${searchTerm}, ${matchType}, now(), now())
    `;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('POST /campanhas/google/search-terms/negate error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao negativar termo' }, { status: 500 });
  }
}
