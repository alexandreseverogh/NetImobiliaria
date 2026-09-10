'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/useApi'

/**
 * Painel de teste dos 5 Agentes de Aceleração do CRM (temporário, Master-only, sem entrada na
 * sidebar — acesse direto por esta URL). Ver .claude/plans/bright-sleeping-fairy.md.
 */

const AGENT_LABELS: Record<string, string> = {
  pendencia_atendimento: 'Pendência de Atendimento',
  stage_stagnation: 'Estagnação por Etapa',
  next_best_action: 'Próxima Ação Sugerida',
  reactivation: 'Reativação de Lead Inativo',
}

interface ScanSafety { agentKey: string; pausedByOverride: boolean }
interface WhatsAppRoleStatus { numeroWhatsapp: string | null; role: 'admin-real' | 'lead-real' | 'unknown' }
interface TenantDebug {
  id: string; name: string; segmentId: string; segmentName: string
  scanSafety: ScanSafety[]; whatsappRole: WhatsAppRoleStatus
}
interface LeadRow {
  lead_uuid: string; nome: string; telefone: string | null
  bola_com: string | null; bola_desde: string | null
  tag_sonho: string | null; resumo_ia: string | null
  score_prontidao: number | null; score_fit: number | null
  etapa_atual: string | null; sla_hours: number | null
  etapa_desde: string | null; responsavel_nome: string | null
}
interface AgentResult {
  shouldFire: boolean; type: 'DEFENSIVE' | 'OFFENSIVE' | 'INFORMATIVE'
  title: string; description: string; confidence: number
  suggestedMessage?: string; leadNome?: string | null
}
interface ActionRow {
  id: string; agent_key: string; type: string; title: string; description: string
  suggested_message: string | null; status: string; approval_pin: string | null
  created_at: string; lead_nome: string
}
interface Suggestion {
  id: string; tag_resultante: string; score_atual: number; score_sugerido: number
  leads_gerados: number; leads_convertidos: number; taxa_conversao_observada: string
  status: string
}

