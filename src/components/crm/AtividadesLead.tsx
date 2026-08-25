'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  ListBulletIcon,
  PlusIcon,
  PaperClipIcon,
  PencilSquareIcon,
  TrashIcon,
  DocumentIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useTheme } from '@/hooks/useTheme'
import { adminFetch } from '@/lib/auth/adminFetch'
import DynamicIcon from '@/components/common/DynamicIcon'

interface TipoAtividade {
  id: number
  nome: string
  icone: string | null
  cor: string
}

type AnexoTipo = 'audio' | 'imagem' | 'pdf'

interface Anexo {
  id: string
  url: string
  tipo: AnexoTipo
  nome_original: string
  tamanho_bytes: number
  created_at: string
}

interface Atividade {
  id: string
  tipo_atividade_id: number
  tipo_nome: string
  tipo_cor: string
  tipo_icone?: string | null
  descricao: string
  usuario_nome?: string | null
  origem?: 'humano' | 'ia'
  /** true = conteúdo nasceu de uma sugestão da IA (NextBestActionCard, "Registrar como
   *  Atividade"), mesmo tendo sido um humano quem clicou Salvar — distinto de origem='ia'
   *  (a IA executou sozinha, sem humano no meio). */
  sugerido_por_ia?: boolean
  anexos: Anexo[]
  created_at: string
}

/** Arquivo escolhido pelo usuário, ainda não enviado — preview via blob: local (sem round-trip
 *  ao servidor), aparece na MESMA lista dos anexos já salvos, só com o selo "Novo". */
interface PendingFile {
  id: string
  file: File
  previewUrl: string
  tipo: AnexoTipo
}

interface Props {
  leadUuid: string
  clientId?: string | null
  /** Preenche o formulário de Nova Atividade com um texto vindo de fora (ex.: "Registrar como
   *  Atividade" no card "Sugestão da IA" — F3, docs/PLANO_AGENTES_ACELERACAO_CRM.md §5).
   *  `nonce` precisa mudar a cada clique pra reabrir o form mesmo se o texto for o mesmo de
   *  antes (useEffect só dispara em mudança de valor). */
  prefill?: { text: string; nonce: number }
}

const MIN_DESCRICAO_LEN = 15

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `há ${d}d`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Classifica um File local pelo mesmo vocabulário de tipo já usado nos anexos persistidos
 *  (audio/imagem/pdf) — só pra escolher a preview certa antes do upload; a validação real de
 *  MIME/tamanho continua sendo feita pelo servidor. */
function classifyFile(file: File): AnexoTipo {
  if (file.type.startsWith('audio/')) return 'audio'
  if (file.type.startsWith('image/')) return 'imagem'
  return 'pdf'
}

/** Preview de 1 anexo — já persistido (com URL real) ou ainda pendente de salvar (com blob:
 *  local). Mesma lista, mesmo componente; `pending` só troca o selo visual, `onRemove` decide
 *  se remove via API (existente) ou só do state local (pendente) — a chamada certa já vem
 *  pronta de quem monta a lista. */
function AttachmentEntry({
  url, tipo, nomeOriginal, pending, onRemove,
}: {
  url: string
  tipo: AnexoTipo
  nomeOriginal: string
  pending?: boolean
  onRemove?: () => void
}) {
  const t = useTheme()
  const [lightbox, setLightbox] = useState(false)

  const body = (() => {
    if (tipo === 'audio') {
      return <audio controls src={url} className="h-9 flex-1 min-w-0" />
    }
    if (tipo === 'imagem') {
      return (
        <>
          <img
            src={url}
            alt={nomeOriginal}
            onClick={() => setLightbox(true)}
            className="h-14 w-14 rounded-lg object-cover border border-white/10 cursor-zoom-in hover:opacity-90 transition-opacity flex-shrink-0"
          />
          {lightbox && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/90" onClick={() => setLightbox(false)}>
              <img src={url} alt="" className="max-h-[85vh] max-w-[90vw] rounded-xl" />
              <button className="absolute top-6 right-6 p-2 text-white/70 hover:text-white"><XMarkIcon className="h-8 w-8" /></button>
            </div>
          )}
        </>
      )
    }
    // pdf
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-500 hover:text-blue-400 min-w-0 truncate">
        <DocumentIcon className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{nomeOriginal}</span>
      </a>
    )
  })()

  return (
    <div className={`mt-2 flex items-center gap-2 rounded-lg px-2 py-1.5 ${t.isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
      {body}
      {pending && (
        <span className="flex-shrink-0 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
          Novo
        </span>
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          title={pending ? 'Remover (ainda não salvo)' : 'Remover este anexo'}
          className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all
            ${t.isDark
              ? 'border-red-500/20 text-red-400/80 hover:border-red-500/50 hover:bg-red-500/15 hover:text-red-400'
              : 'border-red-200 text-red-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600'}`}
        >
          <TrashIcon className="h-3.5 w-3.5" />
          <span>Remover</span>
        </button>
      )}
    </div>
  )
}

