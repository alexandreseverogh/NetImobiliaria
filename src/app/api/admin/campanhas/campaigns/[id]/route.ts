import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

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

// DELETE /api/admin/campanhas/campaigns/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verificar permissão de exclusão server-side
    const denied = await requireApiPermission(request, 'campanhasmarketingdigital', 'DELETE');
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

    await prisma.campaign.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao deletar campanha' }, { status: 500 });
  }
}
