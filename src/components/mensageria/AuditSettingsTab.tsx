'use client'

/**
 * Aba "Auditoria" de /mensageria/config.
 * Parâmetros de auditoria de resolução (fast/longo silêncio/reincidência), com cascata:
 * segmento (padrão do Master) → empresa (override do tenant) → cliente (override do cliente).
 * Leitura para todos; alteração e restauração de herança só para o administrador da empresa.
 * A trava real está no servidor (rotas /intelligence/benchmarks/tenant e /client); a tela só
 * desabilita os controles para evitar erro na cara do usuário.
 */

import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/auth/adminFetch'
import ClientSelector, { useClientSelector } from '@/components/crm/ClientSelector'

type Level = 'segment' | 'tenant' | 'client'

interface AuditParam {
  metric_key: string
  metric_label: string
  description: string | null
  segment_value: number
  tenant_value: number | null
  client_value: number | null
  effective_value: number
  override_level: Level
}

const AUDIT_KEYS = ['audit_fast_resolve_min', 'audit_long_silence_hours', 'audit_reopen_days']

const LABELS: Record<string, { label: string; help: string }> = {
  audit_fast_resolve_min: {
    label: 'Resolução rápida suspeita (minutos)',
    help: 'Conversa resolvida em menos de N minutos depois de mensagem do cliente sem resposta nossa.',
  },
  audit_long_silence_hours: {
    label: 'Resolução após longo silêncio (horas)',
    help: 'Conversa resolvida N horas ou mais depois de mensagem do cliente sem resposta nossa.',
  },
  audit_reopen_days: {
    label: 'Reincidência suspeita (dias)',
    help: 'O mesmo contato abriu outra conversa em menos de N dias após a resolução.',
  },
}

const LEVEL_TEXT: Record<Level, string> = {
  segment: 'Padrão do segmento',
  tenant: 'Personalizado para a empresa',
  client: 'Personalizado para o cliente',
}

interface AuditSettingsTabProps {
  onClose?: () => void
}

