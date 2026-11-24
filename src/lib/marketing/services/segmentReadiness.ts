/**
 * Prontidão de um segmento para curadoria de Interesses Meta (e demais ações que dependem de
 * uma credencial Meta real).
 *
 * "Tenant Meta saudável" = pertence ao segmento, tem credencial Meta ativa com token presente,
 * sem falhas consecutivas do canário horário (FASE 19.3), sem disjuntor aberto (FASE 19.2) e
 * não expirada. Esta condição precisa bater com a subquery de `meta_tenants_healthy` da rota
 * GET /api/admin/master/segments — se mudar aqui, mudar lá também.
 */
import pool from '@/lib/database/connection';

/**
 * Lista do que ainda falta para o segmento ficar pronto para curadoria. Usada logo após o
 * cadastro de um segmento novo, para o Master ver as pendências sem depender de lembrar de
 * abrir a lista depois. Mesma regra dos itens da coluna "Prontidão" em /admin/master/segments.
 */
export async function getSegmentPendencies(segmentId: string): Promise<string[]> {
  const { rows } = await pool.query(
    `SELECT
       (length(btrim(COALESCE(s.description, ''))) > 0) AS has_description,
       (SELECT COUNT(DISTINCT sat.angle_slug)::int
          FROM campanhasmarketingdigital.segment_angle_terms sat
         WHERE sat.segment_id = s.id) AS angles_count,
       jsonb_array_length(COALESCE(s.network_defaults->'meta'->'suggested_interests', '[]'::jsonb))::int AS interests_count
     FROM public.system_segments s
     WHERE s.id = $1::uuid`,
    [segmentId],
  );
  const s = rows[0];
  if (!s) return [];

  const pendencies: string[] = [];
  if (!s.has_description) pendencies.push('Descrição do segmento (a IA usa para sugerir ângulos e interesses)');
  if (!(await findHealthyMetaTenantForSegment(segmentId))) {
    pendencies.push('Uma empresa deste segmento com a Meta conectada e token válido (necessária para resolver interesses)');
  }
  if ((s.angles_count ?? 0) === 0) pendencies.push('Ângulos de comunicação (Ângulos & Demanda → Sugerir com IA)');
  if ((s.interests_count ?? 0) === 0) pendencies.push('Interesses Meta (Interesses Meta → Sugerir com IA, após conectar a Meta)');
  return pendencies;
}

export async function findHealthyMetaTenantForSegment(segmentId: string): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT t.id
       FROM public.tenants t
       JOIN public.tenant_network_credentials tnc ON tnc.tenant_id = t.id AND tnc.is_active = true
       JOIN public.ad_networks n ON n.id = tnc.network_id AND n.code = 'meta'
      WHERE t.segment_id = $1::uuid
        AND (tnc.credentials->>'access_token') IS NOT NULL
        AND tnc.consecutive_failures = 0
        AND tnc.circuit_tripped_at IS NULL
        AND (tnc.expires_at IS NULL OR tnc.expires_at > now())
      ORDER BY t.name
      LIMIT 1`,
    [segmentId],
  );
  return rows[0]?.id ?? null;
}
