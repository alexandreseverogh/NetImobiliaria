import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/marketing/prisma';

export const dynamic = 'force-dynamic';

async function assertMaster(req: NextRequest) {
  const token = req.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  if (!decoded?.is_system_role) return null;
  return decoded;
}

// PUT /api/admin/master/ia-plataforma/models/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!await assertMaster(request)) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      provider, providerLabel, modelId, modelLabel,
      baseUrl, qualityScore, isFree, contextWindow,
      isRecommended, isActive, notes, sortOrder,
    } = body;

    const model = await prisma.llmModel.update({
      where: { id: params.id },
      data: {
        ...(provider       !== undefined && { provider }),
        ...(providerLabel  !== undefined && { providerLabel }),
        ...(modelId        !== undefined && { modelId }),
        ...(modelLabel     !== undefined && { modelLabel }),
        ...(baseUrl        !== undefined && { baseUrl }),
        ...(qualityScore   !== undefined && { qualityScore }),
        ...(isFree         !== undefined && { isFree }),
        ...(contextWindow  !== undefined && { contextWindow }),
        ...(isRecommended  !== undefined && { isRecommended }),
        ...(isActive       !== undefined && { isActive }),
        ...(notes          !== undefined && { notes }),
        ...(sortOrder      !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json({ model });
  } catch (err: any) {
    console.error('[PUT /master/ia-plataforma/models/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/admin/master/ia-plataforma/models/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!await assertMaster(request)) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  try {
    await prisma.llmModel.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[DELETE /master/ia-plataforma/models/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
