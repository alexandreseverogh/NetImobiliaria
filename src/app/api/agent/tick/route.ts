import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/marketing/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/agent/tick
 *
 * FASE 15 — Endpoint externo que substitui o node-cron em ambientes serverless.
 * Deve ser chamado por cron externo (SO, serviço, VPS crontab) a cada 6h:
 *
 *   0 *\/6 * * *  curl -X POST https://seu-dominio/api/agent/tick \
 *                      -H "x-cron-secret: $CRON_SECRET"
 *
 * Protegido por CRON_SECRET idêntico ao usado nos crons de campanhas.
 * Registra AgentHeartbeat a cada execução (sucesso ou falha).
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const startedAt = Date.now();
  const body = await request.json().catch(() => ({}));
  const specificTenantId: string | undefined = body?.tenantId || undefined;
  const triggeredBy: string = body?.triggeredBy || 'api';

  let campaignsSynced = 0;
  let actionsCreated  = 0;
  let errorMessage: string | undefined;

  try {
    // Importações dinâmicas para evitar cold-start em serverless
    const [{ syncMetrics, getActiveTenants }, { runDecisor }] = await Promise.all([
      import('@/lib/marketing/services/agentMonitor'),
      import('@/lib/marketing/services/agentDecisor'),
    ]);

    // 1. Sync de métricas do Meta para todos os tenants
    await syncMetrics();

    // 2. Conta campanhas sincronizadas para heartbeat
    const totalCampaigns = await prisma.campaign.count({
      where: { metaCampaignId: { not: null } },
    });
    campaignsSynced = totalCampaigns;

    // 3. Roda decisor para tenant específico ou todos os ativos
    const tenants = specificTenantId
      ? [specificTenantId]
      : await getActiveTenants();

    const results = await Promise.allSettled(
      tenants.map(tid => runDecisor(tid)),
    );

    actionsCreated = results.reduce((sum, r) => {
      if (r.status === 'fulfilled') return sum + (r.value?.actionsCreated ?? 0);
      return sum;
    }, 0);

  } catch (err: any) {
    errorMessage = err?.message ?? 'Erro desconhecido';
    console.error('[agent/tick] Erro no ciclo:', err);
  }

  // 4. Registra heartbeat independentemente de sucesso ou falha
  const durationMs = Date.now() - startedAt;
  try {
    await prisma.agentHeartbeat.create({
      data: {
        tenantId:        specificTenantId ?? null,
        triggeredBy,
        durationMs,
        campaignsSynced,
        actionsCreated,
        success:         !errorMessage,
        errorMessage:    errorMessage ?? null,
      },
    });
  } catch (hbErr) {
    console.error('[agent/tick] Falha ao registrar heartbeat:', hbErr);
  }

  if (errorMessage) {
    return NextResponse.json(
      { ok: false, error: errorMessage, durationMs },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    campaignsSynced,
    actionsCreated,
    durationMs,
  });
}

/**
 * GET /api/agent/tick — retorna os últimos heartbeats (diagnóstico)
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const heartbeats = await prisma.agentHeartbeat.findMany({
    orderBy: { cycleAt: 'desc' },
    take: 20,
  });

  const lastSuccess = heartbeats.find(h => h.success);
  const lastError   = heartbeats.find(h => !h.success);

  return NextResponse.json({
    lastSuccess: lastSuccess ?? null,
    lastError:   lastError   ?? null,
    recentCycles: heartbeats,
  });
}
