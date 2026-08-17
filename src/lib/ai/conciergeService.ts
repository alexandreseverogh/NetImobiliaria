import pool from '@/lib/database/connection';
import { resolveSegment } from '@/lib/intelligence/segmentResolver';
import { resolvePromptTemplate } from '@/lib/intelligence/promptResolver';
import { renderPrompt } from '@/lib/intelligence/promptRenderer';
import { getLlmClient } from '@/lib/marketing/services/llmClient';

export interface QualificationResult {
  tag_sonho: string;
  resumo_ia: string;
  score_prontidao: number;
  /** Quão bem o lead se encaixa no perfil ideal do negócio (docs/PLANO_AGENTES_ACELERACAO_CRM.md
   *  §3.1) — dimensão SEPARADA de score_prontidao (intenção). null = nunca avaliado (fallback
   *  por palavra-chave não tem como julgar fit; nunca inventamos um número aqui). */
  score_fit: number | null;
}

interface QualificationRule {
  palavras_chave: string;
  tag_resultante: string;
  resumo_modelo: string;
  score_base: number;
}

interface FitCriterion {
  criterio: string;
  peso: number;
}

const EMPTY_MESSAGE_RESULT: QualificationResult = {
  tag_sonho: 'A Definir',
  resumo_ia: 'Lead sem mensagem de intenção.',
  score_prontidao: 5,
  score_fit: null,
};

/**
 * Resultado neutro e explícito quando o segmento do tenant ainda não tem
 * qualificação por IA configurada (system_segments.crm_ia_ativa = false) —
 * nunca finge uma análise real que não existe (o comportamento antigo,
 * "Interesse Geral"/score 5 sempre, era indistinguível de uma qualificação
 * de verdade que só coincidia em ser genérica).
 */
const NOT_CONFIGURED_RESULT: QualificationResult = {
  tag_sonho: 'A Definir',
  resumo_ia: 'Qualificação por IA ainda não configurada para este segmento — aguardando curadoria da equipe da plataforma.',
  score_prontidao: 5,
  score_fit: null,
};

const DEFAULT_KEYWORD_MATCH_RESULT: QualificationResult = {
  tag_sonho: 'Interesse Geral',
  resumo_ia: 'Lead captado com interesse básico. Aguardando triagem humana.',
  score_prontidao: 5,
  score_fit: null,
};

/**
 * Motor de qualificação de lead por IA — 100% dirigido por segmento
 * (public.system_segments), nunca por um id fixo. Cascata:
 *   1. Resolve o segmento real do tenant/cliente (resolveSegment).
 *   2. Se o segmento não tem crm_ia_ativa=true, devolve um resultado
 *      neutro e explícito — nunca opera "no escuro".
 *   3. Tenta o LLM configurado pelo TENANT (getLlmClient — Settings do
 *      tenant primeiro, fallback padrão da plataforma depois), com o
 *      prompt mestre do segmento (system_prompt_templates) + as regras
 *      táticas conhecidas (tenant + segmento) e os critérios de fit
 *      (tenant + segmento) como contexto — 1 única chamada, 2 scores.
 *   4. Se o LLM falhar/devolver algo não-parseável, cai pro motor de
 *      regras por palavra-chave: regras do TENANT primeiro (mais
 *      específicas), depois as regras padrão do SEGMENTO. Esse fallback
 *      só sabe julgar intenção (score_prontidao) — fit fica null, nunca
 *      um número inventado.
 */
export class ConciergeService {
  static async qualifyLead(
    mensagem: string,
    tenantId: string,
    clientId?: string | null,
    rawJson?: any,
  ): Promise<QualificationResult> {
    const text = (mensagem || '').trim();
    if (!text && !rawJson) return EMPTY_MESSAGE_RESULT;

    const segment = await resolveSegment(tenantId, clientId ?? null);
    if (!segment || !segment.crm_ia_ativa) {
      return NOT_CONFIGURED_RESULT;
    }

    const [tenantRules, segmentRules, tenantFit, segmentFit] = await Promise.all([
      getTenantRules(tenantId),
      getSegmentRules(segment.id),
      getTenantFitCriteria(tenantId),
      getSegmentFitCriteria(segment.id),
    ]);
    // Regras/critérios do tenant têm prioridade — são o refinamento deliberado do
    // negócio sobre a curadoria padrão da Master pro segmento.
    const rules = [...tenantRules, ...segmentRules];
    const fitCriteria = [...tenantFit, ...segmentFit];

    try {
      const llmResult = await qualifyWithLlm(text, tenantId, segment.id, rules, fitCriteria);
      if (llmResult) return llmResult;
    } catch (err) {
      console.warn('[ConciergeService] Qualificação via LLM falhou, usando fallback por regra:', err);
    }

    return matchByKeyword(text, rules);
  }
}

