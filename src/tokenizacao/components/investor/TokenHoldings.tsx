'use client'

import { useState } from 'react'
import { 
  Building, 
  MapPin, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Calendar,
  Eye,
  MoreHorizontal,
  Filter,
  Search
} from 'lucide-react'

export default function TokenHoldings() {
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Dados mockados dos tokens
  const tokenHoldings = [
    {
      id: 1,
      tokenSymbol: 'NETHOUSE-01',
      propertyName: 'Apartamento Premium Copacabana',
      location: 'Copacabana, Rio de Janeiro - RJ',
      tokensOwned: 8,
      totalTokens: 3000,
      ownershipPercentage: 0.27,
      valuePerToken: 1200,
      totalValue: 9600,
      averageCost: 1000,
      currentReturn: 20.0,
      monthlyDividend: 100,
      lastDividend: '2024-01-01',
      status: 'active',
      purchaseDate: '2023-06-15',
      image: '/api/placeholder/300/200'
    },
    {
      id: 2,
      tokenSymbol: 'NETHOUSE-02',
      propertyName: 'Cobertura Vista Mar Ipanema',
      location: 'Ipanema, Rio de Janeiro - RJ',
      tokensOwned: 4,
      totalTokens: 2000,
      ownershipPercentage: 0.20,
      valuePerToken: 2800,
      totalValue: 11200,
      averageCost: 2500,
      currentReturn: 12.0,
      monthlyDividend: 142.40,
      lastDividend: '2024-01-01',
      status: 'active',
      purchaseDate: '2023-08-20',
      image: '/api/placeholder/300/200'
    },
    {
      id: 3,
      tokenSymbol: 'NETHOUSE-03',
      propertyName: 'Loft Industrial Vila Madalena',
      location: 'Vila Madalena, São Paulo - SP',
      tokensOwned: 5,
      totalTokens: 1500,
      ownershipPercentage: 0.33,
      valuePerToken: 850,
      totalValue: 4250,
      averageCost: 800,
      currentReturn: 6.25,
      monthlyDividend: 26.56,
      lastDividend: '2024-01-01',
      status: 'active',
      purchaseDate: '2023-10-10',
      image: '/api/placeholder/300/200'
    }
  ]

  const filteredHoldings = tokenHoldings.filter(holding => {
    const matchesSearch = holding.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         holding.tokenSymbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         holding.location.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || holding.status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  const totalValue = tokenHoldings.reduce((sum, holding) => sum + holding.totalValue, 0)
  const totalReturn = tokenHoldings.reduce((sum, holding) => {
    const profit = (holding.valuePerToken - holding.averageCost) * holding.tokensOwned
    return sum + profit
  }, 0)
  const totalReturnPercentage = (totalReturn / (totalValue - totalReturn)) * 100

  return (
    <div className="space-y-6">
      {/* Header com Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Valor Total da Carteira</p>
              <p className="text-2xl font-bold">R$ {totalValue.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Ganho Total</p>
              <p className="text-2xl font-bold">+R$ {totalReturn.toLocaleString()}</p>
              <p className="text-green-200 text-sm">+{totalReturnPercentage.toFixed(1)}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Dividendos Mensais</p>
              <p className="text-2xl font-bold">
                R$ {tokenHoldings.reduce((sum, h) => sum + h.monthlyDividend, 0).toLocaleString()}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por propriedade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtro de Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativos</option>
              <option value="paused">Pausados</option>
              <option value="completed">Finalizados</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Tokens */}
      <div className="space-y-4">
        {filteredHoldings.map((holding) => (
          <div key={holding.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                {/* Informações da Propriedade */}
                <div className="flex items-start space-x-4 mb-4 lg:mb-0">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building className="h-8 w-8 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-900">{holding.propertyName}</h3>
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                        {holding.tokenSymbol}
                      </span>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        holding.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {holding.status === 'active' ? 'Ativo' : 'Pausado'}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-gray-600 text-sm mb-2">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{holding.location}</span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>Comprado em: {new Date(holding.purchaseDate).toLocaleDateString('pt-BR')}</span>
                      <span>•</span>
                      <span>{holding.ownershipPercentage.toFixed(2)}% do imóvel</span>
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Stats da Propriedade */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{holding.tokensOwned}</p>
                  <p className="text-sm text-gray-600">Tokens Possuídos</p>
                  <p className="text-xs text-gray-500">de {holding.totalTokens}</p>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">R$ {holding.valuePerToken.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Valor por Token</p>
                  <p className="text-xs text-gray-500">Custo médio: R$ {holding.averageCost.toLocaleString()}</p>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">+{holding.currentReturn.toFixed(1)}%</p>
                  <p className="text-sm text-gray-600">Retorno Atual</p>
                  <p className="text-xs text-gray-500">R$ {((holding.valuePerToken - holding.averageCost) * holding.tokensOwned).toLocaleString()}</p>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">R$ {holding.monthlyDividend.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Dividendo Mensal</p>
                  <p className="text-xs text-gray-500">Último: {new Date(holding.lastDividend).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              {/* Valor Total */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Valor Total dos Tokens</p>
                    <p className="text-2xl font-bold text-gray-900">R$ {holding.totalValue.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Ganho Total</p>
                    <p className="text-xl font-bold text-green-600">
                      +R$ {((holding.valuePerToken - holding.averageCost) * holding.tokensOwned).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Resumo */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Resumo da Carteira</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{tokenHoldings.length}</p>
            <p className="text-sm text-gray-600">Propriedades</p>
            <p className="text-xs text-gray-500">Tokenizadas</p>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              {tokenHoldings.reduce((sum, h) => sum + h.tokensOwned, 0)}
            </p>
            <p className="text-sm text-gray-600">Tokens Totais</p>
            <p className="text-xs text-gray-500">Em Carteira</p>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">
              {(tokenHoldings.reduce((sum, h) => sum + h.ownershipPercentage, 0) / tokenHoldings.length).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600">Participação Média</p>
            <p className="text-xs text-gray-500">Por Propriedade</p>
          </div>
        </div>
      </div>
    </div>
  )
}

