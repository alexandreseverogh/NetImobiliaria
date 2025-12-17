'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface BarChartCardProps {
  title: string
  data: Array<{
    name: string
    quantidade: number
  }>
  icon: string
  color: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'indigo'
}

const colorClasses = {
  blue: 'bg-blue-50 border-blue-200',
  green: 'bg-green-50 border-green-200',
  purple: 'bg-purple-50 border-purple-200',
  orange: 'bg-orange-50 border-orange-200',
  pink: 'bg-pink-50 border-pink-200',
  indigo: 'bg-indigo-50 border-indigo-200'
}

const barColors = {
  blue: '#3B82F6',
  green: '#10B981',
  purple: '#8B5CF6',
  orange: '#F59E0B',
  pink: '#EC4899',
  indigo: '#6366F1'
}

export default function BarChartCard({ title, data, icon, color }: BarChartCardProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-600">
            Quantidade: <span className="font-semibold">{payload[0].value}</span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${colorClasses[color]} p-6 hover:shadow-md transition-all duration-200`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-xl">{icon}</span>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="quantidade" 
              fill={barColors[color]}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}











