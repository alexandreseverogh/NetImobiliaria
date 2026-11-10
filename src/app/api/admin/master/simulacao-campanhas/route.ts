import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { verifyToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/marketing/prisma';
import { logInteraction } from '@/lib/cta/service';
import { processInboundWhatsAppMessage } from '@/lib/whatsapp/inboundProcessor';

/**
 * Simulação de campanha — FERRAMENTA DE TESTE, uso exclusivo do Master.
 *
 * Proteções (ver conversa de 2026-11-09):
 *  1. Somente Master: o cookie precisa ser de um usuário com is_system_role.
 *  2. Fora de produção: em NODE_ENV=production a rota responde 404, sem revelar que existe.
 *  3. Não é system_feature: não aparece em sidebar nem no provisionamento de tenants.
 *
 * Ações (POST):
 *  - click: registra o clique do anúncio exatamente como /api/r/[trackingId] faz.
 *  - reply: entrega ao processador de mensagens do WhatsApp uma resposta do contato com a tag
 *    [ref:trackingId] — o mesmo caminho que o webhook da Evolution usa.
 */

async function requireMasterOrNotFound(request: NextRequest): Promise<NextResponse | null> {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 });
  }
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso restrito ao Master' }, { status: 403 });
  }
  return null;
}

/** GET ?tenantId=... — anúncios com link rastreado do tenant. */
export async function GET(request: NextRequest) {
  const denied = await requireMasterOrNotFound(request);
  if (denied) return denied;

  const tenantId = new URL(request.url).searchParams.get('tenantId');
  if (!tenantId) return NextResponse.json({ error: 'tenantId obrigatório' }, { status: 400 });

  const ads = await prisma.ad.findMany({
    where: { adSet: { campaign: { tenantId } } },
    include: { adSet: { include: { campaign: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return NextResponse.json({
    ads: ads.map((ad) => ({
      id: ad.id,
      name: ad.name,
      trackingId: ad.trackingId,
      ctaType: ad.ctaType,
      linkUrl: ad.linkUrl,
      campaignId: ad.adSet.campaign.id,
      campaignName: ad.adSet.campaign.name,
      tenantId: ad.adSet.campaign.tenantId,
      clientId: ad.adSet.campaign.clientId ?? null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const denied = await requireMasterOrNotFound(request);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const action = body.action as string | undefined;

  if (action === 'click') {
    const trackingId = String(body.trackingId || '');
    const ad = await prisma.ad.findUnique({
      where: { trackingId },
      include: { adSet: { include: { campaign: true } } },
    });
    if (!ad) return NextResponse.json({ error: 'Anúncio não encontrado para este trackingId' }, { status: 404 });

    const campaign = ad.adSet.campaign;
    if (!campaign.tenantId) return NextResponse.json({ error: 'Campanha sem tenant' }, { status: 400 });
    const isWhatsApp = ad.ctaType === 'WHATSAPP_MESSAGE';
    const eventType = isWhatsApp ? 'WHATSAPP_CLICK' : 'REDIRECT';
    const interactionId = await logInteraction({
      tenantId: campaign.tenantId,
      clientId: campaign.clientId ?? null,
      campaignId: campaign.id,
      adId: ad.id,
      ctaType: ad.ctaType,
      eventType,
      utm: { source: 'simulacao', medium: 'teste', campaign: campaign.name, content: ad.name },
      ip: null,
      userAgent: 'simulacao-campanhas (Master)',
      referrer: null,
    });

    return NextResponse.json({
      ok: true,
      interactionId,
      eventType,
      ctaType: ad.ctaType,
      message: isWhatsApp
        ? 'Clique de WhatsApp registrado. Em um clique real, a pessoa seria levada ao WhatsApp.'
        : 'Clique registrado. Em um clique real, a pessoa seria levada ao destino do anúncio.',
    });
  }

  if (action === 'reply') {
    const trackingId = String(body.trackingId || '');
    const phone = String(body.phone || '').replace(/\D/g, '');
    const text = String(body.text || '').trim();
    if (!trackingId || !phone || !text) {
      return NextResponse.json({ error: 'trackingId, phone e text são obrigatórios' }, { status: 400 });
    }

    const ad = await prisma.ad.findUnique({
      where: { trackingId },
      include: { adSet: { include: { campaign: true } } },
    });
    if (!ad) return NextResponse.json({ error: 'Anúncio não encontrado para este trackingId' }, { status: 404 });

    const tenantId = ad.adSet.campaign.tenantId;
    if (!tenantId) return NextResponse.json({ error: 'Campanha sem tenant' }, { status: 400 });
    const result = await processInboundWhatsAppMessage({
      tenantId,
      ownerClientId: null,
      phone,
      pushName: 'Simulação (teste)',
      text: `${text} [ref:${trackingId}]`,
      externalMessageId: `sim-${randomUUID()}`,
    });

    return NextResponse.json({ ok: true, ...result });
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}
