import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'

// GET - Buscar receitas de destaque
export async function GET(request: NextRequest) {
  try {
    // Verificar permissões
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    // 1. Buscar receita nacional (destaque_nacional = true) estratificada por finalidade
    const receitaNacionalQuery = `
      SELECT 
        COALESCE(fi.nome, 'SEM FINALIDADE') as finalidade,
        COUNT(*) as total_imoveis,
        COALESCE((SELECT vl_destaque_nacional FROM parametros LIMIT 1), 0) as valor_unitario,
        COUNT(*) * COALESCE((SELECT vl_destaque_nacional FROM parametros LIMIT 1), 0) as receita_total
      FROM imoveis i
      LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
      WHERE i.destaque_nacional = true
        AND i.ativo = true
      GROUP BY COALESCE(fi.nome, 'SEM FINALIDADE')
      ORDER BY COALESCE(fi.nome, 'SEM FINALIDADE')
    `

    const receitaNacionalResult = await pool.query(receitaNacionalQuery)
    
    // Processar dados estratificados por finalidade
    const receitaNacionalPorFinalidade = receitaNacionalResult.rows.map((row: any) => {
      // Normalizar nome da finalidade
      let finalidadeNome = row.finalidade || 'SEM FINALIDADE'
      
      // Se for NULL ou vazio, usar 'SEM FINALIDADE'
      if (!row.finalidade || row.finalidade === 'null' || row.finalidade.trim() === '') {
        finalidadeNome = 'SEM FINALIDADE'
      }
      
      return {
        finalidade: finalidadeNome,
        total_imoveis: parseInt(row.total_imoveis) || 0,
        valor_unitario: parseFloat(row.valor_unitario) || 0,
        receita_total: parseFloat(row.receita_total) || 0
      }
    })
    
    // Buscar valor unitário
    const valorUnitarioResult = await pool.query('SELECT vl_destaque_nacional FROM parametros LIMIT 1')
    const valorUnitario = parseFloat(valorUnitarioResult.rows[0]?.vl_destaque_nacional || 0)
    
    // Calcular totais consolidados
    const totalImoveis = receitaNacionalPorFinalidade.reduce((sum, f) => sum + f.total_imoveis, 0)
    const receitaTotal = receitaNacionalPorFinalidade.reduce((sum, f) => sum + f.receita_total, 0)
    
    const receitaNacional = {
      total_imoveis: totalImoveis,
      valor_unitario: valorUnitario,
      receita_total: receitaTotal,
      por_finalidade: receitaNacionalPorFinalidade
    }

    // 2. Buscar receita por estado (destaque = true) estratificada por finalidade
    // Primeiro buscar todos os imóveis com destaque = true, depois agrupar
    // IMPORTANTE: Incluir apenas imóveis com estado_fk válido (que existe em valor_destaque_local)
    const receitaPorEstadoQuery = `
      SELECT 
        i.estado_fk,
        COALESCE(fi.nome, 'SEM FINALIDADE') as finalidade,
        vdl.valor_destaque as valor_unitario,
        COUNT(DISTINCT i.id) as total_imoveis,
        COUNT(DISTINCT i.id) * vdl.valor_destaque as receita_total
      FROM imoveis i
      INNER JOIN valor_destaque_local vdl ON i.estado_fk = vdl.estado_fk AND vdl.cidade_fk = 'TODAS'
      LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
      WHERE i.destaque = true 
        AND i.ativo = true
        AND i.estado_fk IS NOT NULL
      GROUP BY i.estado_fk, vdl.valor_destaque, COALESCE(fi.nome, 'SEM FINALIDADE')
      ORDER BY i.estado_fk, COALESCE(fi.nome, 'SEM FINALIDADE')
    `
    
    // Verificar se há imóveis com destaque mas sem estado_fk ou com estado_fk inválido
    const imoveisSemEstadoQuery = `
      SELECT COUNT(*) as total
      FROM imoveis
      WHERE destaque = true 
        AND ativo = true
        AND (estado_fk IS NULL OR estado_fk NOT IN (SELECT estado_fk FROM valor_destaque_local WHERE cidade_fk = 'TODAS'))
    `
    const imoveisSemEstadoResult = await pool.query(imoveisSemEstadoQuery)
    const imoveisSemEstado = parseInt(imoveisSemEstadoResult.rows[0]?.total || 0)
    if (imoveisSemEstado > 0) {
      console.log('⚠️ ATENÇÃO: Existem', imoveisSemEstado, 'imóveis com destaque local mas sem estado_fk válido')
    }

    const receitaPorEstadoResult = await pool.query(receitaPorEstadoQuery)
    
    // Debug: verificar total de imóveis com destaque local antes do agrupamento
    const debugTotalLocalQuery = `
      SELECT COUNT(*) as total
      FROM imoveis
      WHERE destaque = true AND ativo = true
    `
    const debugTotalLocalResult = await pool.query(debugTotalLocalQuery)
    console.log('🔍 Total real de imóveis com destaque local:', debugTotalLocalResult.rows[0]?.total)
    
    // Debug: verificar total após agrupamento
    const totalAposAgrupamento = receitaPorEstadoResult.rows.reduce((sum, row) => sum + parseInt(row.total_imoveis || 0), 0)
    console.log('🔍 Total após agrupamento por estado/finalidade:', totalAposAgrupamento)

    // Mapear nomes dos estados
    const estadosMap: { [key: string]: string } = {
      'AC': 'Acre',
      'AL': 'Alagoas',
      'AP': 'Amapá',
      'AM': 'Amazonas',
      'BA': 'Bahia',
      'CE': 'Ceará',
      'DF': 'Distrito Federal',
      'ES': 'Espírito Santo',
      'GO': 'Goiás',
      'MA': 'Maranhão',
      'MT': 'Mato Grosso',
      'MS': 'Mato Grosso do Sul',
      'MG': 'Minas Gerais',
      'PA': 'Pará',
      'PB': 'Paraíba',
      'PR': 'Paraná',
      'PE': 'Pernambuco',
      'PI': 'Piauí',
      'RJ': 'Rio de Janeiro',
      'RN': 'Rio Grande do Norte',
      'RS': 'Rio Grande do Sul',
      'RO': 'Rondônia',
      'RR': 'Roraima',
      'SC': 'Santa Catarina',
      'SP': 'São Paulo',
      'SE': 'Sergipe',
      'TO': 'Tocantins'
    }

    // Agrupar receitas por estado e finalidade
    const receitasPorEstadoMap = new Map<string, any>()
    
    receitaPorEstadoResult.rows.forEach((row: any) => {
      const estadoKey = row.estado_fk
      const finalidade = row.finalidade || 'SEM FINALIDADE'
      
      if (!receitasPorEstadoMap.has(estadoKey)) {
        receitasPorEstadoMap.set(estadoKey, {
          estado: estadoKey,
          estado_nome: estadosMap[estadoKey] || estadoKey,
          valor_unitario: parseFloat(row.valor_unitario) || 0,
          total_imoveis: 0,
          receita_total: 0,
          por_finalidade: []
        })
      }
      
      const estadoData = receitasPorEstadoMap.get(estadoKey)!
      const finalidadeData = {
        finalidade,
        total_imoveis: parseInt(row.total_imoveis) || 0,
        receita_total: parseFloat(row.receita_total) || 0
      }
      
      estadoData.por_finalidade.push(finalidadeData)
      estadoData.total_imoveis += finalidadeData.total_imoveis
      estadoData.receita_total += finalidadeData.receita_total
    })
    
    // Garantir que todos os estados tenham entrada (mesmo sem imóveis)
    // Buscar todos os estados e seus valores de uma vez
    const todosEstadosQuery = `
      SELECT estado_fk, valor_destaque 
      FROM valor_destaque_local 
      WHERE cidade_fk = 'TODAS'
    `
    const todosEstadosResult = await pool.query(todosEstadosQuery)
    for (const row of todosEstadosResult.rows) {
      if (!receitasPorEstadoMap.has(row.estado_fk)) {
        receitasPorEstadoMap.set(row.estado_fk, {
          estado: row.estado_fk,
          estado_nome: estadosMap[row.estado_fk] || row.estado_fk,
          valor_unitario: parseFloat(row.valor_destaque || 0),
          total_imoveis: 0,
          receita_total: 0,
          por_finalidade: []
        })
      }
    }
    
    const receitasPorEstado = Array.from(receitasPorEstadoMap.values())
      .sort((a, b) => b.receita_total - a.receita_total)
    
    // Calcular total geral
    const totalGeral = receitasPorEstado.reduce((sum, estado) => sum + estado.receita_total, 0) + 
                       parseFloat(receitaNacional.receita_total || 0)

    // Calcular total de imóveis com destaque (SOMA de nacional + local, não único)
    // Somar todos os imóveis com destaque_nacional = true + todos com destaque = true
    // Mesmo que alguns imóveis tenham ambos os destaques, devem ser contados duas vezes
    const totalNacionalQuery = `SELECT COUNT(*) as total FROM imoveis WHERE destaque_nacional = true AND ativo = true`
    const totalLocalQuery = `SELECT COUNT(*) as total FROM imoveis WHERE destaque = true AND ativo = true`
    
    const totalNacionalResult = await pool.query(totalNacionalQuery)
    const totalLocalResult = await pool.query(totalLocalQuery)
    
    const totalNacional = parseInt(totalNacionalResult.rows[0]?.total || 0)
    const totalLocal = parseInt(totalLocalResult.rows[0]?.total || 0)
    const totalImoveisDestaque = totalNacional + totalLocal

    const responseData = {
      receita_nacional: {
        total_imoveis: parseInt(receitaNacional.total_imoveis) || 0,
        valor_unitario: parseFloat(receitaNacional.valor_unitario) || 0,
        receita_total: parseFloat(receitaNacional.receita_total) || 0,
        por_finalidade: receitaNacional.por_finalidade || []
      },
      receitas_por_estado: receitasPorEstado,
      total_geral: totalGeral,
      total_imoveis_destaque: totalImoveisDestaque
    }
    
    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    console.error('Erro ao buscar receitas de destaque:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao buscar receitas de destaque' },
      { status: 500 }
    )
  }
}

