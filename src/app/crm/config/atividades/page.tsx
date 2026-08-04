'use client'

import React, { useState, useEffect } from 'react'
import {
  ListBulletIcon, PlusIcon, SwatchIcon, TrashIcon,
  PencilSquareIcon, BuildingOffice2Icon, UserIcon,
} from '@heroicons/react/24/outline'
import { useTheme } from '@/hooks/useTheme'
import { adminFetch } from '@/lib/auth/adminFetch'

interface TipoAtividade {
  id: number; nome: string; icone: string | null; cor: string;
  ordem: number; ativo: boolean; client_id: string | null;
}
interface ClienteOpt { uuid: string; nome: string }

export default function AtividadesConfigPage() {
  const t = useTheme()
  const [tipos, setTipos] = useState<TipoAtividade[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentEdit, setCurrentEdit] = useState<Partial<TipoAtividade> | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Escopo: catálogo padrão da empresa (client_id NULL) ou de um cliente específico
  const [scope, setScope] = useState<'tenant' | 'client'>('tenant')
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<ClienteOpt[]>([])
  const [selectedClient, setSelectedClient] = useState<ClienteOpt | null>(null)

  useEffect(() => { fetchTipos() }, [scope, selectedClient])

  useEffect(() => {
    if (clientSearch.length >= 3) {
      const delay = setTimeout(() => {
        adminFetch(`/api/crm/clientes/search?q=${clientSearch}`)
          .then(res => res.json())
          .then(data => setClientResults(data.clientes || []))
      }, 300)
      return () => clearTimeout(delay)
    } else {
      setClientResults([])
    }
  }, [clientSearch])

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
    const payload = {
      ...currentEdit,
      client_id: scope === 'client' ? selectedClient?.uuid : null,
    }
    const res = await adminFetch('/api/crm/atividades/tipos', { method: 'POST', body: JSON.stringify(payload) })
    const data = await res.json()
    if (data.success) { fetchTipos(); setIsModalOpen(false); setCurrentEdit(null) }
    else setError(data.error)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Desativar este tipo de atividade? (fica reversível, os registros já criados com ele continuam intactos)')) return
    const res = await adminFetch(`/api/crm/atividades/tipos?id=${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) fetchTipos()
    else alert(data.error)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold tracking-tight italic flex items-center ${t.textPrimary}`}>
            CATÁLOGO <span className="text-blue-500 ml-2">DE ATIVIDADES</span>
          </h2>
          <p className={`mt-1 text-sm ${t.textSecondary}`}>Tipos padronizados usados ao registrar uma atividade em qualquer lead do Kanban.</p>
        </div>
        <button
          onClick={() => { setCurrentEdit({ nome: '', icone: '', cor: '#3B82F6', ordem: tipos.length + 1 }); setIsModalOpen(true) }}
          disabled={scope === 'client' && !selectedClient}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-all shadow-lg">
          <PlusIcon className="h-4 w-4 mr-2" />Novo Tipo
        </button>
      </div>

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
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              value={selectedClient ? selectedClient.nome : clientSearch}
              onChange={e => { setSelectedClient(null); setClientSearch(e.target.value) }}
              placeholder="Buscar cliente por nome (mín. 3 letras)..."
              className={`w-full rounded-xl py-2 px-4 text-sm ${t.inputBg}`}
            />
            {!selectedClient && clientResults.length > 0 && (
              <div className={`absolute z-10 mt-1 w-full rounded-xl border ${t.borderSub} ${t.modalBg} shadow-xl max-h-56 overflow-y-auto`}>
                {clientResults.map(c => (
                  <button key={c.uuid} onClick={() => { setSelectedClient(c); setClientSearch('') }}
                    className={`block w-full text-left px-4 py-2.5 text-sm ${t.hoverBg} ${t.textPrimary}`}>
                    {c.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`${t.cardBg} rounded-2xl overflow-hidden`}>
        <table className="min-w-full">
          <thead className={`${t.isDark ? 'bg-black/20' : 'bg-gray-50'}`}>
            <tr>
              {['Ordem', 'Nome', 'Cor', 'Ações'].map((h, i) => (
                <th key={h} className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${t.textMuted} ${i === 3 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${t.borderSub}`}>
            {loading ? (
              <tr><td colSpan={4} className={`p-8 text-center ${t.textMuted}`}>Carregando catálogo...</td></tr>
            ) : scope === 'client' && !selectedClient ? (
              <tr><td colSpan={4} className={`p-8 text-center ${t.textMuted}`}>Selecione um cliente para ver/gerenciar o catálogo dele.</td></tr>
            ) : tipos.length === 0 ? (
              <tr><td colSpan={4} className={`p-8 text-center ${t.textMuted}`}>Nenhum tipo cadastrado neste escopo ainda.</td></tr>
            ) : tipos.map((tp) => (
              <tr key={tp.id} className={`group transition-colors ${t.hoverBg}`}>
                <td className="px-6 py-4 text-sm font-bold text-blue-500">{tp.ordem}º</td>
                <td className={`px-6 py-4 text-sm font-medium ${t.textPrimary}`}>{tp.nome}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <div className={`h-5 w-5 rounded-full border ${t.border}`} style={{ backgroundColor: tp.cor }} />
                    <span className={`text-xs font-mono uppercase ${t.textMuted}`}>{tp.cor}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-1">
                    <button onClick={() => { setCurrentEdit(tp); setIsModalOpen(true) }}
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
          <div className={`w-full max-w-md ${t.modalBg} rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200`}>
            <div className="flex items-center justify-between mb-8">
              <h3 className={`text-xl font-bold flex items-center ${t.textPrimary}`}>
                <SwatchIcon className="mr-2 h-6 w-6 text-blue-500" />
                {currentEdit.id ? 'Editar Tipo' : 'Novo Tipo'}
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
                  <label className={`text-xs font-bold uppercase tracking-widest pl-1 ${t.textMuted}`}>Ícone (opcional)</label>
                  <input type="text" placeholder="Ex: PhoneIcon" value={currentEdit.icone || ''}
                    onChange={e => setCurrentEdit({ ...currentEdit, icone: e.target.value })}
                    className={`w-full rounded-xl py-2 px-4 text-sm focus:outline-none ${t.inputBg}`} />
                </div>
              </div>
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
              {error && <div className="text-xs font-bold text-red-500">{error}</div>}
              <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-xl uppercase tracking-widest">
                Salvar Tipo
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
