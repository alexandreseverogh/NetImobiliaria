/* eslint-disable */
'use client'

import { DollarSign, Calendar, Download, TrendingUp } from 'lucide-react'

export default function DividendHistory() {
  const dividendData = [
    {
      id: 1,
      property: 'Apartamento Premium Copacabana',
      tokenSymbol: 'NETHOUSE-01',
      tokens: 8,
      amountPerToken: 12.50,
      totalAmount: 100.00,
      paymentDate: '2024-01-01',
      status: 'paid',
      period: 'Dezembro 2023'
    },
    {
      id: 2,
      property: 'Cobertura Vista Mar Ipanema',
      tokenSymbol: 'NETHOUSE-02',
      tokens: 4,
      amountPerToken: 35.60,
      totalAmount: 142.40,
      paymentDate: '2024-01-01',
      status: 'paid',
      period: 'Dezembro 2023'
    },
    {
      id: 3,
      property: 'Apartamento Premium Copacabana',
      tokenSymbol: 'NETHOUSE-01',
      tokens: 8,
      amountPerToken: 12.00,
      totalAmount: 96.00,
      paymentDate: '2023-12-01',
      status: 'paid',
      period: 'Novembro 2023'
    },
    {
      id: 4,
      property: 'Cobertura Vista Mar Ipanema',
      tokenSymbol: 'NETHOUSE-02',
      tokens: 4,
      amountPerToken: 34.80,
      totalAmount: 139.20,
      paymentDate: '2023-12-01',
      status: 'paid',
      period: 'Novembro 2023'
    }
  ]

  const totalDividends = dividendData.reduce((sum, dividend) => sum + dividend.totalAmount, 0)
  const monthlyAverage = totalDividends / (dividendData.length / 2) // Assumindo 2 propriedades

  return (
    <div className="space-y-8">
      {/* Resumo de Dividendos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Total Recebido</p>
              <p className="text-2xl font-bold">R$ {totalDividends.toLocaleString()}</p>
              <p className="text-green-200 text-sm">Ãšltimos 2 meses</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">MÃ©dia Mensal</p>
              <p className="text-2xl font-bold">R$ {monthlyAverage.toLocaleString()}</p>
              <p className="text-blue-200 text-sm">Por mÃªs</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">PrÃ³ximo Pagamento</p>
              <p className="text-2xl font-bold">01/02</p>
              <p className="text-purple-200 text-sm">Janeiro 2024</p>
            </div>
            <Calendar className="h-8 w-8 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="all">Todas as Propriedades</option>
              <option value="NETHOUSE-01">Apartamento Premium Copacabana</option>
              <option value="NETHOUSE-02">Cobertura Vista Mar Ipanema</option>
            </select>
            
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="all">Todo PerÃ­odo</option>
              <option value="30">Ãšltimos 30 dias</option>
              <option value="90">Ãšltimos 3 meses</option>
              <option value="365">Ãšltimo ano</option>
            </select>
          </div>
          
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="h-4 w-4" />
            <span>Exportar RelatÃ³rio</span>
          </button>
        </div>
      </div>

      {/* Lista de Dividendos */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">HistÃ³rico de Dividendos</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PerÃ­odo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Propriedade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tokens</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor por Token</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data de Pagamento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {dividendData.map((dividend) => (
                <tr key={dividend.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{dividend.period}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{dividend.property}</div>
                    <div className="text-sm text-gray-500">{dividend.tokenSymbol}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{dividend.tokens}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">R$ {dividend.amountPerToken.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-green-600">R$ {dividend.totalAmount.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {new Date(dividend.paymentDate).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Pago
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GrÃ¡fico de Dividendos */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6">EvoluÃ§Ã£o dos Dividendos</h3>
        
        <div className="h-48 flex items-end justify-between space-x-2">
          {dividendData.slice(0, 4).reverse().map((dividend, index) => (
            <div key={dividend.id} className="flex flex-col items-center space-y-2 flex-1">
              <div 
                className="bg-gradient-to-t from-green-500 to-green-400 rounded-t w-full transition-all duration-500 hover:from-green-600 hover:to-green-500 cursor-pointer"
                style={{ height: `${(dividend.totalAmount / 200) * 100}px` }}
                title={`R$ ${dividend.totalAmount.toLocaleString()}`}
              ></div>
              <span className="text-xs text-gray-600 font-medium">{dividend.period.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


