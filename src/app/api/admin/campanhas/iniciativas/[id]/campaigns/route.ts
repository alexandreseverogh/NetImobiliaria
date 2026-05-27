import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

// POST /api/admin/campanhas/iniciativas/[id]/campaigns
// Body: { campaignIds: string[] }  — link existing campaigns
// Body: { unlink: true, campaignIds: string[] }  — unlink campaigns
export async function POST(request: NextRequest, { params }: Params) {
  try {
    // Verificar permissão de edição server-side
    const denied = await requireApiPermission(request, 'campanhasmarketingdigital', 'UPDATE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const initiative = await prisma.marketingInitiative.findFirst({
      where: { id: params.id, tenantId: payload.tenantId },
    });
    if (!initiative) {
      return NextResponse.json({ error: 'Iniciativa não encontrada' }, { status: 404 });
    }

    const { campaignIds, unlink } = await request.json();

    if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
      return NextResponse.json({ error: 'campaignIds é obrigatório' }, { status: 400 });
    }

    if (unlink) {
      await prisma.campaign.updateMany({
        where: { id: { in: campaignIds }, initiativeId: params.id, tenantId: payload.tenantId },
        data: { initiativeId: null },
      });
      return NextResponse.json({ unlinked: campaignIds.length });
    }

    await prisma.campaign.updateMany({
      where: { id: { in: campaignIds }, tenantId: payload.tenantId },
      data: { initiativeId: params.id },
    });

    return NextResponse.json({ linked: campaignIds.length });
  } catch (error: any) {
    console.error('POST /iniciativas/[id]/campaigns error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao vincular campanhas' }, { status: 500 });
  }
}
