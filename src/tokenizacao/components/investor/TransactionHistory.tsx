'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Calendar, Filter, Download } from 'lucide-react'

export default function TransactionHistory() {
  const [filterType, setFilterType] = useState('all')
  const [filterPeriod, setFilterPeriod] = useState('all')

  const transactions = [
    {
      id: 1,
      type: 'buy',
      property: 'Apartamento Premium Copacabana',
      tokenSymbol: 'NETHOUSE-01',
      tokens: 2,
      pricePerToken: 1200,
      totalAmount: 2400,
      date: '2024-01-15',
      status: 'confirmed',
      txHash: '0x1234...5678'
    },
    {
      id: 2,
      type: 'dividend',
      property: 'Cobertura Vista Mar Ipanema',
      tokenSymbol: 'NETHOUSE-02',
      tokens: null,
      pricePerToken: null,
      totalAmount: 142.40,
      date: '2024-01-01',
      status: 'paid',
      txHash: null
    },
    {
      id: 3,
      type: 'buy',
      property: 'Apartamento Premium Copacabana',
      tokenSymbol: 'NETHOUSE-01',
      tokens: 3,
      pricePerToken: 1200,
      totalAmount: 3600,
      date: '2023-12-20',
      status: 'confirmed',
      txHash: '0x9876...5432'
    }
  ]

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'buy':
        return <TrendingUp className="h-5 w-5 text-green-600" />
      case 'sell':
        return <TrendingDown className="h-5 w-5 text-red-600" />
      case 'dividend':
        return <DollarSign className="h-5 w-5 text-blue-600" />
      default:
        return <DollarSign className="h-5 w-5 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os Tipos</option>
              <option value="buy">Compras</option>
              <option value="sell">Vendas</option>
              <option value="dividend">Dividendos</option>
            </select>
            
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todo Período</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 3 meses</option>
              <option value="365">Último ano</option>
            </select>
          </div>
          
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="h-4 w-4" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Lista de Transações */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Propriedade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detalhes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getTransactionIcon(transaction.type)}
                      <span className="text-sm font-medium capitalize">{transaction.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{transaction.property}</div>
                    <div className="text-sm text-gray-500">{transaction.tokenSymbol}</div>
                  </td>
                  <td className="px-6 py-4">
                    {transaction.tokens && (
                      <div className="text-sm text-gray-900">
                        {transaction.tokens} tokens @ R$ {transaction.pricePerToken?.toLocaleString()}
                      </div>
                    )}
                    {transaction.txHash && (
                      <div className="text-xs text-gray-500 font-mono">{transaction.txHash}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${
                      transaction.type === 'dividend' ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      R$ {transaction.totalAmount.toLocaleString()}
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
  )
}

