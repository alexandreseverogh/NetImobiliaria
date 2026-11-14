'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { adminFetch } from '@/lib/auth/adminFetch'
import { useAuth } from '@/hooks/useAuth'

/**
 * Estado e ações da FICHA do lead — ÚNICA fonte de verdade, usada pela página do Kanban e pela
 * página de Leads (antes cada uma tinha a sua cópia, que divergia). A interface fica em
 * LeadFichaModal.tsx; quem renderiza a ficha só chama useLeadFicha() e passa o retorno pra lá.
 */

export interface FichaColuna {
  id: number
  nome: string
  titulo_exibicao: string
  is_ganho?: boolean
  is_perda?: boolean
}

/** Campos que a ficha lê de um lead. Qualquer página pode passar um tipo mais largo. */
export interface FichaLead {
  lead_uuid: string
  nome: string
  email?: string | null
  telefone?: string | null
  coluna_nome: string
  coluna_titulo?: string | null
  client_id?: string | null
  valor_venda?: number | null
  valor_venda_estimado?: number | null
  raw_json?: Record<string, any> | null
  mensagem_original?: string | null
  enriquecimento_cache?: any
  deleted_at?: string | null
  contato_avatar_url?: string | null
  tag_sonho?: string | null
  resumo_ia?: string | null
  score_prontidao: number | null
  score_fit?: number | null
}

interface Options<L extends FichaLead> {
  /** Colunas reais do Kanban do tenant, na ordem do board. */
  colunas: FichaColuna[]
  /** A página atualiza o lead na própria lista (board ou tabela) com este patch. */
  onPatchLead: (leadUuid: string, patch: Partial<L>) => void
  /** A página recarrega a lista depois de excluir ou restaurar um lead. */
  onReload: () => void
}

