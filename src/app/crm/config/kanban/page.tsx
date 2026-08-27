'use client'

import React, { useState, useEffect } from 'react'
import {
  ListBulletIcon, PlusIcon, SwatchIcon, TrashIcon,
  PencilSquareIcon, ChevronDoubleRightIcon, ChevronUpIcon, ChevronDownIcon
} from '@heroicons/react/24/outline'
import { useTheme } from '@/hooks/useTheme'

interface Coluna {
  id: number; nome: string; titulo_exibicao: string;
  ordem: number; cor: string; icone: string; sla_hours: number;
  is_ganho: boolean; is_perda: boolean; requer_valor_estimado: boolean;
}

export default function KanbanConfigPage() {
  const t = useTheme()
  const [colunas, setColunas] = useState<Coluna[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentEdit, setCurrentEdit] = useState<Partial<Coluna> | null>(null)

  useEffect(() => { fetchColunas() }, [])

  const fetchColunas = async () => {
    try {
      const res = await fetch('/api/crm/kanban/colunas')
      const data = await res.json()
      if (data.success) setColunas(data.colunas)
    } finally { setLoading(false) }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/crm/kanban/colunas', { method: 'POST', body: JSON.stringify(currentEdit) })
    const data = await res.json()
    if (data.success) { fetchColunas(); setIsModalOpen(false); setCurrentEdit(null) }
    else alert(data.error)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente excluir esta etapa?')) return
    const res = await fetch(`/api/crm/kanban/colunas?id=${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) fetchColunas()
    else alert(data.error)
  }

  const moveColumn = async (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === colunas.length - 1) return
    const newColunas = [...colunas]
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newColunas[idx], newColunas[targetIdx]] = [newColunas[targetIdx], newColunas[idx]]
    newColunas.forEach((col, i) => col.ordem = i + 1)
    setColunas(newColunas)
    for (const col of newColunas) {
      await fetch('/api/crm/kanban/colunas', { method: 'POST', body: JSON.stringify(col) })
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold tracking-tight italic flex items-center ${t.textPrimary}`}>
            CONFIGURAÇÃO <span className="text-blue-500 ml-2">DO FUNIL</span>
          </h2>
          <p className={`mt-1 text-sm ${t.textSecondary}`}>Personalize as etapas e o visual do seu Kanban operacional.</p>
        </div>
        <button
          onClick={() => { setCurrentEdit({ nome: '', titulo_exibicao: '', ordem: colunas.length + 1, cor: '#3B82F6', icone: 'UserIcon', sla_hours: 24, is_ganho: false, is_perda: false, requer_valor_estimado: false }); setIsModalOpen(true) }}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg">
          <PlusIcon className="h-4 w-4 mr-2" />Nova Etapa
        </button>
      </div>

      <div className={`${t.cardBg} rounded-2xl overflow-hidden`}>
        <table className="min-w-full">
          <thead className={`${t.isDark ? 'bg-black/20' : 'bg-gray-50'}`}>
            <tr>
              {['Ordem', 'Título Interno/Slug', 'Visualização', 'SLA (Máx Horas)', 'Cor', 'Ações'].map((h, i) => (
                <th key={h} className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${t.textMuted} ${i === 5 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${t.borderSub}`}>
            {loading ? (
              <tr><td colSpan={6} className={`p-8 text-center ${t.textMuted}`}>Carregando estrutura...</td></tr>
            ) : colunas.map((col, idx) => (
              <tr key={col.id} className={`group transition-colors ${t.hoverBg}`}>
                <td className="px-6 py-4 text-sm font-bold text-blue-500">{col.ordem}º</td>
                <td className="px-6 py-4">
                  <div className={`text-sm font-medium ${t.textPrimary}`}>{col.nome}</div>
                  <div className={`text-[10px] ${t.textMuted}`}>{col.icone}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border"
                      style={{ backgroundColor: `${col.cor}20`, color: col.cor, borderColor: `${col.cor}30` }}>
                      <ChevronDoubleRightIcon className="mr-1.5 h-3 w-3" />{col.titulo_exibicao}
                    </div>
                    {col.is_ganho && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                        Ganho
                      </span>
                    )}
                    {col.is_perda && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-500/15 text-red-500 border border-red-500/30">
                        Perda
                      </span>
                    )}
                    {col.requer_valor_estimado && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-500 border border-amber-500/30">
                        Exige valor est.
                      </span>
                    )}
                  </div>
                </td>
                <td className={`px-6 py-4 text-sm font-black ${t.textPrimary}`}>
                  <span className={`font-normal mr-1 italic text-[10px] ${t.textMuted}`}>limite:</span>{col.sla_hours || 24}h
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <div className={`h-5 w-5 rounded-full border ${t.border}`} style={{ backgroundColor: col.cor }} />
                    <span className={`text-xs font-mono uppercase ${t.textMuted}`}>{col.cor}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-1">
                    <button onClick={() => moveColumn(idx, 'up')} disabled={idx === 0}
                      className={`p-2 ${t.textMuted} hover:text-white disabled:opacity-30 ${t.cardBg} rounded-lg transition-all`} title="Mover para cima">
                      <ChevronUpIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => moveColumn(idx, 'down')} disabled={idx === colunas.length - 1}
                      className={`p-2 ${t.textMuted} hover:text-white disabled:opacity-30 ${t.cardBg} rounded-lg transition-all mr-3`} title="Mover para baixo">
                      <ChevronDownIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => { setCurrentEdit(col); setIsModalOpen(true) }}
                      className={`p-2 ${t.textMuted} hover:text-blue-500 ${t.cardBg} rounded-lg transition-all`}>
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(col.id)}
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
                {currentEdit.id ? 'Editar Etapa' : 'Nova Etapa'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className={`${t.textMuted} hover:text-blue-500 transition-colors`}>Fechar</button>
            </div>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[['Slug Interno', 'nome', 'text', currentEdit.nome], ['Ordem', 'ordem', 'number', currentEdit.ordem]].map(([label, key, type, val]) => (
                  <div key={String(key)} className="space-y-2">
                    <label className={`text-xs font-bold uppercase tracking-widest pl-1 ${t.textMuted}`}>{String(label)}</label>
                    <input type={String(type)} required value={String(val ?? '')}
                      onChange={e => setCurrentEdit({ ...currentEdit, [String(key)]: type === 'number' ? parseInt(e.target.value) : e.target.value })}
                      className={`w-full rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-blue-500/50 ${t.inputBg}`} />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-widest pl-1 ${t.textMuted}`}>Título Visualização</label>
                <input type="text" required value={currentEdit.titulo_exibicao}
                  onChange={e => setCurrentEdit({ ...currentEdit, titulo_exibicao: e.target.value })}
                  className={`w-full rounded-xl py-3 px-4 text-sm font-bold focus:outline-none focus:border-blue-500/50 ${t.inputBg}`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[['SLA (Limiar Horas)', 'sla_hours', 'number', currentEdit.sla_hours, 'Ex: 24'], ['Ícone', 'icone', 'text', currentEdit.icone, 'Ex: UserIcon']].map(([label, key, type, val, ph]) => (
                  <div key={String(key)} className="space-y-2">
                    <label className={`text-xs font-bold uppercase tracking-widest pl-1 ${t.textMuted}`}>{String(label)}</label>
                    <input type={String(type)} required value={String(val ?? '')} placeholder={String(ph)}
                      onChange={e => setCurrentEdit({ ...currentEdit, [String(key)]: type === 'number' ? parseInt(e.target.value) : e.target.value })}
                      className={`w-full rounded-xl py-2 px-4 text-sm focus:outline-none ${t.inputBg}`} />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-widest pl-1 ${t.textMuted}`}>Etapa Terminal (opcional)</label>
                <p className={`text-[11px] pl-1 ${t.textMuted}`}>
                  Marca esta etapa como o desfecho do negócio. É esse atributo — não o nome da
                  etapa — que os Agentes de Aceleração e os relatórios de CPA/ROAS real usam
                  para saber quando um lead foi convertido ou perdido.
                </p>
                <div className="flex items-center gap-6 pl-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={currentEdit.is_ganho === true}
                      onChange={e => setCurrentEdit({ ...currentEdit, is_ganho: e.target.checked, is_perda: e.target.checked ? false : currentEdit.is_perda, requer_valor_estimado: e.target.checked ? false : currentEdit.requer_valor_estimado })}
                      className="h-4 w-4 rounded accent-emerald-500" />
                    <span className="text-sm font-bold text-emerald-500">Etapa de Ganho</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={currentEdit.is_perda === true}
                      onChange={e => setCurrentEdit({ ...currentEdit, is_perda: e.target.checked, is_ganho: e.target.checked ? false : currentEdit.is_ganho, requer_valor_estimado: e.target.checked ? false : currentEdit.requer_valor_estimado })}
                      className="h-4 w-4 rounded accent-red-500" />
                    <span className="text-sm font-bold text-red-500">Etapa de Perda</span>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-widest pl-1 ${t.textMuted}`}>Valor Estimado (opcional)</label>
                <p className={`text-[11px] pl-1 ${t.textMuted}`}>
                  Exige que o atendente informe um valor estimado do negócio ao mover um lead
                  pra esta etapa (nunca confundido com o valor REAL — esse só é pedido no
                  fechamento). Não aplicável na Etapa de Ganho (que já pede o valor real) nem
                  na Etapa de Perda (negócio perdido não tem mais pipeline aberto a estimar).
                </p>
                <label className={`flex items-center gap-2 pl-1 select-none ${(currentEdit.is_ganho || currentEdit.is_perda) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input type="checkbox" checked={currentEdit.requer_valor_estimado === true && !currentEdit.is_ganho && !currentEdit.is_perda}
                    disabled={currentEdit.is_ganho === true || currentEdit.is_perda === true}
                    onChange={e => setCurrentEdit({ ...currentEdit, requer_valor_estimado: e.target.checked })}
                    className="h-4 w-4 rounded accent-amber-500" />
                  <span className={`text-sm font-bold ${t.isDark ? 'text-amber-400' : 'text-amber-600'}`}>Exige valor estimado ao entrar nesta etapa</span>
                </label>
              </div>
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-widest pl-1 ${t.textMuted}`}>Cor Hex</label>
                <div className="flex items-center space-x-2">
                  <input type="color" value={currentEdit.cor}
                    onChange={e => setCurrentEdit({ ...currentEdit, cor: e.target.value })}
                    className="h-9 w-9 bg-transparent border-none p-0 cursor-pointer rounded" />
                  <input type="text" value={currentEdit.cor}
                    onChange={e => setCurrentEdit({ ...currentEdit, cor: e.target.value })}
                    className={`flex-1 rounded-xl py-2 px-4 text-xs uppercase ${t.inputBg}`} />
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-xl uppercase tracking-widest">
                Salvar Configurações
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
