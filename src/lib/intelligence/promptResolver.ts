import { Pool } from 'pg';

let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) _pool = new Pool({ connectionString: process.env.MARKETING_DATABASE_URL });
  return _pool;
}

/**
 * Resolves the best active prompt template for a given key and segment.
 *
 * Resolution order:
 *   1. Segment-specific template (segment_id = segmentId)
 *   2. Global fallback            (segment_id IS NULL)
 *
 * No tenant override — prompts are segment-scoped only.
 * Returns the raw template string with {{variable}} placeholders, or null if not found.
 */
export async function resolvePromptTemplate(
  templateKey: string,
  segmentId: string | null,
): Promise<string | null> {
  const pool = getPool();

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
