/**
 * Resolução de ângulo de comunicação por ESCOPO (tenant+cliente → segmento), zero hardcode.
 *
 * Substitui o uso direto de `normalizeAngle()`/`ANGLE_OPTIONS` (src/lib/marketing/angles.ts —
 * 8 valores fixos, taxonomia legada) em qualquer ponto que precise VALIDAR ou LISTAR ângulos
 * reais de uma campanha. A fonte de verdade é `segment_angle_terms` (curada pelo Master via
 * `/admin/master/segments` → "Ângulos & Demanda"), já usada pelo Radar de Demanda e pelo Wizard
 * (ver `segmentTaxonomyService.ts`) — este módulo só estende o mesmo princípio para os pontos
 * que ainda validavam contra a lista de 8 valores legados (classificador em lote, API de
 * campanhas, editor inline de ângulo).
 *
 * Fallback: segmento sem NENHUM ângulo cadastrado em `segment_angle_terms` ainda usa a
 * taxonomia legada de `angles.ts` — rede de segurança transitória, explícita via
 * `isLegacyFallback`, nunca silenciosa. Deixa de valer automaticamente assim que o Master
 * cadastrar ao menos 1 ângulo para aquele segmento.
 */

import { resolveSegment } from '@/lib/intelligence/segmentResolver';
import { getSegmentAngles } from './segmentTaxonomyService';
import { ANGLE_OPTIONS as LEGACY_ANGLE_OPTIONS } from '../angles';

export interface AngleOption {
  slug: string;
  label: string;
}

export interface AngleScope {
  options: AngleOption[];
  /** true = segmento ainda sem ângulos próprios cadastrados; usando a taxonomia legada de 8 valores. */
  isLegacyFallback: boolean;
  segmentId: string | null;
  segmentName: string | null;
}

const LEGACY_OPTIONS: AngleOption[] = LEGACY_ANGLE_OPTIONS.map(o => ({ slug: o.value, label: o.label }));

/** Resolve as opções de ângulo válidas para um tenant/cliente (via segmento). */
export async function resolveAngleScope(
  tenantId: string,
  clientId?: string | null,
): Promise<AngleScope> {
  const segment = await resolveSegment(tenantId, clientId ?? null).catch(() => null);
  if (!segment) {
    return { options: LEGACY_OPTIONS, isLegacyFallback: true, segmentId: null, segmentName: null };
  }

  const segAngles = await getSegmentAngles(segment.id).catch(() => []);
  if (segAngles.length > 0) {
    return {
      options: segAngles.map(a => ({ slug: a.slug, label: a.label })),
      isLegacyFallback: false,
      segmentId: segment.id,
      segmentName: segment.name,
    };
  }

  return { options: LEGACY_OPTIONS, isLegacyFallback: true, segmentId: segment.id, segmentName: segment.name };
}

/** Casa um valor (texto livre, ex. retorno de LLM ou da UI) contra uma lista de opções já resolvida. */
export function matchAngle(value: unknown, options: AngleOption[]): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;
  const hit = options.find(o => o.slug.toLowerCase() === v);
  return hit ? hit.slug : null;
}

/**
 * Versão assíncrona de `normalizeAngle()`, ciente de segmento — usar em qualquer ponto que
 * PERSISTE um ângulo (POST/PATCH de campanha, classificador em lote). Nunca aceita um valor
 * fora da taxonomia real do segmento (ou da legada, só enquanto o segmento não tiver a própria).
 */
export async function normalizeAngleForScope(
  value: unknown,
  tenantId: string,
  clientId?: string | null,
): Promise<string | null> {
  const scope = await resolveAngleScope(tenantId, clientId);
  return matchAngle(value, scope.options);
}
