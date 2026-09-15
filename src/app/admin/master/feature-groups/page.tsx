'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/useApi'
import {
  Squares2X2Icon, PlusIcon, TrashIcon, XMarkIcon, StarIcon,
  LinkIcon, LinkSlashIcon, PencilIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

/**
 * Master — Grupos de Funcionalidades.
 *
 * Um Grupo agrupa N funcionalidades reais (já cadastradas, cada uma com seu próprio dono de
 * permissão/provisionamento) sob 1 único item clicável na sidebar vertical. Ao entrar em
 * qualquer aba do grupo, elas aparecem juntas numa barra horizontal acima da página
 * (<HorizontalTabsBar/>), pra navegação cruzada sem voltar pra sidebar.
 *
 * Grupo em si não tem permissão própria — visibilidade é 100% derivada de "o usuário enxerga
 * pelo menos 1 aba deste grupo" (mesmo mecanismo de sempre, por feature). Aqui o Master só
 * decide COMO agrupar o que já existe, nunca QUEM pode ver o quê.
 */

interface Tab {
  id: number
  name: string
  url: string
  sort_order_in_group: number
  is_default_tab: boolean
}

interface Group {
  id: number
  name: string
  icon: string | null
  category_id: number
  category_name?: string
  sort_order: number
  is_active: boolean
  tabs: Tab[]
}

interface Category {
  id: number
  name: string
}

interface FeatureOption {
  id: number
  name: string
  url: string
  category_id: number | null
  group_id: number | null
  sort_order_in_group: number
  is_default_tab: boolean
}

export default function FeatureGroupsPage() {
  const { get, post, put, patch, delete: del } = useApi()

  const [groups, setGroups] = useState<Group[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)

  const loadGroups = useCallback(async () => {
    try {
      const res = await get('/api/admin/master/feature-groups')
      if (res.ok) {
        const data = await res.json()
        setGroups(data.groups || [])
      }
    } catch {
      setError('Erro ao carregar grupos')
    }
  }, [get])

  const loadCategories = useCallback(async () => {
    try {
      const res = await get('/api/admin/categorias')
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      }
    } catch {
      /* fallback silencioso — a tela ainda funciona, só sem opção de categoria pronta */
    }
  }, [get])

  useEffect(() => {
    (async () => {
      setLoading(true)
      await Promise.all([loadGroups(), loadCategories()])
      setLoading(false)
    })()
  }, [loadGroups, loadCategories])

  const handleDeleteGroup = async (group: Group) => {
    if (!confirm(`Excluir o grupo "${group.name}"? As ${group.tabs.length} funcionalidade(s) vinculada(s) voltam a aparecer soltas na sidebar (não são excluídas).`)) return
    const res = await del(`/api/admin/master/feature-groups/${group.id}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'Erro ao excluir grupo')
      return
    }
    loadGroups()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Squares2X2Icon className="h-7 w-7 text-blue-600" />
            Grupos de Funcionalidades
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Agrupe páginas relacionadas sob 1 item da sidebar — dentro, elas aparecem como abas
            horizontais. Permissão e provisionamento continuam por página, sem mudança.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Novo Grupo
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <Squares2X2Icon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum grupo criado ainda.</p>
          <p className="text-xs text-gray-400 mt-1">Crie um grupo e vincule funcionalidades já existentes a ele.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(group => (
            <div key={group.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl ${group.is_active ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Squares2X2Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">{group.name}</h3>
                      {!group.is_active && (
                        <span className="text-[10px] font-bold uppercase text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Inativo</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {group.category_name || 'Sem categoria'} · {group.tabs.length} aba(s)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingGroup(group)}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Editar / gerenciar abas"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir grupo"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {group.tabs.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pl-11">
                  {group.tabs.map(tab => (
                    <span
                      key={tab.id}
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                        tab.is_default_tab ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-50 text-gray-600 border border-gray-200'
                      }`}
                    >
                      {tab.is_default_tab && <StarIconSolid className="h-3 w-3" />}
                      {tab.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <GroupFormModal
          categories={categories}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); loadGroups() }}
        />
      )}

      {editingGroup && (
        <GroupDetailModal
          group={editingGroup}
          categories={categories}
          onClose={() => setEditingGroup(null)}
          onSaved={() => { loadGroups() }}
        />
      )}
    </div>
  )
}

/* ───────────────────────── Criar grupo ───────────────────────── */

