'use client'

import { useState, useEffect } from 'react'
import PermissionGuard from '@/components/admin/PermissionGuard'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  BanknotesIcon, 
  QrCodeIcon, 
  GlobeAltIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface Parametros {
  vl_destaque_nacional: number
  valor_corretor: number
  chave_pix_corretor: string
  cidade_beneficiario_recebimento_corretor: string
  valor_mensal_imovel: number
  qtde_anuncios_imoveis_corretor: number
  periodo_anuncio_corretor: number
  proximos_corretores_recebem_leads: number
  sla_minutos_aceite_lead: number
}

export default function ParametrosPage() {
  const { get, put } = useAuthenticatedFetch()
  const [formData, setFormData] = useState<Parametros>({
    vl_destaque_nacional: 0,
    valor_corretor: 0,
    chave_pix_corretor: '',
    cidade_beneficiario_recebimento_corretor: '',
    valor_mensal_imovel: 0,
    qtde_anuncios_imoveis_corretor: 5,
    periodo_anuncio_corretor: 30,
    proximos_corretores_recebem_leads: 3,
    sla_minutos_aceite_lead: 5
  })
  
  // Estados locais para os inputs de número para evitar o problema do "zero à esquerda"
  const [inputDestaque, setInputDestaque] = useState<string>('0')
  const [inputValorCorretor, setInputValorCorretor] = useState<string>('0')
  const [inputValorMensalImovel, setInputValorMensalImovel] = useState<string>('0')
  const [inputQtdeAnuncios, setInputQtdeAnuncios] = useState<string>('5')
  const [inputPeriodoAnuncio, setInputPeriodoAnuncio] = useState<string>('30')
  const [inputProximosCorretores, setInputProximosCorretores] = useState<string>('3')
  const [inputSlaMinutosAceiteLead, setInputSlaMinutosAceiteLead] = useState<string>('5')
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Carregar valores atuais
  useEffect(() => {
    loadParametros()
  }, [])

  const loadParametros = async () => {
    try {
      setLoading(true)
      const response = await get('/api/admin/parametros')
      
      if (response.ok) {
        const data = await response.json()
        const vlDestaque = data.data.vl_destaque_nacional || 0
        const vlCorretor = data.data.valor_corretor || 0
        const vlMensalImovel = data.data.valor_mensal_imovel || 0
        const qtdeAnuncios = data.data.qtde_anuncios_imoveis_corretor || 5
        const periodoAnuncio = data.data.periodo_anuncio_corretor || 30
        const proximosCorretores = data.data.proximos_corretores_recebem_leads ?? 3
        const slaMinutos = data.data.sla_minutos_aceite_lead ?? 5
        
        setFormData({
          vl_destaque_nacional: vlDestaque,
          valor_corretor: vlCorretor,
          chave_pix_corretor: data.data.chave_pix_corretor || '',
          cidade_beneficiario_recebimento_corretor: data.data.cidade_beneficiario_recebimento_corretor || 'BRASILIA',
          valor_mensal_imovel: vlMensalImovel,
          qtde_anuncios_imoveis_corretor: qtdeAnuncios,
          periodo_anuncio_corretor: periodoAnuncio,
          proximos_corretores_recebem_leads: Number(proximosCorretores) || 3,
          sla_minutos_aceite_lead: Number(slaMinutos) || 5
        })
        
        setInputDestaque(vlDestaque.toString())
        setInputValorCorretor(vlCorretor.toString())
        setInputValorMensalImovel(vlMensalImovel.toString())
        setInputQtdeAnuncios(qtdeAnuncios.toString())
        setInputPeriodoAnuncio(periodoAnuncio.toString())
        setInputProximosCorretores(String(proximosCorretores))
        setInputSlaMinutosAceiteLead(String(slaMinutos))
      } else {
        setMessage({ type: 'error', text: 'Erro ao carregar par+�metros' })
      }
    } catch (error) {
      console.error('Erro ao carregar par+�metros:', error)
      setMessage({ type: 'error', text: 'Erro ao carregar par+�metros' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      setMessage(null)

      // Atualizar formData com os valores dos inputs antes de enviar
      const finalData = {
        ...formData,
        vl_destaque_nacional: parseFloat(inputDestaque) || 0,
        valor_corretor: parseFloat(inputValorCorretor) || 0,
        valor_mensal_imovel: parseFloat(inputValorMensalImovel) || 0,
        qtde_anuncios_imoveis_corretor: parseInt(inputQtdeAnuncios) || 5,
        periodo_anuncio_corretor: parseInt(inputPeriodoAnuncio) || 30,
        proximos_corretores_recebem_leads: parseInt(inputProximosCorretores) || 3,
        sla_minutos_aceite_lead: parseInt(inputSlaMinutosAceiteLead) || 5
      }

      const response = await put('/api/admin/parametros', finalData)

      if (response.ok) {
        setMessage({ type: 'success', text: 'Par+�metros atualizados com sucesso!' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        const errorData = await response.json()
        setMessage({ 
          type: 'error', 
          text: errorData.error || 'Erro ao atualizar parâmetros' 
        })
      }
    } catch (error) {
      console.error('Erro ao salvar parâmetros:', error)
      setMessage({ type: 'error', text: 'Erro ao salvar parâmetros' })
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  // Função para tratar entrada de números e evitar o zero à esquerda
  const handleNumberInput = (value: string, setter: (v: string) => void) => {
    // Se o valor for vazio, define como 0 para não quebrar a lógica
    if (value === '') {
      setter('0')
      return
    }
    
    // Remove o zero à esquerda se o próximo caractere for um dígito (mas mantém se for ponto)
    if (value.length > 1 && value.startsWith('0') && value[1] !== '.') {
      setter(value.substring(1))
    } else {
      setter(value)
    }
  }

  return (
    <PermissionGuard resource="parametros" action="EXECUTE">
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Parâmetros do Sistema</h1>
          <p className="text-slate-500 mt-2 font-medium">
            Gerencie taxas, valores e chaves de pagamento globais
          </p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
          {/* Mensagem de sucesso/erro fixa no topo do form */}
          {message && (
            <div className={`p-4 rounded-2xl flex items-center space-x-3 animate-in fade-in slide-in-from-top-2 ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircleIcon className="w-6 h-6" />
              ) : (
                <XCircleIcon className="w-6 h-6" />
              )}
              <span className="font-bold text-sm">{message.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Seção Destaque Nacional */}
            <div className="bg-white shadow-sm border border-slate-200 rounded-3xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                    <GlobeAltIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Valores Mensais Imóveis e Destaque Nacional</h2>
                    <p className="text-xs text-slate-500 font-medium">Configure as taxas de manutenção e visibilidade nacional</p>
                  </div>
                </div>
              </div>
              <div className="p-6 flex-1 space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Valor Mensal Imóvel (R$)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-slate-400 font-bold text-sm">R$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={inputValorMensalImovel}
                      onChange={(e) => handleNumberInput(e.target.value, setInputValorMensalImovel)}
                      disabled={loading || saving}
                      className="block w-full pl-12 pr-4 py-4 bg-slate-50 border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Valor Unitário Destaque (R$)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-slate-400 font-bold text-sm">R$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={inputDestaque}
                      onChange={(e) => handleNumberInput(e.target.value, setInputDestaque)}
                      disabled={loading || saving}
                      className="block w-full pl-12 pr-4 py-4 bg-slate-50 border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-700"
                    />
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-2">
                  <InformationCircleIcon className="w-4 h-4 text-blue-600 mt-0.5" />
                  <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                    Este valor será cobrado por imóvel que o usuário desejar destacar nacionalmente na plataforma.
                  </p>
                </div>
              </div>
            </div>

            {/* Seção Corretor (Sinal de Reserva) */}
            <div className="bg-white shadow-sm border border-slate-200 rounded-3xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                    <BanknotesIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Serviços do Corretor</h2>
                    <p className="text-xs text-slate-500 font-medium">Parâmetros para geração de QR Code</p>
                  </div>
                </div>
              </div>
              <div className="p-6 flex-1 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Valor Mensal Corretor (R$)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-slate-400 font-bold text-sm">R$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={inputValorCorretor}
                      onChange={(e) => handleNumberInput(e.target.value, setInputValorCorretor)}
                      disabled={loading || saving}
                      className="block w-full pl-12 pr-4 py-4 bg-slate-50 border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold text-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Quantidade de Imóveis Incluídos</label>
                  <input
                    type="number"
                    min="0"
                    value={inputQtdeAnuncios}
                    onChange={(e) => handleNumberInput(e.target.value, setInputQtdeAnuncios)}
                    disabled={loading || saving}
                    className="block w-full px-4 py-4 bg-slate-50 border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Período do Benefício (dias)</label>
                  <input
                    type="number"
                    min="0"
                    value={inputPeriodoAnuncio}
                    onChange={(e) => handleNumberInput(e.target.value, setInputPeriodoAnuncio)}
                    disabled={loading || saving}
                    className="block w-full px-4 py-4 bg-slate-50 border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Chave PIX Oficial</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <QrCodeIcon className="w-5 h-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="CNPJ, E-mail, Celular ou Chave Aleatória"
                      value={formData.chave_pix_corretor}
                      onChange={(e) => setFormData({...formData, chave_pix_corretor: e.target.value})}
                      disabled={loading || saving}
                      className="block w-full pl-12 pr-4 py-4 bg-slate-50 border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold text-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Cidade do Beneficiário</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <GlobeAltIcon className="w-5 h-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Ex: BRASILIA"
                      value={formData.cidade_beneficiario_recebimento_corretor}
                      onChange={(e) => setFormData({...formData, cidade_beneficiario_recebimento_corretor: e.target.value})}
                      onBlur={(e) => setFormData(prev => ({ ...prev, cidade_beneficiario_recebimento_corretor: e.target.value.toUpperCase() }))}
                      disabled={loading || saving}
                      className="block w-full pl-12 pr-4 py-4 bg-slate-50 border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold text-slate-700"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Seção Leads (Roteamento + SLA) */}
            <div className="bg-white shadow-sm border border-slate-200 rounded-3xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-700">
                    <InformationCircleIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Leads (Roteamento e SLA)</h2>
                    <p className="text-xs text-slate-500 font-medium">Controle de transbordo e tempo de aceite</p>
                  </div>
                </div>
              </div>

              <div className="p-6 flex-1 space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Próximos corretores recebem leads (antes do plantonista)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={inputProximosCorretores}
                    onChange={(e) => handleNumberInput(e.target.value, setInputProximosCorretores)}
                    disabled={loading || saving}
                    className="block w-full px-4 py-4 bg-slate-50 border-slate-200 rounded-2xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-bold text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    SLA de aceite do lead (minutos)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={inputSlaMinutosAceiteLead}
                    onChange={(e) => handleNumberInput(e.target.value, setInputSlaMinutosAceiteLead)}
                    disabled={loading || saving}
                    className="block w-full px-4 py-4 bg-slate-50 border-slate-200 rounded-2xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-bold text-slate-700"
                  />
                </div>

                <div className="mt-2 p-3 bg-rose-50 rounded-xl border border-rose-100 flex items-start gap-2">
                  <InformationCircleIcon className="w-4 h-4 text-rose-700 mt-0.5" />
                  <p className="text-[11px] text-rose-800 font-medium leading-relaxed">
                    Ao expirar o SLA, o lead transborda para outros corretores elegíveis até o limite definido — depois disso, vai para o plantonista.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={() => {
                loadParametros()
                setMessage(null)
              }}
              disabled={loading || saving}
              className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
            >
              Descartar
            </button>
            <button
              type="submit"
              disabled={loading || saving}
              className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </button>
          </div>
        </form>
      </div>
    </PermissionGuard>
  )
}
