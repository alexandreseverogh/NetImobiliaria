'use client'

import React, { useState, useEffect } from 'react'
import {
  ListBulletIcon, PlusIcon, SwatchIcon, TrashIcon,
  PencilSquareIcon, BuildingOffice2Icon, UserIcon, MagnifyingGlassIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { useTheme } from '@/hooks/useTheme'
import { adminFetch } from '@/lib/auth/adminFetch'
import DynamicIcon from '@/components/common/DynamicIcon'
import { HybridIconSelector } from '@/components/admin/SidebarManagement/HybridIconSelector'

interface TipoAtividade {
  id: number; nome: string; icone: string | null; cor: string;
  ordem: number; ativo: boolean; client_id: string | null; is_entrada: boolean;
}
interface ClienteOpt { uuid: string; nome: string }

export default function AtividadesConfigPage() {
  const t = useTheme()
  const [tipos, setTipos] = useState<TipoAtividade[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentEdit, setCurrentEdit] = useState<Partial<TipoAtividade> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [showIconSelector, setShowIconSelector] = useState(false)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  // Escopo: catálogo padrão da empresa (client_id NULL) ou de um cliente específico
  const [scope, setScope] = useState<'tenant' | 'client'>('tenant')
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<ClienteOpt[]>([])
  const [selectedClient, setSelectedClient] = useState<ClienteOpt | null>(null)
  const [clientListLoading, setClientListLoading] = useState(false)

  useEffect(() => { fetchTipos() }, [scope, selectedClient])

  // Dropdown sempre populado em ordem alfabética com os clientes do tenant logado
  // (a própria API já ordena por nome ASC); recarrega ao voltar pro escopo "cliente"
  // sem nenhum selecionado (inclusive depois de "Trocar").
  useEffect(() => {
    if (scope === 'client' && !selectedClient) loadAllClients()
  }, [scope, selectedClient])

  const loadAllClients = async () => {
    setClientListLoading(true)
    try {
      const res = await adminFetch('/api/crm/clientes/search')
      const data = await res.json()
      setClientResults(data.clientes || [])
    } finally { setClientListLoading(false) }
  }

  const handleClientSearch = async () => {
    if (clientSearch.trim().length < 3) return
    setClientListLoading(true)
    try {
      const res = await adminFetch(`/api/crm/clientes/search?q=${encodeURIComponent(clientSearch.trim())}`)
      const data = await res.json()
      setClientResults(data.clientes || [])
    } finally { setClientListLoading(false) }
  }

  const clearClientSearch = () => {
    setClientSearch('')
    loadAllClients()
  }

  const fetchTipos = async () => {
    if (scope === 'client' && !selectedClient) { setTipos([]); setLoading(false); return }
    setLoading(true)
    try {
      const url = scope === 'client'
        ? `/api/crm/atividades/tipos?client_id=${selectedClient!.uuid}`
        : `/api/crm/atividades/tipos`
      const res = await adminFetch(url)
      const data = await res.json()
      if (data.success) {
        setTipos(scope === 'client' ? data.tipos.filter((tp: TipoAtividade) => tp.client_id === selectedClient!.uuid) : data.tipos)
      }
    } finally { setLoading(false) }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const isEdit = !!currentEdit?.id
      const payload = {
        ...currentEdit,
        client_id: scope === 'client' ? selectedClient?.uuid : null,
      }
      const res = await adminFetch('/api/crm/atividades/tipos', { method: 'POST', body: JSON.stringify(payload) })
      const data = await res.json()
      if (data.success) {
        await fetchTipos()
        setIsModalOpen(false)
        setCurrentEdit(null)
        setToast(isEdit ? 'Atividade atualizada com sucesso.' : 'Atividade criada com sucesso.')
      } else {
        setError(data.error)
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar atividade.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Desativar esta atividade? (fica reversível, os registros já criados com ela continuam intactos)')) return
    const res = await adminFetch(`/api/crm/atividades/tipos?id=${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) { fetchTipos(); setToast('Atividade desativada com sucesso.') }
    else alert(data.error)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold tracking-tight italic flex items-center ${t.textPrimary}`}>
            CATÁLOGO <span className="text-blue-500 ml-2">DE ATIVIDADES</span>
          </h2>
          <p className={`mt-1 text-sm ${t.textSecondary}`}>Atividades padronizadas usadas ao registrar o histórico de qualquer lead do Kanban.</p>
        </div>
        <button
          onClick={() => { setCurrentEdit({ nome: '', icone: '', cor: '#3B82F6', ordem: tipos.length + 1 }); setShowIconSelector(false); setIsModalOpen(true) }}
          disabled={scope === 'client' && !selectedClient}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-all shadow-lg">
          <PlusIcon className="h-4 w-4 mr-2" />Nova Atividade
        </button>
      </div>

      {toast && (
        <div className="fixed top-6 right-6 z-[200] flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircleIcon className="h-5 w-5" />
          {toast}
        </div>
      )}

      {/* Seletor de escopo */}
      <div className={`flex flex-wrap items-center gap-3 p-4 rounded-2xl border ${t.borderSub} ${t.cardBg}`}>
        <button onClick={() => { setScope('tenant'); setSelectedClient(null) }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${scope === 'tenant' ? 'bg-blue-600 text-white shadow-lg' : `${t.textMuted} hover:text-blue-500`}`}>
          <BuildingOffice2Icon className="h-4 w-4" /> Padrão da Empresa
        </button>
        <button onClick={() => setScope('client')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${scope === 'client' ? 'bg-blue-600 text-white shadow-lg' : `${t.textMuted} hover:text-blue-500`}`}>
          <UserIcon className="h-4 w-4" /> Cliente Específico
        </button>

        {scope === 'client' && (
          <div className="flex-1 min-w-[280px]">
            {selectedClient ? (
              <div className="flex items-center gap-2">
                <div className={`flex-1 rounded-xl py-2 px-4 text-sm font-bold ${t.inputBg}`}>{selectedClient.nome}</div>
                <button onClick={() => setSelectedClient(null)} className="text-xs font-bold text-blue-500 hover:text-blue-400 whitespace-nowrap">
                  Trocar
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleClientSearch() }}
                    placeholder="Buscar cliente (mín. 3 letras)..."
                    className={`flex-1 rounded-xl py-2 px-4 text-sm ${t.inputBg}`}
                  />
                  <button
                    onClick={handleClientSearch}
                    disabled={clientSearch.trim().length < 3}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all whitespace-nowrap">
                    <MagnifyingGlassIcon className="h-4 w-4" /> Buscar
                  </button>
                  {clientSearch && (
                    <button onClick={clearClientSearch} className={`text-xs font-bold ${t.textMuted} hover:text-red-500 whitespace-nowrap`}>
                      Limpar
                    </button>
                  )}
                </div>
                <div className={`rounded-xl border ${t.borderSub} ${t.modalBg} max-h-56 overflow-y-auto`}>
                  {clientListLoading ? (
                    <div className={`px-4 py-3 text-xs ${t.textMuted}`}>Carregando clientes...</div>
                  ) : clientResults.length === 0 ? (
                    <div className={`px-4 py-3 text-xs ${t.textMuted}`}>Nenhum cliente encontrado.</div>
                  ) : (
                    clientResults.map(c => (
                      <button key={c.uuid} onClick={() => { setSelectedClient(c); setClientSearch('') }}
                        className={`block w-full text-left px-4 py-2.5 text-sm ${t.hoverBg} ${t.textPrimary}`}>
                        {c.nome}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`${t.cardBg} rounded-2xl overflow-hidden`}>
        <table className="min-w-full">
          <thead className={`${t.isDark ? 'bg-black/20' : 'bg-gray-50'}`}>
            <tr>
              {['Ordem', 'Ícone', 'Nome', 'Cor', 'Ações'].map((h, i) => (
                <th key={h} className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${t.textMuted} ${i === 4 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${t.borderSub}`}>
            {loading ? (
              <tr><td colSpan={5} className={`p-8 text-center ${t.textMuted}`}>Carregando catálogo...</td></tr>
            ) : scope === 'client' && !selectedClient ? (
              <tr><td colSpan={5} className={`p-8 text-center ${t.textMuted}`}>Selecione um cliente para ver/gerenciar o catálogo dele.</td></tr>
            ) : tipos.length === 0 ? (
              <tr><td colSpan={5} className={`p-8 text-center ${t.textMuted}`}>Nenhuma atividade cadastrada neste escopo ainda.</td></tr>
            ) : tipos.map((tp) => (
              <tr key={tp.id} className={`group transition-colors ${t.hoverBg}`}>
                <td className="px-6 py-4 text-sm font-bold text-blue-500">{tp.ordem}º</td>
                <td className="px-6 py-4">
                  <div className={`inline-flex items-center justify-center h-8 w-8 rounded-lg ${t.isDark ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                    <DynamicIcon iconName={tp.icone ?? ''} className={`h-4 w-4 ${t.textSecondary}`} />
                  </div>
                </td>
                <td className={`px-6 py-4 text-sm font-medium ${t.textPrimary}`}>
                  <div className="flex items-center gap-2">
                    {tp.nome}
                    {tp.is_entrada && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-sky-500/15 text-sky-500 border border-sky-500/30"
                        title="Registrar esta atividade indica que o cliente agiu — o lead volta a aguardar resposta nossa.">
                        Ação do cliente
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <div className={`h-5 w-5 rounded-full border ${t.border}`} style={{ backgroundColor: tp.cor }} />
                    <span className={`text-xs font-mono uppercase ${t.textMuted}`}>{tp.cor}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-1">
                    <button onClick={() => { setCurrentEdit(tp); setShowIconSelector(false); setIsModalOpen(true) }}
                      className={`p-2 ${t.textMuted} hover:text-blue-500 ${t.cardBg} rounded-lg transition-all`}>
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(tp.id)}
                      className={`p-2 ${t.textMuted} hover:text-red-500 ${t.cardBg} rounded-lg transition-all`}>
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && currentEdit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-2xl ${t.modalBg} rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200`}>
            <div className="flex items-center justify-between mb-8">
              <h3 className={`text-xl font-bold flex items-center ${t.textPrimary}`}>
                <SwatchIcon className="mr-2 h-6 w-6 text-blue-500" />
                {currentEdit.id ? 'Editar Atividade' : 'Nova Atividade'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); setError(null) }} className={`${t.textMuted} hover:text-blue-500 transition-colors`}>Fechar</button>
            </div>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-widest pl-1 ${t.textMuted}`}>Nome</label>
                <input type="text" required value={currentEdit.nome || ''}
                  onChange={e => setCurrentEdit({ ...currentEdit, nome: e.target.value })}
                  className={`w-full rounded-xl py-3 px-4 text-sm font-bold focus:outline-none focus:border-blue-500/50 ${t.inputBg}`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={`text-xs font-bold uppercase tracking-widest pl-1 ${t.textMuted}`}>Ordem</label>
                  <input type="number" required value={currentEdit.ordem ?? 0}
                    onChange={e => setCurrentEdit({ ...currentEdit, ordem: parseInt(e.target.value) })}
                    className={`w-full rounded-xl py-2 px-4 text-sm focus:outline-none ${t.inputBg}`} />
                </div>
                <div className="space-y-2">
                  <label className={`text-xs font-bold uppercase tracking-widest pl-1 ${t.textMuted}`}>Ícone</label>
                  <div className={`flex items-center gap-2 rounded-xl px-3 ${t.inputBg}`}>
                    <DynamicIcon iconName={currentEdit.icone ?? ''} className={`h-4 w-4 flex-shrink-0 ${t.textMuted}`} />
                    <input type="text" readOnly value={currentEdit.icone || ''}
                      onClick={() => setShowIconSelector(v => !v)}
                      placeholder="Clique para escolher"
                      className="flex-1 py-2 bg-transparent text-sm cursor-pointer focus:outline-none" />
                  </div>
                </div>
              </div>

              {showIconSelector && (
                <div className="p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 max-h-[34rem] overflow-y-auto custom-scrollbar shadow-inner">
                  <HybridIconSelector
                    selected={currentEdit.icone || ''}
                    onSelect={icone => { setCurrentEdit({ ...currentEdit, icone }); setShowIconSelector(false) }}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-widest pl-1 ${t.textMuted}`}>Cor</label>
                <div className="flex items-center space-x-2">
                  <input type="color" value={currentEdit.cor || '#3B82F6'}
                    onChange={e => setCurrentEdit({ ...currentEdit, cor: e.target.value })}
                    className="h-9 w-9 bg-transparent border-none p-0 cursor-pointer rounded" />
                  <input type="text" value={currentEdit.cor || '#3B82F6'}
                    onChange={e => setCurrentEdit({ ...currentEdit, cor: e.target.value })}
                    className={`flex-1 rounded-xl py-2 px-4 text-xs uppercase ${t.inputBg}`} />
                </div>
              </div>
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-widest pl-1 ${t.textMuted}`}>Direção</label>
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input type="checkbox" checked={currentEdit.is_entrada === true}
                    onChange={e => setCurrentEdit({ ...currentEdit, is_entrada: e.target.checked })}
                    className="h-4 w-4 mt-0.5 rounded accent-sky-500" />
                  <span>
                    <span className="text-sm font-bold text-sky-500">Registra uma ação do cliente</span>
                    <span className={`block text-[11px] mt-0.5 ${t.textMuted}`}>
                      Marque quando esta atividade significar que o CLIENTE se manifestou (ex.:
                      &ldquo;Retorno do cliente&rdquo;, &ldquo;Objeção registrada&rdquo;) — o lead volta a
                      aguardar resposta nossa. Deixe desmarcado para atividades que descrevem
                      uma ação SUA (ligação feita, proposta enviada), que é o padrão.
                    </span>
                  </span>
                </label>
              </div>
              {error && <div className="text-xs font-bold text-red-500">{error}</div>}
              <button type="submit" disabled={saving}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-xl uppercase tracking-widest">
                {saving ? 'Salvando...' : 'Salvar Atividade'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
