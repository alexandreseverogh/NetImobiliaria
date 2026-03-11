'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PermissionGuard from '@/components/admin/PermissionGuard'
import { useApi } from '@/hooks/useApi'
import {
    ChartBarIcon,
    DevicePhoneMobileIcon,
    ComputerDesktopIcon,
    GlobeAltIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    FunnelIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline'

// ─── Tipos ────────────────────────────────────────────────
interface Resumo {
    total_visitas: number
    visitantes_unicos: number
    media_diaria: number
    variacao_percentual: number | null
    variacao_sinal: string | null
}
interface DiaData { data: string; visitas: number; unicos: number }
interface ImovelData { imovel_id: number; codigo: string; titulo: string; visitas: number; visitantes_unicos: number }
interface DispositivoData { device_type: string; visitas: number; percentual: number }
interface OrigemData { referrer_type: string; visitas: number; percentual: number }
interface TipoPaginaData { page_type: string; visitas: number; visitantes_unicos: number }
interface PaginaData { page_path: string; page_type: string; visitas: number; visitantes_unicos: number }

interface DashboardData {
    resumo: Resumo
    visitas_por_dia: DiaData[]
    top_imoveis: ImovelData[]
    por_dispositivo: DispositivoData[]
    por_origem: OrigemData[]
    por_tipo_pagina: TipoPaginaData[]
    top_paginas: PaginaData[]
}

interface Filters {
    periodo: string
    from: string
    to: string
    device: string
    page_type: string
    origem: string
    utm: string
}

// ─── Labels / Traduções ───────────────────────────────────
const PERIODO_LABELS: Record<string, string> = {
    hoje: 'Hoje', ontem: 'Ontem', '7d': 'Últimos 7 dias',
    '30d': 'Últimos 30 dias', '90d': 'Últimos 90 dias',
    mes: 'Este mês', ano: 'Este ano', custom: 'Personalizado',
}
const DEVICE_LABELS: Record<string, string> = {
    mobile: '📱 Mobile', desktop: '💻 Desktop', tablet: '📟 Tablet',
}
const PAGE_LABELS: Record<string, string> = {
    imovel: 'Imóveis', pesquisa: 'Pesquisa', home: 'Home',
    mapa: 'Mapa', landpaging: 'Landing Page', corretor: 'Área Corretor',
    'meu-perfil': 'Meu Perfil', 'anunciar-imovel': 'Anunciar', other: 'Outras',
}
const ORIGEM_LABELS: Record<string, string> = {
    google: '🔍 Google', direct: '🔗 Acesso Direto',
    social: '📲 Redes Sociais', other: '🌐 Outros Sites',
}
const DEVICE_ICONS: Record<string, string> = {
    mobile: '📱', desktop: '💻', tablet: '📟', unknown: '❓',
}

// ─── Utilitários ──────────────────────────────────────────
function formatNumber(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
    return n.toString()
}

function BarChart({ data, labelKey, valueKey, labelMap, colorClass = 'bg-blue-500' }: {
    data: any[]; labelKey: string; valueKey: string; labelMap?: Record<string, string>; colorClass?: string
}) {
    const max = Math.max(...data.map(d => d[valueKey]), 1)
    return (
        <div className="space-y-2">
            {data.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-28 truncate flex-shrink-0">
                        {labelMap?.[item[labelKey]] || item[labelKey]}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div
                            className={`h-5 rounded-full ${colorClass} transition-all duration-700 flex items-center justify-end pr-2`}
                            style={{ width: `${Math.max((item[valueKey] / max) * 100, 3)}%` }}
                        >
                            <span className="text-[10px] text-white font-medium">{formatNumber(item[valueKey])}</span>
                        </div>
                    </div>
                    {item.percentual !== undefined && (
                        <span className="text-xs text-gray-500 w-10 text-right flex-shrink-0">{item.percentual}%</span>
                    )}
                </div>
            ))}
        </div>
    )
}