function GroupFormModal({ categories, onClose, onSaved }: {
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}) {
  const { post } = useApi()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('Squares2X2Icon')
  const [categoryId, setCategoryId] = useState<string>('')
  const [sortOrder, setSortOrder] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!name.trim()) { setError('Nome é obrigatório'); return }
    if (!categoryId) { setError('Escolha em qual categoria da sidebar o grupo aparece'); return }
    setSaving(true)
    setError(null)
    const res = await post('/api/admin/master/feature-groups', {
      name: name.trim(), icon, category_id: parseInt(categoryId), sort_order: sortOrder,
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Erro ao criar grupo')
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Novo Grupo de Funcionalidades</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-5 w-5" /></button>
        </div>

        {error && <div className="mb-3 p-2.5 bg-red-50 text-red-700 text-xs rounded-lg">{error}</div>}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Nome *</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex: Campanhas de Marketing"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Categoria da sidebar *</label>
            <select
              value={categoryId} onChange={e => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Ícone</label>
              <input
                type="text" value={icon} onChange={e => setIcon(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Ordem</label>
              <input
                type="number" value={sortOrder} onChange={e => setSortOrder(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button
            onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Criando...' : 'Criar Grupo'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── Editar grupo + gerenciar abas ───────────────────────── */

function GroupDetailModal({ group, categories, onClose, onSaved }: {
  group: Group
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}) {
  const { get, put, patch } = useApi()
  const [name, setName] = useState(group.name)
  const [icon, setIcon] = useState(group.icon || 'Squares2X2Icon')
  const [categoryId, setCategoryId] = useState(String(group.category_id))
  const [sortOrder, setSortOrder] = useState(group.sort_order)
  const [isActive, setIsActive] = useState(group.is_active)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyFeatureId, setBusyFeatureId] = useState<number | null>(null)

  const [allFeatures, setAllFeatures] = useState<FeatureOption[]>([])
  const [loadingFeatures, setLoadingFeatures] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'linked' | 'available'>('linked')

  const loadFeatures = useCallback(async () => {
    setLoadingFeatures(true)
    const res = await get(`/api/admin/master/feature-groups/${group.id}`)
    if (res.ok) {
      const data = await res.json()
      setAllFeatures(data.features || [])
    }
    setLoadingFeatures(false)
  }, [get, group.id])

  useEffect(() => { loadFeatures() }, [loadFeatures])

  const handleSaveGroup = async () => {
    if (!name.trim()) { setError('Nome é obrigatório'); return }
    setSaving(true)
    setError(null)
    const res = await put(`/api/admin/master/feature-groups/${group.id}`, {
      name: name.trim(), icon, category_id: parseInt(categoryId), sort_order: sortOrder, is_active: isActive,
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Erro ao salvar')
      return
    }
    onSaved()
  }

  const callTabs = async (body: any) => {
    setBusyFeatureId(body.featureId)
    const res = await patch(`/api/admin/master/feature-groups/${group.id}/tabs`, body)
    setBusyFeatureId(null)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'Erro ao atualizar aba')
      return
    }
    await loadFeatures()
    onSaved()
  }

  const linked = allFeatures.filter(f => f.group_id === group.id).sort((a, b) => a.sort_order_in_group - b.sort_order_in_group)
  const available = allFeatures.filter(f => f.group_id !== group.id)
  const displayed = (tab === 'linked' ? linked : available).filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) || f.url.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-gray-900">Editar Grupo: {group.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-5 w-5" /></button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-5">
          {error && <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg">{error}</div>}

          {/* Dados básicos do grupo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-600 mb-1">Nome</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Categoria</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Ícone</label>
              <input value={icon} onChange={e => setIcon(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Ordem</label>
              <input type="number" value={sortOrder} onChange={e => setSortOrder(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
                Ativo
              </label>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleSaveGroup} disabled={saving} className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar Dados do Grupo'}
            </button>
          </div>

          {/* Gerenciar abas */}
          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-bold text-gray-800 mb-2">Abas deste grupo</h4>
            <p className="text-xs text-gray-400 mb-3">
              A aba marcada com <StarIconSolid className="h-3 w-3 inline text-amber-500" /> é pra onde o clique na
              sidebar leva. Vincular uma funcionalidade aqui não muda permissão nem provisionamento dela.
            </p>

            <div className="flex border-b border-gray-100 mb-3">
              <button
                onClick={() => setTab('linked')}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-wide ${tab === 'linked' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}
              >
                Vinculadas ({linked.length})
              </button>
              <button
                onClick={() => setTab('available')}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-wide ${tab === 'available' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}
              >
                Disponíveis ({available.length})
              </button>
            </div>

            <input
              type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 mb-3 border border-gray-200 rounded-lg text-xs"
            />

            {loadingFeatures ? (
              <div className="text-center py-6 text-gray-400 text-xs">Carregando...</div>
            ) : displayed.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs italic">Nenhuma funcionalidade encontrada.</div>
            ) : (
              <div className="space-y-2">
                {displayed.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-2.5 bg-gray-50/60 rounded-xl">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-700 truncate">{f.name}</p>
                      <p className="text-[10px] font-mono text-gray-400 truncate">{f.url}</p>
                      {f.group_id && f.group_id !== group.id && (
                        <p className="text-[10px] text-amber-600">já está em outro grupo — vincular aqui move pra este</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {busyFeatureId === f.id ? (
                        <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                      ) : tab === 'linked' ? (
                        <>
                          <button
                            onClick={() => callTabs({ featureId: f.id, action: 'set_default' })}
                            className={`p-1.5 rounded-lg transition-colors ${f.is_default_tab ? 'text-amber-500' : 'text-gray-300 hover:text-amber-500'}`}
                            title={f.is_default_tab ? 'Aba padrão' : 'Marcar como aba padrão'}
                          >
                            {f.is_default_tab ? <StarIconSolid className="h-4 w-4" /> : <StarIcon className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => callTabs({ featureId: f.id, action: 'unlink' })}
                            className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg"
                            title="Desvincular"
                          >
                            <LinkSlashIcon className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => callTabs({ featureId: f.id, action: 'link', sortOrder: linked.length })}
                          className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
                          title="Vincular a este grupo"
                        >
                          <LinkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
