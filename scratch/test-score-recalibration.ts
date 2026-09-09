/**
 * Teste isolado de score_recalibration — escopado ao ESCOPO TENANT de CRM SOZINHO (nunca
 * o escopo segmento, que é a tabela real compartilhada "Venda de Carros" — evita qualquer
 * risco de mexer em dado real de outro tenant). Nunca chama runScoreRecalibration()/cron.
 */
import { randomUUID } from 'crypto'
import pool from '../src/lib/database/connection'
import { getTenantRuleStats } from '../src/lib/crm/agents/scoreRecalibrationService'

/**
 * recalibrateScope() é privada (não exportada) — mesma situação já documentada nesta sessão
 * pra recordAction()/notifyForResult() de runner.ts. Replicado aqui só o pedaço de
 * orquestração (o cálculo real de estatística continua vindo de getTenantRuleStats, que É
 * exportada — nunca reimplementamos a query de conversão em si).
 */
async function recalibrateScopeTenant(
  tenantId: string,
  janelaDias: number,
  divergenciaMinimaPct: number,
  minLeadsAmostra: number,
) {
  const { rows: rules } = await pool.query(
    `SELECT id, tag_resultante, score_base, ordem FROM crm_qualificacao_regras_tenant
      WHERE tenant_id = $1::uuid AND ativa = true`,
    [tenantId],
  )
  if (rules.length === 0) return { suggestionsCreated: 0, reordered: false }

  const stats = await getTenantRuleStats(tenantId, rules.map((r) => r.tag_resultante), janelaDias)

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
         (scope, tenant_id, tag_resultante, score_atual, score_sugerido,
          leads_gerados, leads_convertidos, taxa_conversao_observada)
       VALUES ('tenant', $1::uuid, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [tenantId, rule.tag_resultante, rule.score_base, scoreSugerido,
       stat.leadsGerados, stat.leadsConvertidos, stat.taxaConversaoObservada],
    )
    if (rowCount) suggestionsCreated++
  }

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
      await pool.query(`UPDATE crm_qualificacao_regras_tenant SET ordem = $1 WHERE id = $2`, [i, ranked[i].id])
      reordered = true
    }
  }
  return { suggestionsCreated, reordered }
}

const TENANT_ID = 'c3fc15b7-7033-4e13-8e24-951c2e087dfb' // CRM SOZINHO
const TAG = 'TESTE ROTEIRO CRM - Score Recalibration'
const RULE_ID = randomUUID()
const LEAD_PREFIX = '22222222-3333-4444-5555-'

async function main() {
  // 1. Regra de teste no escopo TENANT (0 linhas hoje pra este tenant — nunca toca nas 7
  //    regras reais do segmento "Venda de Carros"). score_base=3 (implica taxa ~30%).
  await pool.query(
    `INSERT INTO public.crm_qualificacao_regras_tenant
       (id, tenant_id, palavras_chave, tag_resultante, resumo_modelo, score_base, ordem, ativa)
     VALUES ($1::uuid, $2::uuid, $3, $4, $5, 3, 99, true)`,
    [RULE_ID, TENANT_ID, 'teste roteiro recalibration', TAG, 'Regra de teste do roteiro — score_recalibration'],
  )
  console.log('--- Regra de teste criada (score_base=3) ---', RULE_ID)

  // 2. 10 leads reais (min_leads_amostra=10), 8 convertidos (is_ganho=true) → taxa observada ~80%.
  //    Diverge de 30% implicado por bem mais que os 30% mínimos do config real deste tenant.
  const { rows: colGanho } = await pool.query(
    `SELECT id FROM kanban_colunas WHERE tenant_id=$1::uuid AND is_ganho=true LIMIT 1`,
    [TENANT_ID],
  )
  const { rows: colNaoGanho } = await pool.query(
    `SELECT id FROM kanban_colunas WHERE tenant_id=$1::uuid AND is_ganho IS NOT TRUE LIMIT 1`,
    [TENANT_ID],
  )
  const colunaGanho = colGanho[0]?.id
  const colunaOutra = colNaoGanho[0]?.id
  if (!colunaGanho || !colunaOutra) throw new Error('Sem colunas de kanban reais pra usar no teste')

  for (let i = 0; i < 10; i++) {
    const leadUuid = `${LEAD_PREFIX}${String(i).padStart(12, '0')}`
    const ganho = i < 8 // 8 de 10 = 80%
    await pool.query(
      `INSERT INTO leads_staging (lead_uuid, tenant_id, nome, tag_sonho, created_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, now() - interval '5 days')`,
      [leadUuid, TENANT_ID, `TESTE ROTEIRO CRM - lead recalibration ${i}`, TAG],
    )
    await pool.query(
      `INSERT INTO leads_kanban (lead_uuid, coluna_id) VALUES ($1::uuid, $2)`,
      [leadUuid, ganho ? colunaGanho : colunaOutra],
    )
  }
  console.log('--- 10 leads de teste criados (8 ganhos, 2 não) ---')

  // 3. Chama a orquestração escopada a ESTE tenant (nunca o cron/global).
  const result = await recalibrateScopeTenant(TENANT_ID, 90, 30, 10)
  console.log('\n--- recalibrateScopeTenant ---')
  console.log(result)

  const { rows: suggestions } = await pool.query(
    `SELECT id, tag_resultante, score_atual, score_sugerido, leads_gerados, leads_convertidos,
            taxa_conversao_observada, status
       FROM public.crm_score_recalibration_suggestions
      WHERE scope='tenant' AND tenant_id=$1::uuid AND tag_resultante=$2`,
    [TENANT_ID, TAG],
  )
  console.log('\n--- Sugestão gerada ---')
  console.log(suggestions[0])

  process.exit(0)
}

main().catch((err) => { console.error(err); process.exit(1) })
