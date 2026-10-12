'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/useApi'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartPieIcon } from '@heroicons/react/24/outline'

interface TopFeatureItem {
  label: string
  feature_slug: string | null
  count: number
}

interface Props {
  startDate: string
  endDate: string
  tenantId: string
  userId: string
}

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
  '#ec4899', '#14b8a6', '#8b5cf6', '#84cc16', '#f97316',
]

export default function TopFeaturesPieChart({ startDate, endDate, tenantId, userId }: Props) {
  const { get } = useApi()
  const [items, setItems] = useState<TopFeatureItem[]>([])
  const [totalAccesses, setTotalAccesses] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (tenantId) params.set('tenantId', tenantId)
      if (userId) params.set('userId', userId)

      const response = await get(`/api/admin/master/access-logs/top-features?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setItems(data.items || [])
        setTotalAccesses(data.totalAccesses || 0)
      }
    } catch (error) {
      console.error('Erro ao carregar top funcionalidades:', error)
    } finally {
      setLoading(false)
    }
  }, [get, startDate, endDate, tenantId, userId])

  useEffect(() => {
    load()
  }, [load])

  const chartData = items.map((item, i) => ({
    name: item.label,
    value: item.count,
    color: COLORS[i % COLORS.length],
  }))

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center mb-1">
        <ChartPieIcon className="h-5 w-5 mr-2 text-blue-600" />
        Top 10 Funcionalidades
      </h3>
      <p className="text-xs text-gray-400 font-medium mb-4">
        Mais acessadas por administradores de empresa
      </p>

      {loading ? (
        <div className="py-16 text-center text-xs font-bold text-gray-400 animate-pulse">
          Carregando...
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-xs font-bold text-gray-400">
          Nenhum acesso encontrado para este filtro.
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={38}
                paddingAngle={3}
                labelLine={false}
                label={({ cx, cy, midAngle, innerRadius, outerRadius, value, percent }: any) => {
                  if (percent < 0.05) return null
                  const RADIAN = Math.PI / 180
                  const r = innerRadius + (outerRadius - innerRadius) * 0.55
                  const x = cx + r * Math.cos(-midAngle * RADIAN)
                  const y = cy + r * Math.sin(-midAngle * RADIAN)
                  return (
                    <text
                      x={x}
                      y={y}
                      fill="#fff"
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{ fontSize: 11, fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
                    >
                      {value}
                    </text>
                  )
                }}
              >
                {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip
                formatter={(v: any, name: any) => [
                  `${v} acesso(s) — ${totalAccesses > 0 ? ((Number(v) / totalAccesses) * 100).toFixed(1) : 0}%`,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex flex-col gap-1.5 mt-3">
            {items.map((item, i) => (
              <div key={item.feature_slug || item.label} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-[11px] flex-1 leading-tight text-gray-600 truncate" title={item.label}>
                  {item.label}
                </span>
                <span className="text-[11px] font-semibold shrink-0 text-gray-500">
                  {totalAccesses > 0 ? ((item.count / totalAccesses) * 100).toFixed(1) : 0}%
                </span>
                <span className="text-[11px] font-bold shrink-0 min-w-[28px] text-right text-gray-800">
                  {item.count}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-1 pt-2 border-t border-gray-100">
              <span className="w-2.5 h-2.5 shrink-0" />
              <span className="text-[10px] flex-1 font-black uppercase tracking-wide text-gray-400">
                Total de Acessos
              </span>
              <span className="text-[11px] font-black shrink-0 min-w-[28px] text-right text-gray-900">
                {totalAccesses}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
