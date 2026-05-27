import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload || !payload.tenantId) {
      return NextResponse.json({ error: 'Tenant não encontrado ou usuário não autenticado' }, { status: 401 });
    }

    const config = await prisma.whatsAppConfig.findFirst({
      where: { tenantId: payload.tenantId, isDefault: true },
    });
    
    return NextResponse.json(config || { phoneNumber: '', defaultMessage: '', businessName: '' });
  } catch (error) {
    console.error('Erro no GET /settings/whatsapp:', error);
    return NextResponse.json({ error: 'Erro ao buscar config WhatsApp' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verificar permissão de edição server-side
    const denied = await requireApiPermission(request, 'campanhasmarketingdigital', 'UPDATE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload || !payload.tenantId) {
      return NextResponse.json({ error: 'Tenant não encontrado ou usuário não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { phoneNumber, defaultMessage, businessName } = body;

    const existing = await prisma.whatsAppConfig.findFirst({
      where: { tenantId: payload.tenantId, isDefault: true },
    });

    let config;
    if (existing) {
      config = await prisma.whatsAppConfig.update({
        where: { id: existing.id },
        data: { phoneNumber, defaultMessage, businessName },
      });
    } else {
      config = await prisma.whatsAppConfig.create({
        data: { tenantId: payload.tenantId, phoneNumber, defaultMessage, businessName, isDefault: true },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Erro no PUT /settings/whatsapp:', error);
    return NextResponse.json({ error: 'Erro ao salvar config WhatsApp' }, { status: 500 });
  }
}
