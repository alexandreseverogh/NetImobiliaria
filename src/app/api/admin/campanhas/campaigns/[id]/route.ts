import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { normalizeAngleForScope } from '@/lib/marketing/services/angleResolver';

export const dynamic = 'force-dynamic';

// GET /api/admin/campanhas/campaigns/[id]
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id: params.id, tenantId: payload.tenantId },
      include: { adSets: { include: { ads: true } } },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao buscar campanha' }, { status: 500 });
  }
}

// PATCH /api/admin/campanhas/campaigns/[id] — atualiza campos editáveis (declaredAngle, name)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const campaign = await prisma.campaign.findFirst({
      where: { id: params.id, tenantId: payload.tenantId },
    });
    if (!campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    }

    const updateData: any = {};

    // Campo: ângulo declarado (FASE 14) — correção P2 (docs/PLANO_INTEGRACAO_JEV.md §5.2):
    // valida contra a taxonomia real do SEGMENTO da campanha (via clientId dela), não mais
    // contra os 8 valores fixos legados. Resolve o escopo pelo cliente/tenant da própria
    // campanha (nunca do body — clientId não é editável por este PATCH).
    if ('declaredAngle' in body) {
      updateData.declaredAngle = await normalizeAngleForScope(
        body.declaredAngle,
        payload.tenantId,
        campaign.clientId,
      );
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo editável fornecido' }, { status: 400 });
    }

    const updated = await prisma.campaign.update({
      where: { id: params.id },
      data: updateData,
    });

    // FASE 14d — sincroniza angle_source quando declaredAngle é editado manualmente
    if ('declaredAngle' in updateData) {
      try {
        await pool.query(
          `UPDATE campanhasmarketingdigital."Campaign"
           SET angle_source = $1 WHERE id = $2`,
          [updateData.declaredAngle ? 'declared' : null, params.id],
        );
      } catch { /* non-critical */ }
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao atualizar campanha' }, { status: 500 });
  }
}

// DELETE /api/admin/campanhas/campaigns/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verificar permissão de exclusão server-side
    // 'configuracoes-campanhas' é o recurso real do admin do tenant (ver rota de status).
    const denied = await requireApiPermission(request, 'configuracoes-campanhas', 'DELETE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id: params.id, tenantId: payload.tenantId },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    }

    // Exclusão física só para rascunhos: nunca publicada na rede e sem métricas.
    // Campanha publicada precisa ser ARQUIVADA (ver rota de status), para não perder o histórico
    // de leads e métricas, nem deixar uma campanha viva na Meta sem controle.
    const publicada = Boolean((campaign as any).externalId || (campaign as any).metaCampaignId);
    if (publicada) {
      return NextResponse.json(
        { error: 'Campanha já publicada na rede. Arquive-a em vez de excluir, para manter o histórico.' },
        { status: 409 },
      );
    }
    const temMetricas = await prisma.insight.count({ where: { campaignId: params.id } });
    if (temMetricas > 0) {
      return NextResponse.json(
        { error: 'Campanha com métricas registradas. Arquive-a em vez de excluir.' },
        { status: 409 },
      );
    }

    await prisma.campaign.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao deletar campanha' }, { status: 500 });
  }
}
