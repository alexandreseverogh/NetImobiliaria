// FASE 19.2/19.3 — Circuit breaker por tenant+rede (blindagem contra mudança de API Meta/
// Google/TikTok). Extraído de agentMonitor.ts (FASE 19.2 original) pra ser compartilhado com o
// health-check/canário dedicado (FASE 19.3, src/app/api/cron/campanhas/network-healthcheck) —
// os dois precisam da MESMA lógica de ler/incrementar/resetar o disjuntor; duplicar isso em 2
// lugares é exatamente o tipo de drift que esta frente inteira existe pra evitar.
import prisma from '../prisma';

// Limiar de falhas consecutivas antes de parar de chamar a rede (evita gastar as chamadas
// restantes de um tenant com muitas campanhas na mesma rede quebrada, e risco de rate-limit).
// Cooldown garante que o disjuntor nunca fica travado pra sempre — depois do cooldown, a
// próxima tentativa sempre ganha 1 chance nova (half-open).
export const CIRCUIT_BREAKER_THRESHOLD = parseInt(process.env.NETWORK_CIRCUIT_BREAKER_THRESHOLD || '5', 10);
export const CIRCUIT_BREAKER_COOLDOWN_MINUTES = parseInt(process.env.NETWORK_CIRCUIT_COOLDOWN_MINUTES || '180', 10);

export type CircuitState = { consecutiveFailures: number; circuitTrippedAt: Date | null };

export const NETWORK_LABELS: Record<string, string> = {
  meta: 'Meta Ads',
  google: 'Google Ads',
  tiktok: 'TikTok Ads',
};

// Texto reflete o disjuntor: dispara só quando `threshold` falhas seguidas acontecem, e explica
// que a coleta desta rede foi pausada pro tenant até o cooldown ou correção manual.
export function formatSyncFailureAlert(networkCode: string, threshold: number, lastError: string): string {
  const label = NETWORK_LABELS[networkCode] || networkCode;
  const cooldownH = Math.round(CIRCUIT_BREAKER_COOLDOWN_MINUTES / 60);
  return (
    `⚠️ *Disjuntor aberto — ${label}*\n\n` +
    `${threshold} falhas seguidas ao sincronizar com a ${label}. A coleta desta rede foi ` +
    `pausada pra este tenant (evita insistir numa API quebrada).\n\n` +
    `Último erro: _${lastError.slice(0, 300)}_\n\n` +
    `Pode ser credencial expirada ou a API ter mudado algo (campo removido/renomeado). ` +
    `Nova tentativa automática em até ${cooldownH}h, ou corrija a credencial agora pra reativar antes.`
  );
}

/** Catálogo de redes (poucas linhas, sempre buscado por completo) — mapas nos dois sentidos. */
export async function getNetworkMaps(): Promise<{ codeById: Map<string, string>; idByCode: Map<string, string> }> {
  const rows = await prisma.$queryRawUnsafe<{ id: string; code: string }[]>(
    `SELECT id, code FROM public.ad_networks`,
  );
  const codeById = new Map<string, string>();
  const idByCode = new Map<string, string>();
  for (const r of rows) {
    codeById.set(r.id, r.code);
    idByCode.set(r.code, r.id);
  }
  return { codeById, idByCode };
}

/** Estado do disjuntor de todas as redes de UM tenant, lido de uma vez. */
export async function getCircuitState(tenantId: string): Promise<Map<string, CircuitState>> {
  const rows = await prisma.$queryRawUnsafe<{ code: string; consecutive_failures: number; circuit_tripped_at: Date | null }[]>(
    `SELECT n.code, tnc.consecutive_failures, tnc.circuit_tripped_at
     FROM public.tenant_network_credentials tnc
     JOIN public.ad_networks n ON n.id = tnc.network_id
     WHERE tnc.tenant_id = $1::uuid`,
    tenantId,
  );
  return new Map(rows.map(r => [r.code, { consecutiveFailures: r.consecutive_failures, circuitTrippedAt: r.circuit_tripped_at }]));
}

/** True se o disjuntor está aberto E ainda dentro do cooldown (deve pular a chamada agora). */
export function isCircuitOpen(circuit: CircuitState | undefined): boolean {
  if (!circuit || circuit.consecutiveFailures < CIRCUIT_BREAKER_THRESHOLD) return false;
  const trippedAt = circuit.circuitTrippedAt ? new Date(circuit.circuitTrippedAt).getTime() : 0;
  return Date.now() - trippedAt < CIRCUIT_BREAKER_COOLDOWN_MINUTES * 60 * 1000;
}

/**
 * Incrementa a falha consecutiva no banco (persiste entre rodadas) e no mapa em memória desta
 * rodada. Retorna true se esta falha foi a que cruzou o limiar agora — sinal pra disparar alerta.
 *
 * Refresca `circuitTrippedAt` em TODA falha enquanto acima do limiar (não só na 1ª vez que
 * cruza) — achado real da FASE 19.2: refrescar só no momento do cruzamento deixava o "half-open"
 * liberar TODAS as chamadas pendentes de uma rodada de uma vez (o timestamp em memória ficava
 * congelado), em vez de só 1 tentativa-teste por vez antes de re-fechar.
 */
export async function recordCircuitFailure(
  tenantId: string,
  networkCode: string,
  networkIdByCode: Map<string, string>,
  circuitState: Map<string, CircuitState>,
): Promise<boolean> {
  const networkId = networkIdByCode.get(networkCode);
  const prev = circuitState.get(networkCode) || { consecutiveFailures: 0, circuitTrippedAt: null };
  const next = prev.consecutiveFailures + 1;
  const overThreshold = next >= CIRCUIT_BREAKER_THRESHOLD;
  const justTripped = prev.consecutiveFailures < CIRCUIT_BREAKER_THRESHOLD && overThreshold;

  circuitState.set(networkCode, {
    consecutiveFailures: next,
    circuitTrippedAt: overThreshold ? new Date() : prev.circuitTrippedAt,
  });

  if (networkId) {
    await prisma.$executeRawUnsafe(
      `UPDATE public.tenant_network_credentials
       SET consecutive_failures = consecutive_failures + 1,
           circuit_tripped_at = CASE WHEN consecutive_failures + 1 >= $3 THEN now() ELSE circuit_tripped_at END
       WHERE tenant_id = $1::uuid AND network_id = $2::uuid`,
      tenantId, networkId, CIRCUIT_BREAKER_THRESHOLD,
    );
  }

  return justTripped;
}

/** Zera o disjuntor após um sucesso. Não escreve no banco se já estava zerado (caso comum). */
export async function resetCircuitBreaker(
  tenantId: string,
  networkCode: string,
  networkIdByCode: Map<string, string>,
  circuitState: Map<string, CircuitState>,
): Promise<void> {
  const prev = circuitState.get(networkCode);
  if (!prev || prev.consecutiveFailures === 0) return;

  circuitState.set(networkCode, { consecutiveFailures: 0, circuitTrippedAt: null });

  const networkId = networkIdByCode.get(networkCode);
  if (networkId) {
    await prisma.$executeRawUnsafe(
      `UPDATE public.tenant_network_credentials
       SET consecutive_failures = 0, circuit_tripped_at = NULL
       WHERE tenant_id = $1::uuid AND network_id = $2::uuid`,
      tenantId, networkId,
    );
  }
}
