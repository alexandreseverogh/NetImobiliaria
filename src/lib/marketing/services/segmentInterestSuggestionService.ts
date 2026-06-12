/**
 * FASE 18.4 — Segment Interest Suggestion Service
 * Híbrido: LLM propõe NOMES de interesse por segmento (3 camadas) → o sistema
 * resolve os IDs REAIS na Meta Targeting API. ZERO HARDCODE, IDs nunca inventados.
 */

import { invokeWithTemplate } from '@/lib/intelligence/llmInvoker';
import { resolveMetaAccessToken, searchMetaInterestsCached, type MetaInterest } from './metaInterestService';

export type InterestLayer = 'intencao' | 'estagio' | 'comportamento';

export interface SuggestedInterest extends MetaInterest {
  layer:         InterestLayer | null;
  suggestedTerm: string;   // termo que o LLM propôs e gerou este match
}

export interface InterestSuggestionResult {
  interests:       SuggestedInterest[];
  tokenConfigured: boolean;
  terms:           { term: string; layer: InterestLayer | null }[];
  metaError:       string | null;   // erro da Meta API (ex: rate-limit), se houver
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
    return { interests: [], tokenConfigured: false, terms, metaError: null };
  }

  // 3. Resolve cada termo na Meta API (top 2 matches por termo, dedupe por id).
  //    Pequeno intervalo entre chamadas para reduzir rate-limit (OAuthException code 1).
  const seen = new Set<string>();
  const interests: SuggestedInterest[] = [];
  let metaError: string | null = null;
  for (let i = 0; i < terms.length; i++) {
    const t = terms[i];
    try {
      const matches = await searchMetaInterestsCached(token, t.term, 3);
      for (const m of matches.slice(0, 2)) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        interests.push({ ...m, layer: t.layer, suggestedTerm: t.term });
      }
    } catch (err: any) {
      const fbErr = err?.response?.data?.error;
      if (!metaError) {
        metaError = fbErr?.code === 4 || fbErr?.code === 17 || fbErr?.code === 32
          ? 'Limite de chamadas da Meta API atingido. Aguarde alguns minutos e tente novamente.'
          : (fbErr?.message
              ? `Meta API instável: ${fbErr.message}`
              : 'Meta API instável no momento. Tente novamente em instantes.');
      }
    }
    if (i < terms.length - 1) await new Promise(r => setTimeout(r, 250));
  }

  return { interests, tokenConfigured: true, terms, metaError };
}
