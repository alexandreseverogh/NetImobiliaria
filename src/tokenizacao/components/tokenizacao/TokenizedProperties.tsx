/* eslint-disable */
'use client'

import { useState, useEffect } from 'react'
import { 
  MapPinIcon, 
  CurrencyDollarIcon, 
  ChartBarIcon,
  ArrowRightIcon,
  EyeIcon,
  HeartIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface TokenData {
  id: string
  token_symbol: string
  token_name: string
  token_price: number
  total_supply: number
  tokens_disponiveis: number
  tokens_vendidos: number
  percentual_vendido: number
  valor_arrecadado: number
  status: string
  imovel_titulo: string
  imovel_endereco: string
  valor_original_imovel: number
  data_tokenizacao: string
}

export default function TokenizedProperties() {
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'coming_soon'>('all')
  const [tokens, setTokens] = useState<TokenData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTokens()
  }, [])

  const fetchTokens = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tokens?status=ACTIVE&limit=20')
      const data = await response.json()
      
      if (data.success) {
        setTokens(data.data)
      } else {
        setError('Erro ao carregar tokens')
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor')
      console.error('Erro ao buscar tokens:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredTokens = tokens.filter(token => {
    if (activeTab === 'all') return true
    if (activeTab === 'active') return token.status === 'ACTIVE' && token.tokens_disponiveis > 0
    if (activeTab === 'coming_soon') return token.status === 'PENDING'
    return true
  })

  const getStatusColor = (token: TokenData) => {
    if (token.tokens_disponiveis === 0) return 'bg-red-100 text-red-800'
    if (token.status === 'ACTIVE') return 'bg-green-100 text-green-800'
    if (token.status === 'PENDING') return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (token: TokenData) => {
    if (token.tokens_disponiveis === 0) return 'Esgotado'
    if (token.status === 'ACTIVE') return 'TokenizaÃ§Ã£o Ativa'
    if (token.status === 'PENDING') return 'Em Breve'
    return 'IndisponÃ­vel'
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value)
  }

  if (loading) {
    return (
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              ImÃ³veis
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                Tokenizados
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Invista em imÃ³veis premium atravÃ©s de tokens digitais
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-300"></div>
                <div className="p-6">
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
                  <div className="h-6 bg-gray-300 rounded mb-4"></div>
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro ao carregar dados</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button 
              onClick={fetchTokens}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            ImÃ³veis
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Tokenizados
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Invista em propriedades premium selecionadas cuidadosamente por nossa equipe 
            de especialistas em mercado imobiliÃ¡rio.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex justify-center mb-12">
          <div className="bg-gray-100 rounded-lg p-1 flex">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                activeTab === 'all'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Todos ({tokens.length})
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                activeTab === 'active'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Ativos ({tokens.filter(t => t.status === 'ACTIVE' && t.tokens_disponiveis > 0).length})
            </button>
            <button
              onClick={() => setActiveTab('coming_soon')}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                activeTab === 'coming_soon'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Em Breve ({tokens.filter(t => t.status === 'PENDING').length})
            </button>
          </div>
        </div>

        {/* Properties Grid */}
        {filteredTokens.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredTokens.map((token) => (
              <div
                key={token.id}
                className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
              >
                {/* Property Image */}
                <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden">
                  <div className="absolute inset-0 bg-black/20"></div>
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(token)}`}>
                      {getStatusText(token)}
                    </span>
                  </div>
                  <div className="absolute top-4 right-4 flex space-x-2">
                    <button className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors">
                      <HeartIcon className="h-5 w-5 text-white" />
                    </button>
                    <button className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors">
                      <EyeIcon className="h-5 w-5 text-white" />
                    </button>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-white font-bold text-lg mb-1">{token.imovel_titulo}</h3>
                    <div className="flex items-center text-white/90 text-sm">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      <span>{token.imovel_endereco}</span>
                    </div>
                  </div>
                </div>

                {/* Property Details */}
                <div className="p-6">
                  {/* Token Info */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Token</span>
                      <span className="text-sm font-bold text-blue-600">{token.token_symbol}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">PreÃ§o por Token</span>
                      <span className="text-lg font-bold text-gray-900">{formatCurrency(token.token_price)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">Progresso da TokenizaÃ§Ã£o</span>
                      <span className="font-semibold text-gray-900">{token.percentual_vendido}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${token.percentual_vendido}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {formatNumber(token.tokens_disponiveis)}
                      </div>
                      <div className="text-xs text-gray-600">Tokens DisponÃ­veis</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatNumber(token.tokens_vendidos)}
                      </div>
                      <div className="text-xs text-gray-600">Tokens Vendidos</div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex space-x-3">
                    {token.tokens_disponiveis > 0 ? (
                      <a
                        href={`/investidor?token=${token.id}`}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold text-center hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
                      >
                        <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                        Investir Agora
                      </a>
                    ) : (
                      <button
                        disabled
                        className="flex-1 bg-gray-300 text-gray-500 py-3 px-4 rounded-lg font-semibold cursor-not-allowed"
                      >
                        Esgotado
                      </button>
                    )}
                    <a
                      href={`/tokens/${token.id}`}
                      className="bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <ChartBarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {activeTab === 'all' ? 'Nenhum token encontrado' : 
               activeTab === 'active' ? 'Nenhum token ativo no momento' : 
               'Nenhum token em breve'}
            </h3>
            <p className="text-gray-600 mb-6">
              {activeTab === 'all' ? 'NÃ£o hÃ¡ tokens disponÃ­veis no momento.' :
               activeTab === 'active' ? 'Todos os tokens ativos estÃ£o esgotados.' :
               'NÃ£o hÃ¡ tokens programados para lanÃ§amento.'}
            </p>
            <button 
              onClick={fetchTokens}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Atualizar Lista
            </button>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              NÃ£o encontrou o que procura?
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Nossa equipe estÃ¡ sempre trabalhando para trazer novos imÃ³veis premium. 
              Cadastre-se para ser notificado sobre novos lanÃ§amentos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/investidor"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <ChartBarIcon className="mr-2 h-5 w-5" />
                Cadastrar-se como Investidor
              </a>
              <a
                href="/contato"
                className="inline-flex items-center px-8 py-4 border-2 border-blue-600 text-blue-600 font-semibold text-lg rounded-lg hover:bg-blue-600 hover:text-white transition-all duration-300"
              >
                <ArrowRightIcon className="mr-2 h-5 w-5" />
                Falar com Especialista
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
