/**
 * Correção P3 (docs/PLANO_INTEGRACAO_JEV.md §5.2/§5.3) — taxonomia de hook_type/cta_style/
 * checagens booleanas da Vision de criativos, por SEGMENTO, zero hardcode. Mesmo espírito de
 * `angleResolver.ts` (que já resolve `angle` via `segment_angle_terms`) — aqui para as 3 outras
 * dimensões categóricas/booleanas extraídas por `creativeAnalysisService.ts`.
 */

import pool from '@/lib/database/connection';

export interface TaxonomyOption {
  slug: string;
  label: string;
}

export interface BooleanCheck {
  key: string;
  label: string;
}

/** Opções reais de hook_type cadastradas para o segmento (curadas pelo Master). */
export async function getSegmentHookTypes(segmentId: string): Promise<TaxonomyOption[]> {
  const { rows } = await pool.query(
    `SELECT hook_slug AS slug, hook_label AS label
     FROM campanhasmarketingdigital.segment_hook_type_terms
     WHERE segment_id = $1::uuid
     ORDER BY hook_slug`,
    [segmentId],
  );
  return rows;
}

/** Opções reais de cta_style cadastradas para o segmento (curadas pelo Master). */
export async function getSegmentCtaStyles(segmentId: string): Promise<TaxonomyOption[]> {
  const { rows } = await pool.query(
    `SELECT style_slug AS slug, style_label AS label
     FROM campanhasmarketingdigital.segment_cta_style_terms
     WHERE segment_id = $1::uuid
     ORDER BY style_slug`,
    [segmentId],
  );
  return rows;
}

/** Checagens booleanas ATIVAS para o segmento (Master pode desativar por segmento). */
export async function getSegmentBooleanChecks(segmentId: string): Promise<BooleanCheck[]> {
  const { rows } = await pool.query(
    `SELECT check_key AS key, check_label AS label
     FROM campanhasmarketingdigital.segment_creative_boolean_checks
     WHERE segment_id = $1::uuid AND ativo = true
     ORDER BY check_key`,
    [segmentId],
  );
  return rows;
}

/** Casa um valor (texto livre, retorno do LLM) contra uma lista de opções já resolvida. */
export function matchTaxonomyOption(value: unknown, options: TaxonomyOption[]): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;
  const hit = options.find(o => o.slug.toLowerCase() === v);
  return hit ? hit.slug : null;
}