function DayChart({ data }: { data: DiaData[] }) {
    const max = Math.max(...data.map(d => d.visitas), 1)
    return (
        <div className="flex items-end gap-1 h-32 overflow-x-auto pb-1">
            {data.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-1 min-w-[24px] flex-1 group relative">
                    <div
                        className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-default"
                        style={{ height: `${Math.max((d.visitas / max) * 100, 4)}%` }}
                        title={`${d.data}: ${d.visitas} visitas`}
                    />
                    {/* tooltip */}
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                        {new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}<br />
                        {d.visitas} visitas · {d.unicos} únicos
                    </div>
                </div>
            ))}
        </div>
    )
}

function KPICard({ label, value, sub, icon, color, variacao }: {
    label: string; value: string; sub?: string; icon: React.ReactNode; color: string; variacao?: { valor: number | null; sinal: string | null }
}) {
    return (
        <div className={`bg-white rounded-xl border-l-4 ${color} shadow-sm p-5 flex flex-col gap-2`}>
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">{label}</span>
                <div className="text-gray-400">{icon}</div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {sub && <p className="text-xs text-gray-500">{sub}</p>}
            {variacao?.valor !== null && variacao?.valor !== undefined && (
                <div className={`flex items-center gap-1 text-xs font-semibold ${(variacao.valor ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {(variacao.valor ?? 0) >= 0
                        ? <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                        : <ArrowTrendingDownIcon className="w-3.5 h-3.5" />}
                    {variacao.sinal}{Math.abs(variacao.valor)}% vs período anterior
                </div>
            )}
        </div>
    )
}

// ─── Página Principal ─────────────────────────────────────
export default function VisitasPlataformaPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { get } = useApi()

    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showFilters, setShowFilters] = useState(false)

    const [filters, setFilters] = useState<Filters>({
        periodo: searchParams.get('periodo') || '30d',
        from: searchParams.get('from') || '',
        to: searchParams.get('to') || '',
        device: searchParams.get('device') || '',
        page_type: searchParams.get('page_type') || '',
        origem: searchParams.get('origem') || '',
        utm: searchParams.get('utm') || '',
    })

    const [pendingFilters, setPendingFilters] = useState<Filters>(filters)

    const fetchData = useCallback(async (f: Filters) => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams()
            if (f.periodo) params.set('periodo', f.periodo)
            if (f.from && f.periodo === 'custom') params.set('from', f.from)
            if (f.to && f.periodo === 'custom') params.set('to', f.to)
            if (f.device) params.set('device', f.device)
            if (f.page_type) params.set('page_type', f.page_type)
            if (f.origem) params.set('origem', f.origem)
            if (f.utm) params.set('utm', f.utm)

            const res = await get(`/api/admin/visitas-plataforma?${params.toString()}`)
            if (!res.ok) throw new Error('Erro ao carregar dados')
            const json = await res.json()
            setData(json)
        } catch {
            setError('Não foi possível carregar os dados de visitas.')
        } finally {
            setLoading(false)
        }
    }, [get])

    useEffect(() => {
        fetchData(filters)
    }, []) // eslint-disable-line

    const handleApply = () => {
        setFilters(pendingFilters)
        fetchData(pendingFilters)
        // Persistir na URL
        const params = new URLSearchParams()
        Object.entries(pendingFilters).forEach(([k, v]) => { if (v) params.set(k, v) })
        router.replace(`/admin/visitas-plataforma?${params.toString()}`, { scroll: false })
    }

    const handleClear = () => {
        const clean: Filters = { periodo: '30d', from: '', to: '', device: '', page_type: '', origem: '', utm: '' }
        setPendingFilters(clean)
        setFilters(clean)
        fetchData(clean)
        router.replace('/admin/visitas-plataforma', { scroll: false })
    }

    const activeFilterCount = [filters.device, filters.page_type, filters.origem, filters.utm].filter(Boolean).length

    return (
        <PermissionGuard resource="visita-plataforma" action="READ">
            <div className="min-h-screen bg-gray-50 p-6 space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <ChartBarIcon className="w-8 h-8 text-blue-600" />
                            Visitas Plataforma
                        </h1>
                        <p className="text-gray-500 mt-1">Analytics de acesso ao site público www.imovtec.com.br</p>
                    </div>
                    <button
                        onClick={() => setShowFilters(v => !v)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 shadow-sm transition-colors"
                    >
                        <FunnelIcon className="w-4 h-4" />
                        Filtros
                        {activeFilterCount > 0 && (
                            <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5">{activeFilterCount}</span>
                        )}
                    </button>
                </div>

                {/* Painel de Filtros */}
                {showFilters && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                                <FunnelIcon className="w-4 h-4" /> Filtros
                            </h2>
                            <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Período */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Período</label>
                                <select
                                    value={pendingFilters.periodo}
                                    onChange={e => setPendingFilters(p => ({ ...p, periodo: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {Object.entries(PERIODO_LABELS).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </select>
                            </div>

                            {/* De / Até (apenas quando custom) */}
                            {pendingFilters.periodo === 'custom' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">De</label>
                                        <input type="date" value={pendingFilters.from}
                                            onChange={e => setPendingFilters(p => ({ ...p, from: e.target.value }))}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Até</label>
                                        <input type="date" value={pendingFilters.to}
                                            onChange={e => setPendingFilters(p => ({ ...p, to: e.target.value }))}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Dispositivo */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Dispositivo</label>
                                <select value={pendingFilters.device}
                                    onChange={e => setPendingFilters(p => ({ ...p, device: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Todos</option>
                                    {Object.entries(DEVICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>

                            {/* Tipo de Página */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Página</label>
                                <select value={pendingFilters.page_type}
                                    onChange={e => setPendingFilters(p => ({ ...p, page_type: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Todas</option>
                                    {Object.entries(PAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>

                            {/* Origem */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Origem do Tráfego</label>
                                <select value={pendingFilters.origem}
                                    onChange={e => setPendingFilters(p => ({ ...p, origem: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Todas</option>
                                    {Object.entries(ORIGEM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>

                            {/* UTM Campaign */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">UTM Campaign</label>
                                <input type="text" placeholder="ex: promo-marco" value={pendingFilters.utm}
                                    onChange={e => setPendingFilters(p => ({ ...p, utm: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={handleApply}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                Aplicar Filtros
                            </button>
                            <button onClick={handleClear}
                                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                            >
                                Limpar
                            </button>
                        </div>
                    </div>
                )}

                {/* Estado de Carregamento */}
                {loading && (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
                )}

                {data && !loading && (
                    <>
                        {/* KPIs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <KPICard
                                label="Total de Visitas"
                                value={data.resumo.total_visitas.toLocaleString('pt-BR')}
                                sub={`Período: ${PERIODO_LABELS[filters.periodo] || filters.periodo}`}
                                icon={<ChartBarIcon className="w-6 h-6" />}
                                color="border-blue-500"
                                variacao={{ valor: data.resumo.variacao_percentual, sinal: data.resumo.variacao_sinal }}
                            />
                            <KPICard
                                label="Visitantes Únicos"
                                value={data.resumo.visitantes_unicos.toLocaleString('pt-BR')}
                                sub="Sessions distintas"
                                icon={<GlobeAltIcon className="w-6 h-6" />}
                                color="border-green-500"
                            />
                            <KPICard
                                label="Média Diária"
                                value={data.resumo.media_diaria.toLocaleString('pt-BR')}
                                sub="visitas por dia"
                                icon={<ArrowTrendingUpIcon className="w-6 h-6" />}
                                color="border-purple-500"
                            />
                            <KPICard
                                label="Top Dispositivo"
                                value={data.por_dispositivo[0]
                                    ? `${DEVICE_ICONS[data.por_dispositivo[0].device_type] || '📊'} ${data.por_dispositivo[0].percentual}%`
                                    : '—'}
                                sub={data.por_dispositivo[0] ? DEVICE_LABELS[data.por_dispositivo[0].device_type] || data.por_dispositivo[0].device_type : ''}
                                icon={<DevicePhoneMobileIcon className="w-6 h-6" />}
                                color="border-orange-500"
                            />
                        </div>

                        {/* Gráfico de Visitas por Dia */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <ChartBarIcon className="w-5 h-5 text-blue-600" />
                                Visitas por Dia
                            </h2>
                            {data.visitas_por_dia.length > 0
                                ? <DayChart data={data.visitas_por_dia} />
                                : <p className="text-sm text-gray-400 text-center py-8">Nenhum dado para o período selecionado</p>
                            }
                        </div>

                        {/* Linha 3: Top Imóveis + Dispositivos */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Top Imóveis */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                                <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    🏠 Top 10 Imóveis Mais Visitados
                                </h2>
                                {data.top_imoveis.length > 0 ? (
                                    <div className="space-y-2">
                                        {data.top_imoveis.map((im, i) => (
                                            <div key={im.imovel_id} className="flex items-center gap-3">
                                                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                                    {i + 1}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-800 truncate">
                                                        {im.titulo || `Imóvel #${im.imovel_id}`}
                                                    </p>
                                                    <p className="text-xs text-gray-400">{im.codigo}</p>
                                                </div>
                                                <span className="text-sm font-bold text-blue-600 flex-shrink-0">
                                                    {im.visitas.toLocaleString('pt-BR')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-gray-400 text-center py-4">Nenhum imóvel visitado no período</p>}
                            </div>

                            {/* Dispositivos */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                                <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <ComputerDesktopIcon className="w-5 h-5 text-purple-600" />
                                    Dispositivos
                                </h2>
                                {data.por_dispositivo.length > 0
                                    ? <BarChart data={data.por_dispositivo} labelKey="device_type" valueKey="visitas" labelMap={DEVICE_LABELS} colorClass="bg-purple-500" />
                                    : <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>}
                            </div>
                        </div>

                        {/* Linha 4: Origem + Tipo de Página */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Origem */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                                <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <GlobeAltIcon className="w-5 h-5 text-green-600" />
                                    Origem do Tráfego
                                </h2>
                                {data.por_origem.length > 0
                                    ? <BarChart data={data.por_origem} labelKey="referrer_type" valueKey="visitas" labelMap={ORIGEM_LABELS} colorClass="bg-green-500" />
                                    : <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>}
                            </div>

                            {/* Tipo de Página */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                                <h2 className="font-semibold text-gray-800 mb-4">📄 Por Tipo de Página</h2>
                                {data.por_tipo_pagina.length > 0
                                    ? <BarChart data={data.por_tipo_pagina} labelKey="page_type" valueKey="visitas" labelMap={PAGE_LABELS} colorClass="bg-orange-400" />
                                    : <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>}
                            </div>
                        </div>

                        {/* Top Páginas */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                            <h2 className="font-semibold text-gray-800 mb-4">🔗 Top 10 Páginas Mais Acessadas</h2>
                            {data.top_paginas.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-xs text-gray-500 border-b">
                                                <th className="pb-2 font-medium">#</th>
                                                <th className="pb-2 font-medium">Página</th>
                                                <th className="pb-2 font-medium">Tipo</th>
                                                <th className="pb-2 font-medium text-right">Visitas</th>
                                                <th className="pb-2 font-medium text-right">Únicos</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.top_paginas.map((pg, i) => (
                                                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                                    <td className="py-2 text-gray-400 font-medium">{i + 1}</td>
                                                    <td className="py-2 font-mono text-xs text-gray-700 max-w-xs truncate">{pg.page_path}</td>
                                                    <td className="py-2">
                                                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                                                            {PAGE_LABELS[pg.page_type] || pg.page_type}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 text-right font-bold text-blue-700">{pg.visitas.toLocaleString('pt-BR')}</td>
                                                    <td className="py-2 text-right text-gray-500">{pg.visitantes_unicos.toLocaleString('pt-BR')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : <p className="text-sm text-gray-400 text-center py-4">Sem dados de páginas</p>}
                        </div>
                    </>
                )}
            </div>
        </PermissionGuard>
    )
}
