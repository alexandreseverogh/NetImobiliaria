import type { CrmAgent, CrmAgentContext, CrmAgentResult } from './types'

/**
 * F5 — Recalibração de Score (docs/PLANO_AGENTES_ACELERACAO_CRM.md §3.2/§6).
 *
 * Único agente do catálogo que NÃO opera por lead — opera sobre as REGRAS de qualificação
 * (crm_qualificacao_regras_segmento/_tenant), reordenando por conversão real e sugerindo
 * ajuste de score quando o score cadastrado diverge muito do observado. `evaluate()` sempre
 * retorna null de propósito (nunca dispara via o runner genérico, que é lead-scoped) — a
 * lógica real vive em scoreRecalibrationService.ts, chamada pelo cron diário dedicado
 * (POST /api/cron/crm/score-recalibration). Registrado aqui só pra reaproveitar 100% da UI
 * genérica de toggle/params já construída (SegmentAgentesModal.tsx, /crm/config/agentes) —
 * o Master/tenant ativa e ajusta os limiares exatamente como os outros 4 agentes.
 */
export const scoreRecalibrationAgent: CrmAgent = {
  key: 'score_recalibration',
  label: 'Recalibração de Score',
  description:
    'Roda 1x por dia: reordena as regras de qualificação pela taxa de conversão real (sem aprovação — só prioridade interna, nunca muda texto/score visível) e sugere ajuste de score quando o valor cadastrado diverge muito do observado (exige 1 clique de aprovação).',
  trigger: 'SCHEDULED_SCAN',
  paramHints: [
    { key: 'janela_dias', label: 'Janela de leads considerada (dias)', default: '90' },
    { key: 'divergencia_minima_pct', label: 'Divergência mínima p/ sugerir ajuste (pontos %)', default: '30' },
    { key: 'min_leads_amostra', label: 'Mínimo de leads na amostra p/ considerar', default: '10' },
  ],

  async evaluate(_ctx: CrmAgentContext): Promise<CrmAgentResult | null> {
    return null
  },
}
