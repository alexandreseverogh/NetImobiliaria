'use client'

import React, { useState, useEffect } from 'react'
import {
  AdjustmentsHorizontalIcon, BeakerIcon, PlusIcon, TrashIcon,
  ExclamationCircleIcon, TagIcon, CpuChipIcon,
  ChatBubbleBottomCenterIcon, CheckBadgeIcon, ClockIcon, ScaleIcon, ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'
import { useTheme } from '@/hooks/useTheme'

interface Rule {
  id: string
  palavras_chave: string
  tag_resultante: string
  resumo_modelo: string
  score_base: number
  ordem: number
  ativa: boolean
}

interface RuleStat { tagResultante: string; leadsGerados: number; leadsConvertidos: number; taxaConversaoObservada: number | null }

interface RecalibrationSuggestion {
  id: string
  tag_resultante: string
  score_atual: number
  score_sugerido: number
  leads_gerados: number
  leads_convertidos: number
  taxa_conversao_observada: number
}

interface FitCriterion {
  id: string
  criterio: string
  peso: number
  ordem: number
  ativo: boolean
}

interface SegmentInfo {
  id: string
  name: string
  slug: string
  icon: string | null
  crm_ia_ativa: boolean
}

const EMPTY_RULE_FORM = { id: '', palavras_chave: '', tag_resultante: '', resumo_modelo: '', score_base: 5, ativa: true }
const EMPTY_FIT_FORM = { id: '', criterio: '', peso: 5, ativo: true }

export default function AIConfigPage() {
  const t = useTheme()
  const [segment, setSegment] = useState<SegmentInfo | null>(null)
  const [prompt, setPrompt] = useState<string | null>(null)
  const [segmentRules, setSegmentRules] = useState<Rule[]>([])
  const [tenantRules, setTenantRules] = useState<Rule[]>([])
  const [segmentFitCriteria, setSegmentFitCriteria] = useState<FitCriterion[]>([])
  const [tenantFitCriteria, setTenantFitCriteria] = useState<FitCriterion[]>([])
  const [ruleStats, setRuleStats] = useState<Record<string, RuleStat>>({})
  const [recalibrationSuggestions, setRecalibrationSuggestions] = useState<RecalibrationSuggestion[]>([])
  const [decidingId, setDecidingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditingRule, setIsEditingRule] = useState(false)
  const [currentRule, setCurrentRule] = useState<any>(EMPTY_RULE_FORM)
  const [isEditingFit, setIsEditingFit] = useState(false)
  const [currentFit, setCurrentFit] = useState<any>(EMPTY_FIT_FORM)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/crm/config/ia')
      const data = await res.json()
      if (data.success) {
        setSegment(data.segment)
        setPrompt(data.prompt)
        setSegmentRules(data.segmentRules || [])
        setTenantRules(data.tenantRules || [])
        setSegmentFitCriteria(data.segmentFitCriteria || [])
        setTenantFitCriteria(data.tenantFitCriteria || [])
        setRuleStats(data.tenantRuleStats || {})
        setRecalibrationSuggestions(data.tenantRecalibrationSuggestions || [])
      }
    } finally { setLoading(false) }
  }

  const decideSuggestion = async (suggestionId: string, decision: 'apply' | 'dismiss') => {
    setDecidingId(suggestionId)
    try {
      const res = await fetch('/api/crm/config/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: decision === 'apply' ? 'applyRecalibration' : 'dismissRecalibration', data: { suggestionId } }),
      })
      const json = await res.json()
      if (json.success) fetchData()
      else alert(json.error || 'Erro ao decidir sugestão.')
    } finally {
      setDecidingId(null)
    }
  }

  const handleSaveRule = async () => {
    if (!currentRule.tag_resultante?.trim() || !currentRule.palavras_chave?.trim() || !currentRule.resumo_modelo?.trim()) {
      alert('Tag, palavras-chave e resumo são obrigatórios.')
      return
    }
    const res = await fetch('/api/crm/config/ia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'saveRule', data: currentRule }),
    })
    const json = await res.json()
    if (json.success) { setIsEditingRule(false); fetchData() }
    else alert(json.error || 'Erro ao salvar regra.')
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Deseja excluir esta regra?')) return
    const res = await fetch('/api/crm/config/ia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteRule', data: { id } }),
    })
    const json = await res.json()
    if (json.success) fetchData()
    else alert(json.error || 'Erro ao excluir regra.')
  }

  const handleSaveFit = async () => {
    if (!currentFit.criterio?.trim()) {
      alert('Descreva o critério de encaixe.')
      return
    }
    const res = await fetch('/api/crm/config/ia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'saveFitCriterion', data: currentFit }),
    })
    const json = await res.json()
    if (json.success) { setIsEditingFit(false); fetchData() }
    else alert(json.error || 'Erro ao salvar critério.')
  }

  const handleDeleteFit = async (id: string) => {
    if (!confirm('Deseja excluir este critério?')) return
    const res = await fetch('/api/crm/config/ia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteFitCriterion', data: { id } }),
    })
    const json = await res.json()
    if (json.success) fetchData()
    else alert(json.error || 'Erro ao excluir critério.')
  }

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><BeakerIcon className="h-12 w-12 text-blue-500 animate-pulse" /></div>

  return (
    <>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className={`flex flex-wrap justify-between items-center gap-4 ${t.cardBg} p-8 rounded-3xl shadow-sm`}>
          <div>
            <h2 className={`text-3xl font-black italic tracking-tighter uppercase ${t.textPrimary}`}>
              Inteligência <span className="text-blue-500">de Qualificação</span>
            </h2>
            <p className={`text-sm font-medium ${t.textSecondary}`}>
              {segment ? `Segmento: ${segment.name}` : 'Segmento não identificado para este tenant.'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {segment?.crm_ia_ativa ? (
              <div className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                <CheckBadgeIcon className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">IA Ativa neste Segmento</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                <ClockIcon className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Aguardando Configuração da Master</span>
              </div>
            )}
          </div>
        </div>

        {!segment?.crm_ia_ativa && (
          <div className={`border p-6 rounded-3xl ${t.isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
            <p className={`text-sm font-medium ${t.textSecondary}`}>
              A equipe da plataforma ainda não configurou a qualificação por IA para o segmento
              <strong> {segment?.name || 'deste tenant'}</strong>. Enquanto isso não acontece, novos leads continuam
              sendo capturados normalmente — só a análise automática de intenção/prioridade fica em espera.
              Você já pode cadastrar suas próprias regras abaixo; elas passam a valer assim que a IA for ativada.
            </p>
          </div>
        )}

        {prompt && (
          <div className={`${t.isDark ? 'bg-blue-600/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'} border p-8 rounded-3xl`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-black italic tracking-tighter uppercase flex items-center ${t.textPrimary}`}>
                <ChatBubbleBottomCenterIcon className="h-6 w-6 text-blue-500 mr-2" />
                Prompt Mestre
              </h3>
              <span className={`text-[9px] font-black uppercase tracking-widest ${t.textMuted}`}>Gerenciado pela plataforma</span>
            </div>
            <pre className={`whitespace-pre-wrap text-xs leading-relaxed rounded-2xl px-6 py-5 font-medium ${t.inputBg} ${t.textSecondary}`}>{prompt}</pre>
          </div>
        )}

        <div className="space-y-4">
          <h3 className={`text-xl font-bold flex items-center ${t.textPrimary}`}>
            <TagIcon className="h-6 w-6 text-blue-500 mr-2" />Regras Padrão do Segmento
          </h3>
          <p className={`text-xs ${t.textMuted}`}>Curadas pela equipe da plataforma — valem pra todo tenant deste segmento. Só leitura aqui.</p>
          <div className="grid grid-cols-1 gap-3">
            {segmentRules.length > 0 ? segmentRules.map(rule => (
              <RuleCard key={rule.id} rule={rule} t={t} readOnly />
            )) : (
              <div className={`text-center py-10 border-2 border-dashed rounded-3xl ${t.isDark ? 'border-white/5' : 'border-gray-200'}`}>
                <ExclamationCircleIcon className={`h-8 w-8 mx-auto mb-2 ${t.textMuted}`} />
                <p className={`text-sm ${t.textSecondary}`}>Nenhuma regra padrão cadastrada ainda para este segmento.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className={`text-xl font-bold flex items-center ${t.textPrimary}`}>
              <CpuChipIcon className="h-6 w-6 text-blue-500 mr-2" />Suas Regras Personalizadas
            </h3>
            <button onClick={() => { setCurrentRule(EMPTY_RULE_FORM); setIsEditingRule(true) }}
              className="flex items-center px-6 py-3 bg-blue-600 text-white text-xs font-black uppercase rounded-2xl hover:bg-blue-500 transition-all">
              <PlusIcon className="h-4 w-4 mr-2" />Nova Regra
            </button>
          </div>
          <p className={`text-xs ${t.textMuted}`}>Suas regras têm prioridade sobre as regras padrão do segmento quando ambas baterem na mesma mensagem.</p>

          {isEditingRule && (
            <div className={`${t.isDark ? 'bg-blue-600/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'} border p-8 rounded-3xl animate-in fade-in duration-300`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[['Tag de Intenção', 'tag_resultante', 'text', currentRule.tag_resultante, 'Qual intenção este lead demonstra?'],
                  ['Score Base (0-10)', 'score_base', 'number', currentRule.score_base, ''],
                  ['Palavras-Chave de Gatilho', 'palavras_chave', 'text', currentRule.palavras_chave, 'separar por vírgula']].map(([label, key, type, val, ph], i) => (
                  <div key={String(key)} className={`space-y-1 ${i === 2 ? 'md:col-span-2' : ''}`}>
                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${t.textMuted}`}>{String(label)}</label>
                    <input type={String(type)} value={String(val ?? '')} placeholder={String(ph)}
                      onChange={e => setCurrentRule({ ...currentRule, [String(key)]: type === 'number' ? parseInt(e.target.value) : e.target.value })}
                      className={`w-full rounded-xl px-4 py-3 text-sm ${t.inputBg}`} />
                  </div>
                ))}
                <div className="md:col-span-2 space-y-1">
                  <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${t.textMuted}`}>Resumo para quem for atender</label>
                  <textarea value={currentRule.resumo_modelo} onChange={e => setCurrentRule({ ...currentRule, resumo_modelo: e.target.value })}
                    className={`w-full rounded-xl px-4 py-3 text-sm h-24 ${t.inputBg}`} placeholder="Descrição que aparecerá na ficha do lead..." />
                </div>
              </div>
              <div className="mt-8 flex justify-end space-x-4">
                <button onClick={() => setIsEditingRule(false)} className={`px-6 py-3 text-xs font-bold uppercase ${t.textMuted} hover:text-blue-500 transition-colors`}>Cancelar</button>
                <button onClick={handleSaveRule} className="px-10 py-3 bg-blue-600 text-white text-xs font-black uppercase rounded-xl hover:bg-blue-500">Salvar Regra</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {tenantRules.length > 0 ? tenantRules.map(rule => (
              <RuleCard key={rule.id} rule={rule} t={t}
                stat={ruleStats[rule.tag_resultante]}
                suggestion={recalibrationSuggestions.find(s => s.tag_resultante === rule.tag_resultante)}
                decidingId={decidingId}
                onDecide={decideSuggestion}
                onEdit={() => { setCurrentRule(rule); setIsEditingRule(true) }}
                onDelete={() => handleDeleteRule(rule.id)} />
            )) : (
              <div className={`text-center py-16 border-2 border-dashed rounded-3xl ${t.isDark ? 'border-white/5' : 'border-gray-200'}`}>
                <ExclamationCircleIcon className={`h-10 w-10 mx-auto mb-3 ${t.textMuted}`} />
                <p className={`font-medium ${t.textSecondary}`}>Nenhuma regra própria ainda. As regras padrão do segmento acima seguem valendo.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className={`text-xl font-bold flex items-center ${t.textPrimary}`}>
            <ScaleIcon className="h-6 w-6 text-violet-500 mr-2" />Critérios de Aderência do Segmento (ICP)
          </h3>
          <p className={`text-xs ${t.textMuted}`}>
            Curados pela equipe da plataforma — descrevem o quão bem um lead se encaixa no perfil ideal de cliente
            deste segmento (separado da intenção, que é medida pelas regras acima). Só leitura aqui.
          </p>
          <div className="grid grid-cols-1 gap-3">
            {segmentFitCriteria.length > 0 ? segmentFitCriteria.map(c => (
              <FitCard key={c.id} criterion={c} t={t} readOnly />
            )) : (
              <div className={`text-center py-10 border-2 border-dashed rounded-3xl ${t.isDark ? 'border-white/5' : 'border-gray-200'}`}>
                <ExclamationCircleIcon className={`h-8 w-8 mx-auto mb-2 ${t.textMuted}`} />
                <p className={`text-sm ${t.textSecondary}`}>Nenhum critério de fit cadastrado ainda para este segmento.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className={`text-xl font-bold flex items-center ${t.textPrimary}`}>
              <ScaleIcon className="h-6 w-6 text-violet-500 mr-2" />Seus Critérios de Aderência
            </h3>
            <button onClick={() => { setCurrentFit(EMPTY_FIT_FORM); setIsEditingFit(true) }}
              className="flex items-center px-6 py-3 bg-violet-600 text-white text-xs font-black uppercase rounded-2xl hover:bg-violet-500 transition-all">
              <PlusIcon className="h-4 w-4 mr-2" />Novo Critério
            </button>
          </div>
          <p className={`text-xs ${t.textMuted}`}>Somados aos critérios padrão do segmento acima — a IA avalia todos juntos.</p>

          {isEditingFit && (
            <div className={`${t.isDark ? 'bg-violet-600/10 border-violet-500/30' : 'bg-violet-50 border-violet-200'} border p-8 rounded-3xl animate-in fade-in duration-300`}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3 space-y-1">
                  <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${t.textMuted}`}>Critério de encaixe</label>
                  <textarea value={currentFit.criterio} placeholder="Ex.: orçamento declarado compatível com o portfólio ativo"
                    onChange={e => setCurrentFit({ ...currentFit, criterio: e.target.value })}
                    rows={2}
                    className={`w-full rounded-xl px-4 py-3 text-sm leading-snug resize-y ${t.inputBg}`} />
                </div>
                <div className="space-y-1">
                  <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${t.textMuted}`}>Peso (0-10)</label>
                  <input type="number" min={0} max={10} value={currentFit.peso}
                    onChange={e => setCurrentFit({ ...currentFit, peso: parseInt(e.target.value) })}
                    className={`w-full rounded-xl px-4 py-3 text-sm ${t.inputBg}`} />
                </div>
              </div>
              <div className="mt-8 flex justify-end space-x-4">
                <button onClick={() => setIsEditingFit(false)} className={`px-6 py-3 text-xs font-bold uppercase ${t.textMuted} hover:text-violet-500 transition-colors`}>Cancelar</button>
                <button onClick={handleSaveFit} className="px-10 py-3 bg-violet-600 text-white text-xs font-black uppercase rounded-xl hover:bg-violet-500">Salvar Critério</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {tenantFitCriteria.length > 0 ? tenantFitCriteria.map(c => (
              <FitCard key={c.id} criterion={c} t={t}
                onEdit={() => { setCurrentFit(c); setIsEditingFit(true) }}
                onDelete={() => handleDeleteFit(c.id)} />
            )) : (
              <div className={`text-center py-16 border-2 border-dashed rounded-3xl ${t.isDark ? 'border-white/5' : 'border-gray-200'}`}>
                <ExclamationCircleIcon className={`h-10 w-10 mx-auto mb-3 ${t.textMuted}`} />
                <p className={`font-medium ${t.textSecondary}`}>Nenhum critério próprio ainda. Os critérios padrão do segmento acima seguem valendo.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function RuleCard({ rule, t, readOnly, onEdit, onDelete, stat, suggestion, decidingId, onDecide }: {
  rule: Rule, t: any, readOnly?: boolean, onEdit?: () => void, onDelete?: () => void,
  stat?: RuleStat, suggestion?: RecalibrationSuggestion, decidingId?: string | null,
  onDecide?: (suggestionId: string, decision: 'apply' | 'dismiss') => void
}) {
  return (
    <div className={`group ${t.cardBg} p-6 rounded-3xl transition-all flex flex-col gap-4`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1 space-y-3">
          <div className="flex items-center space-x-3">
            <span className="bg-blue-600/20 text-blue-500 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border border-blue-500/20">{rule.tag_resultante}</span>
            <div className={`h-1 w-1 rounded-full ${t.isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
            <span className="text-emerald-500 font-mono text-[10px] font-black italic">Score Base: {rule.score_base}</span>
            {!rule.ativa && <span className="text-[9px] font-black uppercase text-gray-400">Inativa</span>}
          </div>
          <p className={`text-sm font-medium ${t.textPrimary}`}>{rule.resumo_modelo}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            {rule.palavras_chave.split(',').map((p: string, i: number) => (
              <span key={i} className={`text-[9px] ${t.cardInner} px-2 py-1 rounded-md lowercase ${t.textMuted}`}>{p.trim()}</span>
            ))}
          </div>
          {/* F5 — conversão real, computada ao vivo (nunca armazenada na regra). */}
          {stat && (
            <p className={`text-[10px] font-mono ${t.textMuted}`}>
              {stat.leadsGerados === 0
                ? 'Sem leads reais com esta tag ainda (últimos 90 dias)'
                : `${stat.leadsGerados} lead(s) reais · ${stat.leadsConvertidos} fechado(s) · ${stat.taxaConversaoObservada}% conversão real (90d)`}
            </p>
          )}
        </div>
        {!readOnly && (
          <div className="flex items-center space-x-2">
            <button onClick={onEdit} className={`p-3 ${t.cardBg} hover:text-blue-500 rounded-xl transition-all ${t.textMuted}`}>
              <AdjustmentsHorizontalIcon className="h-5 w-5" />
            </button>
            <button onClick={onDelete} className={`p-3 ${t.cardBg} hover:text-red-500 rounded-xl transition-all ${t.textMuted}`}>
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {suggestion && onDecide && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="flex items-center gap-2 text-xs text-amber-800">
            <ArrowTrendingUpIcon className="h-4 w-4 shrink-0" />
            <span>
              <span className="font-black">Sugestão de recalibração:</span> score {suggestion.score_atual} → {suggestion.score_sugerido}
              {' '}(conversão real {suggestion.taxa_conversao_observada}%, baseado em {suggestion.leads_gerados} leads reais)
            </span>
          </p>
          <div className="flex gap-2 shrink-0">
            <button disabled={decidingId === suggestion.id}
              onClick={() => onDecide(suggestion.id, 'dismiss')}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-50">
              Descartar
            </button>
            <button disabled={decidingId === suggestion.id}
              onClick={() => onDecide(suggestion.id, 'apply')}
              className="px-3 py-1.5 rounded-lg text-[11px] font-black text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50">
              {decidingId === suggestion.id ? 'Aplicando...' : 'Aplicar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function FitCard({ criterion, t, readOnly, onEdit, onDelete }: {
  criterion: FitCriterion, t: any, readOnly?: boolean, onEdit?: () => void, onDelete?: () => void
}) {
  return (
    <div className={`group ${t.cardBg} p-6 rounded-3xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-6`}>
      <div className="flex-1 space-y-2">
        <div className="flex items-center space-x-3">
          <span className="text-violet-500 font-mono text-[10px] font-black italic">Peso: {criterion.peso}</span>
          {!criterion.ativo && <span className="text-[9px] font-black uppercase text-gray-400">Inativo</span>}
        </div>
        <p className={`text-sm font-medium ${t.textPrimary}`}>{criterion.criterio}</p>
      </div>
      {!readOnly && (
        <div className="flex items-center space-x-2">
          <button onClick={onEdit} className={`p-3 ${t.cardBg} hover:text-violet-500 rounded-xl transition-all ${t.textMuted}`}>
            <AdjustmentsHorizontalIcon className="h-5 w-5" />
          </button>
          <button onClick={onDelete} className={`p-3 ${t.cardBg} hover:text-red-500 rounded-xl transition-all ${t.textMuted}`}>
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}
