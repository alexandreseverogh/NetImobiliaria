import { NextRequest, NextResponse } from 'next/server'
import { checkApiPermission } from '@/lib/middleware/permissionMiddleware'
import {
    getVisitasSummary,
    getVisitasPorDia,
    getTopImoveis,
    getVisitasPorDispositivo,
    getVisitasPorOrigem,
    getVisitasPorTipoPagina,
    getTopPaginas,
    getAcessosRecentes,
    type AnalyticsFilters,
} from '@/lib/database/analytics'

export const runtime = 'nodejs'

// Resolve período a partir do shorthand ou datas explícitas
function resolvePeriod(periodo: string | null, from: string | null, to: string | null): { from: string; to: string; prevFrom: string; prevTo: string } {
    const now = new Date()
    const toDate = to ? new Date(to) : now

    let fromDate: Date
    let diffMs: number

    switch (periodo) {
        case '7d':
            fromDate = new Date(now); fromDate.setDate(fromDate.getDate() - 7); break
        case '90d':
            fromDate = new Date(now); fromDate.setDate(fromDate.getDate() - 90); break
        case 'mes':
            fromDate = new Date(now.getFullYear(), now.getMonth(), 1); break
        case 'ano':
            fromDate = new Date(now.getFullYear(), 0, 1); break
        case 'hoje':
            fromDate = new Date(now); fromDate.setHours(0, 0, 0, 0); break
        case 'ontem': {
            fromDate = new Date(now); fromDate.setDate(fromDate.getDate() - 1); fromDate.setHours(0, 0, 0, 0)
            toDate.setDate(toDate.getDate() - 1); toDate.setHours(23, 59, 59, 999); break
        }
        case 'custom':
            fromDate = from ? new Date(from) : new Date(now); fromDate.setDate(fromDate.getDate() - 30); break
        default: // '30d'
            fromDate = new Date(now); fromDate.setDate(fromDate.getDate() - 30)
    }

    diffMs = toDate.getTime() - fromDate.getTime()
    const prevTo = new Date(fromDate.getTime() - 1)
    const prevFrom = new Date(prevTo.getTime() - diffMs)

    return {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        prevFrom: prevFrom.toISOString(),
        prevTo: prevTo.toISOString(),
    }
}

export async function GET(request: NextRequest) {
    try {
        const permCheck = await checkApiPermission(request)
        if (permCheck) return permCheck

        const { searchParams } = new URL(request.url)
        const periodo = searchParams.get('periodo') || '30d'
        const from = searchParams.get('from')
        const to = searchParams.get('to')

        const { from: resolvedFrom, to: resolvedTo, prevFrom, prevTo } = resolvePeriod(periodo, from, to)

        const filters: AnalyticsFilters = {
            from: resolvedFrom,
            to: resolvedTo,
            device_type: searchParams.get('device') || undefined,
            page_type: searchParams.get('page_type') || undefined,
            referrer_type: searchParams.get('origem') || undefined,
            utm_campaign: searchParams.get('utm') || undefined,
        }

        // Executar todas as queries em paralelo para máxima velocidade
        const [summary, porDia, topImoveis, porDispositivo, porOrigem, porTipoPagina, topPaginas, acessosRecentes] = await Promise.all([
            getVisitasSummary(filters, prevFrom, prevTo),
            getVisitasPorDia(filters),
            getTopImoveis(filters, 10),
            getVisitasPorDispositivo(filters),
            getVisitasPorOrigem(filters),
            getVisitasPorTipoPagina(filters),
            getTopPaginas(filters, 10),
            getAcessosRecentes(filters, 20),
        ])

        return NextResponse.json({
            periodo: { from: resolvedFrom, to: resolvedTo },
            resumo: summary,
            visitas_por_dia: porDia,
            top_imoveis: topImoveis,
            por_dispositivo: porDispositivo,
            por_origem: porOrigem,
            por_tipo_pagina: porTipoPagina,
            top_paginas: topPaginas,
            acessos_recentes: acessosRecentes,
        })
    } catch (error) {
        console.error('Erro ao buscar analytics de visitas:', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
