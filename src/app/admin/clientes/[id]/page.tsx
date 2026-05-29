'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeftIcon, PencilIcon, TrashIcon,
  MegaphoneIcon, UserIcon,
} from '@heroicons/react/24/outline'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { UpdateGuard, DeleteGuard } from '@/components/admin/PermissionGuard'
import ClientCampaignSettings from '@/components/admin/clientes/ClientCampaignSettings'

// ─── tipos ────────────────────────────────────────────────────────────────────
interface Cliente {
  uuid: string; nome: string; cpf: string; telefone: string; email: string
  endereco?: string; numero?: string; complemento?: string; bairro?: string
  estado_fk?: string; cidade_fk?: string; cep?: string; origem_cadastro?: string
  created_at: string; created_by?: string; updated_at: string; updated_by?: string
}

// ─── página principal ──────────────────────────────────────────────────────────
type Tab = 'dados' | 'campanha'

export default function VisualizarClientePage() {
  const { get, delete: del } = useAuthenticatedFetch()
  const router  = useRouter()
  const params  = useParams()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [tab, setTab]         = useState<Tab>('dados')

  useEffect(() => {
    if (!params.id) return
    get(`/api/admin/clientes/${params.id}`)
      .then(r => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Cliente não encontrado' : 'Erro ao carregar cliente')
        return r.json()
      })
      .then(setCliente)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [params.id])

  const handleDelete = async () => {
    if (!cliente || !confirm(`Excluir o cliente "${cliente.nome}"?`)) return
    try {
      const r = await del(`/api/admin/clientes/${cliente.uuid}`)
      if (!r.ok) throw new Error('Erro ao excluir')
      router.push('/admin/clientes')
    } catch { alert('Erro ao excluir cliente') }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
    </div>
  )
  if (error || !cliente) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-center">
      <div>
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Erro</h1>
        <p className="text-gray-600 mb-6">{error || 'Cliente não encontrado'}</p>
        <button onClick={() => router.push('/admin/clientes')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <ArrowLeftIcon className="h-4 w-4 mr-2" /> Voltar
        </button>
      </div>
    </div>
  )

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'dados',    label: 'Dados do Cliente',    icon: UserIcon },
    { id: 'campanha', label: 'Configurações Meta',  icon: MegaphoneIcon },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/admin/clientes')}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-gray-900">{cliente.nome}</h1>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{cliente.uuid}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <UpdateGuard resource="clientes">
                <button onClick={() => router.push(`/admin/clientes/${cliente.uuid}/editar`)}
                  className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors">
                  <PencilIcon className="h-4 w-4 mr-2" /> Editar
                </button>
              </UpdateGuard>
              <DeleteGuard resource="clientes">
                <button onClick={handleDelete}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors">
                  <TrashIcon className="h-4 w-4 mr-2" /> Excluir
                </button>
              </DeleteGuard>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1 shadow-sm mb-6">
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all
                  ${active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}>
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Conteúdo das tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

          {/* ── ABA: DADOS ── */}
          {tab === 'dados' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Informações Pessoais */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-gray-900 border-b border-gray-100 pb-2 uppercase tracking-wide">
                  Informações Pessoais
                </h3>
                {[
                  ['Nome Completo',    cliente.nome],
                  ['CPF',             cliente.cpf],
                  ['Telefone',        cliente.telefone],
                  ['E-mail',          cliente.email],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-gray-900">{val}</p>
                  </div>
                ))}
              </div>

              {/* Endereço */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-gray-900 border-b border-gray-100 pb-2 uppercase tracking-wide">
                  Endereço
                </h3>
                {[
                  ['Endereço',   cliente.endereco],
                  ['Número',     cliente.numero],
                  ['Complemento',cliente.complemento],
                  ['Bairro',     cliente.bairro],
                  ['Estado',     cliente.estado_fk],
                  ['Cidade',     cliente.cidade_fk],
                  ['CEP',        cliente.cep],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-gray-900">{val || '—'}</p>
                  </div>
                ))}
              </div>

              {/* Sistema */}
              <div className="md:col-span-2 pt-4 border-t border-gray-100 space-y-4">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Sistema</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Origem</p>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold
                      ${cliente.origem_cadastro === 'Publico' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {cliente.origem_cadastro === 'Publico' ? '🌐 Site Público' : '🖥️ Plataforma'}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Criado em</p>
                    <p className="text-sm font-medium text-gray-900">{new Date(cliente.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Criado por</p>
                    <p className="text-sm font-medium text-gray-900">{cliente.created_by || 'Sistema'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Atualizado em</p>
                    <p className="text-sm font-medium text-gray-900">{new Date(cliente.updated_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ABA: CAMPANHA ── */}
          {tab === 'campanha' && <ClientCampaignSettings clientId={cliente.uuid} />}
        </div>
      </div>
    </div>
  )
}