export default function CrmAgentesDebugPage() {
  const { get, post } = useApi()

  const [tenants, setTenants] = useState<TenantDebug[]>([])
  const [activeTenantId, setActiveTenantId] = useState<string>('')
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [evalResults, setEvalResults] = useState<Record<string, AgentResult | null>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [newLead, setNewLead] = useState({ nome: '', telefone: '', demanda: '' })
  const [actions, setActions] = useState<ActionRow[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [recalForm, setRecalForm] = useState({ tag: 'teste_recal', scoreBase: '3', leadsCount: '20', conversionPct: '80' })

  const activeTenant = tenants.find((t) => t.id === activeTenantId)

  const loadTenants = useCallback(async () => {
    const res = await get('/api/admin/master/crm-agentes-debug/tenants')
    const data = await res.json()
    setTenants(data.tenants || [])
    if (!activeTenantId && data.tenants?.[0]) setActiveTenantId(data.tenants[0].id)
  }, [get, activeTenantId])

  const loadLeads = useCallback(async (tenantId: string) => {
    const res = await get(`/api/admin/master/crm-agentes-debug/leads?tenantId=${tenantId}`)
    const data = await res.json()
    setLeads(data.leads || [])
  }, [get])

  const loadActions = useCallback(async (tenantId: string) => {
    const res = await get(`/api/admin/master/crm-agentes-debug/actions?tenantId=${tenantId}`)
    const data = await res.json()
    setActions(data.actions || [])
  }, [get])

  const loadSuggestions = useCallback(async (tenantId: string) => {
    const res = await get(`/api/admin/master/crm-agentes-debug/score-recalibration/suggestions?tenantId=${tenantId}`)
    const data = await res.json()
    setSuggestions(data.suggestions || [])
  }, [get])

  useEffect(() => { loadTenants() }, [loadTenants])
  useEffect(() => {
    if (!activeTenantId) return
    loadLeads(activeTenantId)
    loadActions(activeTenantId)
    loadSuggestions(activeTenantId)
    setEvalResults({})
  }, [activeTenantId, loadLeads, loadActions, loadSuggestions])

  async function toggleSafety(paused: boolean) {
    setBusy('safety')
    await post('/api/admin/master/crm-agentes-debug/toggle-safety', { body: JSON.stringify({ tenantId: activeTenantId, paused }) })
    await loadTenants()
    setBusy(null)
  }

  async function setWhatsAppRole(role: 'admin-real' | 'lead-real', leadUuid?: string) {
    setBusy('whatsapp')
    await post('/api/admin/master/crm-agentes-debug/whatsapp-role', {
      body: JSON.stringify({ tenantId: activeTenantId, role, leadUuid: leadUuid ?? null }),
    })
    await loadTenants()
    setBusy(null)
  }

  async function createLead() {
    setBusy('novo-lead')
    const res = await post('/api/crm/leads', {
      body: JSON.stringify({
        tenant_id: activeTenantId,
        nome: newLead.nome || 'Lead de Teste',
        telefone: newLead.telefone || '5581900000001',
        mensagem: newLead.demanda,
        utm_source: 'CRM Manual',
      }),
    })
    const data = await res.json()
    setBusy(null)
    if (!res.ok) { alert(`Erro ao criar lead: ${data.error || res.status}`); return }
    setNewLead({ nome: '', telefone: '', demanda: '' })
    await loadLeads(activeTenantId)
  }

  function toggleExpand(leadUuid: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(leadUuid) ? next.delete(leadUuid) : next.add(leadUuid)
      return next
    })
  }

  async function backdate(leadUuid: string, agentKey: string, amount: number, unit: 'minutes' | 'hours' | 'days') {
    setBusy(`backdate-${leadUuid}-${agentKey}`)
    await post('/api/admin/master/crm-agentes-debug/backdate', { body: JSON.stringify({ agentKey, leadUuid, amount, unit }) })
    await loadLeads(activeTenantId)
    setBusy(null)
  }

  async function evaluate(leadUuid: string, agentKey: string) {
    setBusy(`eval-${leadUuid}-${agentKey}`)
    const res = await post('/api/admin/master/crm-agentes-debug/evaluate', {
      body: JSON.stringify({ tenantId: activeTenantId, leadUuid, agentKey }),
    })
    const data = await res.json()
    setBusy(null)
    if (!res.ok) { alert(`Erro: ${data.error}`); return }
    if (data.mode === 'commit-direto') {
      // next_best_action já roda de verdade — recarrega leads/histórico, sem passo de commit.
      await loadLeads(activeTenantId)
      await loadActions(activeTenantId)
      alert(`Sugestão gerada: ${data.result?.suggestion?.title || data.result?.enabled === false ? 'agente desativado neste segmento/tenant' : JSON.stringify(data.result)}`)
      return
    }
    setEvalResults((prev) => ({ ...prev, [`${leadUuid}:${agentKey}`]: data.result }))
  }

  async function commit(leadUuid: string, agentKey: string) {
    const result = evalResults[`${leadUuid}:${agentKey}`]
    if (!result) return
    setBusy(`commit-${leadUuid}-${agentKey}`)
    const res = await post('/api/admin/master/crm-agentes-debug/commit', {
      body: JSON.stringify({ tenantId: activeTenantId, leadUuid, agentKey, result }),
    })
    const data = await res.json()
    setBusy(null)
    if (!res.ok) { alert(`Erro: ${data.error}`); return }
    setEvalResults((prev) => ({ ...prev, [`${leadUuid}:${agentKey}`]: null }))
    await loadActions(activeTenantId)
    await loadLeads(activeTenantId)
  }

  async function decideAction(actionId: string, kind: 'approve' | 'reject', editedMessage?: string) {
    setBusy(`decide-${actionId}`)
    const res = await post(`/api/admin/master/crm-agentes-debug/${kind}`, {
      body: JSON.stringify({ actionId, editedMessage }),
    })
    const data = await res.json()
    setBusy(null)
    if (!res.ok) { alert(`Erro: ${data.error}`); return }
    await loadActions(activeTenantId)
  }

  async function seedRecal() {
    setBusy('recal-seed')
    const res = await post('/api/admin/master/crm-agentes-debug/score-recalibration/seed', {
      body: JSON.stringify({
        tenantId: activeTenantId, tag: recalForm.tag, scoreBase: Number(recalForm.scoreBase),
        leadsCount: Number(recalForm.leadsCount), conversionPct: Number(recalForm.conversionPct),
      }),
    })
    const data = await res.json()
    setBusy(null)
    if (!res.ok) { alert(`Erro: ${data.error}`); return }
    alert(`Regra "${recalForm.tag}" criada com score_base=${data.score}. ${data.leadsCreated} leads sintéticos (${data.convertedCount} convertidos).`)
  }

  async function runRecal() {
    setBusy('recal-run')
    const res = await post('/api/admin/master/crm-agentes-debug/score-recalibration/run', {
      body: JSON.stringify({ tenantId: activeTenantId }),
    })
    const data = await res.json()
    setBusy(null)
    if (!res.ok) { alert(`Erro: ${data.error}`); return }
    await loadSuggestions(activeTenantId)
    alert(`Rodado no escopo tenant: ${data.suggestionsCreated} sugestão(ões) criada(s), reordenado: ${data.reordered}`)
  }

  async function decideRecal(id: string, decision: 'apply' | 'dismiss') {
    setBusy(`recal-decide-${id}`)
    const res = await post('/api/admin/master/crm-agentes-debug/score-recalibration/decide', {
      body: JSON.stringify({ suggestionId: id, decision }),
    })
    const data = await res.json()
    setBusy(null)
    if (!res.ok) { alert(`Erro: ${data.error}`); return }
    alert(data.message)
    await loadSuggestions(activeTenantId)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-mono text-sm">
      <h1 className="text-xl font-bold mb-1">🧪 Painel de teste — Agentes de Aceleração do CRM</h1>
      <p className="text-slate-400 mb-4">Painel temporário, Master-only. Nenhum link na sidebar.</p>

      {/* Seletor de tenant */}
      <div className="flex gap-2 mb-4">
        {tenants.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTenantId(t.id)}
            className={`px-3 py-1.5 rounded border ${t.id === activeTenantId ? 'bg-amber-600 border-amber-500 text-slate-950' : 'bg-slate-800 border-slate-700'}`}
          >
            {t.name} <span className="opacity-70">({t.segmentName})</span>
          </button>
        ))}
      </div>

      {activeTenant && (
        <>
          {/* Status / segurança / WhatsApp role */}
          <section className="bg-slate-900 border border-slate-800 rounded p-4 mb-4">
            <h2 className="font-bold mb-2">1. Status do tenant</h2>
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                Scan automático:{' '}
                {activeTenant.scanSafety.every((s) => s.pausedByOverride) ? (
                  <span className="text-emerald-400">🔒 pausado</span>
                ) : (
                  <span className="text-red-400">▶️ ativo (cuidado!)</span>
                )}
                <button
                  disabled={busy === 'safety'}
                  onClick={() => toggleSafety(!activeTenant.scanSafety.every((s) => s.pausedByOverride))}
                  className="ml-2 px-2 py-0.5 rounded bg-slate-700 border border-slate-600"
                >
                  {activeTenant.scanSafety.every((s) => s.pausedByOverride) ? 'Retomar' : 'Pausar'}
                </button>
              </div>
              <div>
                Papel do WhatsApp: <b>{activeTenant.whatsappRole.role}</b> ({activeTenant.whatsappRole.numeroWhatsapp})
                <button disabled={busy === 'whatsapp'} onClick={() => setWhatsAppRole('admin-real')} className="ml-2 px-2 py-0.5 rounded bg-slate-700 border border-slate-600">
                  Sou o Admin (real)
                </button>
                <button disabled={busy === 'whatsapp'} onClick={() => setWhatsAppRole('lead-real')} className="ml-2 px-2 py-0.5 rounded bg-slate-700 border border-slate-600">
                  Sou o Lead (real)
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              "Sou o Lead" só faz efeito real no telefone do lead que você escolher abaixo (botão "Aplicar papel Lead" em cada linha).
            </p>
          </section>

          {/* Novo lead de teste */}
          <section className="bg-slate-900 border border-slate-800 rounded p-4 mb-4">
            <h2 className="font-bold mb-2">2. + Novo Lead de teste</h2>
            <div className="flex flex-wrap gap-2 mb-2">
              <input placeholder="Nome" value={newLead.nome} onChange={(e) => setNewLead((s) => ({ ...s, nome: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-2 py-1" />
              <input placeholder="Telefone (opcional)" value={newLead.telefone} onChange={(e) => setNewLead((s) => ({ ...s, telefone: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-2 py-1" />
            </div>
            <textarea
              placeholder="Demanda do Cliente — o texto real que alimenta a qualificação por IA (resumo_ia/tag_sonho/scores)"
              value={newLead.demanda}
              onChange={(e) => setNewLead((s) => ({ ...s, demanda: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 mb-2"
              rows={3}
            />
            <button disabled={busy === 'novo-lead'} onClick={createLead} className="px-3 py-1.5 rounded bg-emerald-700 border border-emerald-600">
              Criar e qualificar
            </button>
          </section>

          {/* Tabela de leads */}
          <section className="bg-slate-900 border border-slate-800 rounded p-4 mb-4">
            <h2 className="font-bold mb-2">3. Leads do tenant ({leads.length})</h2>
            {leads.map((l) => (
              <div key={l.lead_uuid} className="border border-slate-800 rounded mb-2">
                <div className="flex justify-between items-center p-2 cursor-pointer" onClick={() => toggleExpand(l.lead_uuid)}>
                  <div>
                    <b>{l.nome}</b> — {l.telefone} — etapa: {l.etapa_atual || '—'} — bola: {l.bola_com || '—'}
                    {l.tag_sonho && <span className="ml-2 text-amber-400">[{l.tag_sonho}]</span>}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setWhatsAppRole(activeTenant.whatsappRole.role === 'lead-real' ? 'lead-real' : 'admin-real', l.lead_uuid) }} className="text-xs px-2 py-0.5 rounded bg-slate-700 border border-slate-600">
                    Aplicar papel atual a este lead
                  </button>
                </div>
                {expanded.has(l.lead_uuid) && (
                  <div className="p-2 border-t border-slate-800 space-y-3">
                    <div className="text-xs text-slate-400">
                      resumo_ia: {l.resumo_ia || '—'} · score_prontidao: {l.score_prontidao ?? '—'} · score_fit: {l.score_fit ?? '—'} · bola_desde: {l.bola_desde || '—'} · etapa_desde: {l.etapa_desde || '—'} (SLA {l.sla_hours ?? '—'}h) · responsável: {l.responsavel_nome || 'ninguém'}
                    </div>
                    {(['pendencia_atendimento', 'stage_stagnation', 'reactivation'] as const).map((agentKey) => {
                      const key = `${l.lead_uuid}:${agentKey}`
                      const result = evalResults[key]
                      return (
                        <div key={agentKey} className="border border-slate-800 rounded p-2">
                          <div className="font-semibold mb-1">{AGENT_LABELS[agentKey]}</div>
                          <div className="flex gap-1 flex-wrap mb-1">
                            <button onClick={() => backdate(l.lead_uuid, agentKey, 10, 'days')} className="text-xs px-2 py-0.5 rounded bg-slate-700 border border-slate-600">
                              ⏱️ Simular 10 dias
                            </button>
                            <button onClick={() => backdate(l.lead_uuid, agentKey, 1, 'hours')} className="text-xs px-2 py-0.5 rounded bg-slate-700 border border-slate-600">
                              ⏱️ Simular 1 hora
                            </button>
                            <button disabled={busy === `eval-${l.lead_uuid}-${agentKey}`} onClick={() => evaluate(l.lead_uuid, agentKey)} className="text-xs px-2 py-0.5 rounded bg-blue-700 border border-blue-600">
                              🔍 Avaliar (dry-run)
                            </button>
                            {result && result.shouldFire && (
                              <button disabled={busy === `commit-${l.lead_uuid}-${agentKey}`} onClick={() => commit(l.lead_uuid, agentKey)} className="text-xs px-2 py-0.5 rounded bg-emerald-700 border border-emerald-600">
                                ✅ Registrar e notificar
                              </button>
                            )}
                          </div>
                          {result && (
                            <div className="text-xs bg-slate-950 border border-slate-800 rounded p-2">
                              {result.shouldFire ? (
                                <>
                                  <div><b>{result.type}</b> — {result.title}</div>
                                  <div className="text-slate-400">{result.description}</div>
                                  {result.suggestedMessage && <div className="mt-1 text-amber-300">✍️ "{result.suggestedMessage}"</div>}
                                </>
                              ) : (
                                <div className="text-slate-500">shouldFire=false (não dispararia agora)</div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    <div>
                      <button disabled={busy === `eval-${l.lead_uuid}-next_best_action`} onClick={() => evaluate(l.lead_uuid, 'next_best_action')} className="text-xs px-2 py-1 rounded bg-blue-700 border border-blue-600">
                        💡 Gerar sugestão (Próxima Ação)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </section>

          {/* Recalibração de score */}
          <section className="bg-slate-900 border border-slate-800 rounded p-4 mb-4">
            <h2 className="font-bold mb-2">4. Recalibração de Score (escopo tenant, nunca segmento)</h2>
            <div className="flex flex-wrap gap-2 mb-2">
              <input placeholder="tag_resultante" value={recalForm.tag} onChange={(e) => setRecalForm((s) => ({ ...s, tag: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-2 py-1" />
              <input placeholder="score_base (1-10)" value={recalForm.scoreBase} onChange={(e) => setRecalForm((s) => ({ ...s, scoreBase: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-32" />
              <input placeholder="qtd leads" value={recalForm.leadsCount} onChange={(e) => setRecalForm((s) => ({ ...s, leadsCount: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-24" />
              <input placeholder="% conversão" value={recalForm.conversionPct} onChange={(e) => setRecalForm((s) => ({ ...s, conversionPct: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-24" />
              <button disabled={busy === 'recal-seed'} onClick={seedRecal} className="px-2 py-1 rounded bg-slate-700 border border-slate-600">Gerar regra + leads sintéticos</button>
              <button disabled={busy === 'recal-run'} onClick={runRecal} className="px-2 py-1 rounded bg-emerald-700 border border-emerald-600">Rodar recalibração</button>
            </div>
            {suggestions.map((s) => (
              <div key={s.id} className="text-xs border border-slate-800 rounded p-2 mb-1 flex justify-between items-center">
                <div>
                  <b>{s.tag_resultante}</b>: {s.score_atual} → {s.score_sugerido} (taxa observada {s.taxa_conversao_observada}%, {s.leads_convertidos}/{s.leads_gerados} leads) — status: {s.status}
                </div>
                {s.status === 'PENDING' && (
                  <div className="flex gap-1">
                    <button onClick={() => decideRecal(s.id, 'apply')} className="px-2 py-0.5 rounded bg-emerald-700 border border-emerald-600">Aplicar</button>
                    <button onClick={() => decideRecal(s.id, 'dismiss')} className="px-2 py-0.5 rounded bg-slate-700 border border-slate-600">Descartar</button>
                  </div>
                )}
              </div>
            ))}
          </section>

          {/* Histórico */}
          <section className="bg-slate-900 border border-slate-800 rounded p-4">
            <h2 className="font-bold mb-2">5. Histórico (crm_agent_actions)</h2>
            {actions.map((a) => (
              <div key={a.id} className="text-xs border border-slate-800 rounded p-2 mb-1">
                <div>
                  <b>{a.lead_nome}</b> — {AGENT_LABELS[a.agent_key] || a.agent_key} — <b>{a.type}</b> — status: <b>{a.status}</b>
                </div>
                <div className="text-slate-400">{a.title} — {a.description}</div>
                {a.suggested_message && <div className="text-amber-300">✍️ "{a.suggested_message}"</div>}
                {a.status === 'PENDING_APPROVAL' && (
                  <div className="flex gap-1 mt-1">
                    <span>PIN: <b>{a.approval_pin}</b></span>
                    <button onClick={() => decideAction(a.id, 'approve', a.suggested_message || undefined)} className="px-2 py-0.5 rounded bg-emerald-700 border border-emerald-600">Aprovar (sem PIN, Master)</button>
                    <button onClick={() => decideAction(a.id, 'reject')} className="px-2 py-0.5 rounded bg-red-700 border border-red-600">Rejeitar</button>
                  </div>
                )}
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  )
}
