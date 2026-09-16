/**
 * Sugestão de campos de "Perfil de Interesse" (form_schema_json) por segmento — CRM.
 * LLM propõe, Master sempre revisa/edita antes de salvar. Mesmo padrão de
 * segmentAngleSuggestionService.ts (FASE 18.3). ZERO HARDCODE (prompt no banco).
 */

import { invokeWithTemplate } from '@/lib/intelligence/llmInvoker'

export interface SuggestedFormField {
  name: string
  label: string
  type: 'text' | 'number' | 'select'
  required: boolean
}

// "currency" deliberadamente fora — desde 2026-08-27 (docs/CHECKPOINT.md) o valor do negócio
// é sempre o campo fixo "Valor Estimado" de NovoLeadModal.tsx, nunca um campo dinâmico do
// Perfil de Interesse; um valor sugerido como currency é rebaixado pra "text" abaixo, nunca
// quebra a sugestão.
const VALID_TYPES = new Set(['text', 'number', 'select'])

function slugifyName(raw: string): string {
  return raw
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60)
}

/**
 * Pede ao LLM (modelo global da plataforma) sugestões de campos de Perfil de Interesse pro
 * segmento. Retorna lista normalizada — nunca salva nada. Lança erro se o LLM/JSON falhar (a
 * rota trata e devolve mensagem amigável).
 */
export async function suggestAtivoFormSchema(
  segmentName: string,
  segmentDescription: string,
): Promise<SuggestedFormField[]> {
  const raw = await invokeWithTemplate({
    templateKey: 'crm_ativo_form_schema_suggestion',
    segmentId: null,
    variables: {
      segment_name: segmentName,
      segment_description: segmentDescription || '(sem descrição)',
    },
    maxTokens: 1200,
  })

  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('LLM não retornou JSON válido de campos.')

  let parsed: any
  try {
    parsed = JSON.parse(match[0])
  } catch {
    throw new Error('Falha ao parsear o JSON de campos do LLM.')
  }
  if (!Array.isArray(parsed)) throw new Error('Resposta do LLM não é um array.')

  const seen = new Set<string>()
  const out: SuggestedFormField[] = []
  for (const item of parsed) {
    const label = String(item?.label ?? '').trim()
    let name = String(item?.name ?? '').trim()
    if (!name && label) name = slugifyName(label)
    name = slugifyName(name)
    if (!name || !label || seen.has(name)) continue
    seen.add(name)

    const type = VALID_TYPES.has(item?.type) ? item.type : 'text'
    const required = item?.required === true

    out.push({ name, label, type, required })
  }
  if (out.length === 0) throw new Error('LLM não retornou campos utilizáveis.')
  return out
}
