import pool from './connection'

export interface AnalyticsFilters {
    from: string          // ISO date: '2026-02-10'
    to: string            // ISO date: '2026-03-11'
    device_type?: string  // 'mobile' | 'desktop' | 'tablet' | undefined
    page_type?: string    // 'imovel' | 'pesquisa' | etc | undefined
    referrer_type?: string // 'google' | 'direct' | 'social' | 'other' | undefined
    utm_campaign?: string // busca parcial
}

// Monta cláusulas WHERE dinâmicas a partir dos filtros
// alias: prefixo de tabela para queries com JOIN (ex: 'ap' → 'ap.created_at')
function buildWhereClause(filters: AnalyticsFilters, startParam = 1, alias = ''): { clause: string; params: any[] } {
    const a = alias ? `${alias}.` : ''
    const conditions: string[] = [
        `${a}created_at >= $${startParam}`,
        `${a}created_at <= $${startParam + 1}`,
        `${a}device_type != 'bot'`,
    ]
    const params: any[] = [filters.from, filters.to]
    let idx = startParam + 2

    if (filters.device_type) {
        conditions.push(`${a}device_type = $${idx++}`)
        params.push(filters.device_type)
    }
    if (filters.page_type) {
        conditions.push(`${a}page_type = $${idx++}`)
        params.push(filters.page_type)
    }
    if (filters.referrer_type) {
        conditions.push(`${a}referrer_type = $${idx++}`)
        params.push(filters.referrer_type)
    }
    if (filters.utm_campaign) {
        conditions.push(`${a}utm_campaign ILIKE $${idx++}`)
        params.push(`%${filters.utm_campaign}%`)
    }

    return { clause: `WHERE ${conditions.join(' AND ')}`, params }
}

// ----- KPIs Principais -----
export async function getVisitasSummary(filters: AnalyticsFilters, prevFrom: string, prevTo: string) {
    const { clause, params } = buildWhereClause(filters)
    const { clause: prevClause, params: prevParams } = buildWhereClause({ ...filters, from: prevFrom, to: prevTo })

    const [current, previous] = await Promise.all([
        pool.query(
            `SELECT
         COUNT(*) AS total_visitas,
         COUNT(DISTINCT session_id) AS visitantes_unicos
       FROM public.analytics_pageviews ${clause}`,
            params
        ),
        pool.query(
            `SELECT COUNT(*) AS total_visitas FROM public.analytics_pageviews ${prevClause}`,
            prevParams
        ),
    ])

    const totalAtual = parseInt(current.rows[0]?.total_visitas || '0')
    const totalAnterior = parseInt(previous.rows[0]?.total_visitas || '0')
    const variacao = totalAnterior > 0
        ? (((totalAtual - totalAnterior) / totalAnterior) * 100).toFixed(1)
        : null

    // Calcular média diária
    const diffDays = Math.max(1, Math.round(
        (new Date(filters.to).getTime() - new Date(filters.from).getTime()) / (1000 * 60 * 60 * 24)
    ))

    const mediaDiaria = totalAtual / diffDays

    return {
        total_visitas: totalAtual,
        visitantes_unicos: parseInt(current.rows[0]?.visitantes_unicos || '0'),
        media_diaria: mediaDiaria >= 1
            ? Math.round(mediaDiaria)
            : parseFloat(mediaDiaria.toFixed(1)), // ex: 0.1 para períodos longos com poucas visitas
        variacao_percentual: variacao ? parseFloat(variacao) : null,
        variacao_sinal: variacao ? (parseFloat(variacao) >= 0 ? '+' : '') : null,
    }
}

// ----- Visitas por Dia -----
export async function getVisitasPorDia(filters: AnalyticsFilters) {
    const { clause, params } = buildWhereClause(filters)

    const result = await pool.query(
        `SELECT
       DATE(created_at) AS data,
       COUNT(*) AS visitas,
       COUNT(DISTINCT session_id) AS unicos
     FROM public.analytics_pageviews ${clause}
     GROUP BY DATE(created_at)
     ORDER BY data ASC`,
        params
    )

    return result.rows.map(r => ({
        data: r.data,
        visitas: parseInt(r.visitas),
        unicos: parseInt(r.unicos),
    }))
}

