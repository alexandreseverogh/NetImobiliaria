interface StatsCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: string
  color: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'indigo'
  trend?: {
    value: number
    isPositive: boolean
  }
}

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  orange: 'bg-orange-100 text-orange-600',
  pink: 'bg-pink-100 text-pink-600',
  indigo: 'bg-indigo-100 text-indigo-600'
}

export default function StatsCard({ title, value, subtitle, icon, color, trend }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <span className="text-2xl">{icon}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        
        {trend && (
          <div className={`flex items-center space-x-1 ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            <span className="text-sm font-medium">
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
            <span className="text-xs">
              {trend.isPositive ? '↗' : '↘'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}