async function getSegmentRules(segmentId: string): Promise<QualificationRule[]> {
  const { rows } = await pool.query(
    `SELECT palavras_chave, tag_resultante, resumo_modelo, score_base
     FROM public.crm_qualificacao_regras_segmento
     WHERE segment_id = $1::uuid AND ativa = true
     ORDER BY ordem ASC`,
    [segmentId],
  );
  return rows;
}

async function getTenantRules(tenantId: string): Promise<QualificationRule[]> {
  const { rows } = await pool.query(
    `SELECT palavras_chave, tag_resultante, resumo_modelo, score_base
     FROM public.crm_qualificacao_regras_tenant
     WHERE tenant_id = $1::uuid AND ativa = true
     ORDER BY ordem ASC`,
    [tenantId],
  );
  return rows;
}

async function getSegmentFitCriteria(segmentId: string): Promise<FitCriterion[]> {
  const { rows } = await pool.query(
    `SELECT criterio, peso
     FROM public.crm_fit_criterios_segmento
     WHERE segment_id = $1::uuid AND ativo = true
     ORDER BY ordem ASC`,
    [segmentId],
  );
  return rows;
}

async function getTenantFitCriteria(tenantId: string): Promise<FitCriterion[]> {
  const { rows } = await pool.query(
    `SELECT criterio, peso
     FROM public.crm_fit_criterios_tenant
     WHERE tenant_id = $1::uuid AND ativo = true
     ORDER BY ordem ASC`,
    [tenantId],
  );
  return rows;
}

function matchByKeyword(text: string, rules: QualificationRule[]): QualificationResult {
  const lower = text.toLowerCase();
  for (const rule of rules) {
    const keywords = rule.palavras_chave
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    if (keywords.some((k) => lower.includes(k))) {
      return {
        tag_sonho: rule.tag_resultante,
        resumo_ia: rule.resumo_modelo,
        score_prontidao: rule.score_base,
        score_fit: null,
      };
    }
  }
  return DEFAULT_KEYWORD_MATCH_RESULT;
}

async function qualifyWithLlm(
  mensagem: string,
  tenantId: string,
  segmentId: string,
  rules: QualificationRule[],
  fitCriteria: FitCriterion[],
): Promise<QualificationResult | null> {
  const template = await resolvePromptTemplate('crm_lead_qualification', segmentId);
  if (!template) return null;

  const regrasTaticas = rules.length
    ? rules.map((r) => `- ${r.tag_resultante}: ${r.resumo_modelo} (gatilhos: ${r.palavras_chave})`).join('\n')
    : 'Nenhuma regra tática cadastrada ainda — use seu próprio julgamento.';

  const criteriosFit = fitCriteria.length
    ? fitCriteria.map((c) => `- ${c.criterio} (peso ${c.peso}/10)`).join('\n')
    : 'Nenhum critério de fit cadastrado ainda — retorne score_fit: 5 (neutro).';

  const prompt = renderPrompt(template, { mensagem, regras_taticas: regrasTaticas, criterios_fit: criteriosFit });

  const llm = await getLlmClient(tenantId);
  // 700, não 500 — o prompt agora pede 2 dimensões de julgamento (intenção + fit), não 1;
  // com o teto antigo, respostas de alguns providers (confirmado ao vivo com Gemini) vinham
  // truncadas no meio do JSON antes de fechar score_fit.
  const responseText = await llm.complete(prompt, 700);

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  const parsed = JSON.parse(jsonMatch[0]);
  const tag = typeof parsed.tag_sonho === 'string' && parsed.tag_sonho.trim() ? parsed.tag_sonho.trim() : DEFAULT_KEYWORD_MATCH_RESULT.tag_sonho;
  const resumo = typeof parsed.resumo_ia === 'string' && parsed.resumo_ia.trim() ? parsed.resumo_ia.trim() : 'Análise via IA concluída.';
  const scoreRaw = Number(parsed.score_prontidao);
  const score = Number.isFinite(scoreRaw) ? Math.min(10, Math.max(0, Math.round(scoreRaw))) : 5;
  const fitRaw = Number(parsed.score_fit);
  const scoreFit = Number.isFinite(fitRaw) ? Math.min(10, Math.max(0, Math.round(fitRaw))) : null;

  return { tag_sonho: tag, resumo_ia: resumo, score_prontidao: score, score_fit: scoreFit };
}
