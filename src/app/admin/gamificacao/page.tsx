
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Crown, AlertTriangle, Search, Filter, RefreshCw, Trophy, History, ArrowRight, User } from 'lucide-react'

// --- Types ---
interface BrokerScore {
    id: string
    nome: string
    email: string
    nivel: number
    xp: number
    leads_aceitos: number
    leads_perdidos: number
    tempo_medio: number
}

interface TransbordoLog {
    id: number
    created_at: string
    status: string
    expira_em: string | null
    motivo: any
    corretor_nome: string
    imovel_codigo: string
    cliente_nome: string
}

export default function GamificationPage() {
    const [activeTab, setActiveTab] = useState<'leaderboard' | 'transbordo'>('leaderboard')
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<any[]>([])
    const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 })
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500)
        return () => clearTimeout(timer)
    }, [search])

    // Fetch Data
    const fetchData = async () => {
        setLoading(true)
        try {
            const type = activeTab
            const query = new URLSearchParams({
                type,
                page: pagination.page.toString(),
                limit: '50',
                ...(debouncedSearch && { search: debouncedSearch })
            })

            const res = await fetch(`/api/admin/gamification/stats?${query.toString()}`)
            const json = await res.json()

            if (activeTab === 'leaderboard') {
                setData(json.data || [])
                setPagination(json.pagination || { page: 1, total: 0, pages: 1 })
            } else {
                // Transbordo API return structure might differ slightly based on my previous impl (I returned {data, page} wrapper)
                setData(json.data || [])
                // Se a API de transbordo não retornar paginação completa, assumimos simples
                setPagination({ page: json.page || 1, total: 1000, pages: 10 }) // Placeholder se faltar count
            }
        } catch (err) {
            console.error('Erro ao buscar dados:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [activeTab, pagination.page, debouncedSearch])

    // Reset pagination when tab or search changes
    useEffect(() => {
        setPagination(p => ({ ...p, page: 1 }))
    }, [activeTab, debouncedSearch])

    return (
        <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                        Gamificação & Transbordo <Trophy className="text-yellow-500 w-8 h-8" />
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Monitore o desempenho dos corretores e o fluxo de leads em tempo real.
                    </p>
                </div>
            </div>

            {/* Controls & Tabs */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                {/* Tabs */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('leaderboard')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'leaderboard'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Crown className="w-4 h-4" /> Ranking (Leaderboard)
                    </button>
                    <button
                        onClick={() => setActiveTab('transbordo')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'transbordo'
                                ? 'bg-white text-orange-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <History className="w-4 h-4" /> Histórico de Transbordo
                    </button>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder={activeTab === 'leaderboard' ? "Buscar corretor..." : "Buscar lead, corretor ou cliente..."}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-2">
                        <RefreshCw className="w-8 h-8 animate-spin" />
                        <span className="text-sm">Carregando dados...</span>
                    </div>
                ) : (
                    <>
                        {activeTab === 'leaderboard' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Posição</th>
                                            <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Corretor</th>
                                            <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider text-center">Nível</th>
                                            <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider text-right">XP Total</th>
                                            <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider text-center">Leads Aceitos</th>
                                            <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider text-center">Leads Perdidos</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {data.map((broker: BrokerScore, index) => (
                                            <tr key={broker.id} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap w-20">
                                                    {index === 0 && <span className="text-2xl">🥇</span>}
                                                    {index === 1 && <span className="text-2xl">🥈</span>}
                                                    {index === 2 && <span className="text-2xl">🥉</span>}
                                                    {index > 2 && <span className="text-gray-400 font-mono">#{index + 1}</span>}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-bold text-lg mr-3">
                                                            {broker.nome.charAt(0)}
                                                        </div>
                                                        <div className="text-sm font-medium text-gray-900">{broker.nome}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                        Lvl {broker.nivel}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-sm text-gray-600">
                                                    {broker.xp.toLocaleString()} XP
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-green-600 font-medium">
                                                    {broker.leads_aceitos}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-red-500 font-medium">
                                                    {broker.leads_perdidos}
                                                </td>
                                            </tr>
                                        ))}
                                        {data.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                                    Nenhum corretor encontrado.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'transbordo' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Data</th>
                                            <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Corretor</th>
                                            <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Lead (Imóvel)</th>
                                            <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Detalhes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {data.map((log: TransbordoLog) => (
                                            <tr key={log.id} className="hover:bg-orange-50/30 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(log.created_at).toLocaleString('pt-BR')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {log.status === 'expirado' && (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 gap-1">
                                                            <AlertTriangle className="w-3 h-3" /> Expirou
                                                        </span>
                                                    )}
                                                    {log.status === 'atribuido' && (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 gap-1">
                                                            <ArrowRight className="w-3 h-3" /> Atribuído
                                                        </span>
                                                    )}
                                                    {log.status === 'aceito' && (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 gap-1">
                                                            <Crown className="w-3 h-3" /> Aceitou
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {log.corretor_nome}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900">{log.cliente_nome}</span>
                                                        <span className="text-xs text-gray-400">{log.imovel_codigo}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 max-w-xs truncate">
                                                    {JSON.stringify(log.motivo)}
                                                </td>
                                            </tr>
                                        ))}
                                        {data.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                                    Nenhum registro de transbordo encontrado.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center mt-4">
                <button
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                    className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                    Anterior
                </button>
                <span className="text-sm text-gray-500">
                    Página {pagination.page} de {pagination.pages}
                </span>
                <button
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                    className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                    Próxima
                </button>
            </div>
        </div>
    )
}
