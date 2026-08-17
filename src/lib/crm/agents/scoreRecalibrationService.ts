import pool from '@/lib/database/connection'
import { resolveEffectiveAgentConfig } from './effectiveConfig'

/**
 * F5 — Recalibração de Score (docs/PLANO_AGENTES_ACELERACAO_CRM.md §3.2).
 *
 * Diferente dos outros 4 agentes, este NÃO opera por lead — opera sobre REGRAS de
 * qualificação (crm_qualificacao_regras_segmento/_tenant). Por isso não implementa
 * findCandidates()/evaluate() de verdade (ver scoreRecalibrationAgent.ts) — a lógica real
 * vive aqui, chamada pelo cron diário dedicado (POST /api/cron/crm/score-recalibration),
 * nunca pelo runner.ts genérico (que é fundamentalmente lead-scoped).
 *
 * Estatísticas de conversão são sempre computadas AO VIVO por (escopo, tag_resultante) —
 * nunca persistidas como coluna da regra — porque o editor do Master/tenant faz replace-all
 * (DELETE+reinsert) a cada save, o que apagaria silenciosamente qualquer dado acumulado numa
 * coluna da própria linha. Ver comentário completo na migração F5.
 */

const JANELA_DIAS_DEFAULT = 90
const DIVERGENCIA_MINIMA_PCT_DEFAULT = 30
const MIN_LEADS_AMOSTRA_DEFAULT = 10

export interface RuleConversionStats {
  tagResultante: string
  leadsGerados: number
  leadsConvertidos: number
  taxaConversaoObservada: number | null
}

/** Estatística de conversão real por tag, dentro da janela — usada tanto pela UI (GET, "dado
 *  bruto sempre visível") quanto pelo job diário (decide sugestão + reordenação). */
async function computeStatsForTags(
  scope: 'segmento' | 'tenant',
  targetId: string,
  tags: string[],
  janelaDias: number,
): Promise<Map<string, RuleConversionStats>> {
  const stats = new Map<string, RuleConversionStats>()
  if (tags.length === 0) return stats

  const whereScope = scope === 'segmento'
    ? `COALESCE(cli.segment_id, t.segment_id) = $1::uuid`
    : `ls.tenant_id = $1::uuid`

  const { rows } = await pool.query(
    `SELECT ls.tag_sonho AS tag,
            count(*)::int AS leads_gerados,
            count(*) FILTER (WHERE kc.is_ganho = true)::int AS leads_convertidos
       FROM leads_staging ls
       JOIN tenants t ON t.id = ls.tenant_id
       LEFT JOIN clientes cli ON cli.uuid = ls.client_id
       LEFT JOIN leads_kanban lk ON lk.lead_uuid = ls.lead_uuid
       LEFT JOIN kanban_colunas kc ON kc.id = lk.coluna_id
      WHERE ${whereScope}
        AND ls.tag_sonho = ANY($2::text[])
        AND ls.created_at > now() - ($3 || ' days')::interval
      GROUP BY ls.tag_sonho`,
    [targetId, tags, janelaDias],
  )

  for (const r of rows) {
    const leadsGerados = r.leads_gerados as number
    const leadsConvertidos = r.leads_convertidos as number
    stats.set(r.tag as string, {
      tagResultante: r.tag,
      leadsGerados,
      leadsConvertidos,
      taxaConversaoObservada: leadsGerados > 0 ? Number(((leadsConvertidos / leadsGerados) * 100).toFixed(2)) : null,
    })
  }
  // Tags sem nenhum lead ainda — presentes no mapa com zero, pra UI mostrar "sem dado" em vez
  // de simplesmente omitir a regra.
  for (const tag of tags) {
    if (!stats.has(tag)) {
      stats.set(tag, { tagResultante: tag, leadsGerados: 0, leadsConvertidos: 0, taxaConversaoObservada: null })
    }
  }
  return stats
}

export async function getSegmentRuleStats(segmentId: string, tags: string[], janelaDias = JANELA_DIAS_DEFAULT) {
  return computeStatsForTags('segmento', segmentId, tags, janelaDias)
}

export async function getTenantRuleStats(tenantId: string, tags: string[], janelaDias = JANELA_DIAS_DEFAULT) {
  return computeStatsForTags('tenant', tenantId, tags, janelaDias)
}

