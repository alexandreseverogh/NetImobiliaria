/* eslint-disable */
'use client'

import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react'

export default function PerformanceCharts() {
  const performanceData = [
    { month: 'Jan', value: 15000, dividend: 187.50 },
    { month: 'Fev', value: 15250, dividend: 190.25 },
    { month: 'Mar', value: 15800, dividend: 197.50 },
    { month: 'Abr', value: 16150, dividend: 201.88 },
    { month: 'Mai', value: 16500, dividend: 206.25 },
    { month: 'Jun', value: 17250, dividend: 215.63 }
  ]

  const totalReturn = ((performanceData[performanceData.length - 1].value - performanceData[0].value) / performanceData[0].value) * 100
  const totalDividends = performanceData.reduce((sum, data) => sum + data.dividend, 0)

  return (
    <div className="space-y-8">
      {/* Resumo de Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Retorno Total</p>
              <p className="text-2xl font-bold">+{totalReturn.toFixed(1)}%</p>
              <p className="text-green-200 text-sm">R$ {(performanceData[performanceData.length - 1].value - performanceData[0].value).toLocaleString()}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Dividendos Totais</p>
              <p className="text-2xl font-bold">R$ {totalDividends.toLocaleString()}</p>
              <p className="text-blue-200 text-sm">Ãšltimos 6 meses</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Rendimento MÃ©dio</p>
              <p className="text-2xl font-bold">{(totalDividends / performanceData.length).toFixed(0)}</p>
              <p className="text-purple-200 text-sm">R$ por mÃªs</p>
            </div>
            <Calendar className="h-8 w-8 text-purple-200" />
          </div>
        </div>
      </div>

      {/* GrÃ¡fico de Performance */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6">EvoluÃ§Ã£o do PortfÃ³lio</h3>
        
        <div className="h-64 flex items-end justify-between space-x-2">
          {performanceData.map((data, index) => (
            <div key={index} className="flex flex-col items-center space-y-2 flex-1">
              <div 
                className="bg-gradient-to-t from-blue-500 to-purple-500 rounded-t w-full transition-all duration-500 hover:from-blue-600 hover:to-purple-600 cursor-pointer"
                style={{ height: `${(data.value / 20000) * 100}px` }}
                title={`R$ ${data.value.toLocaleString()}`}
              ></div>
              <span className="text-xs text-gray-600 font-medium">{data.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabela de Performance Mensal */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Performance Mensal</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MÃªs</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor do PortfÃ³lio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">VariaÃ§Ã£o</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dividendos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retorno</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {performanceData.map((data, index) => {
                const previousValue = index > 0 ? performanceData[index - 1].value : data.value
                const variation = data.value - previousValue
                const returnPercentage = ((data.value - previousValue) / previousValue) * 100
                
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{data.month}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">R$ {data.value.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium flex items-center ${
                        variation >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {variation >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                        R$ {variation.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">R$ {data.dividend.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        returnPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {returnPercentage >= 0 ? '+' : ''}{returnPercentage.toFixed(2)}%
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


