import { Pool } from 'pg';

let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) _pool = new Pool({ connectionString: process.env.MARKETING_DATABASE_URL });
  return _pool;
}

export interface Segment {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color_theme: string | null;
  vocabulary: Record<string, any>;
  funnel_stages: any[];
  creative_taxonomy: Record<string, any>;
  primary_kpis: any[];
  imagens_por_ia: boolean;
  chatbot_max_turns_default: number;
}

export interface SegmentOption {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color_theme: string | null;
}

/**
 * Resolves the effective segment for a given tenant+client combination.
 *
 * Resolution order:
 *   1. Client's own segment_id (if clientId provided and clientes.segment_id is set)
 *   2. Tenant's segment_id
 *   3. Fallback: slug='geral'
 */
export async function resolveSegment(
  tenantId: string,
  clientId?: string | null,
): Promise<Segment | null> {
  const pool = getPool();

  // 'own' e 'segment' são sentinelas de UI — nunca são UUID de cliente
  if (clientId && clientId !== 'own' && clientId !== 'segment') {
    const res = await pool.query<Segment>(
      `SELECT ss.*
       FROM public.system_segments ss
       JOIN public.clientes c ON c.segment_id = ss.id
       WHERE c.uuid = $1::uuid AND ss.is_active = true
       LIMIT 1`,
      [clientId],
    );
    if (res.rows[0]) return res.rows[0];
  }

  const tenantRes = await pool.query<Segment>(
    `SELECT ss.*
     FROM public.system_segments ss
     JOIN public.tenants t ON t.segment_id = ss.id
     WHERE t.id = $1::uuid AND ss.is_active = true
     LIMIT 1`,
    [tenantId],
  );
  if (tenantRes.rows[0]) return tenantRes.rows[0];

  const fallback = await pool.query<Segment>(
    `SELECT * FROM public.system_segments WHERE slug = 'geral' AND is_active = true LIMIT 1`,
  );
  return fallback.rows[0] || null;
}

/** Returns all active segments for use in selectors (never hardcode this list). */
export async function listActiveSegments(): Promise<SegmentOption[]> {
  const res = await getPool().query<SegmentOption>(
    `SELECT id, name, slug, icon, color_theme
     FROM public.system_segments
     WHERE is_active = true
     ORDER BY name`,
  );
  return res.rows;
}