interface RuleRow {
  id: string
  tag_resultante: string
  score_base: number
  ordem: number
}

async function recalibrateScope(
  scope: 'segmento' | 'tenant',
  targetId: string,
  janelaDias: number,
  divergenciaMinimaPct: number,
  minLeadsAmostra: number,
): Promise<{ suggestionsCreated: number; reordered: boolean }> {
  const table = scope === 'segmento' ? 'crm_qualificacao_regras_segmento' : 'crm_qualificacao_regras_tenant'
  const column = scope === 'segmento' ? 'segment_id' : 'tenant_id'

  const { rows: rules } = await pool.query<RuleRow>(
    `SELECT id, tag_resultante, score_base, ordem FROM ${table} WHERE ${column} = $1::uuid AND ativa = true`,
    [targetId],
  )
  if (rules.length === 0) return { suggestionsCreated: 0, reordered: false }

  const stats = await computeStatsForTags(scope, targetId, rules.map((r) => r.tag_resultante), janelaDias)

  let suggestionsCreated = 0
  for (const rule of rules) {
    const stat = stats.get(rule.tag_resultante)
    if (!stat || stat.leadsGerados < minLeadsAmostra || stat.taxaConversaoObservada == null) continue

    const taxaImplicada = rule.score_base * 10
    const divergencia = Math.abs(taxaImplicada - stat.taxaConversaoObservada)
    if (divergencia < divergenciaMinimaPct) continue

    const scoreSugerido = Math.min(10, Math.max(1, Math.round(stat.taxaConversaoObservada / 10)))
    if (scoreSugerido === rule.score_base) continue

    const { rowCount } = await pool.query(
      `INSERT INTO public.crm_score_recalibration_suggestions
         (scope, ${column}, tag_resultante, score_atual, score_sugerido,
          leads_gerados, leads_convertidos, taxa_conversao_observada)
       VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8)
       ON CONFLICT DO NOTHING`,
      [scope, targetId, rule.tag_resultante, rule.score_base, scoreSugerido,
       stat.leadsGerados, stat.leadsConvertidos, stat.taxaConversaoObservada],
    )
    if (rowCount) suggestionsCreated++
  }

  // Reordenação automática (§3.2 item 1) — sem aprovação, é só prioridade de match no
  // fallback por palavra-chave (ConciergeService.matchByKeyword), nunca muda texto/score
  // visível. Regra sem dado suficiente (ou nunca convertida) fica no fim, na ordem original
  // entre si (sort estável).
  const ranked = [...rules].sort((a, b) => {
    const ta = stats.get(a.tag_resultante)?.taxaConversaoObservada
    const tb = stats.get(b.tag_resultante)?.taxaConversaoObservada
    if (ta == null && tb == null) return 0
    if (ta == null) return 1
    if (tb == null) return -1
    return tb - ta
  })
  let reordered = false
  for (let i = 0; i < ranked.length; i++) {
    if (ranked[i].ordem !== i) {
      await pool.query(`UPDATE ${table} SET ordem = $1 WHERE id = $2`, [i, ranked[i].id])
      reordered = true
    }
  }

  return { suggestionsCreated, reordered }
}

