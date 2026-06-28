import { NextRequest, NextResponse } from 'next/server'
import { getDestinationBySlug, logInteraction } from '@/lib/cta/service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/public/cta/{slug}/view
 * Registra a visualização da página de destino (base analítica de demanda).
 */
export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const dest = await getDestinationBySlug(params.slug)
    if (!dest) return NextResponse.json({ ok: false }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null

    await logInteraction({
      tenantId: dest.tenant_id,
      clientId: dest.client_id,
      destinationId: dest.id,
      campaignId: searchParams.get('campaign_id'),
      adId: searchParams.get('ad_id'),
      ctaType: dest.cta_type,
      eventType: 'VIEW',
      utm: {
        source: searchParams.get('utm_source') || undefined,
        medium: searchParams.get('utm_medium') || undefined,
        campaign: searchParams.get('utm_campaign') || undefined,
        content: searchParams.get('utm_content') || undefined,
      },
      ip,
      userAgent: request.headers.get('user-agent'),
      referrer: request.headers.get('referer'),
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
