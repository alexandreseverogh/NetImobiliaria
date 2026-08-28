import { randomUUID } from 'crypto'
import pool from '@/lib/database/connection'
import { notifyWhatsApp, notifySlack } from '@/lib/marketing/services/agentNotificador'
import { resolveEffectiveAgentConfig } from './effectiveConfig'
import { CRM_AGENTS } from './index'
import type { EffectiveAgentConfig } from './effectiveConfig'
import type { CrmAgentResult } from './types'

const PUBLIC_DOMAIN = process.env.PUBLIC_DOMAIN || 'http://localhost:3001'

/**
 * Orquestrador dos agentes SCHEDULED_SCAN do CRM (docs/PLANO_AGENTES_ACELERACAO_CRM.md).
 * Chamado pelo cron POST /api/cron/crm/agentes-scan (x-cron-secret, mesmo padrão do
 * scanAndAlertBreaches() da Mensageria — src/lib/mensageria/sla.ts).
 *
 * Cada agente sabe achar os próprios candidatos (agent.findCandidates()) — a partir de F2
 * (stage_stagnation, condição de candidatura bem diferente da vigilância de pendência: SLA
 * por coluna do Kanban, não "bola parada do nosso lado"), generalizado pra iterar qualquer
 * agente SCHEDULED_SCAN registrado no catálogo, sem o runner precisar conhecer a query de
 * nenhum agente específico.
 *
 * A resolução de config efetiva (resolveEffectiveAgentConfig) vive em effectiveConfig.ts,
 * compartilhada com o fluxo ON_STAGE_CHANGE/sob-demanda de F3 (next_best_action) — só aqui,
 * que processa N candidatos por rodada, vale a pena envolver com cache em memória.
 */

/** agentKey:tenantId:clientId -> config resolvida, evita reconsultar quando o mesmo tenant tem vários leads candidatos. */
const configCache = new Map<string, EffectiveAgentConfig | null>()

async function resolveEffectiveConfigCached(agentKey: string, tenantId: string, clientId: string | null): Promise<EffectiveAgentConfig | null> {
  const cacheKey = `${agentKey}:${tenantId}:${clientId ?? ''}`
  if (configCache.has(cacheKey)) return configCache.get(cacheKey)!
  const result = await resolveEffectiveAgentConfig(agentKey, tenantId, clientId)
  configCache.set(cacheKey, result)
  return result
}

/** Item acumulado pro digest — ver CrmAgent.digest e a montagem em sendDigests(). */
interface DigestItem {
  leadNome: string
  responsavelNome: string
  title: string
  degrau: number
  /** O que o agente CORRIGIU sozinho (ex.: "reatribuído a Fulano"). Null quando só avisou. */
  resumoExecucao: string | null
}

