/**
 * FASE 14 — Taxonomia de Ângulos de Comunicação (fonte única).
 *
 * Mesma taxonomia inferida pelo Vision em creativeAnalysisService.ts (CreativeAnalysis.angle),
 * para permitir comparação entre o ângulo DECLARADO no lançamento (Campaign.declaredAngle)
 * e o ângulo INFERIDO do criativo. NÃO duplicar esta lista em outras telas — importar daqui.
 */

export type CommunicationAngle =
  | 'investment'
  | 'lifestyle'
  | 'family'
  | 'price'
  | 'urgency'
  | 'social'
  | 'luxury'
  | 'other';

export const ANGLE_LABELS: Record<CommunicationAngle, string> = {
  investment: 'Investimento / Valorização',
  lifestyle:  'Estilo de vida',
  family:     'Família',
  price:      'Preço / Oferta',
  urgency:    'Urgência / Escassez',
  social:     'Prova social',
  luxury:     'Luxo / Exclusividade',
  other:      'Outro',
};

/** Lista ordenada para popular <select> (sem 'other' no topo). */
export const ANGLE_OPTIONS: { value: CommunicationAngle; label: string }[] = [
  'investment', 'lifestyle', 'family', 'price', 'urgency', 'social', 'luxury', 'other',
].map(v => ({ value: v as CommunicationAngle, label: ANGLE_LABELS[v as CommunicationAngle] }));

const VALID = new Set<string>(Object.keys(ANGLE_LABELS));

/** Normaliza um valor arbitrário para um ângulo válido (ou null se vazio/inválido). */
export function normalizeAngle(value: unknown): CommunicationAngle | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;
  return VALID.has(v) ? (v as CommunicationAngle) : null;
}

/** Rótulo amigável de um ângulo (fallback para o próprio valor). */
export function angleLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return ANGLE_LABELS[value as CommunicationAngle] ?? value;
}
