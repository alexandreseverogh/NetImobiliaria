'use client'

import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  Calendar,
  MapPin,
  Building
} from 'lucide-react'

interface PortfolioOverviewProps {
  investorData: {
    name: string
    email: string
    totalInvested: number
    currentValue: number
    totalReturn: number
    returnPercentage: number
    monthlyDividends: number
    totalDividends: number
    kycStatus: string
    riskProfile: string
  }
}

export default function PortfolioOverview({ investorData }: PortfolioOverviewProps) {
  // Dados mockados do portfólio
  const portfolioData = {
    totalTokens: 12,
    properties: [
      {
        id: 1,
        name: 'Apartamento Premium Copacabana',
        location: 'Copacabana, Rio de Janeiro - RJ',
        tokens: 8,
        valuePerToken: 1200,
        totalValue: 9600,
        returnPercentage: 12.5,
        monthlyDividend: 100,
        image: '/api/placeholder/300/200'
      },
      {
        id: 2,
        name: 'Cobertura Vista Mar Ipanema',
        location: 'Ipanema, Rio de Janeiro - RJ',
        tokens: 4,
        valuePerToken: 2800,
        totalValue: 11200,
        returnPercentage: 15.2,
        monthlyDividend: 142.40,
        image: '/api/placeholder/300/200'
      }
    ],
    recentTransactions: [
      {
        id: 1,
        type: 'buy',
        property: 'Apartamento Premium Copacabana',
        tokens: 2,
        amount: 2400,
        date: '2024-01-15',
        status: 'confirmed'
      },
      {
        id: 2,
        type: 'dividend',
        property: 'Cobertura Vista Mar Ipanema',
        amount: 142.40,
        date: '2024-01-01',
        status: 'paid'
      },
      {
        id: 3,
        type: 'buy',
        property: 'Apartamento Premium Copacabana',
        tokens: 3,
        amount: 3600,
        date: '2023-12-20',
        status: 'confirmed'
      }
    ],
    performanceData: [
      { month: 'Jan', value: 15000 },
      { month: 'Fev', value: 15250 },
      { month: 'Mar', value: 15800 },
      { month: 'Abr', value: 16150 },
      { month: 'Mai', value: 16500 },
      { month: 'Jun', value: 17250 }
    ]
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'buy':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'sell':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      case 'dividend':
        return <DollarSign className="h-4 w-4 text-blue-600" />
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />
    }
  }

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'buy':
        return 'Compra'
      case 'sell':
        return 'Venda'
      case 'dividend':
        return 'Dividendo'
      default:
        return 'Transação'
    }
  }

  return (
    <div className="space-y-8">
      {/* Resumo do Portfólio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de Performance */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Performance do Portfólio</h3>
            <PieChart className="h-6 w-6 text-blue-600" />
          </div>
          
          {/* Gráfico Simples */}
          <div className="h-48 flex items-end justify-between space-x-2">
            {portfolioData.performanceData.map((data, index) => (
              <div key={index} className="flex flex-col items-center space-y-2">
                <div 
                  className="bg-gradient-to-t from-blue-500 to-purple-500 rounded-t w-8 transition-all duration-500 hover:from-blue-600 hover:to-purple-600"
                  style={{ height: `${(data.value / 20000) * 100}px` }}
                ></div>
                <span className="text-xs text-gray-600 font-medium">{data.month}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-gray-600">Valor do Portfólio</span>
            <span className="text-lg font-bold text-green-600">
              +{investorData.returnPercentage}%
            </span>
          </div>
        </div>

        {/* Distribuição por Propriedade */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Distribuição por Propriedade</h3>
          
          <div className="space-y-4">
            {portfolioData.properties.map((property) => (
              <div key={property.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                    <Building className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{property.name}</h4>
                    <p className="text-xs text-gray-600">{property.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{property.tokens} tokens</p>
                  <p className="text-sm text-gray-600">R$ {property.totalValue.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Minhas Propriedades */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-6">Minhas Propriedades Tokenizadas</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {portfolioData.properties.map((property) => (
            <div key={property.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
              {/* Imagem */}
              <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <Building className="h-16 w-16 text-blue-400" />
              </div>
              
              {/* Conteúdo */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{property.name}</h4>
                    <div className="flex items-center text-gray-600 text-sm">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{property.location}</span>
                    </div>
                  </div>
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                    Ativo
                  </span>
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{property.tokens}</p>
                    <p className="text-xs text-gray-600">Tokens</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">+{property.returnPercentage}%</p>
                    <p className="text-xs text-gray-600">ROI</p>
                  </div>
                </div>
                
                {/* Valores */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valor Total:</span>
                    <span className="font-semibold">R$ {property.totalValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dividendo Mensal:</span>
                    <span className="font-semibold text-green-600">R$ {property.monthlyDividend.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transações Recentes */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-6">Transações Recentes</h3>
        
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transação
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Propriedade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {portfolioData.recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getTransactionIcon(transaction.type)}
                        <span className="text-sm font-medium text-gray-900">
                          {getTransactionLabel(transaction.type)}
                        </span>
                        {transaction.tokens && (
                          <span className="text-xs text-gray-500">
                            ({transaction.tokens} tokens)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{transaction.property}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        transaction.type === 'dividend' ? 'text-green-600' : 'text-gray-900'
                      }`}>
                        R$ {transaction.amount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {new Date(transaction.date).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        transaction.status === 'confirmed' || transaction.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {transaction.status === 'confirmed' ? 'Confirmado' : 
                         transaction.status === 'paid' ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

