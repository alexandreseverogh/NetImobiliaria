import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/campanhas/network-healthcheck
 *
 * FASE 19.3 — Blindagem contra mudança de API (Meta/Google/TikTok). Canário leve e frequente
 * (roda de hora em hora — bem mais frequente que o sync pesado, que roda a cada 6h por padrão):
 * pra cada tenant+rede com credencial ativa, faz a chamada mais barata possível de "isto ainda
 * responde?" via `AdNetworkService.validateCredentials()` — método que já existe no contrato de
 * TODO adapter (Meta: GET /me?fields=id,name; Google: SELECT customer.id FROM customer LIMIT 1;
 * os 3 Fakes: sempre {valid:true}) e já era usado manualmente pelo botão "Validar" da tela de
 * configurações — aqui é só automatizado e ligado ao circuit breaker da FASE 19.2.
 *
 * Sucesso zera o disjuntor; falha incrementa do mesmo jeito que uma falha de sync real —
 * cobre inclusive tenant sem nenhuma campanha ativa sincronizando nesta hora específica, e
 * garante que um disjuntor aberto não fique esperando até 3h de cooldown pra ganhar uma nova
 * tentativa (o canário testa de hora em hora, bem mais cedo que isso).
 *
 * Agnóstico de rede de propósito — nenhuma linha aqui menciona "meta"/"google" — TikTok herda
 * a mesma cobertura automaticamente assim que o adapter real (T2, docs/PLANO_TIKTOK.md) existir.
 * Protegido por CRON_SECRET, mesmo padrão de scripts/feed-cron-scheduler.js.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const prisma = (await import('@/lib/marketing/prisma')).default;
    const { getNetworkServiceForTenant } = await import('@/lib/marketing/networks/factory');
    const { getProvisionedNetworkCodes } = await import('@/lib/marketing/services/networkProvisioning');
    const { notifyWhatsApp } = await import('@/lib/marketing/services/agentNotificador');
    const {
      formatSyncFailureAlert,
      getCircuitState,
      getNetworkMaps,
      recordCircuitFailure,
      resetCircuitBreaker,
      CIRCUIT_BREAKER_THRESHOLD,
    } = await import('@/lib/marketing/services/networkCircuitBreaker');

    // Todo par (tenant, rede) com credencial marcada como ativa — independe de ter campanha
    // sincronizando nesta hora, é exatamente o que o sync pesado não cobre sozinho.
    const rows = await prisma.$queryRawUnsafe<{ tenant_id: string; code: string }[]>(
      `SELECT DISTINCT tnc.tenant_id, n.code
       FROM public.tenant_network_credentials tnc
       JOIN public.ad_networks n ON n.id = tnc.network_id
       WHERE tnc.is_active = true`,
    );

    const byTenant = new Map<string, string[]>();
    for (const r of rows) {
      if (!byTenant.has(r.tenant_id)) byTenant.set(r.tenant_id, []);
      byTenant.get(r.tenant_id)!.push(r.code);
    }

    const { idByCode: networkIdByCode } = await getNetworkMaps();

    let checked = 0;
    let healthy = 0;
    let failed = 0;
    let tripped = 0;

    for (const [tenantId, networkCodes] of Array.from(byTenant.entries())) {
      const provisionedNetworks = await getProvisionedNetworkCodes(tenantId);
      const circuitState = await getCircuitState(tenantId);
      const alertsToSend: Array<{ networkCode: string; lastError: string }> = [];

      for (const networkCode of networkCodes) {
        // Rede desprovisionada (contrato encerrado) nunca é health-checada — mesmo filtro já
        // usado pelo sync pesado (getProvisionedNetworkCodes), fonte única de verdade.
        if (!provisionedNetworks.has(networkCode as any)) continue;

        // Decisão consciente: diferente de syncMetrics(), o canário NUNCA checa isCircuitOpen
        // antes de tentar. É o próprio mecanismo de recuperação — se ele respeitasse o mesmo
        // cooldown de 3h do sync pesado, um disjuntor aberto só teria chance de fechar de novo
        // uma vez a cada 3h (a mesma cadência que já existe sem esta fase), derrotando o
        // propósito de rodar de hora em hora. A chamada é sempre a mais barata do adapter
        // (validateCredentials), então tentar toda hora mesmo com o disjuntor aberto é seguro.
        checked++;
        try {
          const service = await getNetworkServiceForTenant(tenantId, networkCode as any);
          const result = await service.validateCredentials();
          if (result.valid) {
            healthy++;
            await resetCircuitBreaker(tenantId, networkCode, networkIdByCode, circuitState);
          } else {
            failed++;
            const wasTripped = await recordCircuitFailure(tenantId, networkCode, networkIdByCode, circuitState);
            if (wasTripped) {
              tripped++;
              alertsToSend.push({ networkCode, lastError: result.error || 'credencial inválida' });
            }
          }
        } catch (err: any) {
          // getNetworkServiceForTenant pode lançar (credencial malformada) — mesmo tratamento
          // de uma falha real de rede, não de "não configurado" (esse caso nem chega aqui, já
          // que só iteramos tenant+rede que TEM linha em tenant_network_credentials).
          failed++;
          console.error(`[network-healthcheck] Erro validando ${networkCode} pro tenant ${tenantId}:`, err);
          const wasTripped = await recordCircuitFailure(tenantId, networkCode, networkIdByCode, circuitState);
          if (wasTripped) {
            tripped++;
            alertsToSend.push({ networkCode, lastError: err instanceof Error ? err.message : String(err) });
          }
        }
      }

      if (alertsToSend.length > 0) {
        await Promise.allSettled(
          alertsToSend.map(a =>
            notifyWhatsApp(formatSyncFailureAlert(a.networkCode, CIRCUIT_BREAKER_THRESHOLD, a.lastError), tenantId),
          ),
        );
      }
    }

    return NextResponse.json({ ok: true, checked, healthy, failed, tripped });
  } catch (error: any) {
    console.error('POST /cron/campanhas/network-healthcheck error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
