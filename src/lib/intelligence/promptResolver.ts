import { Pool } from 'pg';

let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) _pool = new Pool({ connectionString: process.env.MARKETING_DATABASE_URL });
  return _pool;
}

export interface ResolvePromptScope {
  segmentId?: string | null;
  /** Override por tenant — só CRM/Mensageria (docs/CHECKPOINT.md, 2026-08-28). Campanhas
   *  de Marketing Digital nunca passa isso (getLlmClientForCampaigns/invokeForContext
   *  continuam segmento-apenas, de propósito). */
  tenantId?: string | null;
  /** Override por cliente — cadastrado pelo admin do TENANT em nome do cliente, já que
   *  cliente nunca loga na aplicação. Só faz sentido junto de tenantId. */
  clientId?: string | null;
}

/**
 * Resolves the best active prompt template for a given key, in cascade:
 *
 *   1. Client override   (tenant_id = X, client_id = Y)   — CRM/Mensageria only
 *   2. Tenant override    (tenant_id = X, client_id NULL)  — CRM/Mensageria only
 *   3. Segment default    (segment_id = Z, tenant_id NULL) — curated by Master
 *   4. Global fallback    (segment_id IS NULL, tenant_id IS NULL) — curated by Master
 *
 * Callers that never pass tenantId/clientId (Campanhas de Marketing Digital, via
 * invokeWithTemplate/getLlmClientForCampaigns) fall straight into steps 3-4, unchanged from
 * before this cascade existed — Campanhas keeps a single global-per-segment model, no
 * tenant/client override, by deliberate decision.
 *
 * Returns the raw template string with {{variable}} placeholders, or null if not found.
 */
export async function resolvePromptTemplate(
  templateKey: string,
  scope: ResolvePromptScope | string | null = {},
): Promise<string | null> {
  // Retrocompat: chamadores antigos passavam segmentId como 2º argumento posicional
  // (string | null) — ainda funciona, só vira { segmentId }.
  const { segmentId = null, tenantId = null, clientId = null } =
    typeof scope === 'object' && scope !== null ? scope : { segmentId: scope };

  const pool = getPool();

  if (tenantId && clientId) {
    const res = await pool.query<{ content: string }>(
      `SELECT content
       FROM public.system_prompt_templates
       WHERE template_key = $1
         AND tenant_id = $2::uuid
         AND client_id = $3::uuid
         AND is_active = true
       ORDER BY version DESC
       LIMIT 1`,
      [templateKey, tenantId, clientId],
    );
    if (res.rows[0]) return res.rows[0].content;
  }

  if (tenantId) {
    const res = await pool.query<{ content: string }>(
      `SELECT content
       FROM public.system_prompt_templates
       WHERE template_key = $1
         AND tenant_id = $2::uuid
         AND client_id IS NULL
         AND is_active = true
       ORDER BY version DESC
       LIMIT 1`,
      [templateKey, tenantId],
    );
    if (res.rows[0]) return res.rows[0].content;
  }

  if (segmentId) {
    const res = await pool.query<{ content: string }>(
      `SELECT content
       FROM public.system_prompt_templates
       WHERE template_key = $1
         AND segment_id = $2::uuid
         AND is_active = true
       ORDER BY version DESC
       LIMIT 1`,
      [templateKey, segmentId],
    );
    if (res.rows[0]) return res.rows[0].content;
  }

  const fallback = await pool.query<{ content: string }>(
    `SELECT content
     FROM public.system_prompt_templates
     WHERE template_key = $1
       AND segment_id IS NULL
       AND is_active = true
     ORDER BY version DESC
     LIMIT 1`,
    [templateKey],
  );
  return fallback.rows[0]?.content ?? null;
}
