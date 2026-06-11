/**
 * FASE 18.2 — Segment Taxonomy Service
 * Fonte única (dirigida pelo banco) para ângulos, rótulos e termos de busca POR SEGMENTO.
 * Lê de campanhasmarketingdigital.segment_angle_terms. ZERO HARDCODE.
 */

import pool from '@/lib/database/connection';

export interface SegmentAngle {
  slug:  string;
  label: string;
}

export interface SegmentSearchTerm {
  angle:  string;   // angle_slug
  label:  string;
  term:   string;
  weight: number;
}

export interface ScopeSegment {
  id:         string;
  name:       string;
  slug:       string;
  colorTheme: string | null;
  icon:       string | null;
}

/**
 * Ângulos de um segmento (distinct por slug), com rótulo para UI.
 */
export async function getSegmentAngles(segmentId: string): Promise<SegmentAngle[]> {
  const { rows } = await pool.query(
    `SELECT DISTINCT ON (angle_slug) angle_slug, angle_label
     FROM campanhasmarketingdigital.segment_angle_terms
     WHERE segment_id = $1::uuid
     ORDER BY angle_slug`,
    [segmentId],
  );
  return rows.map(r => ({ slug: r.angle_slug, label: r.angle_label }));
}

/**
 * Termos de busca (Google Trends) de um segmento — pode haver vários por ângulo.
 */
export async function getSegmentSearchTerms(segmentId: string): Promise<SegmentSearchTerm[]> {
  const { rows } = await pool.query(
    `SELECT angle_slug, angle_label, search_term, weight
     FROM campanhasmarketingdigital.segment_angle_terms
     WHERE segment_id = $1::uuid
     ORDER BY angle_slug, weight DESC`,
    [segmentId],
  );
  return rows.map(r => ({
    angle:  r.angle_slug,
    label:  r.angle_label,
    term:   r.search_term,
    weight: Number(r.weight),
  }));
}

/**
 * Mapa global angle_slug → label (para resolução de rótulos na UI/serviços).
 * Útil quando não se conhece o segmento de antemão (dados legados).
 */
export async function getAllAngleLabels(): Promise<Map<string, string>> {
  const { rows } = await pool.query(
    `SELECT DISTINCT ON (angle_slug) angle_slug, angle_label
     FROM campanhasmarketingdigital.segment_angle_terms
     ORDER BY angle_slug, id`,
  );
  return new Map(rows.map(r => [r.angle_slug, r.angle_label]));
}

/**
 * Quais segmentos exibir, dado o escopo (tenant + filtro de cliente).
 *  - cliente único  → apenas o segmento daquele cliente
 *  - 'own'          → segmento do próprio tenant
 *  - agregado (n/a) → segmentos que possuem campanhas (clientes + próprias do tenant)
 * Apenas segmentos que tenham ângulos cadastrados (segment_angle_terms) entram.
 */
export async function getActiveSegmentsForScope(
  tenantId: string,
  clientId?: string | null,
): Promise<ScopeSegment[]> {
  // Cliente único → segmento dele
  if (clientId && clientId !== 'own' && clientId !== 'all') {
    const { rows } = await pool.query(
      `SELECT s.id, s.name, s.slug, s.color_theme, s.icon
       FROM public.clientes c
       JOIN public.system_segments s ON s.id = c.segment_id
       WHERE c.uuid = $1::uuid AND s.is_active = true
       LIMIT 1`,
      [clientId],
    );
    return rows.map(mapScopeSegment);
  }

  // 'own' → segmento do tenant
  if (clientId === 'own') {
    const { rows } = await pool.query(
      `SELECT s.id, s.name, s.slug, s.color_theme, s.icon
       FROM public.tenants t
       JOIN public.system_segments s ON s.id = t.segment_id
       WHERE t.id = $1::uuid AND s.is_active = true
       LIMIT 1`,
      [tenantId],
    );
    return rows.map(mapScopeSegment);
  }

  // Agregado → segmentos com campanhas (de clientes + próprias do tenant)
  const { rows } = await pool.query(
    `SELECT DISTINCT s.id, s.name, s.slug, s.color_theme, s.icon
     FROM public.system_segments s
     WHERE s.is_active = true
       AND s.id IN (
         SELECT c.segment_id
         FROM campanhasmarketingdigital."Campaign" cam
         JOIN public.clientes c ON c.uuid = cam.client_id
         WHERE cam.tenant_id = $1::uuid AND cam.client_id IS NOT NULL AND c.segment_id IS NOT NULL
         UNION
         SELECT t.segment_id
         FROM campanhasmarketingdigital."Campaign" cam
         JOIN public.tenants t ON t.id = cam.tenant_id
         WHERE cam.tenant_id = $1::uuid AND cam.client_id IS NULL AND t.segment_id IS NOT NULL
       )
       AND EXISTS (
         SELECT 1 FROM campanhasmarketingdigital.segment_angle_terms sat
         WHERE sat.segment_id = s.id
       )
     ORDER BY s.name`,
    [tenantId],
  );
  return rows.map(mapScopeSegment);
}

function mapScopeSegment(r: any): ScopeSegment {
  return {
    id:         r.id,
    name:       r.name,
    slug:       r.slug,
    colorTheme: r.color_theme ?? null,
    icon:       r.icon ?? null,
  };
}
