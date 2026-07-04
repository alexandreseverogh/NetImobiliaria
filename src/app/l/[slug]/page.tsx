import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getDestinationBySlug, logInteraction } from '@/lib/cta/service'
import CtaFormClient from './CtaFormClient'

export const dynamic = 'force-dynamic'

/**
 * Página pública de destino de CTA — /l/{slug}
 *  APP_FORM     → renderiza formulário hospedado (Mecanismo A)
 *  WHATSAPP     → loga WHATSAPP_CLICK e redireciona para wa.me
 *  EXTERNAL_URL → loga REDIRECT e redireciona (Mecanismo B — link rastreado)
 */
export default async function CtaDestinationPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: Record<string, string | string[] | undefined>
}) {
  const dest = await getDestinationBySlug(params.slug)
  const hdr = headers()

  if (!dest) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50 px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Página não encontrada</h1>
          <p className="mt-2 text-slate-500">Este link de destino não existe ou foi desativado.</p>
        </div>
      </div>
    )
  }

  const sp = (k: string) => {
    const v = searchParams[k]
    return typeof v === 'string' ? v : Array.isArray(v) ? v[0] : undefined
  }
  const utmCtx = {
    source: sp('utm_source'),
    medium: sp('utm_medium'),
    campaign: sp('utm_campaign'),
    content: sp('utm_content'),
  }
  const ip = hdr.get('x-forwarded-for')?.split(',')[0]?.trim() ?? hdr.get('x-real-ip') ?? null

  if (dest.type === 'WHATSAPP') {
    await logInteraction({
      tenantId: dest.tenant_id,
      clientId: dest.client_id,
      destinationId: dest.id,
      campaignId: sp('campaign_id') ?? null,
      adId: sp('ad_id') ?? null,
      ctaType: dest.cta_type,
      eventType: 'WHATSAPP_CLICK',
      utm: utmCtx,
      ip,
      userAgent: hdr.get('user-agent'),
      referrer: hdr.get('referer'),
    }).catch(() => {})
    const phone = (dest.config?.phoneNumber || '').replace(/\D/g, '')
    // [ref:slug] embutido na mensagem para o webhook da Evolution criar o lead automaticamente
    const baseMsg = dest.config?.introMessage || 'Olá! Vi o anúncio e quero saber mais.'
    const msg = encodeURIComponent(`${baseMsg} [ref:${dest.slug}]`)
    redirect(`https://wa.me/${phone}?text=${msg}`)
  }

  if (dest.type === 'EXTERNAL_URL') {
    const url = dest.config?.url
    if (url) {
      await logInteraction({
        tenantId: dest.tenant_id,
        clientId: dest.client_id,
        destinationId: dest.id,
        campaignId: sp('campaign_id') ?? null,
        adId: sp('ad_id') ?? null,
        ctaType: dest.cta_type,
        eventType: 'REDIRECT',
        utm: utmCtx,
        ip,
        userAgent: hdr.get('user-agent'),
        referrer: hdr.get('referer'),
      }).catch(() => {})
      redirect(url)
    }
  }

  // APP_FORM
  return (
    <CtaFormClient
      slug={dest.slug}
      name={dest.name}
      config={dest.config}
      ctaType={dest.cta_type}
    />
  )
}
