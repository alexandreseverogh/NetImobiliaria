/**
 * FASE 14d — Auto-classificação de ângulo em lote.
 *
 * Usa LLM para inferir o ângulo persuasivo de campanhas pelo nome.
 * Salva em Campaign.declared_angle (angle_source = 'llm_auto').
 * Declaração manual via PATCH da API usa angle_source = 'declared'.
 *
 * Coluna angle_source existe no DB via migration-2026-06-03-angle-source.sql
 * mas não está no schema Prisma (acesso via raw SQL para evitar regeneração).
 *
 * Correção P1 (docs/PLANO_INTEGRACAO_JEV.md §5.2, 2026-10-14) — antes deste fix, as opções de
 * ângulo oferecidas ao LLM eram SEMPRE os 8 valores fixos de `src/lib/marketing/angles.ts`,
 * independente do segmento real da campanha (ex.: uma campanha do segmento "Saúde" era
 * classificada contra "investment/lifestyle/family/price/urgency/social/luxury/other" — uma
 * taxonomia pensada pra Imobiliário). Agora cada campanha é agrupada pelo seu segmento efetivo
 * (via `angleResolver.resolveAngleScope`, que lê `segment_angle_terms` curado pelo Master) e as
 * opções reais daquele segmento são injetadas no prompt. Segmento sem nenhum ângulo cadastrado
 * ainda cai no fallback legado de 8 valores — transparente (`isLegacyFallback`), nunca forçado
 * fora disso.
 */

import pool from '@/lib/database/connection';
import { invokeForContext } from '@/lib/intelligence/llmInvoker';
import { resolveAngleScope, matchAngle, normalizeAngleForScope, type AngleOption, type AngleScope } from './angleResolver';

export interface ClassificationResult {
  id: string;
  name: string;
  suggestedAngle: string | null;
  confidence: 'high' | 'medium' | 'low';
  /** Opções reais do segmento desta campanha — para a UI montar o dropdown de revisão corretamente. */
  allowedAngles: AngleOption[];
  /** true = o segmento desta campanha ainda não tem ângulos próprios; usou a taxonomia legada. */
  isLegacyFallback: boolean;
}

const BATCH_SIZE = 20;

