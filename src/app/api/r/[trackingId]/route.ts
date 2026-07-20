import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { logInteraction } from '@/lib/cta/service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/r/[trackingId]
 * Rota pública de rastreamento de cliques em anúncio → WhatsApp.
 *
 * Fluxo:
 * 1. Usuário clica no anúncio Meta → Meta redireciona para esta URL
 * 2. Registramos o clique como CtaInteraction (fonte única de cliques/atribuição — ver
 *    docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md §9.1; a tabela "Lead" antiga foi descontinuada)
 * 3. Redirecionamos para wa.me/[phone]?text=[mensagem]+[ref:trackingId]
 *
 * O "[ref:trackingId]" embutido na mensagem é o que permite ao processador de mensagens
 * entrantes do WhatsApp (src/lib/whatsapp/inboundProcessor.ts, via resolveCtaRef) reconhecer,
 * quando o internauta responder, que aquela conversa se originou desta campanha/anúncio real —
 * fechando o loop clique → resposta → lead no CRM.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { trackingId: string } }
) {
  const { trackingId } = params;
  const { searchParams } = new URL(request.url);

  try {
    // Busca o Ad pelo trackingId
    const ad = await prisma.ad.findUnique({
      where: { trackingId },
      include: {
        adSet: {
          include: {
            campaign: true,
          },
        },
      },
    });

    if (!ad) {
      // Fallback: redireciona para a home se tracking inválido
      return NextResponse.redirect(new URL('/', request.url));
    }

    const campaign = ad.adSet.campaign;
    const tenantId = campaign.tenantId;
    const clientId = campaign.clientId ?? null;

    // Busca configuração WhatsApp do tenant
    const wppConfig = tenantId
      ? await prisma.whatsAppConfig.findFirst({
          where: { tenantId, isDefault: true },
        })
      : null;

    // Extrai UTM params passados pelo Meta (ou presentes na URL)
    const utmSource   = searchParams.get('utm_source')   || 'meta';
    const utmMedium   = searchParams.get('utm_medium')   || 'paid';
    const utmCampaign = searchParams.get('utm_campaign') || campaign.name;
    const utmContent  = searchParams.get('utm_content')  || ad.name;

    // Captura IP e user-agent
    const ip        = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
                   || request.headers.get('x-real-ip')
                   || null;
    const userAgent = request.headers.get('user-agent') || null;
    const sourceUrl = request.url;

    // Registra o clique de forma assíncrona (não bloqueia o redirect)
    if (tenantId) {
      logInteraction({
        tenantId,
        clientId,
        campaignId: campaign.id,
        adId: ad.id,
        ctaType: 'WHATSAPP_MESSAGE',
        eventType: 'WHATSAPP_CLICK',
        utm: { source: utmSource, medium: utmMedium, campaign: utmCampaign, content: utmContent },
        ip,
        userAgent,
        referrer: sourceUrl,
      }).catch(err => console.error('CtaInteraction create error:', err));
    }

    // Monta URL do WhatsApp
    if (!wppConfig?.phoneNumber) {
      // Sem configuração WhatsApp → redireciona para a home
      console.warn(`Tenant ${tenantId} sem WhatsAppConfig configurado`);
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Normaliza número: remove não-dígitos, garante código Brasil
    let phone = wppConfig.phoneNumber.replace(/\D/g, '');
    if (!phone.startsWith('55')) phone = `55${phone}`;
    // Evolution API espera 12 dígitos (sem o 9 extra de celular BR)
    if (phone.length === 13 && phone.startsWith('55')) {
      phone = phone.slice(0, 4) + phone.slice(5);
    }

    // "[ref:trackingId]" embutido no fim da mensagem — invisível pro usuário no app do
    // WhatsApp (aparece só quando ele confirma o envio), mas é o que fecha a atribuição
    // quando a resposta chega no webhook (ver comentário no topo do arquivo).
    const baseMessage = ad.body || wppConfig.defaultMessage || 'Olá! Vi seu anúncio e tenho interesse.';
    const message = encodeURIComponent(`${baseMessage} [ref:${trackingId}]`);

    const whatsappUrl = `https://wa.me/${phone}?text=${message}`;

    return NextResponse.redirect(whatsappUrl, { status: 302 });
  } catch (error: any) {
    console.error('GET /api/r error:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}