export async function runScoreRecalibration(): Promise<{
  segmentsProcessed: number
  tenantsProcessed: number
  suggestionsCreated: number
  reorderedScopes: number
}> {
  let segmentsProcessed = 0
  let tenantsProcessed = 0
  let suggestionsCreated = 0
  let reorderedScopes = 0

  // Escopo segmento — Master decide, via crm_agentes_config_segmento (sem tenant_id).
  const { rows: activeSegments } = await pool.query(
    `SELECT segment_id, params FROM public.crm_agentes_config_segmento
      WHERE agent_key = 'score_recalibration' AND ativo = true`,
  )
  for (const seg of activeSegments) {
    const params = seg.params ?? {}
    const result = await recalibrateScope(
      'segmento',
      seg.segment_id,
      Number(params.janela_dias) || JANELA_DIAS_DEFAULT,
      Number(params.divergencia_minima_pct) || DIVERGENCIA_MINIMA_PCT_DEFAULT,
      Number(params.min_leads_amostra) || MIN_LEADS_AMOSTRA_DEFAULT,
    )
    segmentsProcessed++
    suggestionsCreated += result.suggestionsCreated
    if (result.reordered) reorderedScopes++
  }

  // Escopo tenant — cada tenant real com o agente efetivamente ativo (override próprio ou
  // herdado do segmento), mesma resolução já usada pelos outros 4 agentes.
  const { rows: tenants } = await pool.query(`SELECT id FROM public.tenants WHERE status = 'active'`)
  for (const t of tenants) {
    const cfg = await resolveEffectiveAgentConfig('score_recalibration', t.id, null)
    if (!cfg || !cfg.ativo) continue
    const result = await recalibrateScope(
      'tenant',
      t.id,
      Number(cfg.params.janela_dias) || JANELA_DIAS_DEFAULT,
      Number(cfg.params.divergencia_minima_pct) || DIVERGENCIA_MINIMA_PCT_DEFAULT,
      Number(cfg.params.min_leads_amostra) || MIN_LEADS_AMOSTRA_DEFAULT,
    )
    tenantsProcessed++
    suggestionsCreated += result.suggestionsCreated
    if (result.reordered) reorderedScopes++
  }

  return { segmentsProcessed, tenantsProcessed, suggestionsCreated, reorderedScopes }
}

export interface DecideResult {
  outcome: 'applied' | 'dismissed' | 'stale'
  message: string
}

/** Aplica ou descarta uma sugestão — resolve a regra atual por tag_resultante (nunca pelo
 *  `rule_id` bruto, que pode ter ficado órfão se o Master/tenant já salvou o editor de
 *  regras — replace-all — entre a sugestão ter sido gerada e decidida agora). Chamador é
 *  responsável por já ter validado a posse (segment_id/tenant_id) antes de chamar. */
export async function decideRecalibrationSuggestion(
  suggestionId: string,
  decision: 'apply' | 'dismiss',
): Promise<DecideResult> {
  const { rows } = await pool.query(
    `SELECT * FROM public.crm_score_recalibration_suggestions WHERE id = $1::uuid`,
    [suggestionId],
  )
  const suggestion = rows[0]
  if (!suggestion) throw new Error('Sugestão não encontrada')
  if (suggestion.status !== 'PENDING') throw new Error(`Sugestão já foi decidida (status: ${suggestion.status})`)

  if (decision === 'dismiss') {
    await pool.query(
      `UPDATE public.crm_score_recalibration_suggestions SET status = 'DISMISSED', decided_at = now() WHERE id = $1::uuid`,
      [suggestionId],
    )
    return { outcome: 'dismissed', message: 'Sugestão descartada.' }
  }

  const table = suggestion.scope === 'segmento' ? 'crm_qualificacao_regras_segmento' : 'crm_qualificacao_regras_tenant'
  const column = suggestion.scope === 'segmento' ? 'segment_id' : 'tenant_id'
  const targetId = suggestion.scope === 'segmento' ? suggestion.segment_id : suggestion.tenant_id

  const { rowCount } = await pool.query(
    `UPDATE ${table} SET score_base = $1, updated_at = now()
      WHERE ${column} = $2::uuid AND tag_resultante = $3`,
    [suggestion.score_sugerido, targetId, suggestion.tag_resultante],
  )

  if (!rowCount) {
    // A regra que originou a sugestão não existe mais com essa tag (editor foi salvo — replace-all
    // — entre a geração da sugestão e esta decisão). Marca como stale em vez de aplicar no vazio.
    await pool.query(
      `UPDATE public.crm_score_recalibration_suggestions SET status = 'DISMISSED', decided_at = now() WHERE id = $1::uuid`,
      [suggestionId],
    )
    return { outcome: 'stale', message: 'A regra original não existe mais (foi editada/removida) — sugestão descartada automaticamente.' }
  }

  await pool.query(
    `UPDATE public.crm_score_recalibration_suggestions SET status = 'APPLIED', decided_at = now() WHERE id = $1::uuid`,
    [suggestionId],
  )
  return { outcome: 'applied', message: `Score atualizado para ${suggestion.score_sugerido}.` }
}