/** Conta campanhas sem ângulo declarado (para mostrar no banner). */
export async function getUnclassifiedCount(tenantId: string): Promise<number> {
  const { rows } = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM campanhasmarketingdigital."Campaign"
     WHERE tenant_id = $1
       AND (declared_angle IS NULL OR declared_angle = '')`,
    [tenantId],
  );
  return rows[0]?.count ?? 0;
}

/** Retorna sugestões de ângulo via LLM — modo preview, não salva no banco. */
export async function classifyCampaignAngles(
  tenantId: string,
  campaignIds?: string[],
): Promise<ClassificationResult[]> {
  const hasIds = Array.isArray(campaignIds) && campaignIds.length > 0;

  const { rows: campaigns } = await pool.query<{ id: string; name: string; client_id: string | null }>(
    hasIds
      // Achado real (não relacionado ao P1 em si): Campaign.id é TEXT, não uuid — o cast
      // ::uuid[] nunca funcionaria aqui (sempre "operator does not exist: text = uuid"); nunca
      // tinha sido exercitado porque a UI de produção só chama este modo sem campaignIds.
      ? `SELECT id, name, client_id FROM campanhasmarketingdigital."Campaign"
         WHERE tenant_id = $1 AND id = ANY($2::text[])
         ORDER BY "createdAt" DESC`
      : `SELECT id, name, client_id FROM campanhasmarketingdigital."Campaign"
         WHERE tenant_id = $1
           AND (declared_angle IS NULL OR declared_angle = '')
         ORDER BY "createdAt" DESC
         LIMIT 200`,
    hasIds ? [tenantId, campaignIds] : [tenantId],
  );

  if (campaigns.length === 0) return [];

  // Agrupa por escopo de ângulo (segmento efetivo da campanha, via client_id) — cada grupo vira
  // seu(s) próprio(s) lote(s) de até 20, nunca misturando taxonomias de segmentos diferentes
  // na mesma chamada ao LLM.
  const scopeCache = new Map<string, AngleScope>();
  async function scopeForClient(clientId: string | null): Promise<AngleScope> {
    const key = clientId ?? '__own__';
    if (!scopeCache.has(key)) {
      scopeCache.set(key, await resolveAngleScope(tenantId, clientId));
    }
    return scopeCache.get(key)!;
  }

  const groups = new Map<string, { scope: AngleScope; campaigns: typeof campaigns }>();
  for (const c of campaigns) {
    const scope = await scopeForClient(c.client_id);
    const groupKey = scope.segmentId ?? '__sem_segmento__';
    if (!groups.has(groupKey)) groups.set(groupKey, { scope, campaigns: [] });
    groups.get(groupKey)!.campaigns.push(c);
  }

  const results: ClassificationResult[] = [];
  for (const { scope, campaigns: groupCampaigns } of groups.values()) {
    for (let i = 0; i < groupCampaigns.length; i += BATCH_SIZE) {
      const batch = groupCampaigns.slice(i, i + BATCH_SIZE);
      results.push(...await classifyBatch(tenantId, batch, scope));
    }
  }
  return results;
}

async function classifyBatch(
  tenantId: string,
  campaigns: { id: string; name: string; client_id: string | null }[],
  scope: AngleScope,
): Promise<ClassificationResult[]> {
  const campaignList = campaigns
    .map(c => `ID: ${c.id} | Nome: ${c.name}`)
    .join('\n');
  const angleOptionsText = scope.options
    .map(o => `${o.slug} — ${o.label}`)
    .join('\n');

  try {
    const response = await invokeForContext({
      templateKey: 'classify_campaign_angle',
      tenantId,
      variables: { campaign_list: campaignList, angle_options: angleOptionsText },
      maxTokens: 800,
    });

    if (!response) throw new Error('LLM retornou resposta vazia');

    const jsonMatch = response.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) throw new Error('Resposta não contém JSON array');

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      id: string;
      angle: string;
      confidence: string;
    }>;

    return parsed.map(item => {
      const campaign = campaigns.find(c => c.id === item.id);
      const matched = matchAngle(item.angle, scope.options);
      return {
        id: item.id,
        name: campaign?.name ?? item.id,
        // Nunca força um slug fora da taxonomia real do segmento (ex.: 'other' pode nem
        // existir no catálogo customizado) — sem match, fica null, confiança 'low'.
        suggestedAngle: matched,
        confidence: matched
          ? ((['high', 'medium', 'low'] as const).includes(item.confidence as any)
              ? (item.confidence as 'high' | 'medium' | 'low')
              : 'medium')
          : 'low',
        allowedAngles: scope.options,
        isLegacyFallback: scope.isLegacyFallback,
      };
    });
  } catch {
    // Fallback: marca tudo como não-classificado, baixa confiança — nunca inventa um slug.
    return campaigns.map(c => ({
      id: c.id,
      name: c.name,
      suggestedAngle: null,
      confidence: 'low' as const,
      allowedAngles: scope.options,
      isLegacyFallback: scope.isLegacyFallback,
    }));
  }
}

/** Persiste as classificações no banco (angle_source = 'llm_auto'). */
export async function saveAngleClassifications(
  tenantId: string,
  assignments: Array<{ id: string; angle: string }>,
): Promise<number> {
  let saved = 0;
  for (const { id, angle } of assignments) {
    if (!angle) continue;
    try {
      // Resolve o client_id real da campanha pra validar contra o segmento certo (nunca contra
      // uma taxonomia genérica) — P1, docs/PLANO_INTEGRACAO_JEV.md §5.2.
      const { rows } = await pool.query<{ client_id: string | null }>(
        `SELECT client_id FROM campanhasmarketingdigital."Campaign"
         WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId],
      );
      if (rows.length === 0) continue;

      const normalized = await normalizeAngleForScope(angle, tenantId, rows[0].client_id);
      if (!normalized) continue;

      const { rowCount } = await pool.query(
        `UPDATE campanhasmarketingdigital."Campaign"
         SET declared_angle = $1,
             angle_source    = 'llm_auto',
             "updatedAt"     = now()
         WHERE id = $2 AND tenant_id = $3`,
        [normalized, id, tenantId],
      );
      if ((rowCount ?? 0) > 0) saved++;
    } catch { /* pula falhas individuais */ }
  }
  return saved;
}
