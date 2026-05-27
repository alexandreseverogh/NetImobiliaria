import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/campanhas/briefing
 * Gera briefing para todos os tenants e envia via WhatsApp/Slack.
 * Body: { type: 'morning' | 'closing' | 'manual' }
 * Protegido por CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const type: 'morning' | 'closing' | 'manual' = body.type || 'manual';

    const { getActiveTenants } = await import('@/lib/marketing/services/agentMonitor');
    const { generateStrategicBriefing } = await import('@/lib/marketing/services/strategicBriefing');
    const { notifyWhatsApp, notifySlack } = await import('@/lib/marketing/services/agentNotificador');

    const tenants = await getActiveTenants();

    const results = await Promise.allSettled(
      tenants.map(async (tenantId: string) => {
        const briefing = await generateStrategicBriefing(type, tenantId);
        const content = briefing.content as any;
        const msg = `*Briefing ${type.toUpperCase()}*\n\n${content?.performanceSummary || briefing.summary}`;
        await Promise.allSettled([
          notifyWhatsApp(msg, tenantId),
          notifySlack(msg),
        ]);
        return tenantId;
      })
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed    = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({ ok: true, type, tenants: tenants.length, succeeded, failed });
  } catch (error: any) {
    console.error('POST /cron/campanhas/briefing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
