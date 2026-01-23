'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface CorretorPopupProps {
  isOpen: boolean
  onClose: () => void
  onCadastrarClick: () => void
  onLoginClick: () => void
}

interface CorretorPlanData {
  valor_corretor: number
  qtde_anuncios_imoveis_corretor: number
  periodo_anuncio_corretor: number
  valor_mensal_imovel: number
}

function CorretorManifestoDrawer({
  isOpen,
  onClose,
  onCadastrarClick
}: {
  isOpen: boolean
  onClose: () => void
  onCadastrarClick: () => void
}) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const [activeTab, setActiveTab] = useState<'essencia' | 'como' | 'confianca'>('essencia')
  const [slaMinutos, setSlaMinutos] = useState<number>(5)

  useEffect(() => {
    if (!isOpen) return

    // Preserve focus + lock scroll
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'

    const t = window.setTimeout(() => {
      closeButtonRef.current?.focus()
    }, 0)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.clearTimeout(t)
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
      previouslyFocusedRef.current?.focus?.()
      previouslyFocusedRef.current = null
    }
  }, [isOpen, onClose])

  // Carregar SLA (parametros.sla_minutos_aceite_lead) para exibir aviso de transbordo no manifesto
  useEffect(() => {
    if (!isOpen) return
      ; (async () => {
        try {
          const response = await fetch('/api/public/corretor/plano')
          if (!response.ok) return
          const json = await response.json()
          const n = Number(json?.data?.sla_minutos_aceite_lead)
          if (Number.isFinite(n) && n > 0) setSlaMinutos(n)
        } catch { }
      })()
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="manifesto-title">
      {/* Backdrop */}
      <button type="button" aria-label="Fechar manifesto" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel: mobile fullscreen, desktop drawer */}
      <div className="absolute inset-0 flex justify-end md:p-4 md:items-start">
        <div className="relative w-full h-full bg-white shadow-2xl md:max-w-xl md:h-auto md:max-h-[calc(100vh-2rem)] md:rounded-2xl overflow-hidden md:self-start">
          <div className="flex flex-col h-full md:h-auto">
            {/* Header */}
            <div className="bg-white/90 backdrop-blur border-b border-gray-200">
              <div className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Manifesto do Corretor</p>
                  <h2 id="manifesto-title" className="text-xl font-black text-gray-900 leading-tight mt-1">
                    Você não vende imóveis. Você guia decisões de vida.
                  </h2>
                  <p className="text-sm text-gray-600 mt-2">Direto ao ponto — com propósito.</p>
                </div>

                <button
                  ref={closeButtonRef}
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="px-4 pb-3">
                <div className="inline-flex w-full rounded-xl bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('essencia')}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${activeTab === 'essencia' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    aria-pressed={activeTab === 'essencia'}
                  >
                    Essência
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('como')}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${activeTab === 'como' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    aria-pressed={activeTab === 'como'}
                  >
                    Como ajudamos
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('confianca')}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${activeTab === 'confianca' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    aria-pressed={activeTab === 'confianca'}
                  >
                    Confiança
                  </button>
                </div>
              </div>
            </div>

            {/* Content (no-scroll by design: each tab fits) */}
            <div className="px-4 py-3 md:overflow-y-auto">
              {activeTab === 'essencia' && (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                    <p className="text-sm text-gray-800 leading-relaxed">
                      Tem gente que procura “um imóvel”. Mas, na verdade, está procurando <strong>segurança</strong>,{' '}
                      <strong>pertencimento</strong> e um lugar para viver o próximo capítulo da vida.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4">
                    <h3 className="text-sm font-extrabold text-gray-900">O que a Imovtec acredita</h3>
                    <ul className="mt-2 space-y-2 text-sm text-gray-700 leading-relaxed">
                      <li className="flex gap-2">
                        <span className="text-blue-700 font-bold">•</span>
                        <span>Um bom atendimento não começa no preço — começa na história, na dor e no sonho.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-700 font-bold">•</span>
                        <span>O imóvel certo é o que ele oferece por dentro e o que o bairro entrega ao redor.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-700 font-bold">•</span>
                        <span>Processo bem feito protege o cliente e valoriza o corretor — e isso vira confiança.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                    <p className="text-sm text-gray-800 leading-relaxed">
                      Você não trabalha com “contatos”. Você trabalha com pessoas — e pessoas decidem melhor quando se sentem compreendidas.
                    </p>
                    <p className="text-xs italic text-red-600 mt-2 leading-relaxed">
                      Atenção: para proteger o tempo certo do cliente, os leads têm SLA de aceite de <strong>{slaMinutos} min</strong>. Se o aceite não ocorrer nesse prazo, o lead pode ser redirecionado para outro corretor.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'como' && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <h3 className="text-sm font-extrabold text-gray-900">O que a plataforma faz por você</h3>
                    <div className="mt-2 space-y-2 text-sm text-gray-700">
                      <div className="flex items-start gap-2">
                        <span className="text-blue-700 font-bold">✓</span>
                        <span>Investe em divulgação e capta leads (Meta/YouTube + outras fontes).</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-blue-700 font-bold">✓</span>
                        <span>Entrega leads com intenção, região e preferências — com contexto do “porquê”.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-blue-700 font-bold">✓</span>
                        <span>Conecta perfil do cliente com características do imóvel e do entorno.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-blue-700 font-bold">✓</span>
                        <span>Organiza tudo por etapas e prioridade, para você não perder o timing.</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-2xl border border-gray-200 p-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Para o seu dia a dia</p>
                      <p className="text-sm text-gray-800 leading-relaxed mt-1">
                        Menos conversa vazia. Mais clareza. Mais visitas com gente que realmente tem perfil.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-gray-200 p-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Para sua logística</p>
                      <p className="text-sm text-gray-800 leading-relaxed mt-1">
                        Você informa seus estados/cidades de atuação e recebe oportunidades mais coerentes com sua presença e atendimento.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'confianca' && (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <h3 className="text-sm font-extrabold text-amber-900">CRECI não é detalhe. É proteção.</h3>
                    <p className="text-sm text-amber-900/90 leading-relaxed mt-2">
                      A plataforma exige CRECI válido e passa por validação. Isso protege o cliente, protege o mercado e fortalece seu
                      posicionamento profissional.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4">
                    <h3 className="text-sm font-extrabold text-gray-900">Transparência para o corretor confiar</h3>
                    <ul className="mt-2 space-y-2 text-sm text-gray-700 leading-relaxed">
                      <li className="flex gap-2">
                        <span className="text-blue-700 font-bold">•</span>
                        <span>Regras claras de entrega e acompanhamento de oportunidades.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-700 font-bold">•</span>
                        <span>Mais rastreabilidade do atendimento (para não perder o lead pelo caminho).</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-700 font-bold">•</span>
                        <span>Um processo que dá previsibilidade — sem tirar sua autonomia.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                    <p className="text-sm text-gray-800 leading-relaxed">
                      Se isso faz sentido para você, cadastre-se e comece com uma plataforma que investe em divulgação e te ajuda a transformar
                      interesse em visita — e visita em conquista.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer CTA */}
            <div className="bg-white/95 backdrop-blur border-t border-gray-200 p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    onClose()
                    onCadastrarClick()
                  }}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm"
                >
                  Quero me cadastrar
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors border-2 border-gray-300 text-sm"
                >
                  Voltar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CorretorPopup({ isOpen, onClose, onCadastrarClick, onLoginClick }: CorretorPopupProps) {
  const [planData, setPlanData] = useState<CorretorPlanData>({
    valor_corretor: 0,
    qtde_anuncios_imoveis_corretor: 5,
    periodo_anuncio_corretor: 30,
    valor_mensal_imovel: 0
  })
  const [loading, setLoading] = useState(true)
  const [manifestoOpen, setManifestoOpen] = useState(false)
  const manifestoLabel = useMemo(() => 'Ler o Manifesto do Corretor (2 min)', [])

  useEffect(() => {
    if (isOpen) {
      loadPlanData()
    }
  }, [isOpen])

  const loadPlanData = async () => {
    try {
      const response = await fetch('/api/public/corretor/plano')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setPlanData(result.data)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do plano:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-6 my-8">
        <CorretorManifestoDrawer
          isOpen={manifestoOpen}
          onClose={() => setManifestoOpen(false)}
          onCadastrarClick={onCadastrarClick}
        />

        <button
          onClick={onClose}
          className="absolute top-3 right-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-800 bg-gray-100 border-2 border-gray-300 hover:bg-gray-200 rounded-lg transition-colors z-20 shadow-md"
          aria-label="Fechar"
        >
          <span>Fechar</span>
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-4">
          {/* Título Principal */}
          <div className="text-center border-b pb-3">
            <h2 className="text-2xl font-black text-gray-900">
              Boas-vindas à nova geração do mercado imobiliário
            </h2>
          </div>

          {/* Duas colunas: Esquerda (texto) e Direita (valores) */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Coluna Esquerda: Proposta de valor */}
            <div className="space-y-3">
              {/* Introdução */}
              <div className="text-gray-700 leading-relaxed">
                <p className="text-base">
                  Aqui, você <strong>não apenas anuncia imóveis</strong>. Você conta com uma plataforma que trabalha por você, <strong>24 horas por dia</strong>.
                </p>
              </div>

              {/* Missão */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl">
                <p className="text-sm text-gray-800 leading-relaxed">
                  Nossa missão é investir na divulgação dos seus imóveis, utilizando <strong>inteligência avançada</strong> para identificar, analisar e conectar seus anúncios a compradores e locatários com real potencial de fechamento — no momento certo e com o perfil ideal.
                </p>
              </div>

              {/* O que a plataforma faz */}
              <div className="space-y-2">
                <p className="text-gray-800 font-semibold text-sm">
                  Enquanto você foca no relacionamento e na negociação, a plataforma:
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-start">
                    <span className="text-blue-600 mr-2 text-lg flex-shrink-0">✓</span>
                    <span className="text-gray-700 text-sm">Promove seus imóveis continuamente nos canais certos</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-blue-600 mr-2 text-lg flex-shrink-0">✓</span>
                    <span className="text-gray-700 text-sm">Cruza perfis de compradores com características dos imóveis</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-blue-600 mr-2 text-lg flex-shrink-0">✓</span>
                    <span className="text-gray-700 text-sm">Entrega leads qualificados com alto índice de compatibilidade</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-blue-600 mr-2 text-lg flex-shrink-0">✓</span>
                    <span className="text-gray-700 text-sm">Envia oportunidades exclusivas de proprietários ainda não anunciantes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Como funciona - Valores */}
            <div className="space-y-3">
              {!loading && (
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-4 h-full flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-amber-900 mb-3 flex items-center">
                      <span className="mr-2">💼</span> Como funciona
                    </h3>

                    <div className="space-y-2 text-gray-800 text-sm">
                      <div className="bg-white/50 rounded-lg p-3">
                        <p className="font-semibold text-gray-700 text-xs mb-1">Acesso mensal do corretor:</p>
                        <p className="text-2xl font-black text-blue-700">{formatCurrency(planData.valor_corretor)}</p>
                      </div>

                      <div className="bg-white/50 rounded-lg p-3">
                        <p className="font-semibold text-gray-700 text-xs mb-1">Benefício inicial:</p>
                        <p>
                          Até <strong className="text-blue-700">{planData.qtde_anuncios_imoveis_corretor} imóveis</strong> incluídos por{' '}
                          <strong className="text-blue-700">{planData.periodo_anuncio_corretor} dias</strong>
                        </p>
                      </div>

                      <div className="bg-white/50 rounded-lg p-3">
                        <p className="font-semibold text-gray-700 text-xs mb-1">Após o período inicial:</p>
                        <p>
                          <strong className="text-blue-700 text-lg">{formatCurrency(planData.valor_mensal_imovel)}</strong> <span className="text-gray-600">por imóvel/mês</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-amber-300">
                    <p className="text-xs text-amber-900 italic">
                      Para manter o padrão de excelência e segurança da plataforma, o <strong>CRECI é obrigatório</strong> e passará por validação.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Acesse agora + Footer combinados */}
          <div className="border-t pt-4 space-y-3">
            <h3 className="text-lg font-bold text-gray-900 text-center">Acesse agora</h3>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={onCadastrarClick}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm"
              >
                🚀 Quero me cadastrar como corretor
              </button>

              <button
                onClick={onLoginClick}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors border-2 border-gray-300 text-sm"
              >
                🔑 Já tenho conta — entrar na plataforma
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setManifestoOpen(true)}
                className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800 hover:underline underline-offset-4"
              >
                {manifestoLabel}
              </button>
            </div>

            {/* Footer integrado */}
            <div className="text-center pt-2">
              <p className="text-gray-600 italic text-xs">
                Mais tecnologia, mais inteligência, mais oportunidades.
              </p>
              <p className="text-blue-700 font-bold text-sm mt-0.5">
                Aqui, a nossa plataforma trabalha a seu favor, 7 dias por semana e 24h por dia.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


