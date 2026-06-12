/**
 * FASE 18.4 — Segment Interest Suggestion Service
 * Híbrido: LLM propõe NOMES de interesse por segmento (3 camadas) → o sistema
 * resolve os IDs REAIS na Meta Targeting API. ZERO HARDCODE, IDs nunca inventados.
 */

import { invokeWithTemplate } from '@/lib/intelligence/llmInvoker';
import { resolveMetaAccessToken, searchMetaInterests, type MetaInterest } from './metaInterestService';

export type InterestLayer = 'intencao' | 'estagio' | 'comportamento';

export interface SuggestedInterest extends MetaInterest {
  layer:         InterestLayer | null;
  suggestedTerm: string;   // termo que o LLM propôs e gerou este match
}

export interface InterestSuggestionResult {
  interests:       SuggestedInterest[];
  tokenConfigured: boolean;
  terms:           { term: string; layer: InterestLayer | null }[];
}

const LAYERS: InterestLayer[] = ['intencao', 'estagio', 'comportamento'];

/**
 * LLM propõe termos de interesse → resolve IDs reais na Meta API.
 * Se o tenant não tem token Meta, retorna tokenConfigured=false (a UI avisa)
 * mas ainda devolve os termos sugeridos pelo LLM.
 */
export async function suggestSegmentInterests(
  segmentName: string,
  description: string,
  tenantId: string,
): Promise<InterestSuggestionResult> {
  // 1. LLM → termos por camada
  const raw = await invokeWithTemplate({
    templateKey: 'segment_interests_suggestion',
    segmentId:   null,
    variables: {
      segment_name:        segmentName,
      segment_description: description || '(sem descrição)',
    },
    maxTokens: 900,
  });

  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('LLM não retornou JSON válido de interesses.');
  let parsed: any;
  try { parsed = JSON.parse(match[0]); }
  catch { throw new Error('Falha ao parsear o JSON de interesses do LLM.'); }
  if (!Array.isArray(parsed)) throw new Error('Resposta do LLM não é um array.');

  const terms: { term: string; layer: InterestLayer | null }[] = [];
  for (const item of parsed) {
    const term = String(item?.term ?? '').trim();
    if (!term) continue;
    const layerRaw = String(item?.layer ?? '').trim().toLowerCase();
    const layer = (LAYERS as string[]).includes(layerRaw) ? (layerRaw as InterestLayer) : null;
    terms.push({ term, layer });
  }
  if (terms.length === 0) throw new Error('LLM não retornou termos utilizáveis.');

  // 2. Token do tenant (IDs do Meta são globais)
  const token = await resolveMetaAccessToken(tenantId);
  if (!token) {
    return { interests: [], tokenConfigured: false, terms };
  }

  // 3. Resolve cada termo na Meta API (top 2 matches por termo, dedupe por id)
  const seen = new Set<string>();
  const interests: SuggestedInterest[] = [];
  for (const t of terms) {
    let matches: MetaInterest[] = [];
    try { matches = await searchMetaInterests(token, t.term, 3); }
    catch { matches = []; }
    for (const m of matches.slice(0, 2)) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      interests.push({ ...m, layer: t.layer, suggestedTerm: t.term });
    }
  }

  return { interests, tokenConfigured: true, terms };
}
