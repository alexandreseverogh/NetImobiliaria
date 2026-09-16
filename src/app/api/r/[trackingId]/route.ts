import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { logInteraction } from '@/lib/cta/service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/r/[trackingId]
 * Rota pública de rastreamento de cliques em anúncio → destino real (F2/F3 de
 * docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md §6) — QUALQUER CTA da campanha passa por aqui,
 * não só WhatsApp (generalizado nesta fase; antes só o caminho WhatsApp era rastreado).
 *
 * Fluxo:
 * 1. Usuário clica no anúncio Meta → Meta redireciona para esta URL
 * 2. Registramos o clique como CtaInteraction (fonte única de cliques/atribuição — ver
 *    docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md §9.1; a tabela "Lead" antiga foi descontinuada)
 * 3a. CTA = WhatsApp → redireciona para wa.me/[phone]?text=[mensagem]+[ref:trackingId]
 * 3b. Qualquer outro CTA (ex.: formulário hospedado em /l/{slug}) → redireciona para
 *     ad.linkUrl (o destino real escolhido no wizard) com "?ref={trackingId}" anexado —
 *     é esse "ref" que /l/[slug] (e o submit do formulário) resolvem via resolveCtaRef
 *     pra saber a campanha/anúncio real de origem, sem depender de Mensageria.
 *
 * O "[ref:trackingId]"/"?ref=" é o que permite ao processador de mensagens entrantes do
 * WhatsApp (src/lib/whatsapp/inboundProcessor.ts) OU ao endpoint de submissão de formulário
 * reconhecerem, quando o internauta responde/submete, que aquela conversa/lead se originou
 * desta campanha/anúncio real — fechando o loop clique → lead no CRM.
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

    // ── CTA não-WhatsApp (formulário/link externo) ──────────────────────────────
    if (ad.ctaType !== 'WHATSAPP_MESSAGE') {
      if (!ad.linkUrl) {
        return NextResponse.redirect(new URL('/', request.url));
      }

      if (tenantId) {
        logInteraction({
          tenantId,
          clientId,
          campaignId: campaign.id,
          adId: ad.id,
          ctaType: ad.ctaType,
          eventType: 'REDIRECT',
          utm: { source: utmSource, medium: utmMedium, campaign: utmCampaign, content: utmContent },
          ip,
          userAgent,
          referrer: sourceUrl,
        }).catch(err => console.error('CtaInteraction create error:', err));
      }

      const destUrl = new URL(ad.linkUrl, request.url);
      destUrl.searchParams.set('ref', trackingId);
      return NextResponse.redirect(destUrl.toString(), { status: 302 });
    }

    // ── CTA = WhatsApp ───────────────────────────────────────────────────────────
    // Busca configuração WhatsApp do tenant
    const wppConfig = tenantId
      ? await prisma.whatsAppConfig.findFirst({
          where: { tenantId, isDefault: true },
        })
      : null;

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
