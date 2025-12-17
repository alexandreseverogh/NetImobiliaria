'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface PieChartCardProps {
  title: string
  data: Array<{ name: string; value: number }>
  colors?: string[]
  loading?: boolean
}

const DEFAULT_COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // green-500
  '#F59E0B', // yellow-500
  '#EF4444', // red-500
  '#8B5CF6', // purple-500
  '#EC4899', // pink-500
  '#14B8A6', // teal-500
  '#F97316', // orange-500
  '#6366F1', // indigo-500
  '#84CC16', // lime-500
  '#06B6D4', // cyan-500
  '#F43F5E', // rose-500
]

export function PieChartCard({ title, data, colors = DEFAULT_COLORS, loading = false }: PieChartCardProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-lg hover:shadow-xl transition-shadow flex flex-col h-full">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-lg hover:shadow-xl transition-shadow flex flex-col h-full">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Nenhum dado disponível</p>
        </div>
      </div>
    )
  }

  const sortedData = [...data].sort((a, b) => b.value - a.value)

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-lg p-4 hover:shadow-2xl transition-all flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <span className="text-xs font-medium text-white bg-blue-600 px-2 py-1 rounded-full">
          {total}
        </span>
      </div>
      
      <div className="flex-shrink-0">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={sortedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={false}
              outerRadius={90}
              fill="#8884d8"
              dataKey="value"
            >
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1F2937',
                border: 'none',
                borderRadius: '8px',
                color: 'white'
              }}
              formatter={(value: any, name: string) => [
                `${value} (${((value / total) * 100).toFixed(1)}%)`,
                name
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex-1 overflow-hidden">
        <div className="max-h-48 overflow-y-auto pr-2 space-y-1.5 custom-scrollbar">
          {sortedData.map((entry, index) => {
            const percentage = ((entry.value / total) * 100).toFixed(1)
            return (
              <div 
                key={`legend-${index}`}
                className="flex items-center justify-between text-xs hover:bg-blue-50 p-1.5 rounded transition-colors border border-transparent hover:border-blue-100"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div 
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <span className="text-gray-700 truncate" title={entry.name}>
                    {entry.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="font-semibold text-gray-900">{entry.value}</span>
                  <span className="text-gray-500">({percentage}%)</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

