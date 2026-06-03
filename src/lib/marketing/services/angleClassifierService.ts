/**
 * FASE 14d — Auto-classificação de ângulo em lote.
 *
 * Usa LLM para inferir o ângulo persuasivo de campanhas pelo nome.
 * Salva em Campaign.declared_angle (angle_source = 'llm_auto').
 * Declaração manual via PATCH da API usa angle_source = 'declared'.
 *
 * Coluna angle_source existe no DB via migration-2026-06-03-angle-source.sql
 * mas não está no schema Prisma (acesso via raw SQL para evitar regeneração).
 */

import pool from '@/lib/database/connection';
import { normalizeAngle, type CommunicationAngle } from '@/lib/marketing/angles';
import { invokeForContext } from '@/lib/intelligence/llmInvoker';

export interface ClassificationResult {
  id: string;
  name: string;
  suggestedAngle: CommunicationAngle;
  confidence: 'high' | 'medium' | 'low';
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

  const { rows: campaigns } = await pool.query<{ id: string; name: string }>(
    hasIds
      ? `SELECT id, name FROM campanhasmarketingdigital."Campaign"
         WHERE tenant_id = $1 AND id = ANY($2::uuid[])
         ORDER BY "createdAt" DESC`
      : `SELECT id, name FROM campanhasmarketingdigital."Campaign"
         WHERE tenant_id = $1
           AND (declared_angle IS NULL OR declared_angle = '')
         ORDER BY "createdAt" DESC
         LIMIT 200`,
    hasIds ? [tenantId, campaignIds] : [tenantId],
  );

  if (campaigns.length === 0) return [];

  const results: ClassificationResult[] = [];
  for (let i = 0; i < campaigns.length; i += BATCH_SIZE) {
    const batch = campaigns.slice(i, i + BATCH_SIZE);
    results.push(...await classifyBatch(tenantId, batch));
  }
  return results;
}

async function classifyBatch(
  tenantId: string,
  campaigns: { id: string; name: string }[],
): Promise<ClassificationResult[]> {
  const campaignList = campaigns
    .map(c => `ID: ${c.id} | Nome: ${c.name}`)
    .join('\n');

  try {
    const response = await invokeForContext({
      templateKey: 'classify_campaign_angle',
      tenantId,
      variables: { campaign_list: campaignList },
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
      return {
        id: item.id,
        name: campaign?.name ?? item.id,
        suggestedAngle: (normalizeAngle(item.angle) ?? 'other') as CommunicationAngle,
        confidence: (['high', 'medium', 'low'] as const).includes(item.confidence as any)
          ? (item.confidence as 'high' | 'medium' | 'low')
          : 'medium',
      };
    });
  } catch {
    // Fallback: marca tudo como 'other' com baixa confiança
    return campaigns.map(c => ({
      id: c.id,
      name: c.name,
      suggestedAngle: 'other' as CommunicationAngle,
      confidence: 'low' as const,
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
    const normalized = normalizeAngle(angle);
    if (!normalized) continue;
    try {
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
