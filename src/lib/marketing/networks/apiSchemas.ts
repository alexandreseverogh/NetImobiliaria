// FASE 19.5 — Blindagem contra mudança de API (Meta/Google Ads). Validação de schema (zod) na
// fronteira das chamadas de rede — escopo deliberadamente estreito, não exaustivo (ver
// docs/CHECKPOINT.md, plano salvo em C:\Users\T-GAMER\.claude\plans\crystalline-riding-squid.md):
//
//   1. O payload que SAI pro Meta (optimization_goal/custom_event_type/billing_event) — nunca
//      deixa um valor vazio/malformado sair pra rede real, onde o erro seria mais caro e mais
//      difícil de rastrear até a causa (config de segmento, bug de UI, etc.).
//   2. O formato da resposta que ENTRA — criação de campanha (Meta: .data.id; Google já tinha
//      isso via firstResourceName, não duplicado aqui) e insights (Meta/Google fetchInsights).
//
// Decisão de comportamento, deliberada: NUNCA mascarar resposta malformada como zero silencioso
// (o que já acontecia antes — `parseInt(row.impressions || 0)` sempre "funciona", mesmo quando
// `row` não tem nada a ver com o shape esperado, e um "0 real" e um "resposta quebrada" ficam
// indistinguíveis pro motor de decisão automática). Em vez disso, uma linha que não bate com o
// schema esperado lança erro claro — que cai no MESMO catch já usado pelo alerta da FASE 19.1
// (agentMonitor.ts), fechando o loop com o circuit breaker (19.2) e o canário (19.3) em vez de
// inventar um 4º mecanismo de alerta paralelo.

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// 1. Payload de SAÍDA — o que vai pro Meta antes de qualquer chamada de rede
// ─────────────────────────────────────────────────────────────

/**
 * Campos do AdSet que a plataforma resolve automaticamente (network_defaults do segmento, ou
 * fallback do próprio endpoint) e que a Meta exige como string não-vazia. Validação
 * estrutural, não uma allowlist fechada de valores — a Meta pode adicionar objetivos/eventos
 * novos a qualquer momento, e travar numa lista fixa seria repetir o mesmo tipo de "quebra a
 * aplicação" que esta fase existe pra prevenir. O que importa aqui é nunca deixar `undefined`,
 * `null`, string vazia ou tipo errado chegar na Graph API.
 */
export const AdSetOutboundFieldsSchema = z.object({
  optimizationGoal: z.string().trim().min(1, 'optimization_goal vazio/ausente'),
  billingEvent: z.string().trim().min(1, 'billing_event vazio/ausente'),
});

/** customEventType só é obrigatório quando há pixel_id (promoted_object) — opcional aqui, a
 *  própria chamada em metaAdsAdapter.ts só invoca esta validação depois de confirmar pixelId. */
export const CustomEventTypeSchema = z.string().trim().min(1, 'custom_event_type vazio/ausente');

/**
 * Valida os campos de saída antes de montar o payload pro Meta. Lança erro claro e específico
 * — nunca deixa passar silenciosamente pra virar um payload malformado na rede real.
 */
export function assertAdSetOutboundFields(adSet: { optimizationGoal?: unknown; billingEvent?: unknown }): void {
  const result = AdSetOutboundFieldsSchema.safeParse(adSet);
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`[FASE 19.5] Payload de AdSet inválido antes de enviar pro Meta — ${issues}`);
  }
}

export function assertCustomEventType(value: unknown): void {
  const result = CustomEventTypeSchema.safeParse(value);
  if (!result.success) {
    throw new Error(`[FASE 19.5] custom_event_type inválido antes de enviar pro Meta — ${result.error.issues[0]?.message}`);
  }
}

// ─────────────────────────────────────────────────────────────
// 2a. Resposta de ENTRADA — criação de campanha/adset/creative/ad no Meta
// ─────────────────────────────────────────────────────────────

/** Toda chamada de mutação da Meta Graph API (POST campaigns/adsets/adcreatives/ads) devolve
 *  `{ id: "..." }` no corpo — mesmo shape nos 4 pontos de metaAdsAdapter.createCampaign(). */
