import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { generateStrategicBriefing } from '@/lib/marketing/services/strategicBriefing';
import { notifyWhatsApp } from '@/lib/marketing/services/agentNotificador';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export const dynamic = 'force-dynamic';

// POST /api/admin/campanhas/settings/whatsapp/test-briefing
export async function POST(request: NextRequest) {
  try {
    // Verificar permissão de execução server-side
    const denied = await requireApiPermission(request, 'campanhasmarketingdigital', 'EXECUTE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Gera um briefing manual de teste
    const briefing = await generateStrategicBriefing('manual', payload.tenantId);

    const content = briefing.content as any;
    const summary = content?.performanceSummary || briefing.summary || 'Briefing de teste gerado.';

    const message =
      `📊 *Briefing de Teste — Trafego Pago*\n\n` +
      `${summary}\n\n` +
      `✅ Integração WhatsApp funcionando corretamente.`;

    await notifyWhatsApp(message, payload.tenantId);

    return NextResponse.json({ success: true, message: 'Briefing de teste enviado via WhatsApp' });
  } catch (error: any) {
    console.error('POST /settings/whatsapp/test-briefing error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao enviar briefing de teste' }, { status: 500 });
  }
}