// ----- Top Imóveis Visitados (com detalhes completos do imóvel) -----
export async function getTopImoveis(filters: AnalyticsFilters, limit = 10) {
    const { clause, params } = buildWhereClause(filters, 1, 'ap')
    const limitParam = params.length + 1

    const result = await pool.query(
        `SELECT
       ap.imovel_id,
       i.codigo,
       i.titulo,
       i.endereco,
       i.numero,
       i.complemento,
       i.bairro,
       i.cidade_fk         AS cidade,
       i.estado_fk         AS estado,
       i.preco,
       i.quartos,
       i.banheiros,
       i.suites,
       i.vagas_garagem,
       i.area_total,
       COUNT(*) AS visitas,
       COUNT(DISTINCT ap.session_id) AS visitantes_unicos,
       MAX(ap.created_at)  AS ultimo_acesso,
       (SELECT ap2.referrer_type
          FROM public.analytics_pageviews ap2
          WHERE ap2.imovel_id = ap.imovel_id
          ORDER BY ap2.created_at DESC
          LIMIT 1
       ) AS ultima_origem
     FROM public.analytics_pageviews ap
     LEFT JOIN public.imoveis i ON i.id = ap.imovel_id
     ${clause} AND ap.imovel_id IS NOT NULL
     GROUP BY ap.imovel_id, i.codigo, i.titulo, i.endereco, i.numero, i.complemento,
              i.bairro, i.cidade_fk, i.estado_fk, i.preco, i.quartos,
              i.banheiros, i.suites, i.vagas_garagem, i.area_total
     ORDER BY visitas DESC
     LIMIT $${limitParam}`,
        [...params, limit]
    )

    return result.rows.map(r => ({
        imovel_id: r.imovel_id,
        codigo: r.codigo,
        titulo: r.titulo,
        endereco: [
            r.estado,
            r.cidade,
            r.bairro,
            r.endereco,
            r.numero ? `nº ${r.numero}` : null,
            r.complemento || null,
        ].filter(Boolean).join(', '),
        preco: r.preco ? parseFloat(r.preco) : null,
        quartos: r.quartos,
        banheiros: r.banheiros,
        suites: r.suites,
        vagas_garagem: r.vagas_garagem,
        area_total: r.area_total ? parseFloat(r.area_total) : null,
        visitas: parseInt(r.visitas),
        visitantes_unicos: parseInt(r.visitantes_unicos),
        ultimo_acesso: r.ultimo_acesso,
        ultima_origem: r.ultima_origem,
    }))
}

// ----- Visitas por Dispositivo -----
export async function getVisitasPorDispositivo(filters: AnalyticsFilters) {
    const { clause, params } = buildWhereClause(filters)

    const result = await pool.query(
        `SELECT
       device_type,
       COUNT(*) AS visitas
     FROM public.analytics_pageviews ${clause}
     GROUP BY device_type
     ORDER BY visitas DESC`,
        params
    )

    const total = result.rows.reduce((sum, r) => sum + parseInt(r.visitas), 0)

    return result.rows.map(r => ({
        device_type: r.device_type,
        visitas: parseInt(r.visitas),
        percentual: total > 0 ? parseFloat(((parseInt(r.visitas) / total) * 100).toFixed(1)) : 0,
    }))
}

// ----- Visitas por Origem do Tráfego -----
export async function getVisitasPorOrigem(filters: AnalyticsFilters) {
    const { clause, params } = buildWhereClause(filters)

    const result = await pool.query(
        `SELECT
       COALESCE(referrer_type, 'direct') AS referrer_type,
       COUNT(*) AS visitas
     FROM public.analytics_pageviews ${clause}
     GROUP BY referrer_type
     ORDER BY visitas DESC`,
        params
    )

    const total = result.rows.reduce((sum, r) => sum + parseInt(r.visitas), 0)

    return result.rows.map(r => ({
        referrer_type: r.referrer_type,
        visitas: parseInt(r.visitas),
        percentual: total > 0 ? parseFloat(((parseInt(r.visitas) / total) * 100).toFixed(1)) : 0,
    }))
}

// ----- Visitas por Tipo de Página -----
export async function getVisitasPorTipoPagina(filters: AnalyticsFilters) {
    const { clause, params } = buildWhereClause(filters)

    const result = await pool.query(
        `SELECT
       page_type,
       COUNT(*) AS visitas,
       COUNT(DISTINCT session_id) AS visitantes_unicos
     FROM public.analytics_pageviews ${clause}
     GROUP BY page_type
     ORDER BY visitas DESC`,
        params
    )

    return result.rows.map(r => ({
        page_type: r.page_type,
        visitas: parseInt(r.visitas),
        visitantes_unicos: parseInt(r.visitantes_unicos),
    }))
}

// ----- Top Páginas Visitadas (agregado) -----
export async function getTopPaginas(filters: AnalyticsFilters, limit = 10) {
    const { clause, params } = buildWhereClause(filters)
    const limitParam = params.length + 1

    const result = await pool.query(
        `SELECT
       page_path,
       page_type,
       COUNT(*) AS visitas,
       COUNT(DISTINCT session_id) AS visitantes_unicos
     FROM public.analytics_pageviews ${clause}
     GROUP BY page_path, page_type
     ORDER BY visitas DESC
     LIMIT $${limitParam}`,
        [...params, limit]
    )

    return result.rows.map(r => ({
        page_path: r.page_path,
        page_type: r.page_type,
        visitas: parseInt(r.visitas),
        visitantes_unicos: parseInt(r.visitantes_unicos),
    }))
}

// ----- Acessos Recentes (com hora e origem — últimos N registros) -----
export async function getAcessosRecentes(filters: AnalyticsFilters, limit = 20) {
    const { clause, params } = buildWhereClause(filters)
    const limitParam = params.length + 1

    const result = await pool.query(
        `SELECT
       id,
       page_path,
       page_type,
       referrer_type,
       device_type,
       created_at
     FROM public.analytics_pageviews ${clause}
     ORDER BY created_at DESC
     LIMIT $${limitParam}`,
        [...params, limit]
    )

    return result.rows.map(r => ({
        id: r.id,
        page_path: r.page_path,
        page_type: r.page_type,
        referrer_type: r.referrer_type || 'direct',
        device_type: r.device_type,
        created_at: r.created_at,
    }))
}
