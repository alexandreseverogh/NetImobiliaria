'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { useEstadosCidades } from '@/hooks/useEstadosCidades'
import EstadoSelect from '@/components/shared/EstadoSelect'
import { 
  MapPin, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  Globe,
  Building2
} from 'lucide-react'

interface AreaAtuacao {
  id: number
  estado_fk: string
  cidade_fk: string
  created_at: string
}

export default function AreasAtuacaoPage() {
  const { get, post, delete: del } = useAuthenticatedFetch()
  const { estados, municipios, loadMunicipios, getEstadoNome } = useEstadosCidades()
  
  const [areas, setAreas] = useState<AreaAtuacao[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form State
  const [selectedEstadoId, setSelectedEstadoId] = useState('')
  const [selectedCidadeNome, setSelectedCidadeNome] = useState('')

  const [corretorNome, setCorretorNome] = useState<string | null>(null)
  const [corretorFotoDataUrl, setCorretorFotoDataUrl] = useState<string | null>(null)

  // Carregar dados do corretor logado
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user-data')
      if (!raw) return
      const u = JSON.parse(raw)
      setCorretorNome(u?.nome || null)
      const fotoBase64 = u?.foto || null
      const fotoMime = u?.foto_tipo_mime || 'image/jpeg'
      setCorretorFotoDataUrl(fotoBase64 ? `data:${fotoMime};base64,${fotoBase64}` : null)
    } catch {}
  }, [])

  // Carregar áreas existentes
  const loadAreas = useCallback(async () => {
    try {
      setLoading(true)
      const resp = await get('/api/public/corretor/areas-atuacao')
      const data = await resp.json()
      if (resp.ok && data.success) {
        setAreas(data.areas)
      } else {
        throw new Error(data.error || 'Erro ao carregar áreas')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [get])

  useEffect(() => {
    loadAreas()
  }, [loadAreas])

  // Monitorar mudança de estado para carregar municípios
  useEffect(() => {
    if (selectedEstadoId) {
      loadMunicipios(selectedEstadoId)
      setSelectedCidadeNome('')
    }
  }, [selectedEstadoId, loadMunicipios])

  const handleAddArea = async () => {
    if (!selectedEstadoId || !selectedCidadeNome) {
      setError('Selecione o Estado e a Cidade')
      return
    }

    const estado = estados.find(e => e.id === selectedEstadoId)
    if (!estado) return

    setAdding(true)
    setError(null)
    setSuccess(null)

    try {
      const resp = await post('/api/public/corretor/areas-atuacao', {
        estado_fk: estado.sigla,
        cidade_fk: selectedCidadeNome
      })
      const data = await resp.json()

      if (resp.ok && data.success) {
        setSuccess('Área de atuação adicionada com sucesso!')
        setAreas(prev => [...prev, data.area].sort((a, b) => 
          a.estado_fk.localeCompare(b.estado_fk) || a.cidade_fk.localeCompare(b.cidade_fk)
        ))
        setSelectedEstadoId('')
        setSelectedCidadeNome('')
      } else {
        setError(data.error || 'Erro ao adicionar área')
      }
    } catch (err: any) {
      setError('Erro de conexão ao adicionar área')
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteArea = async (id: number) => {
    if (!confirm('Tem certeza que deseja remover esta área de atuação?')) return

    try {
      const resp = await del(`/api/public/corretor/areas-atuacao?id=${id}`)
      const data = await resp.json()
      if (resp.ok && data.success) {
        setAreas(prev => prev.filter(a => a.id !== id))
        setSuccess('Área removida com sucesso')
      } else {
        setError(data.error || 'Erro ao remover área')
      }
    } catch (err) {
      setError('Erro ao remover área')
    }
  }

  const handleVoltar = () => {
    try {
      const returnUrl = sessionStorage.getItem('corretor_return_url') || '/landpaging'
      const url = new URL(returnUrl, window.location.origin)
      url.searchParams.set('corretor_home', 'true')
      window.location.href = url.pathname + url.search
    } catch {
      window.location.href = '/landpaging?corretor_home=true'
    }
  }

  const municipiosOrdenados = useMemo(() => {
    return [...municipios].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [municipios])

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header Profissional */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-8 mb-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-6">
              {corretorFotoDataUrl ? (
                <img
                  src={corretorFotoDataUrl}
                  alt={corretorNome || 'Corretor'}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-100 border-4 border-white shadow-lg flex items-center justify-center text-blue-600 text-2xl font-black">
                  {corretorNome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'C'}
                </div>
              )}
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Áreas de Atuação</h1>
                <p className="text-slate-500 font-medium mt-1">Gerencie as regiões onde você atende seus clientes</p>
                {corretorNome && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider">
                    <Globe className="w-3.5 h-3.5" />
                    {corretorNome}
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={handleVoltar}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl active:scale-95 group"
            >
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              Voltar ao Painel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Coluna de Adição (Formulário) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Nova Área
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Estado</label>
                  <EstadoSelect
                    value={selectedEstadoId}
                    onChange={setSelectedEstadoId}
                    placeholder="Selecione o Estado"
                    className="w-full bg-slate-50 border-slate-200 rounded-xl py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                    showAllOption={false}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Cidade</label>
                  <select
                    value={selectedCidadeNome}
                    onChange={(e) => setSelectedCidadeNome(e.target.value)}
                    disabled={!selectedEstadoId}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Selecione a Cidade</option>
                    {municipiosOrdenados.map(m => (
                      <option key={m.id} value={m.nome}>{m.nome}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleAddArea}
                  disabled={adding || !selectedEstadoId || !selectedCidadeNome}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:shadow-none"
                >
                  {adding ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Adicionar Área
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="mt-6 flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="font-medium">{error}</p>
                </div>
              )}

              {success && (
                <div className="mt-6 flex items-start gap-3 p-4 bg-green-50 border border-green-100 rounded-xl text-green-600 text-sm animate-in fade-in slide-in-from-top-2">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <p className="font-medium">{success}</p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-blue-800 mb-2">Dica de Especialista</h3>
              <p className="text-xs text-blue-600 leading-relaxed font-medium">
                Mantenha seu foco em regiões estratégicas. Atuar em muitas áreas simultaneamente pode reduzir sua agilidade no atendimento.
              </p>
            </div>
          </div>

          {/* Coluna de Listagem (Visualização Cumulativa) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm min-h-[400px]">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Suas Áreas Atuais
                  <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-bold rounded-full">
                    {areas.length}
                  </span>
                </h2>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                  <p className="text-slate-400 font-medium">Carregando suas áreas...</p>
                </div>
              ) : areas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                    <MapPin className="w-10 h-10 text-slate-200" />
                  </div>
                  <div>
                    <p className="text-slate-500 font-bold text-lg">Nenhuma área definida</p>
                    <p className="text-slate-400 text-sm mt-1 max-w-xs">
                      Utilize o formulário ao lado para cadastrar suas regiões de atuação.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {areas.map((area) => (
                    <div
                      key={area.id}
                      className="group flex items-center justify-between p-5 bg-slate-50 hover:bg-white border border-slate-100 hover:border-blue-200 rounded-2xl transition-all hover:shadow-md animate-in fade-in zoom-in duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 flex items-center justify-center bg-white border border-slate-100 text-blue-600 rounded-xl shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <MapPin className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                            {area.estado_fk} - {getEstadoNome(estados.find(e => e.sigla === area.estado_fk)?.id || '')}
                          </p>
                          <p className="text-base font-bold text-slate-800 leading-tight">
                            {area.cidade_fk}
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteArea(area.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Remover Área"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