const MetaMutateResponseSchema = z.object({
  id: z.string().min(1),
});

/**
 * Extrai o `id` de uma resposta de mutação da Meta, validando o shape antes. Substitui os 4
 * acessos diretos `xRes.data.id` (campaign/adset/creative/ad) que existiam sem nenhuma
 * validação — se a Meta mudar o formato (campo renomeado, resposta vazia, `id` numérico em vez
 * de string), antes isso silenciosamente virava `undefined` propagado pela cadeia inteira
 * (adSetPayload.campaign_id = undefined, etc.); agora lança erro claro no PRIMEIRO ponto em
 * que o shape diverge do esperado.
 */
export function extractMetaMutateId(data: unknown, context: string): string {
  const result = MetaMutateResponseSchema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `[FASE 19.5] Resposta da Meta Graph API fora do formato esperado ao ${context} — ` +
      `esperava { id: string }, recebeu ${JSON.stringify(data)?.slice(0, 300)}`,
    );
  }
  return result.data.id;
}

// ─────────────────────────────────────────────────────────────
// 2b. Resposta de ENTRADA — fetchInsights (Meta)
// ─────────────────────────────────────────────────────────────

/** Uma linha de `/insights` da Meta — campos numéricos aceitam number OU string numérica
 *  (a Graph API já devolveu os dois formatos historicamente conforme o campo/versão), mas
 *  `date_start` é sempre obrigatório: sem ele não dá pra saber a que dia a linha pertence, e
 *  todo o pipeline de agregação por dia (CPL timeline, dashboards) depende disso. */
const MetaInsightsRowSchema = z.object({
  date_start: z.string().min(1),
}).passthrough(); // demais campos continuam sendo lidos pelo parsing manual já existente

/**
 * Valida cada linha da resposta de insights do Meta antes do parsing manual (que já existe e
 * já é tolerante campo a campo via `|| 0`). Esta validação cobre o caso que o parsing manual
 * NUNCA pegava: uma linha que não é sequer um objeto de insight de verdade (ex.: a Meta muda a
 * estrutura do array de `data`, ou devolve um objeto de erro disfarçado de linha) — antes
 * disso silenciosamente virava uma linha "zerada" indistinguível de uma campanha real sem
 * nenhuma atividade. Lança no 1º item inválido — a mesma disciplina de "nunca zero mentiroso".
 */
export function assertMetaInsightsRows(rows: unknown[]): void {
  for (let i = 0; i < rows.length; i++) {
    const result = MetaInsightsRowSchema.safeParse(rows[i]);
    if (!result.success) {
      throw new Error(
        `[FASE 19.5] Linha ${i} de /insights (Meta) fora do formato esperado — ` +
        `${result.error.issues[0]?.message}. Amostra: ${JSON.stringify(rows[i])?.slice(0, 300)}`,
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 2c. Resposta de ENTRADA — fetchInsights (Google)
// ─────────────────────────────────────────────────────────────

/** Uma linha da query GAQL de `fetchInsights` (Google Ads SDK) — `segments.date` e `metrics`
 *  (como objeto, mesmo vazio) são obrigatórios; o resto continua acessado pelo parsing manual
 *  já existente (`row.metrics.impressions || 0` etc.). Sem esta validação, `row.metrics`
 *  ausente lançava um TypeError cru e sem contexto ("Cannot read properties of undefined") no
 *  meio do `.map()` — agora lança um erro claro, no mesmo padrão do Meta. */
const GoogleInsightsRowSchema = z.object({
  segments: z.object({ date: z.string().min(1) }),
  metrics: z.record(z.string(), z.unknown()),
});

export function assertGoogleInsightsRows(rows: unknown[]): void {
  for (let i = 0; i < rows.length; i++) {
    const result = GoogleInsightsRowSchema.safeParse(rows[i]);
    if (!result.success) {
      throw new Error(
        `[FASE 19.5] Linha ${i} da query de insights (Google Ads) fora do formato esperado — ` +
        `${result.error.issues[0]?.message}. Amostra: ${JSON.stringify(rows[i])?.slice(0, 300)}`,
      );
    }
  }
}
