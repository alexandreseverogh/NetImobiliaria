'use client'

import React, { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/hooks/useTheme'
import { adminFetch } from '@/lib/auth/adminFetch'

/**
 * TEMAS DO CICLO DE VENDAS — cadastro por tenant (ex.: "Venda de Imóveis", "Aluguel de Imóveis").
 * O tema filtra o Kanban e a lista de leads, e é escolhido no "+ Novo Lead".
 */

interface Tema {
  id: number
  nome: string
}

export default function TemasConfigPage() {
  const t = useTheme()
  const [temas, setTemas] = useState<Tema[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [novoNome, setNovoNome] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingNome, setEditingNome] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminFetch('/api/crm/temas')
      const data = await res.json()
      if (data.success) setTemas(data.temas)
      else setError(data.error || 'Erro ao carregar temas')
    } catch {
      setError('Erro de conexão ao carregar temas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const salvar = async (id: number | null, nome: string) => {
    if (!nome.trim()) {
      setError('O nome do tema é obrigatório.')
      return false
    }
    setSaving(true)
    setError(null)
    try {
      const res = await adminFetch('/api/crm/temas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { id, nome } : { nome }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Erro ao salvar tema')
        return false
      }
      setToast(id ? 'Tema atualizado.' : 'Tema criado.')
      await load()
      return true
    } catch {
      setError('Erro de conexão ao salvar tema')
      return false
    } finally {
      setSaving(false)
    }
  }

  const criar = async () => {
    if (await salvar(null, novoNome)) setNovoNome('')
  }

  const confirmarEdicao = async () => {
    if (editingId === null) return
    if (await salvar(editingId, editingNome)) {
      setEditingId(null)
      setEditingNome('')
    }
  }

  const desativar = async (tema: Tema) => {
    if (!window.confirm(`Desativar o tema "${tema.nome}"? Os leads que já usam este tema continuam vinculados a ele, mas ele deixa de aparecer para novos cadastros e filtros.`)) return
    try {
      const res = await adminFetch(`/api/crm/temas?id=${tema.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Erro ao desativar tema')
        return
      }
      setToast('Tema desativado.')
      await load()
    } catch {
      setError('Erro de conexão ao desativar tema')
    }
  }

  const inputCls = `w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none ${t.inputBg}`

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className={`text-2xl font-black ${t.isDark ? 'text-white' : 'text-gray-900'}`}>Temas do Ciclo de Vendas</h1>
        <p className={`text-sm mt-1 ${t.isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Separe o funil por temas (ex.: Venda de Imóveis, Aluguel de Imóveis). Os temas filtram o Kanban e a lista de leads.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>
      )}
      {toast && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">{toast}</div>
      )}

      {/* Criar novo */}
      <div className={`${t.cardBg} rounded-2xl p-5 space-y-3`}>
        <label className={`text-xs font-bold uppercase tracking-wide ${t.isDark ? 'text-gray-400' : 'text-gray-500'}`}>Novo tema</label>
        <div className="flex gap-3">
          <input
            value={novoNome}
            onChange={e => setNovoNome(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') criar() }}
            placeholder="Ex.: Venda de Imóveis"
            maxLength={120}
            className={inputCls}
          />
          <button
            onClick={criar}
            disabled={saving || !novoNome.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gold-premium text-navy-dark disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <PlusIcon className="h-4 w-4" /> Adicionar
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className={`${t.cardBg} rounded-2xl overflow-hidden`}>
        {loading ? (
          <div className={`p-6 text-sm ${t.isDark ? 'text-gray-400' : 'text-gray-500'}`}>Carregando…</div>
        ) : temas.length === 0 ? (
          <div className={`p-6 text-sm ${t.isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Nenhum tema cadastrado. Sem temas, o Kanban e a lista de leads não exibem o filtro de tema.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200/10">
            {temas.map(tema => (
              <li key={tema.id} className="flex items-center gap-3 px-5 py-3">
                {editingId === tema.id ? (
                  <>
                    <input
                      value={editingNome}
                      onChange={e => setEditingNome(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') confirmarEdicao() }}
                      maxLength={120}
                      autoFocus
                      className={`${inputCls} flex-1`}
                    />
                    <button onClick={confirmarEdicao} disabled={saving} className="p-2 text-emerald-500 hover:opacity-80" title="Salvar">
                      <CheckIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => { setEditingId(null); setEditingNome('') }} className="p-2 text-gray-400 hover:opacity-80" title="Cancelar">
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className={`flex-1 text-sm font-semibold ${t.isDark ? 'text-white' : 'text-gray-900'}`}>{tema.nome}</span>
                    <button
                      onClick={() => { setEditingId(tema.id); setEditingNome(tema.nome) }}
                      className="p-2 text-gray-400 hover:text-gold-premium"
                      title="Renomear"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => desativar(tema)} className="p-2 text-gray-400 hover:text-red-500" title="Desativar">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
