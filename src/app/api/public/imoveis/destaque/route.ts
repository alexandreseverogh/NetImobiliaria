import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

type TipoDestaque = 'DV' | 'DA'

function parseTipoDestaque(raw: string | null): TipoDestaque {
  return raw === 'DA' ? 'DA' : 'DV'
}

function parseLimit(raw: string | null, fallback: number): number {
  const n = raw ? Number(raw) : NaN
  if (!Number.isFinite(n)) return fallback
  return Math.min(50, Math.max(1, Math.floor(n)))
}

async function fetchImagemPrincipal(imovelId: number): Promise<string | null> {
  const imagemQuery = `
    SELECT id
    FROM imovel_imagens
    WHERE imovel_id = $1 AND principal = true
    ORDER BY created_at DESC
    LIMIT 1
  `
  const imagemResult = await pool.query(imagemQuery, [imovelId])
  if (imagemResult.rows.length === 0) return null
  const row = imagemResult.rows[0]
  // Retorna URL para streaming
  return `/api/public/imagens/${row.id}`
}

async function fetchImagensPrincipais(ids: number[]): Promise<Record<number, string>> {
  if (!ids.length) return {}

  const query = `
    SELECT DISTINCT ON (imovel_id)
      imovel_id,
      id
    FROM imovel_imagens
    WHERE imovel_id = ANY($1::int[])
      AND principal = true
    ORDER BY imovel_id, created_at DESC
  `
  const result = await pool.query(query, [ids])
  return result.rows.reduce<Record<number, string>>((acc, row) => {
    // Retorna URL para streaming
    acc[row.imovel_id] = `/api/public/imagens/${row.id}`
    return acc
  }, {})
}

// API PÚBLICA - Buscar imóveis em destaque (SEM autenticação)
export async function GET(request: NextRequest) {
  try {
    // Schema OFICIAL (Postgres 17 + backup net-imobiliaria_backup_2025-12-20_17-36-57.sql)
    const tipoCol = 'tipo_fk'
    const statusCol = 'status_fk'
    const cidadeCol = 'cidade_fk'
    const estadoCol = 'estado_fk'

    const { searchParams } = new URL(request.url)
    const tipoDestaque = parseTipoDestaque(searchParams.get('tipo_destaque'))
    const estado = searchParams.get('estado')
    const cidade = searchParams.get('cidade')
    const destaqueNacionalOnly = searchParams.get('destaque_nacional_only') === 'true'
    const includeImages = searchParams.get('include_images') !== 'false'
    const limit = parseLimit(searchParams.get('limit'), 50)

    const estadoNorm = estado?.trim().toUpperCase()
    const cidadeNorm = cidade?.trim()

    // Regra: sem localização => mostrar apenas nacional; com localização => tenta local e faz fallback pra nacional
    const semLocalizacao = !estado && !cidade
    const buscarSomenteNacional = destaqueNacionalOnly || semLocalizacao

    const params: any[] = []
    let paramIndex = 1

    const buildQuery = (mode: 'nacional' | 'local') => {
      const where: string[] = [
        'i.ativo = true',
        'si.ativo = true',
        'si.consulta_imovel_internauta = true'
      ]

      if (mode === 'nacional') {
        where.push('i.destaque_nacional = true')
      } else {
        where.push('i.destaque = true')
        // IMPORTANTE (performance): evitar funções na coluna (TRIM/UPPER) para permitir uso de índice.
        if (estadoNorm) {
          where.push(`i.${estadoCol} = $${paramIndex}`)
          params.push(estadoNorm)
          paramIndex++
        }
        // Cidade vinda da geolocalização/seleção normalmente é exata -> usar igualdade (usa índice).
        // Se houver divergência de acentos/case no futuro, podemos introduzir fallback opcional.
        if (cidadeNorm) {
          where.push(`i.${cidadeCol} = $${paramIndex}`)
          params.push(cidadeNorm)
          paramIndex++
        }
      }

      // Finalidade (DV/DA) sempre via flags de landing
      if (tipoDestaque === 'DV') where.push('fi.vender_landpaging = true')
      if (tipoDestaque === 'DA') where.push('fi.alugar_landpaging = true')

      return `
        SELECT 
          i.id,
          i.codigo,
          i.titulo,
          i.descricao,
          i.preco,
          i.endereco,
          i.bairro,
          i.${cidadeCol} as cidade_fk,
          i.${estadoCol} as estado_fk,
          i.cep,
          i.quartos,
          i.banheiros,
          i.area_total,
          i.vagas_garagem,
          i.${tipoCol} as tipo_fk,
          i.finalidade_fk,
          ti.nome as tipo_nome,
          fi.nome as finalidade_nome,
          fi.tipo_destaque,
          i.destaque_nacional,
          i.lancamento,
          fi.vender_landpaging,
          fi.alugar_landpaging
        FROM imoveis i
        INNER JOIN tipos_imovel ti ON i.${tipoCol} = ti.id
        INNER JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
        INNER JOIN status_imovel si ON i.${statusCol} = si.id
        WHERE ${where.join(' AND ')}
        ORDER BY i.created_at DESC
        LIMIT ${limit}
      `
    }

    let rows: any[] = []
    let usadoFallbackNacional = false

    if (buscarSomenteNacional) {
      const q = buildQuery('nacional')
      const r = await pool.query(q, params)
      rows = r.rows
    } else {
      // 1) tenta local
      const qLocal = buildQuery('local')
      const rLocal = await pool.query(qLocal, params)
      rows = rLocal.rows

      // 2) fallback nacional
      if (rows.length === 0) {
        usadoFallbackNacional = true
        // reset params/index for query nacional (sem filtros de local)
        params.length = 0
        paramIndex = 1
        const qNac = buildQuery('nacional')
        const rNac = await pool.query(qNac, params)
        rows = rNac.rows
      }
    }

    // Imagens principais (batch) — opcional para reduzir payload/latência
    let imoveisComImagens: any[] = rows
    if (includeImages) {
      const ids = rows.map(r => r.id)
      const imagens = await fetchImagensPrincipais(ids)
      imoveisComImagens = rows.map(imovel => ({
        ...imovel,
        imagem_principal: imagens[imovel.id] || null
      }))
    } else {
      imoveisComImagens = rows.map(imovel => ({ ...imovel, imagem_principal: null }))
    }

    return NextResponse.json({
      success: true,
      imoveis: imoveisComImagens,
      usadoFallbackNacional
    })
  } catch (error) {
    console.error('❌ Erro ao buscar imóveis em destaque:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

