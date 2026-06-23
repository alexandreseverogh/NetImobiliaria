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

// GET /api/admin/master/ia-plataforma/models
export async function GET(request: NextRequest) {
  if (!await assertMaster(request)) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  try {
    const models = await prisma.llmModel.findMany({
      orderBy: [{ sortOrder: 'asc' }, { provider: 'asc' }, { modelLabel: 'asc' }],
    });
    return NextResponse.json({ models });
  } catch (err: any) {
    console.error('[GET /master/ia-plataforma/models]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/master/ia-plataforma/models
export async function POST(request: NextRequest) {
  if (!await assertMaster(request)) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      provider, providerLabel, modelId, modelLabel,
      baseUrl = null, qualityScore = 3, isFree = false,
      contextWindow = null, isRecommended = false,
      isActive = true, notes = null, sortOrder = 0,
    } = body;

    if (!provider || !providerLabel || !modelId || !modelLabel) {
      return NextResponse.json({ error: 'provider, providerLabel, modelId e modelLabel são obrigatórios' }, { status: 400 });
    }

    const model = await prisma.llmModel.create({
      data: {
        provider, providerLabel, modelId, modelLabel,
        baseUrl, qualityScore, isFree,
        contextWindow, isRecommended, isActive, notes, sortOrder,
      },
    });

    return NextResponse.json({ model }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /master/ia-plataforma/models]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