export async function runCrmAgentScans(): Promise<{ scanned: number; fired: number; digests: number }> {
  configCache.clear()
  const scheduledAgents = Object.values(CRM_AGENTS).filter((a) => a.trigger === 'SCHEDULED_SCAN' && a.findCandidates)

  let scanned = 0
  let fired = 0

  // tenantId -> itens acumulados na rodada (só agentes com digest: true).
  const digestPorTenant = new Map<string, DigestItem[]>()

  for (const agent of scheduledAgents) {
    const candidates = await agent.findCandidates!()
    scanned += candidates.length

    for (const c of candidates) {
      const cfg = await resolveEffectiveConfigCached(agent.key, c.tenantId, c.clientId)
      if (!cfg || !cfg.ativo) continue

      const result = await agent.evaluate({
        tenantId: c.tenantId,
        leadUuid: c.leadUuid,
        clientId: c.clientId,
        segment: cfg.segment,
        params: cfg.params,
      })
      if (!result?.shouldFire) continue

      // A ação SEMPRE é gravada por lead (auditoria granular preservada). O que o digest muda
      // é só a notificação: uma por tenant no fim da rodada, em vez de uma por lead.
      const actionId = await recordAction(agent.key, c.tenantId, c.leadUuid, result)
      fired++

      // Efeito colateral real do agente (G2: reatribuição automática). O runner não sabe o que
      // o execute() faz — só que, se existir, roda sozinho e devolve um resumo pro digest.
      // Falhar aqui nunca invalida a ação já gravada nem derruba a varredura dos demais leads.
      let resumoExecucao: string | null = null
      if (agent.execute) {
        try {
          resumoExecucao = await agent.execute(
            { tenantId: c.tenantId, leadUuid: c.leadUuid, clientId: c.clientId, segment: cfg.segment, params: cfg.params },
            result,
            actionId,
          )
        } catch (err) {
          console.error(`[crm/agents/${agent.key}] execute() falhou pro lead ${c.leadUuid}:`, err)
        }
      }

      if (agent.digest) {
        const lista = digestPorTenant.get(c.tenantId) ?? []
        lista.push({
          leadNome: result.leadNome || 'Lead',
          responsavelNome: result.responsavelNome || 'Sem responsável atribuído',
          title: result.title,
          degrau: Number(result.payload?.degrau ?? 0),
          resumoExecucao,
        })
        digestPorTenant.set(c.tenantId, lista)
      } else {
        await notifyForResult(c.tenantId, c.leadUuid, result, actionId, resumoExecucao)
      }
    }
  }

  await sendDigests(digestPorTenant)
  return { scanned, fired, digests: digestPorTenant.size }
}

/**
 * Anti-flood (docs/PLANO_PENDENCIA_ATENDIMENTO.md §4.2): uma mensagem por tenant por rodada,
 * agrupada por responsável, em vez de uma por lead. Em escala de call center a notificação 1:1
 * é inutilizável — e era a pendência já registrada no CHECKPOINT para F1/F2.
 *
 * O agrupamento é por responsável (não por lead) porque é isso que torna a mensagem acionável:
 * o gestor vê de quem é a fila parada, não uma lista plana de nomes de lead.
 */
async function sendDigests(digestPorTenant: Map<string, DigestItem[]>): Promise<void> {
  for (const [tenantId, itens] of digestPorTenant) {
    const porResponsavel = new Map<string, DigestItem[]>()
    for (const it of itens) {
      const lista = porResponsavel.get(it.responsavelNome) ?? []
      lista.push(it)
      porResponsavel.set(it.responsavelNome, lista)
    }

    const escalonados = itens.filter((i) => i.degrau >= 2).length
    const linhas: string[] = [
      `⏱️ *Leads aguardando atendimento* — ${itens.length} no total` +
        (escalonados > 0 ? ` (${escalonados} já escalonado${escalonados > 1 ? 's' : ''})` : ''),
      '',
    ]
    for (const [responsavel, lista] of porResponsavel) {
      linhas.push(`👤 *${responsavel}* — ${lista.length}`)
      // Teto de 5 por responsável: o digest é um chamado à ação, não um relatório. A lista
      // completa está no CRM; despejar 200 nomes no WhatsApp derrota o próprio anti-flood.
      for (const it of lista.slice(0, 5)) {
        // O que a máquina já corrigiu sozinha vem explícito — sem isso o gestor não teria como
        // saber que a fila dele mudou sem ninguém pedir.
        const acao = it.resumoExecucao ? `\n      ↳ ${it.resumoExecucao}` : ''
        // 🆘 = fila de resgate (exige ação humana); 🟢 = a máquina já corrigiu sozinha.
        const marca = it.degrau >= 4 ? '🆘' : it.degrau === 3 ? '🟢' : it.degrau === 2 ? '🔴' : '🟡'
        linhas.push(`   ${marca} ${it.leadNome} — ${it.title}${acao}`)
      }
      if (lista.length > 5) linhas.push(`   … e mais ${lista.length - 5}`)
      linhas.push('')
    }

    const msg = linhas.join('\n').trim()
    await notifyWhatsApp(msg, tenantId).catch(() => {})
    await notifySlack(msg, tenantId).catch(() => {})
  }
}

