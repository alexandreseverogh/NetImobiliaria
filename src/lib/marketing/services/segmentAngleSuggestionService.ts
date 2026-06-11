/**
 * FASE 18.3 — Segment Angle Suggestion Service
 * LLM propõe ângulos + termos de Google Trends para um segmento (nicho).
 * Admin revisa e salva em segment_angle_terms. ZERO HARDCODE (prompt no banco).
 */

import pool from '@/lib/database/connection';
import { invokeWithTemplate } from '@/lib/intelligence/llmInvoker';

export interface SuggestedAngle {
  slug:  string;
  label: string;
  terms: string[];
}

const S = 'campanhasmarketingdigital';

function slugify(raw: string): string {
  return raw
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

/**
 * Pede ao LLM (modelo global) sugestões de ângulos + termos para o segmento.
 * Retorna lista normalizada. Lança erro se o LLM/JSON falhar (UI trata).
 */
export async function suggestSegmentAngles(
  segmentName: string,
  segmentDescription: string,
): Promise<SuggestedAngle[]> {
  const raw = await invokeWithTemplate({
    templateKey: 'segment_angles_suggestion',
    segmentId:   null,
    variables: {
      segment_name:        segmentName,
      segment_description: segmentDescription || '(sem descrição)',
    },
    maxTokens: 1200,
  });

  // Extrai o primeiro array JSON da resposta
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('LLM não retornou JSON válido de ângulos.');

  let parsed: any;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    throw new Error('Falha ao parsear o JSON de ângulos do LLM.');
  }
  if (!Array.isArray(parsed)) throw new Error('Resposta do LLM não é um array.');

  const seen = new Set<string>();
  const out: SuggestedAngle[] = [];
  for (const item of parsed) {
    const label = String(item?.label ?? '').trim();
    let slug    = String(item?.slug ?? '').trim();
    if (!slug && label) slug = slugify(label);
    slug = slugify(slug);
    if (!slug || !label || seen.has(slug)) continue;
    seen.add(slug);

    const terms = Array.isArray(item?.terms)
      ? item.terms.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 4)
      : [];
    out.push({ slug, label, terms });
  }
  if (out.length === 0) throw new Error('LLM não retornou ângulos utilizáveis.');
  return out;
}

/**
 * Ângulos atuais de um segmento (agrupados slug → label + termos) para o editor.
 */
export async function getSegmentAnglesDetailed(segmentId: string): Promise<SuggestedAngle[]> {
  const { rows } = await pool.query(
    `SELECT angle_slug, angle_label, search_term
     FROM ${S}.segment_angle_terms
     WHERE segment_id = $1::uuid
     ORDER BY angle_slug, weight DESC`,
    [segmentId],
  );
  const map = new Map<string, SuggestedAngle>();
  for (const r of rows) {
    if (!map.has(r.angle_slug)) map.set(r.angle_slug, { slug: r.angle_slug, label: r.angle_label, terms: [] });
    map.get(r.angle_slug)!.terms.push(r.search_term);
  }
  return Array.from(map.values());
}

/**
 * Persiste os ângulos confirmados de um segmento.
 * Substitui (replace) todas as linhas do segmento e sincroniza
 * system_segments.creative_taxonomy.angles com os slugs.
 */
export async function saveSegmentAngles(segmentId: string, angles: SuggestedAngle[]): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Replace: remove tudo do segmento e reinsere
    await client.query(
      `DELETE FROM ${S}.segment_angle_terms WHERE segment_id = $1::uuid`,
      [segmentId],
    );

    let inserted = 0;
    for (const a of angles) {
      const slug  = slugify(a.slug || a.label);
      const label = (a.label || a.slug).trim();
      const terms = (a.terms && a.terms.length > 0) ? a.terms : [label]; // ao menos 1 termo
      if (!slug || !label) continue;
      for (const term of terms) {
        const t = String(term).trim();
        if (!t) continue;
        await client.query(
          `INSERT INTO ${S}.segment_angle_terms (segment_id, angle_slug, angle_label, search_term)
           VALUES ($1::uuid, $2, $3, $4)
           ON CONFLICT (segment_id, angle_slug, search_term) DO UPDATE SET angle_label = EXCLUDED.angle_label`,
          [segmentId, slug, label, t],
        );
        inserted++;
      }
    }

    // Sincroniza creative_taxonomy.angles (lista de slugs) no segmento
    const slugs = Array.from(new Set(angles.map(a => slugify(a.slug || a.label)).filter(Boolean)));
    await client.query(
      `UPDATE public.system_segments
       SET creative_taxonomy = jsonb_set(
         COALESCE(creative_taxonomy, '{}'::jsonb),
         '{angles}',
         $2::jsonb
       )
       WHERE id = $1::uuid`,
      [segmentId, JSON.stringify(slugs)],
    );

    await client.query('COMMIT');
    return inserted;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    throw e;
  } finally {
    client.release();
  }
}