export function useLeadFicha<L extends FichaLead>({ colunas, onPatchLead, onReload }: Options<L>) {
  const { user } = useAuth()

  const [selectedLead, setSelectedLead] = useState<L | null>(null)
  const [tenantConfig, setTenantConfig] = useState<any>(null)
  const [ativoFormSchema, setAtivoFormSchema] = useState<{ name: string; type: string; label: string }[]>([])
  const [movingLead, setMovingLead] = useState(false)
  const [deletingLead, setDeletingLead] = useState(false)
  const [isAgendarOpen, setIsAgendarOpen] = useState(false)
  const [agendamentosVersion, setAgendamentosVersion] = useState(0)
  const [atividadeAction, setAtividadeAction] = useState<{ id: string; action: 'edit' | 'delete'; nonce: number } | null>(null)
  const [novaAtividadeNonce, setNovaAtividadeNonce] = useState(0)
  const [activityPrefill, setActivityPrefill] = useState<{ text: string; nonce: number } | undefined>(undefined)
  // Mover pra uma etapa de Ganho pede o valor REAL da venda antes de confirmar.
  const [pendingGanhoMove, setPendingGanhoMove] = useState<{ lead: L; targetCol: FichaColuna } | null>(null)
  const [valorVendaInput, setValorVendaInput] = useState('')
  const [fichaValorEstimadoInput, setFichaValorEstimadoInput] = useState('')
  const [savingValorEstimado, setSavingValorEstimado] = useState(false)
  const [fichaRawJsonEdits, setFichaRawJsonEdits] = useState<Record<string, string>>({})
  const [fichaMensagemEdit, setFichaMensagemEdit] = useState('')
  const [savingInfoLead, setSavingInfoLead] = useState(false)

  const fetchTenantConfig = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin-auth-token') : null
      const tenantId = user?.currentTenant?.id
      const res = await fetch(`/api/crm/config/tenant?tenantId=${tenantId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      // `tenantConfig !== null` é o sinal de "já sabemos a config" — nunca deixa preso em null.
      setTenantConfig(data.success ? data.config : {})
    } catch {
      setTenantConfig({})
    }
  }, [user?.currentTenant?.id])

  const fetchAtivoFormSchema = useCallback(async () => {
    try {
      const res = await adminFetch('/api/crm/ativo/config')
      const data = await res.json()
      if (data.success) setAtivoFormSchema(data.formSchema || [])
    } catch (err) {
      console.error('❌ [CRM] Erro ao carregar schema do Perfil de Interesse:', err)
    }
  }, [])

  useEffect(() => {
    fetchTenantConfig()
    fetchAtivoFormSchema()
  }, [])

  // Coluna de Ganho/Perda decide o comportamento; nunca pelo nome da coluna.
  const getNextColumn = useCallback((currentColName: string) => {
    const idx = colunas.findIndex(c => c.nome === currentColName)
    return idx >= 0 && idx < colunas.length - 1 ? colunas[idx + 1] : null
  }, [colunas])
  const getPrevColumn = useCallback((currentColName: string) => {
    const idx = colunas.findIndex(c => c.nome === currentColName)
    return idx > 0 ? colunas[idx - 1] : null
  }, [colunas])

  /** Aplica um patch no lead da lista da página E no lead aberto na ficha, se for o mesmo. */
  const patchLead = (leadUuid: string, patch: Partial<L>) => {
    onPatchLead(leadUuid, patch)
    setSelectedLead(prev => (prev && prev.lead_uuid === leadUuid ? { ...prev, ...patch } : prev))
  }

  /** Abre a ficha de um lead e carrega os campos editáveis a partir dele. */
  const openLead = useCallback((lead: L) => {
    setSelectedLead(lead)
    setFichaValorEstimadoInput(
      lead.valor_venda_estimado != null
        ? Number(lead.valor_venda_estimado).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : ''
    )
    const rawJsonNow: Record<string, string> = {}
    for (const field of ativoFormSchema) {
      const v = lead.raw_json?.[field.name]
      rawJsonNow[field.name] = v != null ? String(v) : ''
    }
    setFichaRawJsonEdits(rawJsonNow)
    setFichaMensagemEdit(lead.mensagem_original || '')
  }, [ativoFormSchema])

  const closeLead = () => setSelectedLead(null)

  const executeMove = async (lead: L, targetCol: FichaColuna, valorVenda?: number, valorEstimado?: number) => {
    setMovingLead(true)
    const oldColumnName = lead.coluna_nome
    const extra = {
      ...(valorVenda !== undefined ? { valor_venda: valorVenda } : {}),
      ...(valorEstimado !== undefined ? { valor_venda_estimado: valorEstimado } : {}),
    }
    patchLead(lead.lead_uuid, { coluna_nome: targetCol.nome, ...extra } as Partial<L>)
    try {
      const res = await adminFetch('/api/crm/kanban/move', {
        method: 'POST',
        body: JSON.stringify({
          lead_uuid: lead.lead_uuid,
          coluna_id: targetCol.id,
          ...(valorVenda !== undefined ? { valor_venda: valorVenda } : {}),
          ...(valorEstimado !== undefined ? { valor_venda_estimado: valorEstimado } : {}),
        }),
      })
      const data = await res.json()
      if (!data.success) patchLead(lead.lead_uuid, { coluna_nome: oldColumnName } as Partial<L>)
    } catch {
      patchLead(lead.lead_uuid, { coluna_nome: oldColumnName } as Partial<L>)
    } finally {
      setMovingLead(false)
    }
  }

  /** Ponto único de decisão de mover: Ganho pede o valor real; o resto move direto. */
  const requestMove = (lead: L, targetCol: FichaColuna, valorEstimadoOverride?: number) => {
    if (targetCol.is_ganho) {
      setValorVendaInput('')
      setPendingGanhoMove({ lead, targetCol })
      return
    }
    if (targetCol.is_perda) {
      executeMove(lead, targetCol)
      return
    }
    executeMove(lead, targetCol, undefined, valorEstimadoOverride)
  }

  const confirmGanhoMove = () => {
    if (!pendingGanhoMove) return
    const digits = valorVendaInput.replace(/\D/g, '')
    const valor = digits ? parseInt(digits, 10) / 100 : 0
    executeMove(pendingGanhoMove.lead, pendingGanhoMove.targetCol, valor)
    setPendingGanhoMove(null)
  }

  const cancelGanhoMove = () => setPendingGanhoMove(null)

  const saveFichaValorEstimado = async () => {
    if (!selectedLead) return
    const digits = fichaValorEstimadoInput.replace(/\D/g, '')
    if (!digits) return
    const valor = parseInt(digits, 10) / 100
    const currentCol = colunas.find(c => c.nome === selectedLead.coluna_nome)
    if (!currentCol) return
    setSavingValorEstimado(true)
    try {
      const res = await adminFetch('/api/crm/kanban/move', {
        method: 'POST',
        body: JSON.stringify({ lead_uuid: selectedLead.lead_uuid, coluna_id: currentCol.id, valor_venda_estimado: valor }),
      })
      const data = await res.json()
      if (data.success) patchLead(selectedLead.lead_uuid, { valor_venda_estimado: valor } as Partial<L>)
    } finally {
      setSavingValorEstimado(false)
    }
  }

  const saveFichaInfoLead = async () => {
    if (!selectedLead) return
    setSavingInfoLead(true)
    try {
      const res = await adminFetch(`/api/crm/leads/${selectedLead.lead_uuid}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'update_fields', raw_json: fichaRawJsonEdits, mensagem_original: fichaMensagemEdit }),
      })
      const data = await res.json()
      if (data.success) {
        patchLead(selectedLead.lead_uuid, {
          raw_json: data.raw_json,
          mensagem_original: data.mensagem_original,
          enriquecimento_cache: data.enriquecimento_cache,
        } as Partial<L>)
      }
    } finally {
      setSavingInfoLead(false)
    }
  }

  const fichaInfoDirty = useMemo(() => {
    if (!selectedLead) return { rawJsonDirty: false, mensagemDirty: false, valorDirty: false, any: false }
    const currentCol = colunas.find(c => c.nome === selectedLead.coluna_nome)
    const isTerminal = !!(currentCol?.is_ganho || currentCol?.is_perda)
    const valorSavedFormatted = selectedLead.valor_venda_estimado != null
      ? Number(selectedLead.valor_venda_estimado).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : ''
    const valorDirty = !isTerminal && fichaValorEstimadoInput !== valorSavedFormatted
    const rawJsonDirty = ativoFormSchema.some(f => {
      const saved = selectedLead.raw_json?.[f.name] != null ? String(selectedLead.raw_json[f.name]) : ''
      return (fichaRawJsonEdits[f.name] ?? '') !== saved
    })
    const mensagemDirty = fichaMensagemEdit !== (selectedLead.mensagem_original || '')
    return { rawJsonDirty, mensagemDirty, valorDirty, any: rawJsonDirty || mensagemDirty || valorDirty }
  }, [selectedLead, colunas, fichaValorEstimadoInput, fichaRawJsonEdits, fichaMensagemEdit, ativoFormSchema])

  const saveFichaInfoLeadCombined = async () => {
    const calls: Promise<void>[] = []
    if (fichaInfoDirty.rawJsonDirty || fichaInfoDirty.mensagemDirty) calls.push(saveFichaInfoLead())
    if (fichaInfoDirty.valorDirty) calls.push(saveFichaValorEstimado())
    await Promise.all(calls)
  }

  const moveLead = (lead: L, direction: 'forward' | 'backward' = 'forward') => {
    const targetCol = direction === 'forward' ? getNextColumn(lead.coluna_nome) : getPrevColumn(lead.coluna_nome)
    if (!targetCol) return
    const digits = fichaValorEstimadoInput.replace(/\D/g, '')
    const valorEstimadoOverride = digits ? parseInt(digits, 10) / 100 : undefined
    requestMove(lead, targetCol, valorEstimadoOverride)
  }

  /** Campo do Perfil de Interesse que o lead declarou como valor (primeiro type "currency"). */
  const referenceValueField = useMemo(
    () => ativoFormSchema.find(f => f.type === 'currency'),
    [ativoFormSchema]
  )

  const handleDeleteLead = async (lead: L) => {
    if (!confirm(
      'Excluir este lead?\n\n' +
      'Leads SEM nenhuma atividade registrada são removidos permanentemente.\n' +
      'Leads COM atividades vão pra lixeira e podem ser restaurados depois.'
    )) return
    setDeletingLead(true)
    try {
      const res = await adminFetch(`/api/crm/leads/${lead.lead_uuid}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        alert(data.message)
        closeLead()
        onReload()
      } else {
        alert(data.error || 'Erro ao excluir lead.')
      }
    } finally {
      setDeletingLead(false)
    }
  }

  const handleRestoreLead = async (lead: L) => {
    setDeletingLead(true)
    try {
      const res = await adminFetch(`/api/crm/leads/${lead.lead_uuid}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'restore' }),
      })
      const data = await res.json()
      if (data.success) {
        closeLead()
        onReload()
      } else {
        alert(data.error || 'Erro ao restaurar lead.')
      }
    } finally {
      setDeletingLead(false)
    }
  }

  const handleUseSuggestionAsActivity = (text: string) => setActivityPrefill({ text, nonce: Date.now() })
  const bumpAgendamentos = () => setAgendamentosVersion(v => v + 1)

  return {
    colunas,
    selectedLead,
    openLead,
    closeLead,
    tenantConfig,
    refreshTenantConfig: fetchTenantConfig,
    ativoFormSchema,
    referenceValueField,
    movingLead,
    deletingLead,
    isAgendarOpen,
    setIsAgendarOpen,
    agendamentosVersion,
    bumpAgendamentos,
    atividadeAction,
    setAtividadeAction,
    novaAtividadeNonce,
    setNovaAtividadeNonce,
    activityPrefill,
    handleUseSuggestionAsActivity,
    pendingGanhoMove,
    valorVendaInput,
    setValorVendaInput,
    confirmGanhoMove,
    cancelGanhoMove,
    fichaValorEstimadoInput,
    setFichaValorEstimadoInput,
    savingValorEstimado,
    fichaRawJsonEdits,
    setFichaRawJsonEdits,
    fichaMensagemEdit,
    setFichaMensagemEdit,
    savingInfoLead,
    fichaInfoDirty,
    saveFichaInfoLeadCombined,
    moveLead,
    requestMove,
    getNextColumn,
    getPrevColumn,
    handleDeleteLead,
    handleRestoreLead,
  }
}

export type LeadFichaApi<L extends FichaLead> = ReturnType<typeof useLeadFicha<L>>