/** Grava crm_agent_actions. Separado da notificação porque o digest (§4.2 do plano de
 *  pendência) precisa gravar por lead mas notificar em lote no fim da rodada. */
async function recordAction(
  agentKey: string,
  tenantId: string,
  leadUuid: string,
  result: CrmAgentResult,
): Promise<string> {
  const isOffensive = result.type === 'OFFENSIVE'
  const pin = isOffensive ? Math.floor(100000 + Math.random() * 900000).toString() : null
  const pinExp = isOffensive ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null
  const status = isOffensive ? 'PENDING_APPROVAL' : 'NOTIFIED'
  const actionId = randomUUID()

  await pool.query(
    `INSERT INTO public.crm_agent_actions
       (id, tenant_id, lead_uuid, agent_key, type, title, description, suggested_message,
        confidence, status, approval_pin, approval_pin_exp, payload)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)`,
    [actionId, tenantId, leadUuid, agentKey, result.type, result.title, result.description,
     result.suggestedMessage ?? null, result.confidence, status, pin, pinExp,
     JSON.stringify(result.payload ?? {})],
  )
  return actionId
}

/** Notificação 1:1 — usada por agentes SEM digest. OFFENSIVE (F4, reactivation) exige
 *  aprovação humana (PIN de 6 dígitos + link, mesmo mecanismo já em produção nos agentes
 *  ofensivos de Campanhas); DEFENSIVE só notifica, sem ação nenhuma a aprovar. */
async function notifyForResult(
  tenantId: string,
  leadUuid: string,
  result: CrmAgentResult,
  actionId: string,
  resumoExecucao?: string | null,
): Promise<void> {
  const isOffensive = result.type === 'OFFENSIVE'

  if (isOffensive) {
    const { rows: pinRows } = await pool.query(
      `SELECT approval_pin FROM public.crm_agent_actions WHERE id = $1::uuid`,
      [actionId],
    )
    const pin = pinRows[0]?.approval_pin ?? ''
    const { rows } = await pool.query(`SELECT nome FROM leads_staging WHERE lead_uuid = $1::uuid`, [leadUuid])
    const leadNome = rows[0]?.nome || 'Lead'
    const approveUrl = `${PUBLIC_DOMAIN}/api/crm/agent/approve/${actionId}`
    const rejectUrl = `${PUBLIC_DOMAIN}/api/crm/agent/reject/${actionId}`
    const msg =
      `🤖 *Agente CRM — Aprovação Necessária*\n\n` +
      `👤 Lead: ${leadNome}\n` +
      `💡 ${result.title}\n` +
      `📝 ${result.description}\n\n` +
      (result.suggestedMessage ? `✍️ Rascunho:\n"${result.suggestedMessage}"\n\n` : '') +
      `🎯 Confiança: ${(result.confidence * 100).toFixed(0)}%\n\n` +
      `🔐 PIN de confirmação: *${pin}*\n   (válido por 24h — não compartilhe)\n\n` +
      `✅ Aprovar: ${approveUrl}\n` +
      `❌ Rejeitar: ${rejectUrl}`
    await notifyWhatsApp(msg, tenantId).catch(() => {})
    await notifySlack(msg, tenantId).catch(() => {})
    return
  }

  // Quando o agente executou algo sozinho, a notificação PRECISA dizer o quê — sem isso o
  // tenant descobriria só depois que uma mensagem saiu para o cliente dele. Vale sobretudo
  // pra reativação automática (G6), que fala com o lead sem passar por ninguém.
  const msg = `⏱️ ${result.title}\n${result.description}` +
    (resumoExecucao ? `\n\n🤖 Ação automática: ${resumoExecucao}` : '') +
    (result.suggestedMessage && resumoExecucao ? `\n\n✍️ Mensagem enviada:\n"${result.suggestedMessage}"` : '')
  await notifyWhatsApp(msg, tenantId).catch(() => {})
  await notifySlack(msg, tenantId).catch(() => {})
}