export default function AtividadesLead({ leadUuid, clientId, prefill }: Props) {
  const t = useTheme()
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [tipos, setTipos] = useState<TipoAtividade[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingAnexos, setEditingAnexos] = useState<Anexo[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formTipoId, setFormTipoId] = useState<string>('')
  const [formDescricao, setFormDescricao] = useState('')
  const [formSugeridoPorIa, setFormSugeridoPorIa] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingFilesRef = useRef<PendingFile[]>([])
  pendingFilesRef.current = pendingFiles

  useEffect(() => {
    if (leadUuid) loadAll()
  }, [leadUuid])

  // Revoga qualquer blob: local que ainda não foi limpo se o componente desmontar com o
  // formulário aberto (troca de lead com a ficha aberta, por exemplo) — evita vazamento de
  // memória do navegador.
  useEffect(() => {
    return () => {
      pendingFilesRef.current.forEach(p => URL.revokeObjectURL(p.previewUrl))
    }
  }, [])

  useEffect(() => {
    if (!prefill || !prefill.text) return
    setEditingId(null)
    setEditingAnexos([])
    setFormTipoId('')
    setFormDescricao(prefill.text)
    setFormSugeridoPorIa(true)
    setPendingFiles(prev => { prev.forEach(p => URL.revokeObjectURL(p.previewUrl)); return [] })
    setShowForm(true)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill?.nonce])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [atRes, tpRes] = await Promise.all([
        adminFetch(`/api/crm/atividades?lead_uuid=${leadUuid}`),
        adminFetch(`/api/crm/atividades/tipos${clientId ? `?client_id=${clientId}` : ''}`),
      ])
      const atData = await atRes.json()
      const tpData = await tpRes.json()
      if (atData.success) setAtividades(atData.atividades)
      if (tpData.success) setTipos(tpData.tipos)
    } catch (e) { /* silent */ } finally { setLoading(false) }
  }

  const resetForm = () => {
    setFormTipoId('')
    setFormDescricao('')
    setFormSugeridoPorIa(false)
    setPendingFiles(prev => { prev.forEach(p => URL.revokeObjectURL(p.previewUrl)); return [] })
    if (fileInputRef.current) fileInputRef.current.value = ''
    setEditingId(null)
    setEditingAnexos([])
    setShowForm(false)
    setError(null)
  }

  const startEdit = (a: Atividade) => {
    setEditingId(a.id)
    setEditingAnexos(a.anexos || [])
    setFormTipoId(String(a.tipo_atividade_id))
    setFormDescricao(a.descricao)
    setFormSugeridoPorIa(false)
    setPendingFiles(prev => { prev.forEach(p => URL.revokeObjectURL(p.previewUrl)); return [] })
    setShowForm(true)
    setError(null)
  }

  /** Remove 1 anexo já salvo — funciona tanto no card de leitura (fora de edição) quanto na
   *  lista dentro do formulário: atualiza os dois locais de state que podem estar exibindo o
   *  mesmo anexo ao mesmo tempo (a atividade real está sempre visível na lista de baixo,
   *  mesmo enquanto seu formulário de edição está aberto acima). */
  const handleDeleteAnexo = async (anexoId: string, atividadeId: string) => {
    if (!confirm('Remover este anexo?')) return
    try {
      const res = await adminFetch(`/api/crm/atividades/anexos?id=${anexoId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Erro ao remover anexo.')
        return
      }
      setAtividades(prev => prev.map(a => a.id === atividadeId
        ? { ...a, anexos: a.anexos.filter(an => an.id !== anexoId) }
        : a))
      setEditingAnexos(prev => prev.filter(an => an.id !== anexoId))
    } catch (e: any) {
      setError(e.message || 'Erro ao remover anexo.')
    }
  }

  const handleAddFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const newItems: PendingFile[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      tipo: classifyFile(file),
    }))
    setPendingFiles(prev => [...prev, ...newItems])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemovePendingFile = (id: string) => {
    setPendingFiles(prev => {
      const item = prev.find(p => p.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return prev.filter(p => p.id !== id)
    })
  }

  const handleSubmit = async () => {
    setError(null)
    if (!formTipoId) { setError('Escolha uma atividade.'); return }
    if (formDescricao.trim().length < MIN_DESCRICAO_LEN) {
      setError(`A descrição precisa ter pelo menos ${MIN_DESCRICAO_LEN} caracteres.`)
      return
    }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('tipo_atividade_id', formTipoId)
      fd.append('descricao', formDescricao.trim())
      pendingFiles.forEach(p => fd.append('arquivos', p.file))

      let res: Response
      if (editingId) {
        fd.append('id', editingId)
        res = await adminFetch(`/api/crm/atividades`, { method: 'PATCH', body: fd })
      } else {
        fd.append('lead_uuid', leadUuid)
        fd.append('sugerido_por_ia', formSugeridoPorIa ? 'true' : 'false')
        res = await adminFetch(`/api/crm/atividades`, { method: 'POST', body: fd })
      }
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Erro ao salvar atividade.')
        return
      }
      resetForm()
      loadAll()
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar atividade.')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta atividade?')) return
    try {
      const res = await adminFetch(`/api/crm/atividades?id=${id}`, { method: 'DELETE' })
      if (res.ok) setAtividades(prev => prev.filter(a => a.id !== id))
    } catch (e) { /* silent */ }
  }

  if (loading) return (
    <div className={`text-center py-4 text-xs italic ${t.textMuted} animate-pulse`}>
      Carregando atividades...
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className={`flex items-center space-x-2 text-xs font-black uppercase tracking-widest ${t.textMuted}`}>
          <ListBulletIcon className="h-4 w-4 text-blue-500" />
          <span>Atividades</span>
          {atividades.length > 0 && (
            <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded-full text-[10px]">
              {atividades.length}
            </span>
          )}
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:text-blue-400 transition-colors">
            <PlusIcon className="h-3.5 w-3.5" /> Nova Atividade
          </button>
        )}
      </div>

      {showForm && (
        <div className={`p-4 rounded-2xl border ${t.borderSub} ${t.isDark ? 'bg-white/[0.02]' : 'bg-gray-50'} space-y-3`}>
          <select
            value={formTipoId}
            onChange={e => setFormTipoId(e.target.value)}
            className={`w-full text-xs font-semibold rounded-xl px-3 py-2.5 border ${t.borderSub} ${t.isDark ? 'bg-black/30 text-white' : 'bg-white text-slate-700'} focus:outline-none focus:ring-2 focus:ring-blue-500/30`}
          >
            <option value="">Selecione a atividade...</option>
            {tipos.map(tp => <option key={tp.id} value={tp.id}>{tp.nome}</option>)}
          </select>
          <textarea
            value={formDescricao}
            onChange={e => setFormDescricao(e.target.value)}
            placeholder={`Descreva a atividade (mínimo ${MIN_DESCRICAO_LEN} caracteres)...`}
            rows={3}
            className={`w-full text-xs rounded-xl px-3 py-2.5 border ${t.borderSub} ${t.isDark ? 'bg-black/30 text-white placeholder:text-white/30' : 'bg-white text-slate-700'} focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none`}
          />

          {(editingAnexos.length > 0 || pendingFiles.length > 0) && (
            <div className="space-y-1.5">
              <p className={`text-[10px] font-bold uppercase tracking-widest ${t.textMuted}`}>Anexos</p>
              {editingAnexos.map(an => (
                <AttachmentEntry key={an.id} url={an.url} tipo={an.tipo} nomeOriginal={an.nome_original}
                  onRemove={() => handleDeleteAnexo(an.id, editingId!)} />
              ))}
              {pendingFiles.map(p => (
                <AttachmentEntry key={p.id} url={p.previewUrl} tipo={p.tipo} nomeOriginal={p.file.name}
                  pending onRemove={() => handleRemovePendingFile(p.id)} />
              ))}
            </div>
          )}

          <label className={`flex items-center gap-1.5 text-[10px] font-bold cursor-pointer ${t.textMuted} hover:text-blue-500 transition-colors w-fit`}>
            <PaperClipIcon className="h-3.5 w-3.5" />
            Anexar áudio, imagem ou PDF (pode escolher vários)
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="audio/*,image/*,application/pdf"
              onChange={e => handleAddFiles(e.target.files)}
              className="hidden"
            />
          </label>

          {error && <div className="text-[11px] font-bold text-red-500">{error}</div>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={resetForm} className={`px-4 py-2 text-[10px] font-bold uppercase ${t.textMuted} hover:text-red-500 transition-colors`}>Cancelar</button>
            <button onClick={handleSubmit} disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[10px] font-bold uppercase rounded-xl transition-all">
              {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Registrar'}
            </button>
          </div>
        </div>
      )}

      {atividades.length === 0 && !showForm ? (
        <div className={`text-center py-6 rounded-2xl border border-dashed ${t.borderSub} ${t.isDark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
          <ListBulletIcon className={`h-8 w-8 mx-auto mb-2 ${t.textMuted}`} />
          <p className={`text-xs font-medium ${t.textMuted}`}>Nenhuma atividade registrada ainda</p>
        </div>
      ) : (
        <div className="space-y-2">
          {atividades.map(a => (
            <div key={a.id} className={`p-4 rounded-2xl border ${t.borderSub} ${t.isDark ? 'bg-white/[0.02]' : 'bg-white'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3 min-w-0">
                  <div className="mt-0.5 flex items-center justify-center h-7 w-7 rounded-lg flex-shrink-0" style={{ backgroundColor: `${a.tipo_cor}1a`, color: a.tipo_cor }}>
                    <DynamicIcon iconName={a.tipo_icone ?? ''} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: a.tipo_cor }}>{a.tipo_nome}</span>
                      <span className={`text-[10px] ${t.textMuted}`}>{timeAgo(a.created_at)}</span>
                      {a.origem === 'ia' ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gold-premium/15 text-gold-premium flex items-center gap-1">
                          🤖 Agente de IA
                        </span>
                      ) : (
                        a.usuario_nome && <span className={`text-[10px] ${t.textMuted} opacity-60`}>· {a.usuario_nome}</span>
                      )}
                      {/* Distinto de "Agente de IA" acima: aqui um humano sempre clicou Salvar —
                          só o CONTEÚDO nasceu de uma sugestão (NextBestActionCard). */}
                      {a.sugerido_por_ia && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 flex items-center gap-1">
                          ✨ Sugerido pela IA
                        </span>
                      )}
                      {a.anexos?.length > 0 && (
                        <span className={`text-[10px] ${t.textMuted} opacity-60`}>
                          · {a.anexos.length} {a.anexos.length === 1 ? 'anexo' : 'anexos'}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-1 leading-relaxed ${t.textSecondary}`}>{a.descricao}</p>
                    {a.anexos?.map(an => (
                      <AttachmentEntry key={an.id} url={an.url} tipo={an.tipo} nomeOriginal={an.nome_original}
                        onRemove={() => handleDeleteAnexo(an.id, a.id)} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(a)} className={`p-1.5 rounded-lg ${t.isDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-gray-100 text-gray-400'} hover:text-blue-500 transition-all`} title="Editar">
                    <PencilSquareIcon className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(a.id)} className={`p-1.5 rounded-lg ${t.isDark ? 'hover:bg-red-500/20 text-white/40' : 'hover:bg-red-50 text-gray-400'} hover:text-red-500 transition-all`} title="Excluir">
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