export function AuditSettingsTab({ onClose }: AuditSettingsTabProps) {
  const { clients, loading: clientsLoading, clientFilter, setClientFilter } = useClientSelector('mensageria-audit-settings')
  // 'own' = empresa; uuid = cliente. Nunca 'segment' aqui (o tenant não edita o segmento).
  const clientId = clientFilter === 'own' || clientFilter === 'segment' ? null : clientFilter

  const [params, setParams] = useState<AuditParam[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  async function load() {
    setLoading(true)
    setErro(null)
    try {
      const url = clientId
        ? `/api/admin/campanhas/intelligence/benchmarks/client?clientId=${clientId}`
        : `/api/admin/campanhas/intelligence/benchmarks/tenant`
      const res = await adminFetch(url)
      const data = await res.json()
      const all: AuditParam[] = (data.benchmarks || []).filter((b: AuditParam) => AUDIT_KEYS.includes(b.metric_key))
      setParams(all)
      const d: Record<string, string> = {}
      for (const p of all) d[p.metric_key] = String(p.effective_value)
      setDrafts(d)
    } catch {
      setErro('Não foi possível carregar os parâmetros.')
    } finally {
      setLoading(false)
    }
  }

  // Quem pode alterar: o mesmo critério do servidor (administrador da empresa ou Master),
  // lido de bot-flows para não criar mais um endpoint só para isso.
  useEffect(() => {
    adminFetch('/api/admin/mensageria/bot-flows')
      .then((r) => r.json())
      .then((d) => setCanEdit(!!d.canEdit))
      .catch(() => setCanEdit(false))
  }, [])

  useEffect(() => { load() }, [clientId])

  async function salvar() {
    setErro(null)
    const overrides = AUDIT_KEYS.map((k) => ({ metric_key: k, value: Number(drafts[k]) }))
    if (overrides.some((o) => !Number.isFinite(o.value) || o.value <= 0)) {
      setErro('Todos os valores precisam ser números maiores que zero.')
      return
    }
    setSaving(true)
    try {
      const body = clientId ? { clientId, overrides } : { overrides }
      const res = await adminFetch(
        clientId ? '/api/admin/campanhas/intelligence/benchmarks/client' : '/api/admin/campanhas/intelligence/benchmarks/tenant',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      )
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setErro(d.error || 'Falha ao salvar.')
        return
      }
      setOk(true)
      setTimeout(() => setOk(false), 2000)
      await load()
    } catch {
      setErro('Falha de rede ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  // Restaura a herança: apaga o override do nível atual, voltando ao nível de cima.
  async function restaurar(metricKey: string) {
    setErro(null)
    const url = clientId
      ? `/api/admin/campanhas/intelligence/benchmarks/client?clientId=${clientId}&metric_key=${metricKey}`
      : `/api/admin/campanhas/intelligence/benchmarks/tenant?metric_key=${metricKey}`
    const res = await adminFetch(url, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setErro(d.error || 'Falha ao restaurar.')
      return
    }
    await load()
  }

  const isOverridden = (p: AuditParam) =>
    clientId ? p.override_level === 'client' : p.tenant_value !== null

  return (
    <div className="rounded-2xl border border-white/8 bg-[#0d1b2e] p-6 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-white">Auditoria de resolução</h2>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Limites que sinalizam conversas resolvidas que podem ter sido encerradas sem atendimento.
          O sistema apenas sinaliza: quem confere é o administrador, na aba de auditoria do Painel do Gestor.
        </p>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Escopo</p>
        <ClientSelector
          value={clientFilter}
          onChange={setClientFilter}
          clients={clients}
          loading={clientsLoading}
          allowSegment={false}
          variant="toggle"
        />
      </div>

      {!canEdit && (
        <p className="text-xs text-amber-300">
          Somente leitura. Apenas o administrador da empresa altera estes parâmetros.
        </p>
      )}

      {loading ? (
        <div className="h-24 rounded-lg bg-white/5 animate-pulse" />
      ) : (
        <div className="space-y-4">
          {AUDIT_KEYS.map((k) => {
            const p = params.find((x) => x.metric_key === k)
            if (!p) return null
            const meta = LABELS[k]
            const overridden = isOverridden(p)
            return (
              <div key={k}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-200">{meta.label}</label>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    p.override_level === 'segment'
                      ? 'bg-slate-500/15 text-slate-300'
                      : 'bg-[#c5a028]/15 text-[#e9c766]'
                  }`}>
                    {LEVEL_TEXT[p.override_level]}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    step="1"
                    disabled={!canEdit || saving}
                    value={drafts[k] ?? ''}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [k]: e.target.value }))}
                    className="w-32 h-9 px-3 rounded-lg bg-[#0a192f] border border-white/10 text-sm text-white outline-none focus:border-[#2563eb] disabled:opacity-50"
                  />
                  {canEdit && overridden && (
                    <button
                      onClick={() => restaurar(k)}
                      className="h-9 px-3 rounded-lg text-xs text-slate-300 hover:bg-white/5"
                    >
                      Restaurar herança
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{meta.help}</p>
              </div>
            )
          })}
        </div>
      )}

      {erro && <p className="text-xs text-red-400">{erro}</p>}

      <div className="flex justify-end gap-2 pt-2">
        {onClose && (
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg text-sm text-slate-300 hover:bg-white/5"
          >
            Fechar
          </button>
        )}
        {canEdit && (
          <button
            onClick={salvar}
            disabled={saving || loading}
            className="h-9 px-4 rounded-lg text-sm font-semibold bg-[#c5a028] text-[#020c1b] hover:bg-[#d4af37] disabled:opacity-50"
          >
            {saving ? 'Salvando…' : ok ? 'Salvo' : 'Salvar'}
          </button>
        )}
      </div>
    </div>
  )
}

export default AuditSettingsTab
